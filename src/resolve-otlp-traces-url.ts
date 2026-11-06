import { OTLP_TRACES_PATH } from './constants/telemetry';

/**
 * The traces URL for an OTLP destination without a fixed address (local
 * Jaeger, Azure Monitor's data collection rule):
 * OTEL_EXPORTER_OTLP_TRACES_ENDPOINT as is, else a base
 * endpoint (the option, OTEL_EXPORTER_OTLP_ENDPOINT, the fallback) with
 * /v1/traces added. Undefined when there is none.
 */
export function resolveOtlpTracesUrl(
  endpoint: string | undefined,
  fallback: string | undefined,
): string | undefined {
  if (!endpoint && process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT) {
    return process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT;
  }
  const base = endpoint || process.env.OTEL_EXPORTER_OTLP_ENDPOINT || fallback;
  if (!base) {
    return undefined;
  }
  return `${base.replace(/\/+$/, '')}${OTLP_TRACES_PATH}`;
}
