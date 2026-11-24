import { clampTries } from '../sanity';

describe('clampTries', () => {
  it('keeps a value inside the range', () => {
    expect(clampTries(2)).toBe(2);
  });

  it('caps at the maximum', () => {
    expect(clampTries(7)).toBe(3);
    expect(clampTries(7, 5)).toBe(5);
  });

  it('turns negative, fractional and invalid input into a safe value', () => {
    expect(clampTries(-1)).toBe(0);
    expect(clampTries(1.9)).toBe(1);
    expect(clampTries(Number.NaN)).toBe(0);
  });
});
