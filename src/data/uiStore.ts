import { create } from 'zustand';

/**
 * UI state shared across screens (Zustand). Server data does not go here;
 * that is TanStack Query's job.
 *
 * Usage: const version = useUiStore((s) => s.version);
 *
 * Empty for now. `version` lets later sessions migrate persisted UI state.
 */
export type UiState = {
  version: number;
};

export const useUiStore = create<UiState>(() => ({
  version: 1,
}));
