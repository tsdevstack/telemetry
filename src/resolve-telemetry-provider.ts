import type { TelemetryProvider } from './types';

const CLOUD_PROVIDERS: readonly TelemetryProvider[] = ['gcp', 'aws', 'azure'];

/**
 * The cloud the process runs on. Unset, 'local' or an unknown value means
 * local: traces go to the local OTLP endpoint.
 */
export function resolveTelemetryProvider(
  value: string | undefined = process.env.TELEMETRY_PROVIDER,
): TelemetryProvider {
  const provider = value?.trim().toLowerCase();
  return CLOUD_PROVIDERS.find((p) => p === provider) ?? 'local';
}
