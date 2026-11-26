import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, DownloadTask, File, Paths, type DownloadPauseState } from 'expo-file-system';

import {
  estimateBytes,
  filesForTopic,
  planDownload,
  type FileKind,
  type ManifestEntry,
  type MediaFile,
  type Quality,
  type TopicMedia,
} from '@/domain/videoPlan';

/**
 * Topic downloads (runbook S16 item 1, specs/prd.md section 11). Every video,
 * poster and caption file of a topic is downloaded once into the app's own
 * document folder and played from there (specs/video-board.md P3).
 *
 * - One file at a time. Finished files are kept, so a lost connection only
 *   costs the file that was downloading.
 * - Cancel pauses the current file and saves its resume data; the next start
 *   continues it instead of starting again.
 * - Each file's size is checked against what the server said it would be.
 * - A manifest per topic, keyed by content version, records what is on the
 *   phone, so a content change downloads only files whose link changed.
 */

type PausedFile = { key: string; url: string; state: DownloadPauseState };

export type Manifest = {
  topicCode: string;
  contentVersion: string | null;
  quality: Quality;
  /** The media list itself, so the topic can be played with no network. */
  media: TopicMedia;
  entries: Record<string, ManifestEntry>;
  paused: PausedFile | null;
};

const manifestKey = (topicCode: string) => `atlas.media.${topicCode}`;
const mediaRoot = () => new Directory(Paths.document, 'media');

export async function readManifest(topicCode: string): Promise<Manifest | null> {
  try {
    const text = await AsyncStorage.getItem(manifestKey(topicCode));
    if (!text) return null;
    const m = JSON.parse(text) as Manifest;
    return m.topicCode === topicCode && typeof m.entries === 'object' ? m : null;
  } catch {
    return null;
  }
}

async function writeManifest(m: Manifest): Promise<void> {
  await AsyncStorage.setItem(manifestKey(m.topicCode), JSON.stringify(m));
}

function fileFor(fileName: string): File {
  return new File(mediaRoot(), fileName);
}

function startManifest(media: TopicMedia, quality: Quality, old: Manifest | null): Manifest {
  return {
    topicCode: media.topicCode,
    contentVersion: old?.contentVersion ?? null,
    quality,
    media,
    // Kept across a quality change: posters and captions stay, only videos whose link changed download again.
    entries: old?.entries ?? {},
    paused: old?.paused ?? null,
  };
}

/** Bytes the server says a file has, or null when it does not say. */
async function headSize(url: string): Promise<number | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(url, { method: 'HEAD', signal: controller.signal });
    if (!res.ok) return null;
    const n = Number(res.headers.get('content-length'));
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function guessBytes(file: MediaFile, media: TopicMedia): number {
  if (file.kind === 'poster') return 60_000;
  if (file.kind === 'captions') return 5_000;
  const v = media.versions.find((x) => x.id === file.versionId);
  return estimateBytes(v?.durationSeconds ?? 120);
}

/** What is still to download for this topic, in bytes. Asks the server for exact sizes, estimates the rest. */
export async function getTopicDownloadSize(media: TopicMedia, quality: Quality = '360'): Promise<number> {
  const manifest = await readManifest(media.topicCode);
  const plan = planDownload(filesForTopic(media, quality), manifest?.entries ?? {});
  let total = 0;
  for (const f of plan.toDownload) total += (await headSize(f.url)) ?? guessBytes(f, media);
  return total;
}

/**
 * Every file the topic needs is recorded and still on the phone. Without a
 * quality, the quality the topic was last downloaded at counts (D-46).
 */
export async function isTopicReady(media: TopicMedia, quality?: Quality): Promise<boolean> {
  const manifest = await readManifest(media.topicCode);
  if (!manifest) return false;
  const files = filesForTopic(media, quality ?? manifest.quality);
  if (!planDownload(files, manifest.entries).ready) return false;
  return files.every((f) => fileFor(f.fileName).exists);
}

/** The local file for a version's video, poster or captions, or null when it is not on the phone. */
export async function localUriFor(topicCode: string, versionId: string, kind: FileKind): Promise<string | null> {
  const manifest = await readManifest(topicCode);
  const entry = manifest?.entries[`${versionId}:${kind}`];
  if (!entry) return null;
  const file = fileFor(entry.fileName);
  return file.exists ? file.uri : null;
}

export type DownloadProgress = {
  videosDone: number;
  videosTotal: number;
  /** Bytes of the file downloading now, when known. */
  fileBytesWritten: number;
  fileBytesTotal: number | null;
};

export type DownloadResult = 'done' | 'cancelled' | 'failed';

/**
 * Downloads what the topic still needs. Resolves 'cancelled' after a cancel
 * (resume data kept), 'failed' after a network or size error (finished files
 * kept), 'done' when the topic is ready.
 */
export async function downloadTopic(
  media: TopicMedia,
  opts: { quality?: Quality; onProgress?: (p: DownloadProgress) => void; signal?: AbortSignal } = {},
): Promise<DownloadResult> {
  const quality = opts.quality ?? '360';
  const manifest = startManifest(media, quality, await readManifest(media.topicCode));
  const files = filesForTopic(media, quality);
  const plan = planDownload(files, manifest.entries);
  let videosDone = plan.videosDone;
  const report = (written = 0, total: number | null = null) =>
    opts.onProgress?.({ videosDone, videosTotal: plan.videosTotal, fileBytesWritten: written, fileBytesTotal: total });
  report();

  for (const f of plan.toDownload) {
    if (opts.signal?.aborted) {
      await writeManifest(manifest);
      return 'cancelled';
    }
    const target = fileFor(f.fileName);
    target.parentDirectory.create({ intermediates: true, idempotent: true });
    const expected = await headSize(f.url);
    const onProgress = ({ bytesWritten, totalBytes }: { bytesWritten: number; totalBytes: number }) =>
      report(bytesWritten, totalBytes > 0 ? totalBytes : expected);

    let task: DownloadTask;
    let resumed = false;
    if (manifest.paused && manifest.paused.key === f.key && manifest.paused.url === f.url) {
      task = DownloadTask.fromSavable(manifest.paused.state, { onProgress });
      resumed = true;
    } else {
      if (target.exists) target.delete();
      task = File.createDownloadTask(f.url, target, { onProgress });
    }

    const onAbort = () => task.pause();
    opts.signal?.addEventListener('abort', onAbort);
    let result: File | null;
    try {
      result = resumed ? await task.resumeAsync() : await task.downloadAsync();
    } catch {
      opts.signal?.removeEventListener('abort', onAbort);
      manifest.paused = null;
      await writeManifest(manifest);
      return 'failed';
    }
    opts.signal?.removeEventListener('abort', onAbort);

    if (result === null) {
      // Paused by cancel: keep the resume data for next time.
      manifest.paused = { key: f.key, url: f.url, state: task.savable() };
      await writeManifest(manifest);
      return 'cancelled';
    }

    const size = target.exists ? target.size : 0;
    if (size <= 0 || (expected !== null && size !== expected)) {
      if (target.exists) target.delete();
      manifest.paused = null;
      await writeManifest(manifest);
      return 'failed';
    }
    // A video at another quality had another file name: remove the old file.
    const previous = manifest.entries[f.key];
    if (previous && previous.fileName !== f.fileName) {
      const oldFile = fileFor(previous.fileName);
      if (oldFile.exists) oldFile.delete();
    }
    manifest.entries[f.key] = { key: f.key, url: f.url, fileName: f.fileName, bytes: size };
    manifest.paused = null;
    if (f.kind === 'video') videosDone += 1;
    await writeManifest(manifest);
    report();
  }

  // Files the topic no longer uses.
  for (const old of plan.toDelete) {
    const file = fileFor(old.fileName);
    if (file.exists) file.delete();
    delete manifest.entries[old.key];
  }
  manifest.contentVersion = media.contentVersion;
  manifest.quality = quality;
  await writeManifest(manifest);
  return 'done';
}

/** Reads a downloaded caption file. Empty text when it is missing, so the video still plays. */
export async function readLocalText(uri: string): Promise<string> {
  try {
    return await new File(uri).text();
  } catch {
    return '';
  }
}

/** Dev builds only: removes a topic's files and manifest, so the download can be tested again. */
export async function clearTopicMedia(topicCode: string): Promise<void> {
  if (!__DEV__) return;
  const dir = new Directory(mediaRoot(), topicCode);
  if (dir.exists) dir.delete();
  await AsyncStorage.removeItem(manifestKey(topicCode));
}
