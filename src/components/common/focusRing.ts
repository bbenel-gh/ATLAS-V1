import type { ViewStyle } from 'react-native';

import { colors } from './theme';

/**
 * The visible focus style for every touchable and input: a 2px teal outline
 * drawn outside the element, so it never shifts the layout.
 *
 * Usage: style={[styles.base, focused && focusRing]} with `focused` tracked
 * from onFocus and onBlur.
 */
export const focusRing: ViewStyle = {
  outlineColor: colors.teal,
  outlineStyle: 'solid',
  outlineWidth: 2,
  outlineOffset: 2,
};
