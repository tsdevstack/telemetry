import { describe, it, expect, rs } from '@rstest/core';

rs.mock('@aws-sdk/credential-provider-node', () => ({
  defaultProvider: () => async () => ({
    accessKeyId: 'AKIDEXAMPLE',
    secretAccessKey: 'secret',
    sessionToken: 'session-token',
  }),
}));

import { createAwsSignedHeaders } from './create-aws-signed-headers';

const URL = 'https://xray.eu-west-1.amazonaws.com/v1/traces';

describe('createAwsSignedHeaders', () => {
  describe('Standard use cases', () => {
    it('should sign the request for X-Ray with the task credentials', async () => {
      const getHeaders = createAwsSignedHeaders('eu-west-1');
      const headers = await getHeaders(URL, new Uint8Array([1, 2, 3]));

      expect(headers.authorization).toMatch(
        /^AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE\/\d{8}\/eu-west-1\/xray\/aws4_request, SignedHeaders=[a-z0-9;-]+, Signature=[0-9a-f]{64}$/,
      );
      const signedHeaders = /SignedHeaders=([^,]+)/.exec(
        headers.authorization,
      )?.[1];
      expect(signedHeaders?.split(';')).toEqual(
        expect.arrayContaining(['content-type', 'host', 'x-amz-date']),
      );
      expect(headers['x-amz-security-token']).toBe('session-token');
      expect(headers['x-amz-date']).toMatch(/^\d{8}T\d{6}Z$/);
    });
  });

  describe('Edge cases', () => {
    it('should leave Host out (fetch sets it) and sign each body', async () => {
      const getHeaders = createAwsSignedHeaders('eu-west-1');
      const first = await getHeaders(URL, new Uint8Array([1]));
      const second = await getHeaders(URL, new Uint8Array([2]));

      expect(Object.keys(first).map((k) => k.toLowerCase())).not.toContain(
        'host',
      );
      expect(first.authorization).not.toBe(second.authorization);
    });
  });
});
