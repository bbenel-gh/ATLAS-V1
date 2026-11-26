import { toTopicMedia } from './topicMedia';

jest.mock('./supabase', () => ({ supabase: {} }));
jest.mock('./pupilAuth', () => ({ OfflineError: class extends Error {}, withTimeout: jest.fn() }));
jest.mock('./videoCache', () => ({ readManifest: jest.fn() }));


const version = (id: string, label: string) => ({
  id,
  label,
  url_360: `https://m.test/${id}-360.mp4`,
  url_480: `https://m.test/${id}-480.mp4`,
  url_720: null,
  url_1080: null,
  poster_url: null,
  captions_url: `https://m.test/${id}.vtt`,
  board_colour: '#F6F0E6',
  duration_seconds: 90,
});

describe('toTopicMedia', () => {
  it('puts the overview first, then lesson order, then version a before b', () => {
    const media = toTopicMedia({
      code: 'B7-MATERIALS',
      content_version: '2026-11-26-abcdef01',
      segments: [
        { code: '1A', sort_order: 1, video_versions: [version('1a-b', 'b'), version('1a-a', 'a')] },
        { code: 'OV', sort_order: 0, video_versions: [version('ov-a', 'a')] },
        { code: '1B', sort_order: 2, video_versions: null },
      ],
    });
    expect(media.versions.map((v) => `${v.segmentCode}-${v.label}`)).toEqual(['OV-a', '1A-a', '1A-b']);
    expect(media.versions[0]).toEqual({
      id: 'ov-a',
      segmentCode: 'OV',
      label: 'a',
      url360: 'https://m.test/ov-a-360.mp4',
      url480: 'https://m.test/ov-a-480.mp4',
      url720: null,
      url1080: null,
      posterUrl: null,
      captionsUrl: 'https://m.test/ov-a.vtt',
      boardColour: '#F6F0E6',
      durationSeconds: 90,
    });
    expect(media.contentVersion).toBe('2026-11-26-abcdef01');
  });

  it('copes with a topic that has no segments yet', () => {
    expect(toTopicMedia({ code: 'X1', content_version: null, segments: null }).versions).toEqual([]);
  });
});
