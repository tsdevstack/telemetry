import {
  ParentBasedSampler,
  TraceIdRatioBasedSampler,
  type Sampler,
} from '@opentelemetry/sdk-trace';
import { HealthCheckSampler } from './health-check-sampler';

/**
 * A sampled parent (Kong, another service, the frontend) is followed. A
 * request without a parent, or whose parent was not sampled, uses the
 * rate: on Cloud Run the platform adds its own unsampled parent to most
 * requests, which must not switch tracing off. Health probes and metrics
 * scrapes are never traced.
 */
export function createTraceSampler(rate: number): Sampler {
  const ratio = new TraceIdRatioBasedSampler(rate);
  return new HealthCheckSampler(
    new ParentBasedSampler({
      root: ratio,
      remoteParentNotSampled: ratio,
    }),
  );
}
