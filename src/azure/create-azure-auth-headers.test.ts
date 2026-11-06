import { describe, it, expect, rs, beforeEach, afterEach } from '@rstest/core';

const { mockGetToken, mockCredential } = rs.hoisted(() => ({
  mockGetToken: rs.fn(),
  mockCredential: rs.fn(),
}));

rs.mock('@azure/identity', () => ({
  ManagedIdentityCredential: class {
    constructor(options?: unknown) {
      mockCredential(options);
    }
    getToken = mockGetToken;
  },
}));

import { createAzureAuthHeaders } from './create-azure-auth-headers';

const URL =
  'https://dce.westeurope-1.ingest.monitor.azure.com/datacollectionRules/dcr-1/streams/Microsoft-OTLP-Traces/otlp/v1/traces';

describe('createAzureAuthHeaders', () => {
  beforeEach(() => {
    rs.clearAllMocks();
    delete process.env.AZURE_SECRETS_CLIENT_ID;
  });

  afterEach(() => {
    delete process.env.AZURE_SECRETS_CLIENT_ID;
  });

  describe('Standard use cases', () => {
    it("should send a token of the service's own identity", async () => {
      process.env.AZURE_SECRETS_CLIENT_ID = 'client-1';
      mockGetToken.mockResolvedValue({
        token: 'eyJ.token',
        expiresOnTimestamp: Date.now() + 3_600_000,
      });

      const headers = await createAzureAuthHeaders()(URL, new Uint8Array());

      expect(headers).toEqual({ authorization: 'Bearer eyJ.token' });
      expect(mockCredential).toHaveBeenCalledWith({ clientId: 'client-1' });
      expect(mockGetToken).toHaveBeenCalledWith(
        'https://monitor.azure.com/.default',
      );
    });

    it("should use the app's system-assigned identity without a client ID (Next.js)", async () => {
      mockGetToken.mockResolvedValue({
        token: 't',
        expiresOnTimestamp: Date.now() + 3_600_000,
      });

      await createAzureAuthHeaders()(URL, new Uint8Array());

      expect(mockCredential).toHaveBeenCalledWith(undefined);
    });

    it('should keep the token until shortly before it expires', async () => {
      mockGetToken.mockResolvedValue({
        token: 't',
        expiresOnTimestamp: Date.now() + 3_600_000,
      });
      const getHeaders = createAzureAuthHeaders();

      await getHeaders(URL, new Uint8Array());
      await getHeaders(URL, new Uint8Array());

      expect(mockGetToken).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge cases', () => {
    it('should get a new token when the kept one is about to expire', async () => {
      mockGetToken
        .mockResolvedValueOnce({
          token: 'old',
          expiresOnTimestamp: Date.now() + 60_000,
        })
        .mockResolvedValueOnce({
          token: 'new',
          expiresOnTimestamp: Date.now() + 3_600_000,
        });
      const getHeaders = createAzureAuthHeaders();

      await getHeaders(URL, new Uint8Array());
      const headers = await getHeaders(URL, new Uint8Array());

      expect(headers).toEqual({ authorization: 'Bearer new' });
    });

    it('should fail the export when there is no token', async () => {
      mockGetToken.mockResolvedValue(null);

      await expect(
        createAzureAuthHeaders()(URL, new Uint8Array()),
      ).rejects.toThrow('no Entra token');
    });
  });
});
