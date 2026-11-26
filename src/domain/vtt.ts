/**
 * A small WebVTT reader for the board captions (specs/video-board.md P7,
 * runbook S16 item 4). Pure TypeScript, no React.
 *
 * Reads the parts ATLAS needs: cue timings and cue text. Skips cue ids, cue
 * settings, NOTE, STYLE and REGION blocks, and strips simple tags like <i>.
 */

export type Cue = { start: number; end: number; text: string };

/** "mm:ss.ttt" or "hh:mm:ss.ttt" in seconds. A comma before the milliseconds is accepted. */
export function parseTimestamp(value: string): number | null {
  const m = /^(?:(\d{1,2}):)?(\d{2}):(\d{2})[.,](\d{3})$/.exec(value.trim());
  if (!m) return null;
  const [, h, mm, ss, ms] = m;
  const minutes = Number(mm);
  const seconds = Number(ss);
  if (minutes > 59 || seconds > 59) return null;
  return Number(h ?? 0) * 3600 + minutes * 60 + seconds + Number(ms) / 1000;
}

const TIMING = /^(\S+)\s+-->\s+(\S+)/;

export function parseVtt(text: string): Cue[] {
  const lines = text.replace(/^﻿/, '').split(/\r\n|\r|\n/);
  if (!/^WEBVTT(\s|$)/.test(lines[0] ?? '')) return [];

  // Blocks are separated by one or more empty lines.
  const blocks: string[][] = [];
  let current: string[] = [];
  for (const line of lines.slice(1)) {
    if (line.trim() === '') {
      if (current.length > 0) blocks.push(current);
      current = [];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) blocks.push(current);

  const cues: Cue[] = [];
  for (const block of blocks) {
    const first = block[0] ?? '';
    if (/^(NOTE|STYLE|REGION)(\s|$)/.test(first)) continue;
    const timingIndex = block.findIndex((l) => l.includes('-->'));
    if (timingIndex < 0 || timingIndex > 1) continue;
    const m = TIMING.exec(block[timingIndex] ?? '');
    if (!m) continue;
    const start = parseTimestamp(m[1] ?? '');
    const end = parseTimestamp(m[2] ?? '');
    if (start === null || end === null || end <= start) continue;
    const cueText = block
      .slice(timingIndex + 1)
      .map((l) => l.replace(/<[^>]*>/g, '').trim())
      .filter((l) => l !== '')
      .join('\n');
    if (cueText === '') continue;
    cues.push({ start, end, text: cueText });
  }
  return cues.sort((a, b) => a.start - b.start);
}

/** The cue on screen at `time` seconds: start included, end excluded. null in a gap. */
export function cueAt(cues: readonly Cue[], time: number): Cue | null {
  let lo = 0;
  let hi = cues.length - 1;
  let found: Cue | null = null;
  // Last cue whose start is at or before time.
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const c = cues[mid] as Cue;
    if (c.start <= time) {
      found = c;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found && time < found.end ? found : null;
}
