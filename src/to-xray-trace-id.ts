/**
 * A W3C trace ID in X-Ray's form (1-<8 hex>-<24 hex>), as the X-Ray and
 * CloudWatch consoles show it. Undefined for anything that is not a W3C
 * trace ID.
 */
export function toXrayTraceId(traceId: string): string | undefined {
  if (!/^[0-9a-f]{32}$/.test(traceId)) {
    return undefined;
  }
  return `1-${traceId.slice(0, 8)}-${traceId.slice(8)}`;
}
