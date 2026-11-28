import { cueAt, parseTimestamp, parseVtt } from './vtt';

describe('parseTimestamp', () => {
  it('reads mm:ss.ttt', () => {
    expect(parseTimestamp('01:02.500')).toBe(62.5);
  });

  it('reads hh:mm:ss.ttt', () => {
    expect(parseTimestamp('01:00:03.250')).toBe(3603.25);
  });

  it('accepts a comma before the milliseconds (SRT habit)', () => {
    expect(parseTimestamp('00:00:04,100')).toBeCloseTo(4.1);
  });

  it('returns null for anything else', () => {
    expect(parseTimestamp('1:2')).toBeNull();
    expect(parseTimestamp('00:61.000')).toBeNull();
    expect(parseTimestamp('')).toBeNull();
    expect(parseTimestamp('ab:cd.efg')).toBeNull();
  });
});

describe('parseVtt', () => {
  it('reads a simple file', () => {
    const text = 'WEBVTT\n\n00:00.000 --> 00:02.500\nMaterials are all around us.\n\n00:02.500 --> 00:05.000\nLet us look at some.\n';
    expect(parseVtt(text)).toEqual([
      { start: 0, end: 2.5, text: 'Materials are all around us.' },
      { start: 2.5, end: 5, text: 'Let us look at some.' },
    ]);
  });

  it('joins a multi-line cue with a line break', () => {
    const text = 'WEBVTT\n\n00:00:01.000 --> 00:00:04.000\nWood comes from trees.\nIt is a natural material.\n';
    expect(parseVtt(text)).toEqual([{ start: 1, end: 4, text: 'Wood comes from trees.\nIt is a natural material.' }]);
  });

  it('copes with several empty lines, Windows line endings, a byte order mark and a header line', () => {
    const text = '﻿WEBVTT - Materials overview\r\n\r\n\r\n\r\n00:00.000 --> 00:01.000\r\nOne.\r\n\r\n\r\n00:01.000 --> 00:02.000\r\nTwo.\r\n';
    expect(parseVtt(text).map((c) => c.text)).toEqual(['One.', 'Two.']);
  });

  it('skips cue identifiers, settings after the timing, NOTE and STYLE blocks', () => {
    const text = [
      'WEBVTT',
      '',
      'NOTE This is a comment',
      'over two lines',
      '',
      'STYLE',
      '::cue { color: black }',
      '',
      'intro-1',
      '00:00.000 --> 00:01.500 line:90% align:center',
      'Hello.',
      '',
    ].join('\n');
    expect(parseVtt(text)).toEqual([{ start: 0, end: 1.5, text: 'Hello.' }]);
  });

  it('removes simple tags inside the text', () => {
    const text = 'WEBVTT\n\n00:00.000 --> 00:01.000\n<v Teacher>This is <i>glass</i>.</v>\n';
    expect(parseVtt(text)[0]?.text).toBe('This is glass.');
  });

  it('drops a cue with a bad timing line or no text, and sorts by start', () => {
    const text = [
      'WEBVTT',
      '',
      '00:05.000 --> 00:06.000',
      'Later.',
      '',
      '00:xx.000 --> 00:01.000',
      'Broken.',
      '',
      '00:02.000 --> 00:03.000',
      '',
      '00:00.000 --> 00:01.000',
      'First.',
    ].join('\n');
    expect(parseVtt(text).map((c) => c.text)).toEqual(['First.', 'Later.']);
  });

  it('drops a cue that ends before it starts', () => {
    expect(parseVtt('WEBVTT\n\n00:03.000 --> 00:01.000\nBackwards.\n')).toEqual([]);
  });

  it('returns no cues for an empty file or a file that is not WebVTT', () => {
    expect(parseVtt('')).toEqual([]);
    expect(parseVtt('1\n00:00:00,000 --> 00:00:01,000\nAn SRT file.\n')).toEqual([]);
  });
});

describe('cueAt', () => {
  const cues = parseVtt('WEBVTT\n\n00:00.000 --> 00:02.000\nOne.\n\n00:03.000 --> 00:05.000\nTwo.\n');

  it('finds the cue showing at a time, start included, end excluded', () => {
    expect(cueAt(cues, 0)?.text).toBe('One.');
    expect(cueAt(cues, 1.99)?.text).toBe('One.');
    expect(cueAt(cues, 3)?.text).toBe('Two.');
  });

  it('returns null in a gap, before the first cue and after the last', () => {
    expect(cueAt(cues, 2)).toBeNull();
    expect(cueAt(cues, 2.5)).toBeNull();
    expect(cueAt(cues, 5)).toBeNull();
    expect(cueAt(cues, -1)).toBeNull();
    expect(cueAt([], 1)).toBeNull();
  });
});
