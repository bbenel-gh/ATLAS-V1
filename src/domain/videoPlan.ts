/**
 * Pure rules for topic downloads and the board player (runbook S16,
 * specs/video-board.md, specs/prd.md section 11). No React, no file system.
 * src/data/videoCache.ts and src/components/board/ do the work.
 */

/** Video heights the player takes, lowest first. 360p and 480p are always made; 720p and 1080p are optional (D-46). */
export const QUALITIES = ['360', '480', '720', '1080'] as const;
export type Quality = (typeof QUALITIES)[number];

/** A stored or typed quality, made safe. Anything unknown is 360p, the data-saving default. */
export function toQuality(value: unknown): Quality {
  return (QUALITIES as readonly unknown[]).includes(value) ? (value as Quality) : '360';
}

export type VideoVersionMedia = {
  id: string;
  segmentCode: string;
  label: string;
  url360: string;
  url480: string;
  url720?: string | null;
  url1080?: string | null;
  posterUrl: string | null;
  captionsUrl: string | null;
  boardColour: string;
  durationSeconds: number;
};

export type TopicMedia = {
  topicCode: string;
  contentVersion: string | null;
  versions: VideoVersionMedia[];
  /** For the board header (P10). Optional so tests and old manifests need not carry them. */
  title?: string;
  subject?: string;
  classLevel?: string;
};

export type FileKind = 'video' | 'poster' | 'captions';

/** One file to have on the phone. `fileName` is relative to the app's media folder. */
export type MediaFile = { key: string; versionId: string; kind: FileKind; url: string; fileName: string };

/** One file already on the phone, as recorded in the manifest. */
export type ManifestEntry = { key: string; url: string; fileName: string; bytes: number };

/**
 * The video link for a quality: the asked one if the version has it, else the
 * best lower one. 360p always exists, so there is always a link.
 */
export function pickVideo(v: VideoVersionMedia, quality: Quality): { quality: Quality; url: string } {
  const links: Record<Quality, string | null | undefined> = { '360': v.url360, '480': v.url480, '720': v.url720, '1080': v.url1080 };
  for (let i = QUALITIES.indexOf(quality); i >= 0; i -= 1) {
    const q = QUALITIES[i] as Quality;
    const url = links[q];
    if (url) return { quality: q, url };
  }
  return { quality: '360', url: v.url360 };
}

/** Every file a topic needs: each version's video, then its poster and captions when it has them. */
export function filesForTopic(media: TopicMedia, quality: Quality = '360'): MediaFile[] {
  const files: MediaFile[] = [];
  for (const v of media.versions) {
    const base = `${media.topicCode}/${v.segmentCode}-${v.label}`;
    const video = pickVideo(v, quality);
    files.push({ key: `${v.id}:video`, versionId: v.id, kind: 'video', url: video.url, fileName: `${base}-${video.quality}.mp4` });
    if (v.posterUrl) files.push({ key: `${v.id}:poster`, versionId: v.id, kind: 'poster', url: v.posterUrl, fileName: `${base}.jpg` });
    if (v.captionsUrl) {
      files.push({ key: `${v.id}:captions`, versionId: v.id, kind: 'captions', url: v.captionsUrl, fileName: `${base}.vtt` });
    }
  }
  return files;
}

export type DownloadPlan = {
  /** Files missing on the phone, or whose link changed. In the order they should download. */
  toDownload: MediaFile[];
  /** Files on the phone the topic no longer uses. */
  toDelete: ManifestEntry[];
  videosTotal: number;
  videosDone: number;
  ready: boolean;
};

/**
 * Compares what the topic needs with the manifest. A file whose link is the
 * same is kept, so a content change downloads only what changed.
 */
export function planDownload(files: readonly MediaFile[], manifest: Readonly<Record<string, ManifestEntry>>): DownloadPlan {
  const needed = new Set(files.map((f) => f.key));
  const toDownload = files.filter((f) => manifest[f.key]?.url !== f.url);
  const toDelete = Object.values(manifest).filter((e) => !needed.has(e.key));
  const videos = files.filter((f) => f.kind === 'video');
  const videosDone = videos.filter((f) => manifest[f.key]?.url === f.url).length;
  return { toDownload, toDelete, videosTotal: videos.length, videosDone, ready: toDownload.length === 0 };
}

/** About 500 kbps (specs/video-board.md section 2), used when the server does not say the size. */
export function estimateBytes(durationSeconds: number, kbps = 500): number {
  return Math.round((durationSeconds * kbps * 1000) / 8);
}

/** Whole megabytes for "This topic needs <size> MB". Never shows 0 for a real file. */
export function formatMegabytes(bytes: number): string {
  if (bytes <= 0) return '0';
  return String(Math.max(1, Math.round(bytes / 1_000_000)));
}

/** How much of the board is on screen, 0 to 1 (P6). `top` is the board's y inside the scroll content. */
export function visibleFraction(
  board: { top: number; height: number },
  view: { scrollY: number; viewportHeight: number },
): number {
  if (board.height <= 0) return 0;
  const top = Math.max(board.top, view.scrollY);
  const bottom = Math.min(board.top + board.height, view.scrollY + view.viewportHeight);
  return Math.max(0, Math.min(1, (bottom - top) / board.height));
}

/**
 * Whether the board video should be playing (P4, P5, P6, P8). The pupil's own
 * pause always wins; leaving the screen or the app pauses without counting as
 * the pupil's pause, so coming back resumes.
 */
export function shouldPlay(s: { ready: boolean; ended: boolean; userPaused: boolean; appActive: boolean; visible: number }): boolean {
  return s.ready && !s.ended && !s.userPaused && s.appActive && s.visible >= 0.5;
}

/**
 * A byte count from the phone as a plain number. Android sends download
 * progress and file sizes as BigInt although the types say number; mixing
 * BigInt with number throws, and a BigInt never equals a number.
 */
export function toByteCount(value: unknown): number {
  const n = typeof value === 'bigint' ? Number(value) : typeof value === 'number' ? value : Number.NaN;
  return Number.isFinite(n) ? n : 0;
}
