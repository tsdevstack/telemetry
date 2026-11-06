import { describe, it, expect, rs, beforeEach } from '@rstest/core';

const { mockGetAccessToken, mockGoogleAuth } = rs.hoisted(() => ({
  mockGetAccessToken: rs.fn(),
  mockGoogleAuth: rs.fn(),
}));

rs.mock('google-auth-library', () => ({
  GoogleAuth: class {
    constructor(options: unknown) {
      mockGoogleAuth(options);
    }
    async getClient() {
      return { getAccessToken: mockGetAccessToken };
    }
  },
}));

import { createGcpAuthHeaders } from './create-gcp-auth-headers';

describe('createGcpAuthHeaders', () => {
  beforeEach(() => {
    rs.clearAllMocks();
  });

  describe('Standard use cases', () => {
    it("should send the service account's token", async () => {
      mockGetAccessToken.mockResolvedValue({ token: 'ya29.token' });

      const getHeaders = createGcpAuthHeaders();
      const headers = await getHeaders(
        'https://telemetry.googleapis.com/v1/traces',
        new Uint8Array(),
      );

      expect(headers).toEqual({ authorization: 'Bearer ya29.token' });
      expect(mockGoogleAuth).toHaveBeenCalledWith({
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      });
    });
  });

  describe('Edge cases', () => {
    it('should fail without a token', async () => {
      mockGetAccessToken.mockResolvedValue({ token: null });

      await expect(
        createGcpAuthHeaders()('https://x', new Uint8Array()),
      ).rejects.toThrow('no Google access token');
    });
  });
});
