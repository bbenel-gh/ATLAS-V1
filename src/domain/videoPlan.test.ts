import {
  estimateBytes,
  filesForTopic,
  formatMegabytes,
  planDownload,
  shouldPlay,
  visibleFraction,
  type ManifestEntry,
  type TopicMedia,
} from './videoPlan';

const v = (id: string, segmentCode: string, label: string, extra: Partial<TopicMedia['versions'][number]> = {}) => ({
  id,
  segmentCode,
  label,
  url360: `https://media.test/${segmentCode}-${label}-360.mp4`,
  url480: `https://media.test/${segmentCode}-${label}-480.mp4`,
  posterUrl: `https://media.test/${segmentCode}-${label}.jpg`,
  captionsUrl: `https://media.test/${segmentCode}-${label}.vtt`,
  boardColour: '#F6F0E6',
  durationSeconds: 120,
  ...extra,
});

const MEDIA: TopicMedia = {
  topicCode: 'B7-MATERIALS',
  contentVersion: '2026-11-26-abcdef01',
  versions: [v('id-ov', 'OV', 'a'), v('id-1a', '1A', 'a'), v('id-1b', '1A', 'b', { posterUrl: null, captionsUrl: null })],
};

describe('filesForTopic', () => {
  it('lists every video at 360p by default, with its poster and captions', () => {
    const files = filesForTopic(MEDIA);
    expect(files.map((f) => f.key)).toEqual([
      'id-ov:video',
      'id-ov:poster',
      'id-ov:captions',
      'id-1a:video',
      'id-1a:poster',
      'id-1a:captions',
      'id-1b:video',
    ]);
    expect(files[0]).toEqual({
      key: 'id-ov:video',
      versionId: 'id-ov',
      kind: 'video',
      url: 'https://media.test/OV-a-360.mp4',
      fileName: 'B7-MATERIALS/OV-a-360.mp4',
    });
    expect(files[1]?.fileName).toBe('B7-MATERIALS/OV-a.jpg');
    expect(files[2]?.fileName).toBe('B7-MATERIALS/OV-a.vtt');
  });

  it('uses the 480p link when asked', () => {
    const files = filesForTopic(MEDIA, '480');
    expect(files[0]?.url).toBe('https://media.test/OV-a-480.mp4');
    expect(files[0]?.fileName).toBe('B7-MATERIALS/OV-a-480.mp4');
  });
});

describe('planDownload', () => {
  const done = (key: string, url: string, bytes = 1000): ManifestEntry => ({ key, url, fileName: `x/${key}`, bytes });

  it('downloads everything when nothing is on the phone', () => {
    const plan = planDownload(filesForTopic(MEDIA), {});
    expect(plan.toDownload).toHaveLength(7);
    expect(plan.toDelete).toEqual([]);
    expect(plan.videosTotal).toBe(3);
  });

  it('downloads only what changed after a content update', () => {
    const files = filesForTopic(MEDIA);
    const manifest: Record<string, ManifestEntry> = {};
    for (const f of files) manifest[f.key] = done(f.key, f.url);
    manifest['id-1a:video'] = done('id-1a:video', 'https://media.test/old-1A-a-360.mp4');
    const plan = planDownload(files, manifest);
    expect(plan.toDownload.map((f) => f.key)).toEqual(['id-1a:video']);
    expect(plan.videosDone).toBe(2);
  });

  it('deletes files the topic no longer uses', () => {
    const files = filesForTopic(MEDIA);
    const manifest: Record<string, ManifestEntry> = { 'gone:video': done('gone:video', 'https://media.test/gone.mp4') };
    for (const f of files) manifest[f.key] = done(f.key, f.url);
    const plan = planDownload(files, manifest);
    expect(plan.toDownload).toEqual([]);
    expect(plan.toDelete.map((e) => e.key)).toEqual(['gone:video']);
    expect(plan.ready).toBe(true);
  });

  it('is not ready while any file is missing', () => {
    expect(planDownload(filesForTopic(MEDIA), {}).ready).toBe(false);
  });
});

describe('estimateBytes and formatMegabytes', () => {
  it('estimates about 500 kbps of video plus a little for poster and captions', () => {
    expect(estimateBytes(120)).toBe(Math.round((120 * 500_000) / 8));
  });

  it('shows whole megabytes, at least 1', () => {
    expect(formatMegabytes(7_600_000)).toBe('8');
    expect(formatMegabytes(10_000)).toBe('1');
    expect(formatMegabytes(0)).toBe('0');
  });
});

describe('visibleFraction', () => {
  // A board 200 tall at y 100 inside the scroll content. The screen shows 600.
  it('is 1 when the whole board is on screen', () => {
    expect(visibleFraction({ top: 100, height: 200 }, { scrollY: 0, viewportHeight: 600 })).toBe(1);
  });

  it('is 0.5 when half the board has scrolled off the top', () => {
    expect(visibleFraction({ top: 100, height: 200 }, { scrollY: 200, viewportHeight: 600 })).toBe(0.5);
  });

  it('is 0 when the board is fully off screen, above or below', () => {
    expect(visibleFraction({ top: 100, height: 200 }, { scrollY: 400, viewportHeight: 600 })).toBe(0);
    expect(visibleFraction({ top: 900, height: 200 }, { scrollY: 0, viewportHeight: 600 })).toBe(0);
  });

  it('is 0 for a board with no height yet', () => {
    expect(visibleFraction({ top: 0, height: 0 }, { scrollY: 0, viewportHeight: 600 })).toBe(0);
  });
});

describe('shouldPlay (P4 to P8)', () => {
  const base = { ready: true, ended: false, userPaused: false, appActive: true, visible: 1 };

  it('plays when ready, on screen, in the foreground and not paused by the pupil', () => {
    expect(shouldPlay(base)).toBe(true);
  });

  it('pauses when the pupil paused it', () => {
    expect(shouldPlay({ ...base, userPaused: true })).toBe(false);
  });

  it('pauses when the app is in the background', () => {
    expect(shouldPlay({ ...base, appActive: false })).toBe(false);
  });

  it('pauses when less than half the board is on screen, plays at exactly half', () => {
    expect(shouldPlay({ ...base, visible: 0.49 })).toBe(false);
    expect(shouldPlay({ ...base, visible: 0.5 })).toBe(true);
  });

  it('does not play before the file is ready, or after the end', () => {
    expect(shouldPlay({ ...base, ready: false })).toBe(false);
    expect(shouldPlay({ ...base, ended: true })).toBe(false);
  });
});
