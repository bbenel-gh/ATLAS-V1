import { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from 'react-native';

import { spacing } from '@/components/common/theme';
import { useReducedMotion } from '@/components/common/useReducedMotion';
import { visibleFraction } from '@/domain/videoPlan';

/**
 * Ties a board to the screen's scroll (specs/video-board.md P6 and P9).
 * Put `onBoardLayout` on a direct child of the Screen's content that wraps the
 * board, and pass `onScroll` and `scrollRef` to Screen.
 */
export function useBoardScroll() {
  const reduceMotion = useReducedMotion();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const boardBox = useRef({ top: 0, height: 0 });
  const viewBox = useRef({ scrollY: 0, viewportHeight: Dimensions.get('window').height });
  const [visible, setVisible] = useState(1);

  const recompute = useCallback(() => {
    // Round to tenths so small scrolls do not re-render the player.
    const next = Math.round(visibleFraction(boardBox.current, viewBox.current) * 10) / 10;
    setVisible((prev) => (prev === next ? prev : next));
  }, []);

  const onBoardLayout = useCallback(
    (e: LayoutChangeEvent) => {
      boardBox.current = { top: e.nativeEvent.layout.y, height: e.nativeEvent.layout.height };
      recompute();
    },
    [recompute],
  );

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      viewBox.current = { scrollY: e.nativeEvent.contentOffset.y, viewportHeight: e.nativeEvent.layoutMeasurement.height };
      recompute();
    },
    [recompute],
  );

  const scrollToBoard = useCallback(() => {
    scrollRef.current?.scrollTo({ y: Math.max(0, boardBox.current.top - spacing.lg), animated: !reduceMotion });
  }, [reduceMotion]);

  const scrollToEnd = useCallback(() => {
    scrollRef.current?.scrollToEnd({ animated: !reduceMotion });
  }, [reduceMotion]);

  return { scrollRef, onScroll, onBoardLayout, visible, scrollToBoard, scrollToEnd };
}
