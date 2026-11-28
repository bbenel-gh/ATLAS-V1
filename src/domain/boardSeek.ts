/**
 * Pure rules for seeking on the board video by gesture (specs/video-board.md
 * P11, D-52). No bar and no visible controls: double tap left goes back 10 s,
 * double tap right goes forward 10 s, holding a side keeps moving until the
 * finger lifts. Forward never passes the furthest point already watched, so a
 * first watch cannot skip the explanation. No React.
 */

export type SeekSide = 'back' | 'forward';

/** Seconds moved by one double tap. */
export const SEEK_STEP = 10;
/** A second tap on the same side within this time is a double tap. */
export const DOUBLE_TAP_MS = 280;
/** Holding a side starts moving after this time. */
export const HOLD_DELAY_MS = 500;
/** While held: move this many seconds every HOLD_STEP_MS (about 8 times normal speed). */
export const HOLD_STEP_SECONDS = 2;
export const HOLD_STEP_MS = 250;

/** Moves smaller than this are not worth a seek or a hint. */
const MIN_MOVE = 0.1;

/** Left half goes back, right half goes forward. An unknown width counts as back. */
export function sideOf(x: number, width: number): SeekSide {
  if (!Number.isFinite(x) || !Number.isFinite(width) || width <= 0) return 'back';
  return x < width / 2 ? 'back' : 'forward';
}

/**
 * Where a seek of `delta` seconds lands, or null when it would not move
 * (already at the start, or nothing watched ahead). An unknown duration (0)
 * leaves only the furthest-watched limit.
 */
export function seekTarget(args: { current: number; delta: number; duration: number; furthest: number }): number | null {
  const { current, delta, duration, furthest } = args;
  if (![current, delta, duration, furthest].every(Number.isFinite)) return null;
  const limit = duration > 0 ? Math.min(duration, furthest) : furthest;
  const target = delta > 0 ? Math.min(current + delta, limit) : Math.max(current + delta, 0);
  const moved = delta > 0 ? target - current : current - target;
  return moved < MIN_MOVE ? null : target;
}

/** The furthest point watched only ever grows. */
export function nextFurthest(furthest: number, currentTime: number): number {
  return Number.isFinite(currentTime) ? Math.max(furthest, currentTime) : furthest;
}

/** A tap is a double tap when it follows a tap on the same side within DOUBLE_TAP_MS. */
export function tapKind(prev: { at: number; side: SeekSide } | null, now: number, side: SeekSide): 'double' | 'pending' {
  if (prev && prev.side === side && now - prev.at <= DOUBLE_TAP_MS) return 'double';
  return 'pending';
}
