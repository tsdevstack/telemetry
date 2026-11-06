import { DEFAULT_TRACE_SAMPLE_RATE } from './constants/telemetry';

/**
 * The share of new traces to keep, from TRACE_SAMPLE_RATE (0 to 1, set by
 * the deploy from tracing.sampleRate). Anything else keeps every trace.
 */
export function readTraceSampleRate(
  value: string | undefined = process.env.TRACE_SAMPLE_RATE,
): number {
  if (value === undefined || value.trim() === '') {
    return DEFAULT_TRACE_SAMPLE_RATE;
  }
  const rate = Number(value);
  if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
    return DEFAULT_TRACE_SAMPLE_RATE;
  }
  return rate;
}
