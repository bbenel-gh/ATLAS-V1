import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { chooseSegmentState } from '@/domain/segmentSync';
import { initialSegmentState, type SegmentState, type TriesResult } from '@/domain/tries';

import { pendingLessonJobs, syncLessons } from './lessonQueue';
import { applySegmentEvent, type EngineEvent } from './segmentEngine';
import { fetchServerSegment, makeSegmentRepo, readLocalSegment } from './segmentRepo';

/**
 * One segment's state for the segment screen (runbook S20 item 2).
 *
 * Loads the phone copy at once, then the server copy; while writes are still
 * waiting on the phone, the phone copy wins (chooseSegmentState). dispatch
 * runs the tries reducer, queues every write and applies the effects
 * (src/data/segmentEngine.ts). Events are applied one at a time, in order.
 */
export function useSegment(segmentCode: string): {
  state: SegmentState;
  ready: boolean;
  dispatch: (event: EngineEvent) => Promise<TriesResult>;
} {
  const queryClient = useQueryClient();
  const [state, setState] = useState<SegmentState>(initialSegmentState);
  const [ready, setReady] = useState(false);
  const stateRef = useRef(state);
  const chain = useRef<Promise<unknown>>(Promise.resolve());

  const repo = useMemo(
    () => makeSegmentRepo(() => queryClient.invalidateQueries({ queryKey: ['home'] })),
    [queryClient],
  );

  useEffect(() => {
    let live = true;
    void (async () => {
      const local = await readLocalSegment(segmentCode);
      if (live && local) {
        stateRef.current = local;
        setState(local);
      }
      await syncLessons();
      const [server, pending] = await Promise.all([fetchServerSegment(segmentCode), pendingLessonJobs(segmentCode)]);
      if (!live) return;
      const chosen = chooseSegmentState(stateRef.current === initialSegmentState ? local : stateRef.current, server, pending);
      stateRef.current = chosen;
      setState(chosen);
      setReady(true);
    })();
    return () => {
      live = false;
    };
  }, [segmentCode]);

  const dispatch = useCallback(
    (event: EngineEvent) => {
      const run = chain.current.then(async () => {
        const result = await applySegmentEvent(repo, segmentCode, stateRef.current, event);
        if (result.ok) {
          stateRef.current = result.state;
          setState(result.state);
        }
        return result;
      });
      chain.current = run.catch(() => undefined);
      return run;
    },
    [repo, segmentCode],
  );

  return { state, ready, dispatch };
}
