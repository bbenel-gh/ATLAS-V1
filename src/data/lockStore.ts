import { create } from 'zustand';

import { shouldLockOnReturn } from '@/domain/lockRule';

/**
 * The PIN lock on a shared phone (runbook S12). UI state, so Zustand.
 *
 * It starts locked: every cold start (restart, app closed or killed) asks for
 * the PIN again before anything shows. PinLock unlocks straight away when no
 * pupil is signed in.
 */
type LockState = {
  locked: boolean;
  backgroundedAt: number | null;
  unlock: () => void;
  lock: () => void;
  wentToBackground: (now: number) => void;
  cameBack: (now: number) => void;
};

export const useLockStore = create<LockState>((set, get) => ({
  locked: true,
  backgroundedAt: null,
  unlock: () => set({ locked: false, backgroundedAt: null }),
  lock: () => set({ locked: true }),
  // Only the first moment counts: "inactive" then "background" must not restart the clock.
  wentToBackground: (now) => {
    if (get().backgroundedAt === null) set({ backgroundedAt: now });
  },
  cameBack: (now) => {
    const { backgroundedAt, locked } = get();
    set({ backgroundedAt: null, locked: locked || shouldLockOnReturn(backgroundedAt, now) });
  },
}));
