import {
  ParentBasedSampler,
  TraceIdRatioBasedSampler,
  type Sampler,
} from '@opentelemetry/sdk-trace';
import { CopiedParentSampler } from './copied-parent-sampler';
import { HealthCheckSampler } from './health-check-sampler';

/**
 * A parent from the traceparent copy (Kong, the frontend, another service:
 * TraceparentCopyPropagator) is followed both ways: a trace that hop
 * dropped stays dropped. A request without a parent, or whose parent came
 * from traceparent alone, uses the rate, sampled or not: every framework hop
 * sends the copy, so that parent is the platform's own. On Cloud Run the
 * front end puts its parent on requests, unsampled on most, sampled on a
 * Cloud Scheduler job's, and neither may decide (a job is traced at the
 * rate like any other request). Spans inside the process follow their
 * parent. Health probes and metrics scrapes are never traced.
 */
export function createTraceSampler(rate: number): Sampler {
  const ratio = new TraceIdRatioBasedSampler(rate);
  return new HealthCheckSampler(
    new CopiedParentSampler(
      new ParentBasedSampler({ root: ratio }),
      new ParentBasedSampler({
        root: ratio,
        remoteParentSampled: ratio,
        remoteParentNotSampled: ratio,
      }),
    ),
  );
}
