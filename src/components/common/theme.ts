/**
 * ATLAS design tokens.
 *
 * Source of truth: CLAUDE.md "Look", which takes its primary "paper and ink"
 * system from BRAND-HANDOFF.md. Do not invent a colour here. If a screen needs
 * a colour that is not in this file, raise it in ops/BLOCKERS.md first.
 *
 * This module has no imports on purpose, so src/theme.test.ts can check every
 * value without pulling in React Native.
 */

/** App colours. Used everywhere except the lesson video area. */
export const colors = {
  paper: '#F2F4F3',
  ink: '#16233E',
  inkSoft: '#4C566B',
  gold: '#B9852F',
  goldSoft: '#E9D2A4',
  teal: '#2F6F5E',
  tealSoft: '#D6E7E1',
  line: '#DDE2DE',
  card: '#FCFCFA',
} as const;

/**
 * Board colours. The lesson video area only, per specs/video-board.md.
 * The video background must match `board` exactly so the player has no visible
 * edge. Never use these for app chrome.
 */
export const board = {
  board: '#F6F0E6',
  boardInk: '#1C2740',
  boardMuted: '#6B6558',
  boardLine: '#E4DCCB',
} as const;

/**
 * Font families, keyed by role. The values are the names registered by
 * useFonts() in app/_layout.tsx, so they must match the @expo-google-fonts
 * exports exactly.
 */
export const fonts = {
  /** Body text. */
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
  /** Headings. */
  heading: 'Fraunces_600SemiBold',
  headingBold: 'Fraunces_700Bold',
  /** Labels. */
  label: 'IBMPlexMono_400Regular',
  labelMedium: 'IBMPlexMono_500Medium',
  /** Handwriting, for the board style only. */
  hand: 'Caveat_400Regular',
} as const;

/**
 * Text styles. Body text is Inter 16px.
 * Named `typography`, not `type`, because `import { type }` collides with
 * TypeScript's `import { type Foo }` syntax.
 */
export const typography = {
  display: { fontFamily: fonts.headingBold, fontSize: 40, lineHeight: 48 },
  title: { fontFamily: fonts.heading, fontSize: 28, lineHeight: 36 },
  heading: { fontFamily: fonts.heading, fontSize: 20, lineHeight: 28 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: fonts.bodySemiBold, fontSize: 16, lineHeight: 24 },
  small: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: fonts.label, fontSize: 13, lineHeight: 18, letterSpacing: 0.4 },
  caption: { fontFamily: fonts.label, fontSize: 12, lineHeight: 16, letterSpacing: 0.4 },
} as const;

/**
 * Spacing scale 4, 8, 12, 16, 24, 32, exactly as the runbook S02 states.
 * Do not add a step without changing the runbook first.
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/** Pill buttons and inputs, rounded cards. */
export const radius = {
  card: 16,
  pill: 999,
} as const;

/** 1px line border everywhere. No shadows anywhere in ATLAS. */
export const borderWidth = 1;

export const theme = {
  colors,
  board,
  fonts,
  typography,
  spacing,
  radius,
  borderWidth,
} as const;

export type Theme = typeof theme;
