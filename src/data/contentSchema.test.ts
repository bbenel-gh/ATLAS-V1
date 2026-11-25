import draft from '../../content/materials.json';

import { contentSchema, formatContentIssues, validateContent, type Content } from './contentSchema';

/** A fresh copy of the draft file, safe to change in one test. */
const valid = (): Content => structuredClone(draft) as Content;

/** Paths of every error, written the way the checker prints them. */
function errorPaths(data: unknown): string[] {
  const result = validateContent(data);
  return result.ok ? [] : result.errors.map((e) => e.path);
}

function errorFor(data: unknown, path: string): string | undefined {
  const result = validateContent(data);
  return result.ok ? undefined : result.errors.find((e) => e.path === path)?.message;
}

const seg = (c: Content, code: string) => {
  const s = c.segments.find((x) => x.code === code);
  if (!s) throw new Error(`no segment ${code}`);
  return s;
};

describe('the draft content file', () => {
  it('passes the schema', () => {
    const result = validateContent(draft);
    expect(result.ok ? [] : result.errors).toEqual([]);
  });

  it('marks every piece of text as DRAFT', () => {
    const texts: string[] = [];
    const walk = (v: unknown, key: string) => {
      if (typeof v === 'string') {
        const notText = /url/i.test(key) || ['id', 'code', 'label', 'subject', 'level', 'boardColour', 'title', 'exampleWorld'].includes(key)
          || key === 'interestTags' || key === 'misconceptionTags' || key === 'prerequisites' || key === 'misconceptionCode' || key === 'segmentCode';
        if (!notText) texts.push(v);
      } else if (Array.isArray(v)) v.forEach((x) => walk(x, key));
      else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => walk(x, k));
    };
    walk(draft, '');
    expect(texts.length).toBeGreaterThan(100);
    expect(texts.filter((t) => !t.startsWith('DRAFT:'))).toEqual([]);
  });

  it('uses the real segment titles from specs/prd.md section 7.1', () => {
    const c = valid();
    expect(c.segments.map((s) => [s.code, s.title])).toEqual([
      ['1A', 'What a material is'],
      ['1B', 'Properties of materials'],
      ['1C', 'Natural and man-made materials'],
      ['1D', 'Choosing a material for a use'],
      ['1E', 'Caring for and reusing materials'],
    ]);
  });

  it('holds the V1 totals in specs/prd.md section 7.2', () => {
    const c = valid();
    const videos = 1 + c.segments.reduce((n, s) => n + s.versions.length, 0);
    expect(videos).toBe(11);
    expect(c.segments.reduce((n, s) => n + s.checkQuestions.length, 0)).toBe(15);
    expect(c.exam.paperA.objective.length + c.exam.paperB.objective.length).toBe(20);
    expect(c.exam.paperA.theory.length + c.exam.paperB.theory.length).toBe(6);
    expect(c.recheck.length).toBe(3);
  });
});

describe('cross-field rules', () => {
  it('refuses a misconceptionTag that is not in the segment list, and names the path', () => {
    const c = valid();
    seg(c, '1B').versions[0]!.misconceptionTags = ['1B-M9'];
    expect(errorPaths(c)).toEqual(['segments[1].versions[0].misconceptionTags[0]']);
    expect(errorFor(c, 'segments[1].versions[0].misconceptionTags[0]')).toMatch(/1B-M9.*not in the misconception list of segment 1B/);
  });

  it('refuses a misconceptionTag from another segment', () => {
    const c = valid();
    seg(c, '1B').versions[0]!.misconceptionTags = ['1A-M1'];
    expect(errorPaths(c)).toEqual(['segments[1].versions[0].misconceptionTags[0]']);
  });

  it('refuses an overview misconceptionTag that no segment lists', () => {
    const c = valid();
    c.topic.overview.misconceptionTags = ['1C-M9'];
    expect(errorPaths(c)).toEqual(['topic.overview.misconceptionTags[0]']);
  });

  it('refuses a reason option code that is not in the segment list', () => {
    const c = valid();
    const option = seg(c, '1C').checkQuestions[2]!.reasonOptions.find((o) => !o.sound)!;
    option.misconceptionCode = '1C-M7';
    const index = seg(c, '1C').checkQuestions[2]!.reasonOptions.indexOf(option);
    expect(errorPaths(c)).toEqual([`segments[2].checkQuestions[2].reasonOptions[${index}].misconceptionCode`]);
  });

  it('refuses a misconception code that does not start with its segment code', () => {
    const c = valid();
    seg(c, '1D').misconceptions.push({ code: '1A-M5', text: 'DRAFT: wrong segment' });
    expect(errorPaths(c)).toContain('segments[3].misconceptions[2].code');
  });

  it('refuses the same misconception code twice in a segment', () => {
    const c = valid();
    const s = seg(c, '1D');
    s.misconceptions.push({ code: s.misconceptions[0]!.code, text: 'DRAFT: copy' });
    expect(errorPaths(c)).toContain('segments[3].misconceptions[2].code');
  });

  it('refuses a worked example of 120 words and accepts 119', () => {
    const c = valid();
    seg(c, '1A').workedExample.text = `DRAFT: ${Array.from({ length: 119 }, () => 'word').join(' ')}`;
    expect(errorPaths(c)).toEqual(['segments[0].workedExample.text']);
    seg(c, '1A').workedExample.text = `DRAFT: ${Array.from({ length: 118 }, () => 'word').join(' ')}`;
    expect(errorPaths(c)).toEqual([]);
  });

  it('refuses an exclamation mark in any text, wherever it is', () => {
    const c = valid();
    c.exam.paperB.theory[1]!.schemePoints[0]!.point = 'DRAFT: great point!';
    seg(c, '1E').misconceptions[0]!.text = 'DRAFT: oh!';
    expect(errorPaths(c).sort()).toEqual(['exam.paperB.theory[1].schemePoints[0].point', 'segments[4].misconceptions[0].text']);
  });

  it('refuses an em dash in any text', () => {
    const c = valid();
    const emDash = String.fromCharCode(0x2014);
    c.topic.title = `Materials ${emDash} draft`;
    c.recheck[0]!.question = `DRAFT: a ${emDash} b`;
    expect(errorPaths(c).sort()).toEqual(['recheck[0].question', 'topic.title']);
  });

  it('refuses an interest tag outside the allowed list', () => {
    const c = valid();
    seg(c, '1A').versions[1]!.interestTags = ['football', 'dancing' as 'music'];
    expect(errorPaths(c)).toEqual(['segments[0].versions[1].interestTags[1]']);
  });

  it('accepts "phones and computers" as one interest tag', () => {
    const c = valid();
    seg(c, '1A').versions[1]!.interestTags = ['phones and computers'];
    expect(errorPaths(c)).toEqual([]);
  });

  it('needs exactly one sound reason option', () => {
    const c = valid();
    for (const o of seg(c, '1B').checkQuestions[0]!.reasonOptions) o.sound = false;
    expect(errorPaths(c)).toContain('segments[1].checkQuestions[0].reasonOptions');
  });

  it('needs a misconception code on each unsound reason, and none on the sound one', () => {
    const c = valid();
    const options = seg(c, '1B').checkQuestions[1]!.reasonOptions;
    const sound = options.findIndex((o) => o.sound);
    const unsound = options.findIndex((o) => !o.sound);
    options[sound]!.misconceptionCode = '1B-M1';
    delete options[unsound]!.misconceptionCode;
    expect(errorPaths(c).sort()).toEqual([
      `segments[1].checkQuestions[1].reasonOptions[${sound}].misconceptionCode`,
      `segments[1].checkQuestions[1].reasonOptions[${unsound}].misconceptionCode`,
    ].sort());
  });

  it('needs exactly one tap option to be an accepted answer', () => {
    const c = valid();
    const q = seg(c, '1C').checkQuestions[0]!;
    q.tapOptions = ['DRAFT: one', 'DRAFT: two', 'DRAFT: three'];
    expect(errorPaths(c)).toEqual(['segments[2].checkQuestions[0].tapOptions']);
    q.tapOptions = [q.acceptedAnswers[0]!, q.acceptedAnswers[0]!.toUpperCase(), 'DRAFT: three'];
    expect(errorPaths(c)).toContain('segments[2].checkQuestions[0].tapOptions');
  });

  it('needs versions labelled a, b and so on, with no gaps or repeats', () => {
    const c = valid();
    seg(c, '1D').versions[1]!.label = 'a';
    expect(errorPaths(c)).toEqual(['segments[3].versions[1].label']);
  });

  it('needs the segments 1A to 1E, in order', () => {
    const c = valid();
    [c.segments[0], c.segments[1]] = [c.segments[1]!, c.segments[0]!];
    expect(errorPaths(c)).toEqual(expect.arrayContaining(['segments[0].code', 'segments[1].code']));
  });

  it('needs every re-check item to name a real segment', () => {
    const c = valid();
    c.recheck[2]!.segmentCode = '1F' as '1A';
    expect(errorPaths(c)).toContain('recheck[2].segmentCode');
  });

  it('needs the scheme points of a theory item to cover its marks', () => {
    const c = valid();
    const item = c.exam.paperA.theory[0]!;
    item.marks = item.schemePoints.reduce((n, p) => n + p.marks, 0) + 1;
    expect(errorPaths(c)).toEqual(['exam.paperA.theory[0].schemePoints']);
  });

  it('needs exactly one accepted answer among the tap options of a re-check item', () => {
    const c = valid();
    c.recheck[1]!.tapOptions = ['DRAFT: one', 'DRAFT: two', 'DRAFT: three'];
    expect(errorPaths(c)).toEqual(['recheck[1].tapOptions']);
  });

  it('refuses a prerequisite that is the topic itself', () => {
    const c = valid();
    c.topic.prerequisites = [c.topic.id];
    expect(errorPaths(c)).toEqual(['topic.prerequisites[0]']);
  });
});

describe('shape rules', () => {
  it.each([
    ['a video over 180 seconds', (c: Content) => { seg(c, '1A').versions[0]!.durationSeconds = 181; }, 'segments[0].versions[0].durationSeconds'],
    ['a board colour that is not hex', (c: Content) => { seg(c, '1A').versions[0]!.boardColour = 'cream'; }, 'segments[0].versions[0].boardColour'],
    ['a video URL that is not https', (c: Content) => { seg(c, '1A').versions[0]!.url360 = 'http://media.example/x'; }, 'segments[0].versions[0].url360'],
    ['2 tap options', (c: Content) => { seg(c, '1A').checkQuestions[0]!.tapOptions.pop(); }, 'segments[0].checkQuestions[0].tapOptions'],
    ['2 check questions', (c: Content) => { seg(c, '1A').checkQuestions.pop(); }, 'segments[0].checkQuestions'],
    ['1 video version', (c: Content) => { seg(c, '1A').versions.pop(); }, 'segments[0].versions'],
    ['9 objective items', (c: Content) => { c.exam.paperA.objective.pop(); }, 'exam.paperA.objective'],
    ['3 options on an objective item', (c: Content) => { c.exam.paperA.objective[0]!.options.pop(); }, 'exam.paperA.objective[0].options'],
    ['a correctIndex of 4', (c: Content) => { c.exam.paperB.objective[3]!.correctIndex = 4; }, 'exam.paperB.objective[3].correctIndex'],
    ['4 theory items', (c: Content) => { c.exam.paperB.theory.push(structuredClone(c.exam.paperB.theory[0]!)); }, 'exam.paperB.theory'],
    ['2 re-check items', (c: Content) => { c.recheck.pop(); }, 'recheck'],
    ['an unknown field (a typo)', (c: Content) => { (seg(c, '1A') as Record<string, unknown>).titel = 'x'; }, 'segments[0]'],
  ])('refuses %s', (_label, change, path) => {
    const c = valid();
    change(c);
    expect(errorPaths(c)).toContain(path);
  });
});

describe('formatContentIssues', () => {
  it('writes each error as a JSON path and a plain-English sentence', () => {
    const c = valid();
    seg(c, '1A').versions[0]!.durationSeconds = 200;
    seg(c, '1A').checkQuestions[0]!.tapOptions.pop();
    delete (seg(c, '1B') as Partial<Content['segments'][number]>).objective;
    const result = contentSchema.safeParse(c);
    expect(result.success).toBe(false);
    if (result.success) return;
    const errors = formatContentIssues(result.error.issues, c);
    expect(errors).toEqual(expect.arrayContaining([
      { path: 'segments[0].versions[0].durationSeconds', message: 'must be 180 or less (it is 200)' },
      { path: 'segments[0].checkQuestions[0].tapOptions', message: 'must have exactly 3 items (it has 2)' },
      { path: 'segments[1].objective', message: 'is missing. It must be text' },
    ]));
  });
});
