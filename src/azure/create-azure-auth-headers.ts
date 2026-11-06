import { ManagedIdentityCredential, type AccessToken } from '@azure/identity';
import {
  AZURE_MONITOR_SCOPE,
  AZURE_TOKEN_REFRESH_MARGIN_MS,
} from '../constants/telemetry';
import type { ExportHeadersFactory } from '../types';

/**
 * Headers for Azure Monitor's OTLP endpoint (a data collection rule): an
 * Entra token of the app's managed identity. Services and workers use their
 * own identity (AZURE_SECRETS_CLIENT_ID, the one with the role on the rule);
 * Next.js on App Service its system-assigned identity. The token is kept
 * until shortly before it expires.
 */
export function createAzureAuthHeaders(): ExportHeadersFactory {
  const clientId = process.env.AZURE_SECRETS_CLIENT_ID;
  const credential = clientId
    ? new ManagedIdentityCredential({ clientId })
    : new ManagedIdentityCredential();
  let cached: AccessToken | null = null;

  return async () => {
    if (
      !cached ||
      cached.expiresOnTimestamp - AZURE_TOKEN_REFRESH_MARGIN_MS <= Date.now()
    ) {
      cached = await credential.getToken(AZURE_MONITOR_SCOPE);
    }
    if (!cached) {
      throw new Error('no Entra token for the managed identity');
    }
    return { authorization: `Bearer ${cached.token}` };
  };
}
