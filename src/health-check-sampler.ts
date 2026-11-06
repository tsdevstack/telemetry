import {
  SpanKind,
  type Attributes,
  type Context,
  type Link,
} from '@opentelemetry/api';
import {
  SamplingDecision,
  type Sampler,
  type SamplingResult,
} from '@opentelemetry/sdk-trace';
import { REQUEST_PATH_ATTRIBUTES } from './constants/telemetry';
import { isHealthCheckPath } from './is-health-check-path';

/**
 * Keeps health probes and metrics scrapes out of traces: a server span for
 * one of them is not recorded (so neither is anything under it); every
 * other span is up to the wrapped sampler. Load balancers and Front Door
 * probe Kong and the Next.js apps every few seconds.
 */
export class HealthCheckSampler implements Sampler {
  constructor(private readonly sampler: Sampler) {}

  shouldSample(
    context: Context,
    traceId: string,
    spanName: string,
    spanKind: SpanKind,
    attributes: Attributes,
    links: Link[],
  ): SamplingResult {
    if (spanKind === SpanKind.SERVER) {
      const path = REQUEST_PATH_ATTRIBUTES.map((key) => attributes[key]).find(
        (value) => typeof value === 'string',
      );
      if (typeof path === 'string' && isHealthCheckPath(path)) {
        return { decision: SamplingDecision.NOT_RECORD };
      }
    }
    return this.sampler.shouldSample(
      context,
      traceId,
      spanName,
      spanKind,
      attributes,
      links,
    );
  }

  toString(): string {
    return `HealthCheckSampler{${this.sampler.toString()}}`;
  }
}
