import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * True when the phone asks for reduced motion (Android "Remove animations",
 * or prefers-reduced-motion on the web). Updates live if the setting changes.
 *
 * Usage: const reduceMotion = useReducedMotion(); if (reduceMotion) skip the animation.
 *
 * Every component that animates must check this. CLAUDE.md and runbook S02:
 * no animation when the phone asks for reduced motion.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (active) setReduced(value);
      })
      .catch(() => {
        // If the setting cannot be read, keep the default and carry on.
      });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return reduced;
}
