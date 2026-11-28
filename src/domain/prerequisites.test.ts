import { checkPrerequisites, isTopicDone, topicsDone } from './prerequisites';

/**
 * FAKE prerequisite data (runbook S15 item 5). V1 has one topic, Materials,
 * with no prerequisites, so every case here uses invented topic codes.
 */
const FAKE = {
  materials: { code: 'B7-MATERIALS', prerequisites: ['B6-MATTER'] },
  mixtures: { code: 'B7-MIXTURES', prerequisites: ['B6-MATTER', 'B7-MATERIALS'] },
  none: { code: 'B7-LIVING', prerequisites: [] as string[] },
};

describe('checkPrerequisites', () => {
  it('is ok when the topic has no prerequisites', () => {
    expect(checkPrerequisites([], FAKE.none.prerequisites)).toEqual({ ok: true });
  });

  it('is ok when every prerequisite is done', () => {
    expect(checkPrerequisites(['B6-MATTER', 'B7-MATERIALS'], FAKE.mixtures.prerequisites)).toEqual({ ok: true });
  });

  it('lists the one missing prerequisite', () => {
    expect(checkPrerequisites([], FAKE.materials.prerequisites)).toEqual({ ok: false, missing: ['B6-MATTER'] });
  });

  it('lists only the missing ones, in the order the topic gives them', () => {
    expect(checkPrerequisites(['B6-MATTER'], FAKE.mixtures.prerequisites)).toEqual({
      ok: false,
      missing: ['B7-MATERIALS'],
    });
    expect(checkPrerequisites([], FAKE.mixtures.prerequisites)).toEqual({
      ok: false,
      missing: ['B6-MATTER', 'B7-MATERIALS'],
    });
  });

  it('ignores topics done that the topic does not need', () => {
    expect(checkPrerequisites(['B7-LIVING', 'B8-ENERGY'], FAKE.materials.prerequisites)).toEqual({
      ok: false,
      missing: ['B6-MATTER'],
    });
  });

  it('lists a repeated prerequisite once', () => {
    expect(checkPrerequisites([], ['B6-MATTER', 'B6-MATTER'])).toEqual({ ok: false, missing: ['B6-MATTER'] });
  });

  it('never lists the topic as its own prerequisite', () => {
    expect(checkPrerequisites([], ['B7-MATERIALS'], 'B7-MATERIALS')).toEqual({ ok: true });
  });

  it('does not change its inputs', () => {
    const done = ['B6-MATTER'];
    const prereqs = ['B6-MATTER', 'B7-MATERIALS'];
    checkPrerequisites(done, prereqs);
    expect(done).toEqual(['B6-MATTER']);
    expect(prereqs).toEqual(['B6-MATTER', 'B7-MATERIALS']);
  });
});

describe('isTopicDone', () => {
  it('counts achieved and confirmed mastery as done', () => {
    expect(isTopicDone('achieved')).toBe(true);
    expect(isTopicDone('confirmed')).toBe(true);
  });

  it('does not count revision or no mastery row', () => {
    expect(isTopicDone('revision')).toBe(false);
    expect(isTopicDone(null)).toBe(false);
  });
});

describe('topicsDone', () => {
  it('returns the codes of topics with achieved or confirmed mastery', () => {
    expect(
      topicsDone([
        { topicCode: 'B6-MATTER', status: 'confirmed' },
        { topicCode: 'B7-MATERIALS', status: 'revision' },
        { topicCode: 'B7-LIVING', status: 'achieved' },
      ]),
    ).toEqual(['B6-MATTER', 'B7-LIVING']);
  });

  it('is empty with no mastery rows', () => {
    expect(topicsDone([])).toEqual([]);
  });

  it('feeds checkPrerequisites: a nudge until the fake prerequisite is mastered', () => {
    const before = topicsDone([{ topicCode: 'B6-MATTER', status: 'revision' }]);
    expect(checkPrerequisites(before, FAKE.materials.prerequisites)).toEqual({ ok: false, missing: ['B6-MATTER'] });
    const after = topicsDone([{ topicCode: 'B6-MATTER', status: 'achieved' }]);
    expect(checkPrerequisites(after, FAKE.materials.prerequisites)).toEqual({ ok: true });
  });
});
