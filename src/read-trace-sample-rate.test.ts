import { describe, it, expect } from '@rstest/core';
import { readTraceSampleRate } from './read-trace-sample-rate';

describe('readTraceSampleRate', () => {
  describe('Standard use cases', () => {
    it('should read a rate between 0 and 1', () => {
      expect(readTraceSampleRate('0.25')).toBe(0.25);
      expect(readTraceSampleRate('0')).toBe(0);
      expect(readTraceSampleRate('1')).toBe(1);
    });

    it('should keep every trace when the rate is not set', () => {
      expect(readTraceSampleRate(undefined)).toBe(1);
      expect(readTraceSampleRate('')).toBe(1);
    });
  });

  describe('Edge cases', () => {
    it('should keep every trace for a value that is not a rate', () => {
      expect(readTraceSampleRate('abc')).toBe(1);
      expect(readTraceSampleRate('1.5')).toBe(1);
      expect(readTraceSampleRate('-0.1')).toBe(1);
    });
  });
});
