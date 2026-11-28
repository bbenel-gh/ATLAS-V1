import {
  DOUBLE_TAP_MS,
  HOLD_DELAY_MS,
  HOLD_STEP_MS,
  HOLD_STEP_SECONDS,
  nextFurthest,
  SEEK_STEP,
  seekTarget,
  sideOf,
  tapKind,
} from './boardSeek';

describe('constants (specs/video-board.md P11)', () => {
  it('double tap moves 10 seconds', () => {
    expect(SEEK_STEP).toBe(10);
  });
  it('a second tap must come within 280 ms', () => {
    expect(DOUBLE_TAP_MS).toBe(280);
  });
  it('holding starts after half a second', () => {
    expect(HOLD_DELAY_MS).toBe(500);
  });
  it('holding moves 2 seconds every 250 ms', () => {
    expect(HOLD_STEP_SECONDS).toBe(2);
    expect(HOLD_STEP_MS).toBe(250);
  });
});

describe('sideOf', () => {
  it('left half goes back', () => {
    expect(sideOf(0, 400)).toBe('back');
    expect(sideOf(199, 400)).toBe('back');
  });
  it('right half goes forward', () => {
    expect(sideOf(200, 400)).toBe('forward');
    expect(sideOf(400, 400)).toBe('forward');
  });
  it('an unknown width counts as back, the safe side', () => {
    expect(sideOf(50, 0)).toBe('back');
    expect(sideOf(Number.NaN, 400)).toBe('back');
  });
});

describe('seekTarget', () => {
  const base = { current: 30, duration: 75, furthest: 30 };

  it('goes back 10 seconds', () => {
    expect(seekTarget({ ...base, delta: -10 })).toBe(20);
  });
  it('never goes below 0', () => {
    expect(seekTarget({ ...base, current: 4, delta: -10 })).toBe(0);
  });
  it('gives null when already at the start', () => {
    expect(seekTarget({ ...base, current: 0, delta: -10 })).toBeNull();
  });
  it('goes forward up to the furthest point watched', () => {
    expect(seekTarget({ current: 10, duration: 75, furthest: 40, delta: 10 })).toBe(20);
    expect(seekTarget({ current: 35, duration: 75, furthest: 40, delta: 10 })).toBe(40);
  });
  it('gives null on a first watch, where nothing ahead has been watched', () => {
    expect(seekTarget({ ...base, delta: 10 })).toBeNull();
  });
  it('never passes the end, even after the whole video was watched', () => {
    expect(seekTarget({ current: 70, duration: 75, furthest: 75, delta: 10 })).toBe(75);
  });
  it('a furthest point past the end counts as the end', () => {
    expect(seekTarget({ current: 70, duration: 75, furthest: 80, delta: 10 })).toBe(75);
  });
  it('an unknown duration still allows going back, and forward only to the furthest point', () => {
    expect(seekTarget({ current: 30, duration: 0, furthest: 50, delta: -10 })).toBe(20);
    expect(seekTarget({ current: 30, duration: 0, furthest: 50, delta: 10 })).toBe(40);
  });
  it('ignores tiny moves under a tenth of a second', () => {
    expect(seekTarget({ current: 39.95, duration: 75, furthest: 40, delta: 10 })).toBeNull();
  });
  it('bad numbers give null', () => {
    expect(seekTarget({ current: Number.NaN, duration: 75, furthest: 40, delta: -10 })).toBeNull();
  });
});

describe('nextFurthest', () => {
  it('only ever grows', () => {
    expect(nextFurthest(20, 25)).toBe(25);
    expect(nextFurthest(40, 10)).toBe(40);
  });
  it('ignores bad numbers', () => {
    expect(nextFurthest(20, Number.NaN)).toBe(20);
  });
});

describe('tapKind', () => {
  it('a first tap is pending', () => {
    expect(tapKind(null, 1000, 'back')).toBe('pending');
  });
  it('a second tap on the same side within 280 ms is a double tap', () => {
    expect(tapKind({ at: 1000, side: 'back' }, 1200, 'back')).toBe('double');
    expect(tapKind({ at: 1000, side: 'forward' }, 1280, 'forward')).toBe('double');
  });
  it('a second tap after 280 ms starts again', () => {
    expect(tapKind({ at: 1000, side: 'back' }, 1281, 'back')).toBe('pending');
  });
  it('a second tap on the other side starts again', () => {
    expect(tapKind({ at: 1000, side: 'back' }, 1100, 'forward')).toBe('pending');
  });
});
