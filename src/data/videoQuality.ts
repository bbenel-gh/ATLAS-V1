import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { toQuality, type Quality } from '@/domain/videoPlan';

/**
 * The video quality this phone downloads (D-46). 360p by default, to save
 * data on low-end phones (specs/prd.md section 11). The pupil may pick 480p,
 * 720p or 1080p on the download screen; a version without that quality uses
 * the best lower one. Kept on the phone, not on the server.
 */
type QualityState = { quality: Quality; loaded: boolean; setQuality: (q: Quality) => void };

const KEY = 'atlas.video.quality';

export const useVideoQuality = create<QualityState>((set) => ({
  quality: '360',
  loaded: false,
  setQuality: (quality) => {
    set({ quality });
    void AsyncStorage.setItem(KEY, quality).catch(() => undefined);
  },
}));

void AsyncStorage.getItem(KEY)
  .then((value) => useVideoQuality.setState({ quality: toQuality(value), loaded: true }))
  .catch(() => useVideoQuality.setState({ loaded: true }));
