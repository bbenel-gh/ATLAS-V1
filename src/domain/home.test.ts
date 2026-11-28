import {
  buildHome,
  COMING_SOON_SUBJECTS,
  decideOpen,
  missingTopicTitles,
  topicProgress,
  withFakePrerequisite,
  type HomeInput,
  type HomeTopic,
} from './home';

const seg = (id: string, code: string, sortOrder: number) => ({ id, code, title: `Segment ${code}`, sortOrder });

const MATERIALS: HomeTopic = {
  code: 'B7-MATERIALS',
  title: 'Diversity of Matter: Materials',
  subject: 'Integrated Science',
  classLevel: 'Basic 7',
  prerequisites: [],
  segments: [
    seg('s-ov', 'OV', 0),
    seg('s-1a', '1A', 1),
    seg('s-1b', '1B', 2),
    seg('s-1c', '1C', 3),
    seg('s-1d', '1D', 4),
    seg('s-1e', '1E', 5),
  ],
};

// FAKE second topic, only to test ordering and grouping (V1 has one topic).
const LIVING: HomeTopic = {
  code: 'B7-LIVING',
  title: 'Living things',
  subject: 'Integrated Science',
  classLevel: 'Basic 7',
  prerequisites: [],
  segments: [seg('l-ov', 'OV', 0), seg('l-1a', '1A', 1), seg('l-1b', '1B', 2)],
};

function input(over: Partial<HomeInput> = {}): HomeInput {
  return {
    name: 'Ama',
    topics: [MATERIALS],
    classTopicCodes: [],
    segmentStatus: {},
    mastery: [],
    recheckDue: null,
    ...over,
  };
}

describe('topicProgress', () => {
  it('counts parts without the overview', () => {
    expect(topicProgress(MATERIALS, {})).toEqual({ parts: 5, done: 0 });
  });

  it('counts only complete parts as done, not moved on or in progress', () => {
    expect(
      topicProgress(MATERIALS, {
        's-ov': 'complete',
        's-1a': 'complete',
        's-1b': 'complete',
        's-1c': 'moved_on',
        's-1d': 'in_progress',
      }),
    ).toEqual({ parts: 5, done: 2 });
  });
});

describe('buildHome: Recommended for you', () => {
  it('shows the topic the class teacher has set, with its progress', () => {
    const home = buildHome(input({ classTopicCodes: ['B7-MATERIALS'], segmentStatus: { 's-1a': 'complete' } }));
    expect(home.recommended).toEqual([
      { kind: 'topic', topicCode: 'B7-MATERIALS', title: 'Diversity of Matter: Materials', parts: 5, done: 1 },
    ]);
  });

  it('keeps the order the teacher set and skips codes not in the library', () => {
    const home = buildHome(
      input({ topics: [MATERIALS, LIVING], classTopicCodes: ['B7-LIVING', 'B9-NOT-HERE', 'B7-MATERIALS'] }),
    );
    expect(home.recommended.map((r) => r.topicCode)).toEqual(['B7-LIVING', 'B7-MATERIALS']);
  });

  it('lists a set topic once even if set twice', () => {
    const home = buildHome(input({ classTopicCodes: ['B7-MATERIALS', 'B7-MATERIALS'] }));
    expect(home.recommended).toHaveLength(1);
  });

  it('is empty when no topic is set and nothing waits', () => {
    expect(buildHome(input()).recommended).toEqual([]);
  });

  it('adds segments moved on after 3 tries, in lesson order', () => {
    const home = buildHome(input({ segmentStatus: { 's-1c': 'moved_on', 's-1a': 'moved_on', 's-1b': 'complete' } }));
    expect(home.recommended).toEqual([
      { kind: 'reteach', topicCode: 'B7-MATERIALS', segmentCode: '1A', segmentTitle: 'Segment 1A', reason: 'moved_on' },
      { kind: 'reteach', topicCode: 'B7-MATERIALS', segmentCode: '1C', segmentTitle: 'Segment 1C', reason: 'moved_on' },
    ]);
  });

  it('adds segments answered wrongly in a missed re-check', () => {
    const home = buildHome(
      input({
        mastery: [{ topicCode: 'B7-MATERIALS', status: 'revision', recheckResult: 'miss', missedSegmentIds: ['s-1d'] }],
      }),
    );
    expect(home.recommended).toEqual([
      { kind: 'reteach', topicCode: 'B7-MATERIALS', segmentCode: '1D', segmentTitle: 'Segment 1D', reason: 'recheck' },
    ]);
  });

  it('ignores missed segment ids unless the re-check result is a miss', () => {
    const home = buildHome(
      input({
        mastery: [{ topicCode: 'B7-MATERIALS', status: 'confirmed', recheckResult: 'pass', missedSegmentIds: ['s-1d'] }],
      }),
    );
    expect(home.recommended).toEqual([]);
  });

  it('lists a segment once when it is both moved on and missed in the re-check', () => {
    const home = buildHome(
      input({
        segmentStatus: { 's-1b': 'moved_on' },
        mastery: [{ topicCode: 'B7-MATERIALS', status: 'revision', recheckResult: 'miss', missedSegmentIds: ['s-1b'] }],
      }),
    );
    expect(home.recommended).toHaveLength(1);
    expect(home.recommended[0]).toMatchObject({ segmentCode: '1B', reason: 'moved_on' });
  });

  it('never offers the overview as a segment to re-teach', () => {
    const home = buildHome(input({ segmentStatus: { 's-ov': 'moved_on' } }));
    expect(home.recommended).toEqual([]);
  });

  it('ignores segment ids it cannot find in the library', () => {
    const home = buildHome(input({ segmentStatus: { 'gone-id': 'moved_on' } }));
    expect(home.recommended).toEqual([]);
  });

  it('puts a due re-check first (slot that S33 fills)', () => {
    const home = buildHome(
      input({
        classTopicCodes: ['B7-MATERIALS'],
        segmentStatus: { 's-1a': 'moved_on' },
        recheckDue: { topicCode: 'B7-MATERIALS' },
      }),
    );
    expect(home.recommended.map((r) => r.kind)).toEqual(['recheck', 'topic', 'reteach']);
    expect(home.recommended[0]).toEqual({
      kind: 'recheck',
      topicCode: 'B7-MATERIALS',
      title: 'Diversity of Matter: Materials',
    });
  });

  it('drops a due re-check for a topic not in the library', () => {
    expect(buildHome(input({ recheckDue: { topicCode: 'B9-GONE' } })).recommended).toEqual([]);
  });
});

describe('buildHome: Choose a topic', () => {
  it('groups topics by subject, Science first, then Mathematics as coming soon', () => {
    const home = buildHome(input({ topics: [MATERIALS, LIVING] }));
    expect(home.subjects).toEqual([
      {
        name: 'Integrated Science',
        available: true,
        topics: [
          { topicCode: 'B7-MATERIALS', title: 'Diversity of Matter: Materials', parts: 5, done: 0 },
          { topicCode: 'B7-LIVING', title: 'Living things', parts: 2, done: 0 },
        ],
      },
      { name: 'Mathematics', available: false, topics: [] },
    ]);
  });

  it('shows progress on each topic card', () => {
    const home = buildHome(input({ segmentStatus: { 's-1a': 'complete', 's-1e': 'complete' } }));
    expect(home.subjects[0]?.topics[0]).toMatchObject({ parts: 5, done: 2 });
  });

  it('does not list a coming soon subject twice once it has topics', () => {
    const maths: HomeTopic = { ...LIVING, code: 'B7-NUMBERS', subject: 'Mathematics' };
    const home = buildHome(input({ topics: [MATERIALS, maths] }));
    expect(home.subjects.map((s) => [s.name, s.available])).toEqual([
      ['Integrated Science', true],
      ['Mathematics', true],
    ]);
  });

  it('still lists the coming soon subjects with an empty library', () => {
    const home = buildHome(input({ topics: [] }));
    expect(home.subjects).toEqual(COMING_SOON_SUBJECTS.map((name) => ({ name, available: false, topics: [] })));
  });
});

describe('buildHome: name', () => {
  it('passes the name through trimmed', () => {
    expect(buildHome(input({ name: '  Ama  ' })).name).toBe('Ama');
  });
});

describe('withFakePrerequisite (dev switch)', () => {
  it('gives only the chosen topic the fake prerequisite, without changing the input', () => {
    const topics = [MATERIALS, LIVING];
    const out = withFakePrerequisite(topics, 'B7-MATERIALS', 'DEV-FAKE-PREREQ');
    expect(out[0]?.prerequisites).toEqual(['DEV-FAKE-PREREQ']);
    expect(out[1]?.prerequisites).toEqual([]);
    expect(MATERIALS.prerequisites).toEqual([]);
  });

  it('does not add the fake prerequisite twice', () => {
    const once = withFakePrerequisite([MATERIALS], 'B7-MATERIALS', 'DEV-FAKE-PREREQ');
    expect(withFakePrerequisite(once, 'B7-MATERIALS', 'DEV-FAKE-PREREQ')[0]?.prerequisites).toEqual(['DEV-FAKE-PREREQ']);
  });
});

describe('missingTopicTitles', () => {
  it('uses the library title when the missing topic is known', () => {
    expect(missingTopicTitles(['B7-LIVING'], [MATERIALS, LIVING], {})).toEqual([
      { topicCode: 'B7-LIVING', title: 'Living things', inLibrary: true },
    ]);
  });

  it('falls back to a known extra title, then to the code', () => {
    expect(missingTopicTitles(['DEV-FAKE-PREREQ', 'B6-X'], [MATERIALS], { 'DEV-FAKE-PREREQ': 'Matter around us' })).toEqual([
      { topicCode: 'DEV-FAKE-PREREQ', title: 'Matter around us', inLibrary: false },
      { topicCode: 'B6-X', title: 'B6-X', inLibrary: false },
    ]);
  });
});

describe('decideOpen (prerequisite nudge, FAKE data)', () => {
  const fake = withFakePrerequisite([MATERIALS, LIVING], 'B7-MATERIALS', 'DEV-FAKE-PREREQ');
  const titles = { 'DEV-FAKE-PREREQ': 'Matter and its properties (dev test)' };

  it('opens a topic with no prerequisites straight away', () => {
    expect(decideOpen('B7-MATERIALS', { topics: [MATERIALS], mastery: [] })).toEqual({ kind: 'open', topicCode: 'B7-MATERIALS' });
  });

  it('nudges when a prerequisite is missing, and still names the chosen topic to open anyway', () => {
    expect(decideOpen('B7-MATERIALS', { topics: fake, mastery: [] }, titles)).toEqual({
      kind: 'nudge',
      topicCode: 'B7-MATERIALS',
      first: { topicCode: 'DEV-FAKE-PREREQ', title: 'Matter and its properties (dev test)' },
      titles: ['Matter and its properties (dev test)'],
    });
  });

  it('opens once the prerequisite is mastered', () => {
    const mastery = [{ topicCode: 'DEV-FAKE-PREREQ', status: 'achieved' as const, recheckResult: null, missedSegmentIds: [] }];
    expect(decideOpen('B7-MATERIALS', { topics: fake, mastery }, titles)).toEqual({ kind: 'open', topicCode: 'B7-MATERIALS' });
  });

  it('suggests a missing topic that is in the library by its title', () => {
    const needsLiving = withFakePrerequisite([MATERIALS, LIVING], 'B7-MATERIALS', 'B7-LIVING');
    expect(decideOpen('B7-MATERIALS', { topics: needsLiving, mastery: [] })).toMatchObject({
      kind: 'nudge',
      first: { topicCode: 'B7-LIVING', title: 'Living things' },
    });
  });

  it('opens an unknown topic code rather than blocking', () => {
    expect(decideOpen('B9-UNKNOWN', { topics: fake, mastery: [] })).toEqual({ kind: 'open', topicCode: 'B9-UNKNOWN' });
  });
});
