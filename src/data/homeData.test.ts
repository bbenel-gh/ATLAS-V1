import { buildHome } from '@/domain/home';

import { toHomeInput } from './homeData';

const materials = {
  code: 'B7-MATERIALS',
  title: 'Diversity of Matter: Materials',
  subject: 'Integrated Science',
  class_level: 'Basic 7',
  prerequisites: [],
  segments: [
    { id: 's1b', code: '1B', title: 'B', sort_order: 2 },
    { id: 'sov', code: 'OV', title: 'Overview', sort_order: 0 },
    { id: 's1a', code: '1A', title: 'A', sort_order: 1 },
  ],
};

describe('toHomeInput', () => {
  it('maps rows to the Home input, with the re-check slot empty until S33', () => {
    const input = toHomeInput({
      name: 'Ama',
      topics: [materials],
      classTopics: [{ set_at: '2026-11-26T10:00:00Z', topics: { code: 'B7-MATERIALS' } }],
      segmentStatus: [{ segment_id: 's1a', status: 'complete' }],
      mastery: [{ status: 'revision', recheck_result: 'miss', missed_segment_ids: ['s1b'], topics: { code: 'B7-MATERIALS' } }],
    });
    expect(input.classTopicCodes).toEqual(['B7-MATERIALS']);
    expect(input.segmentStatus).toEqual({ s1a: 'complete' });
    expect(input.mastery).toEqual([
      { topicCode: 'B7-MATERIALS', status: 'revision', recheckResult: 'miss', missedSegmentIds: ['s1b'] },
    ]);
    expect(input.recheckDue).toBeNull();
    expect(buildHome(input).recommended).toEqual([
      { kind: 'topic', topicCode: 'B7-MATERIALS', title: 'Diversity of Matter: Materials', parts: 2, done: 1 },
      { kind: 'reteach', topicCode: 'B7-MATERIALS', segmentCode: '1B', segmentTitle: 'B', reason: 'recheck' },
    ]);
  });

  it('orders class topics by when they were set and drops rows without a topic', () => {
    const input = toHomeInput({
      name: 'Ama',
      topics: [materials],
      classTopics: [
        { set_at: '2026-11-26T12:00:00Z', topics: { code: 'B7-LATER' } },
        { set_at: '2026-11-26T09:00:00Z', topics: { code: 'B7-MATERIALS' } },
        { set_at: '2026-11-26T10:00:00Z', topics: null },
      ],
      segmentStatus: [],
      mastery: [],
    });
    expect(input.classTopicCodes).toEqual(['B7-MATERIALS', 'B7-LATER']);
  });

  it('treats missing lists from the database as empty', () => {
    const input = toHomeInput({
      name: 'Ama',
      topics: [{ ...materials, prerequisites: null, segments: null }],
      classTopics: [],
      segmentStatus: [],
      mastery: [{ status: 'achieved', recheck_result: null, missed_segment_ids: null, topics: { code: 'B7-MATERIALS' } }],
    });
    expect(input.topics[0]?.prerequisites).toEqual([]);
    expect(input.topics[0]?.segments).toEqual([]);
    expect(input.mastery[0]?.missedSegmentIds).toEqual([]);
  });
});
