import { forwardRef } from 'react';
import { Platform } from 'react-native';

import { CODE_LENGTH, filterCodeInput, filterPinInput } from '@/domain/auth';

import { SlotInput, type SlotInputHandle } from './SlotInput';

type Common = {
  value: string;
  onChangeText: (value: string) => void;
  onFilled?: (value: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
};

/**
 * The 6-box code input, IBM Plex Mono, uppercase. Letters that cannot be in a
 * code (0, O, 1, I) are ignored as they are typed (src/domain/auth.ts).
 */
export const CodeBoxes = forwardRef<SlotInputHandle, Common>(function CodeBoxes(props, ref) {
  return (
    <SlotInput
      ref={ref}
      {...props}
      length={CODE_LENGTH}
      filter={filterCodeInput}
      show={(c) => c}
      accessibilityLabel="Your code, 6 letters and numbers"
      autoCapitalize="characters"
      // visible-password turns off word suggestions on Android keyboards.
      keyboardType={Platform.OS === 'android' ? 'visible-password' : 'default'}
    />
  );
});

/** The 4-digit PIN input on the number pad. Digits show as dots. */
export const PinDots = forwardRef<SlotInputHandle, Common & { accessibilityLabel: string }>(function PinDots(props, ref) {
  return <SlotInput ref={ref} {...props} length={4} filter={filterPinInput} show={() => '•'} keyboardType="number-pad" />;
});
