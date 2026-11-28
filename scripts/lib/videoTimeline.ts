/**
 * Timing for the board video generator (D-47, specs/video-board.md section 2).
 * Pure: no files, no canvas, no ffmpeg. The voice gives word start times; this
 * works out when each board line is written, when the board turns to a fresh
 * page, and the caption cues (one per spoken sentence, word for word).
 */

export type ScriptLine = { board: string; say: string };
export type VideoScript = { pages: ScriptLine[][] };
/** A spoken word: `line` is the index of the sentence (unit) it belongs to. */
export type Word = { line: number; text: string; start: number; chars: number };
export type Unit = { lineIndex: number; text: string };

export type TimedLine = {
  page: number;
  board: string;
  say: string;
  start: number;
  end: number;
  writeStart: number;
  writeEnd: number;
};
export type Timeline = { lines: TimedLine[]; pages: { start: number }[]; duration: number };
export type Cue = { start: number; end: number; text: string };

/** Seconds a page turn starts before the page's first spoken word. */
const PAGE_TURN = 0.6;
/** Seconds the finished board holds after the voice ends (P8: the last frame stays). */
const TAIL = 2;
const WRITE_SECONDS_PER_CHAR = 0.11;
const MIN_WRITE = 0.8;

const round = (n: number) => Math.round(n * 1000) / 1000;

export function splitSentences(text: string): string[] {
  return text
    .trim()
    .split(/(?<=[.?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Every spoken sentence in order, with the index of its board line (counted across pages). */
export function toUnits(script: VideoScript): Unit[] {
  return script.pages.flat().flatMap((line, lineIndex) => splitSentences(line.say).map((text) => ({ lineIndex, text })));
}

function unitStarts(script: VideoScript, words: Word[]): number[] {
  return toUnits(script).map((_, i) => {
    const first = words.filter((w) => w.line === i).sort((a, b) => a.start - b.start)[0];
    if (!first) throw new Error(`The voice gave no word timings for sentence ${i + 1}. Check the narration text.`);
    return first.start;
  });
}

export function buildTimeline(script: VideoScript, words: Word[], audioSeconds: number): Timeline {
  const units = toUnits(script);
  const starts = unitStarts(script, words);
  const flat = script.pages.flatMap((page, p) => page.map((line) => ({ ...line, page: p })));
  const lineStart = flat.map((_, i) => starts[units.findIndex((u) => u.lineIndex === i)] ?? 0);

  const lines = flat.map((l, i): TimedLine => {
    const start = lineStart[i] ?? 0;
    const end = lineStart[i + 1] ?? audioSeconds;
    const span = end - start;
    const write = Math.min(Math.max(l.board.length * WRITE_SECONDS_PER_CHAR, MIN_WRITE), Math.max(span * 0.9, MIN_WRITE));
    return {
      page: l.page,
      board: l.board,
      say: l.say,
      start,
      end,
      writeStart: start,
      writeEnd: round(Math.min(start + write, end)),
    };
  });

  const pages = script.pages.map((_, p) => {
    const first = lines.find((l) => l.page === p);
    return { start: p === 0 ? 0 : round(Math.max(0, (first?.start ?? 0) - PAGE_TURN)) };
  });
  return { lines, pages, duration: round(audioSeconds + TAIL) };
}

/** 0 before the line is written, 1 once it is finished. */
export function writeProgress(line: { writeStart: number; writeEnd: number }, t: number): number {
  if (t <= line.writeStart) return 0;
  if (t >= line.writeEnd) return 1;
  return (t - line.writeStart) / (line.writeEnd - line.writeStart);
}

/** One cue per spoken sentence. A cue stays until the next sentence starts. */
export function captionCues(script: VideoScript, words: Word[], audioSeconds: number): Cue[] {
  const units = toUnits(script);
  const starts = unitStarts(script, words);
  return units.map((u, i) => ({ start: starts[i] ?? 0, end: starts[i + 1] ?? audioSeconds, text: u.text }));
}

/** At most two balanced lines of `max` characters when the text allows it. */
export function wrapCaption(text: string, max = 42): string {
  if (text.length <= max) return text;
  const words = text.split(' ');
  let best: string | null = null;
  let bestGap = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ');
    const b = words.slice(i).join(' ');
    if (a.length > max || b.length > max) continue;
    const gap = Math.abs(a.length - b.length);
    if (gap < bestGap) {
      bestGap = gap;
      best = `${a}\n${b}`;
    }
  }
  return best ?? text;
}

function stamp(seconds: number): string {
  const ms = Math.round(seconds * 1000);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(ms % 1000, 3)}`;
}

export function toVtt(cues: Cue[]): string {
  const blocks = cues.map((c, i) => `${i + 1}\n${stamp(c.start)} --> ${stamp(c.end)}\n${wrapCaption(c.text)}`);
  return `WEBVTT\n\n${blocks.join('\n\n')}\n`;
}
