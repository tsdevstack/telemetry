import { GoogleAuth } from 'google-auth-library';
import { GCP_CLOUD_PLATFORM_SCOPE } from '../constants/telemetry';
import type { ExportHeadersFactory } from '../types';

/**
 * Headers for Google's OTLP endpoint: a token of the service's own account
 * (Cloud Run's metadata server; locally, Application Default Credentials).
 * The library caches the token and renews it before it expires.
 */
export function createGcpAuthHeaders(): ExportHeadersFactory {
  const auth = new GoogleAuth({ scopes: [GCP_CLOUD_PLATFORM_SCOPE] });

  return async () => {
    const client = await auth.getClient();
    const { token } = await client.getAccessToken();
    if (!token) {
      throw new Error('no Google access token for the service account');
    }
    return { authorization: `Bearer ${token}` };
  };
}
