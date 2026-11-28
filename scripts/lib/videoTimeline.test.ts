import { cueAt, parseVtt } from '../../src/domain/vtt';
import {
  buildTimeline,
  captionCues,
  splitSentences,
  toUnits,
  toVtt,
  wrapCaption,
  writeProgress,
  type VideoScript,
  type Word,
} from './videoTimeline';

const SCRIPT: VideoScript = {
  pages: [
    [
      { board: 'Materials', say: 'This topic is about materials.' },
      { board: 'cup: clay', say: 'Look at a cup. It may be made of clay.' },
    ],
    [{ board: "Let's begin", say: "Take your time. Let's begin." }],
  ],
};

// Units: 0 "This topic is about materials." 1 "Look at a cup." 2 "It may be made of clay."
//        3 "Take your time." 4 "Let's begin."
const w = (unit: number, start: number, text = 'word'): Word => ({ line: unit, text, start, chars: text.length });
const WORDS: Word[] = [
  w(0, 0.2),
  w(0, 1.0),
  w(1, 3.0),
  w(1, 3.4),
  w(2, 4.5),
  w(2, 5.0),
  w(3, 7.0),
  w(3, 7.4),
  w(4, 8.5),
  w(4, 9.0),
];

describe('splitSentences', () => {
  it('splits after a full stop or question mark followed by a space', () => {
    expect(splitSentences('Is it hard? Does it bend? Yes.')).toEqual(['Is it hard?', 'Does it bend?', 'Yes.']);
  });

  it('keeps a single sentence whole and trims spaces', () => {
    expect(splitSentences('  A door may be made of wood.  ')).toEqual(['A door may be made of wood.']);
  });
});

describe('toUnits', () => {
  it('lists every sentence with the board line it belongs to, page by page', () => {
    expect(toUnits(SCRIPT)).toEqual([
      { lineIndex: 0, text: 'This topic is about materials.' },
      { lineIndex: 1, text: 'Look at a cup.' },
      { lineIndex: 1, text: 'It may be made of clay.' },
      { lineIndex: 2, text: 'Take your time.' },
      { lineIndex: 2, text: "Let's begin." },
    ]);
  });
});

describe('buildTimeline', () => {
  const t = buildTimeline(SCRIPT, WORDS, 10);

  it('starts each board line with its first spoken word and ends it at the next line', () => {
    expect(t.lines.map((l) => [l.page, l.start, l.end])).toEqual([
      [0, 0.2, 3.0],
      [0, 3.0, 7.0],
      [1, 7.0, 10],
    ]);
  });

  it('writes each line inside its spoken time, never for less than 0.8 seconds', () => {
    for (const l of t.lines) {
      expect(l.writeStart).toBe(l.start);
      expect(l.writeEnd).toBeGreaterThanOrEqual(l.writeStart + 0.8);
      expect(l.writeEnd).toBeLessThanOrEqual(l.end);
    }
  });

  it('turns to a fresh page just before its first line, and holds the last frame after the voice ends', () => {
    expect(t.pages).toEqual([{ start: 0 }, { start: 6.4 }]);
    expect(t.duration).toBe(12);
  });

  it('refuses a sentence the voice gave no word timings for', () => {
    expect(() => buildTimeline(SCRIPT, WORDS.filter((x) => x.line !== 3), 10)).toThrow(/sentence 4/);
  });
});

describe('writeProgress', () => {
  const line = { writeStart: 2, writeEnd: 4 };
  it('is 0 before, 1 after, and grows in between', () => {
    expect(writeProgress(line, 1)).toBe(0);
    expect(writeProgress(line, 3)).toBe(0.5);
    expect(writeProgress(line, 5)).toBe(1);
  });
});

describe('captionCues and toVtt', () => {
  const cues = captionCues(SCRIPT, WORDS, 10);

  it('gives one cue per sentence, word for word with the narration', () => {
    expect(cues.map((c) => c.text)).toEqual(toUnits(SCRIPT).map((u) => u.text));
    expect(cues.map((c) => [c.start, c.end])).toEqual([
      [0.2, 3.0],
      [3.0, 4.5],
      [4.5, 7.0],
      [7.0, 8.5],
      [8.5, 10],
    ]);
  });

  it('writes WebVTT that the app reads back with the right cue at each moment', () => {
    const parsed = parseVtt(toVtt(cues));
    expect(parsed).toHaveLength(5);
    expect(cueAt(parsed, 0.1)).toBeNull();
    expect(cueAt(parsed, 3.2)?.text).toBe('Look at a cup.');
    expect(cueAt(parsed, 9.9)?.text).toBe("Let's begin.");
  });
});

describe('wrapCaption', () => {
  it('keeps short captions on one line', () => {
    expect(wrapCaption('Take your time.')).toBe('Take your time.');
  });

  it('breaks a long caption into at most two balanced lines of 42 characters or fewer', () => {
    const text = 'Then you will sort materials into those from nature and those people make.';
    const lines = wrapCaption(text).split('\n');
    expect(lines.length).toBeLessThanOrEqual(2);
    for (const l of lines) expect(l.length).toBeLessThanOrEqual(42);
    expect(lines.join(' ')).toBe(text);
  });
});
