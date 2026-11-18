import type { Attributes, Context, Link, SpanKind } from '@opentelemetry/api';
import type { Sampler, SamplingResult } from '@opentelemetry/sdk-trace';
import { PARENT_FROM_COPY_KEY } from './constants/telemetry';

/**
 * Picks the rule by where the request's parent came from: from the
 * traceparent copy (TraceparentCopyPropagator marks it), a framework hop
 * (Kong, the frontend, another service) decided, and `fromCopy` applies;
 * a parent from traceparent alone (on Cloud Run, the platform's own) or no
 * parent goes to `otherwise`.
 */
export class CopiedParentSampler implements Sampler {
  constructor(
    private readonly fromCopy: Sampler,
    private readonly otherwise: Sampler,
  ) {}

  shouldSample(
    context: Context,
    traceId: string,
    spanName: string,
    spanKind: SpanKind,
    attributes: Attributes,
    links: Link[],
  ): SamplingResult {
    const sampler =
      context.getValue(PARENT_FROM_COPY_KEY) === true
        ? this.fromCopy
        : this.otherwise;
    return sampler.shouldSample(
      context,
      traceId,
      spanName,
      spanKind,
      attributes,
      links,
    );
  }

  toString(): string {
    return `CopiedParentSampler{fromCopy=${this.fromCopy.toString()}, otherwise=${this.otherwise.toString()}}`;
  }
}
