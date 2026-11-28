import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

/**
 * Dev-only switches, kept on the phone so they survive a restart. Every
 * switch is off and cannot be turned on in a release build (__DEV__ false).
 *
 * fakePrerequisite (runbook S15 item 6): gives the Materials topic a fake
 * prerequisite, so the "I'd suggest this first" nudge can be seen on a phone.
 */
export const FAKE_PREREQ = {
  topicCode: 'B7-MATERIALS',
  code: 'DEV-FAKE-PREREQ',
  title: 'Matter and its properties (dev test)',
} as const;

type DevFlags = {
  fakePrerequisite: boolean;
  setFakePrerequisite: (on: boolean) => void;
};

const STORAGE_KEY = 'atlas.dev.flags';

export const useDevFlags = create<DevFlags>((set) => ({
  fakePrerequisite: false,
  setFakePrerequisite: (on) => {
    if (!__DEV__) return;
    set({ fakePrerequisite: on });
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ fakePrerequisite: on })).catch(() => undefined);
  },
}));

if (__DEV__) {
  void AsyncStorage.getItem(STORAGE_KEY)
    .then((text) => {
      if (!text) return;
      const saved = JSON.parse(text) as { fakePrerequisite?: unknown };
      if (saved.fakePrerequisite === true) useDevFlags.setState({ fakePrerequisite: true });
    })
    .catch(() => undefined);
}
