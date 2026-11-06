import { describe, it, expect } from '@rstest/core';
import { Sha256Hash } from './sha256-hash';

function hex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('hex');
}

describe('Sha256Hash', () => {
  describe('Standard use cases', () => {
    it('should hash with SHA-256', async () => {
      const hash = new Sha256Hash();
      hash.update('abc');
      expect(hex(await hash.digest())).toBe(
        'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
      );
    });

    it('should use HMAC-SHA-256 with a secret', async () => {
      const hash = new Sha256Hash('key');
      hash.update('The quick brown fox jumps over the lazy dog');
      expect(hex(await hash.digest())).toBe(
        'f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8',
      );
    });
  });

  describe('Edge cases', () => {
    it('should take bytes and a part of a buffer', async () => {
      const whole = new TextEncoder().encode('xxabcxx');
      const hash = new Sha256Hash(new Uint8Array([107, 101, 121]).buffer);
      hash.update(whole.subarray(2, 5));
      const expected = new Sha256Hash('key');
      expected.update('abc');
      expect(hex(await hash.digest())).toBe(hex(await expected.digest()));
    });
  });
});
