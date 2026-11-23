import { board, borderWidth, colors, fonts, radius, spacing, typography } from './theme';

/**
 * These values are quoted from CLAUDE.md "Look". The test exists so a token
 * cannot drift, and so nobody can add an ad-hoc colour without this failing.
 * If a token genuinely has to change, CLAUDE.md changes first, and only Bright
 * may change CLAUDE.md.
 */

describe('app colour tokens', () => {
  it('matches CLAUDE.md exactly', () => {
    expect(colors).toEqual({
      paper: '#F2F4F3',
      ink: '#16233E',
      inkSoft: '#4C566B',
      gold: '#B9852F',
      goldSoft: '#E9D2A4',
      teal: '#2F6F5E',
      tealSoft: '#D6E7E1',
      line: '#DDE2DE',
      card: '#FCFCFA',
    });
  });

  it('has no colour outside the nine named tokens', () => {
    expect(Object.keys(colors)).toHaveLength(9);
  });
});

describe('board colour tokens', () => {
  it('matches CLAUDE.md exactly', () => {
    expect(board).toEqual({
      board: '#F6F0E6',
      boardInk: '#1C2740',
      boardMuted: '#6B6558',
      boardLine: '#E4DCCB',
    });
  });

  it('has no colour outside the four named tokens', () => {
    expect(Object.keys(board)).toHaveLength(4);
  });

  it('keeps the board palette separate from the app palette', () => {
    const appValues = Object.values(colors) as string[];
    for (const boardValue of Object.values(board) as string[]) {
      expect(appValues).not.toContain(boardValue);
    }
  });
});

describe('colour format', () => {
  it('uses 6-digit uppercase hex everywhere', () => {
    for (const value of [...Object.values(colors), ...Object.values(board)]) {
      expect(value).toMatch(/^#[0-9A-F]{6}$/);
    }
  });
});

describe('typography', () => {
  it('uses Inter for body, Fraunces for headings, IBM Plex Mono for labels', () => {
    expect(fonts.body).toMatch(/^Inter_/);
    expect(fonts.heading).toMatch(/^Fraunces_/);
    expect(fonts.label).toMatch(/^IBMPlexMono_/);
    expect(fonts.hand).toMatch(/^Caveat_/);
  });

  it('sets body text at 16px', () => {
    expect(typography.body.fontSize).toBe(16);
    expect(typography.body.fontFamily).toBe(fonts.body);
  });

  it('gives every text style a family and a size', () => {
    for (const style of Object.values(typography)) {
      expect(typeof style.fontFamily).toBe('string');
      expect(style.fontFamily.length).toBeGreaterThan(0);
      expect(style.fontSize).toBeGreaterThan(0);
      expect(style.lineHeight).toBeGreaterThanOrEqual(style.fontSize);
    }
  });
});

describe('spacing', () => {
  it('matches the runbook scale 4, 8, 12, 16, 24, 32', () => {
    expect(Object.values(spacing)).toEqual([4, 8, 12, 16, 24, 32]);
  });
});

/** Hue in degrees, 0 to 360. Returns null for a grey, which has no hue. */
function hueOf(hex: string): number | null {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  if (delta < 0.04) return null;
  let h: number;
  if (max === r) h = ((g - b) / delta) % 6;
  else if (max === g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;
  h *= 60;
  return h < 0 ? h + 360 : h;
}

describe('no red anywhere', () => {
  // Runbook S02: "There is NO red in the theme. Do not add one."
  // CLAUDE.md: wrong answers are never shown in red, errors never flash red.
  // Gold #B9852F sits at about 37 degrees, which is amber, not red. A real red
  // lands under 20 or over 340, so that is what this rejects.
  it('has no token in the red part of the colour wheel', () => {
    for (const [name, hex] of Object.entries({ ...colors, ...board })) {
      const hue = hueOf(hex);
      if (hue === null) continue;
      const nearRed = hue < 20 || hue > 340;
      expect({ name, hex, hue: Math.round(hue), nearRed }).toMatchObject({
        nearRed: false,
      });
    }
  });

  it('has no token named like an error colour', () => {
    for (const name of Object.keys({ ...colors, ...board })) {
      expect(name).not.toMatch(/red|danger|error|alert/i);
    }
  });
});

describe('shape', () => {
  it('uses a 1px line border', () => {
    expect(borderWidth).toBe(1);
  });

  it('keeps a pill radius for buttons and inputs', () => {
    expect(radius.pill).toBeGreaterThanOrEqual(999);
  });
});
