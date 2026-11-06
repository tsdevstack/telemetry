import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { SignatureV4 } from '@smithy/signature-v4';
import {
  AWS_XRAY_SIGNING_SERVICE,
  OTLP_PROTOBUF_CONTENT_TYPE,
} from '../constants/telemetry';
import type { ExportHeadersFactory } from '../types';
import { Sha256Hash } from './sha256-hash';

/**
 * Headers for X-Ray's OTLP endpoint: a SigV4 signature over the request,
 * body included, with the task role's credentials (ECS container
 * credentials; locally, the usual AWS credential chain).
 */
export function createAwsSignedHeaders(region: string): ExportHeadersFactory {
  const signer = new SignatureV4({
    service: AWS_XRAY_SIGNING_SERVICE,
    region,
    credentials: defaultProvider(),
    sha256: Sha256Hash,
  });

  return async (url, body) => {
    const { hostname, pathname } = new URL(url);
    const signed = await signer.sign({
      method: 'POST',
      protocol: 'https:',
      hostname,
      path: pathname,
      headers: { host: hostname, 'content-type': OTLP_PROTOBUF_CONTENT_TYPE },
      body,
    });

    // fetch sets Host itself (same value)
    const headers: Record<string, string> = {};
    for (const [name, value] of Object.entries(signed.headers)) {
      if (name.toLowerCase() !== 'host') {
        headers[name] = value;
      }
    }
    return headers;
  };
}
