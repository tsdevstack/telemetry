import { describe, it, expect, rs } from '@rstest/core';
import { ROOT_CONTEXT, SpanKind } from '@opentelemetry/api';
import {
  AlwaysOffSampler,
  AlwaysOnSampler,
  SamplingDecision,
} from '@opentelemetry/sdk-trace';
import { PARENT_FROM_COPY_KEY } from './constants/telemetry';
import { CopiedParentSampler } from './copied-parent-sampler';

const TRACE_ID = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

describe('CopiedParentSampler', () => {
  const sampler = new CopiedParentSampler(
    new AlwaysOffSampler(),
    new AlwaysOnSampler(),
  );

  describe('Standard use cases', () => {
    it('should use the first sampler for a parent from the copy', () => {
      expect(
        sampler.shouldSample(
          ROOT_CONTEXT.setValue(PARENT_FROM_COPY_KEY, true),
          TRACE_ID,
          'GET /x',
          SpanKind.SERVER,
          {},
          [],
        ).decision,
      ).toBe(SamplingDecision.NOT_RECORD);
    });

    it('should use the second sampler otherwise', () => {
      expect(
        sampler.shouldSample(
          ROOT_CONTEXT,
          TRACE_ID,
          'GET /x',
          SpanKind.SERVER,
          {},
          [],
        ).decision,
      ).toBe(SamplingDecision.RECORD_AND_SAMPLED);
    });
  });

  describe('Edge cases', () => {
    it('should pass every argument on', () => {
      const inner = new AlwaysOnSampler();
      const spy = rs.spyOn(inner, 'shouldSample');
      const links = [
        {
          context: {
            traceId: TRACE_ID,
            spanId: 'bbbbbbbbbbbbbbbb',
            traceFlags: 1,
          },
        },
      ];

      new CopiedParentSampler(inner, inner).shouldSample(
        ROOT_CONTEXT,
        TRACE_ID,
        'job',
        SpanKind.CONSUMER,
        { a: 'b' },
        links,
      );

      expect(spy).toHaveBeenCalledWith(
        ROOT_CONTEXT,
        TRACE_ID,
        'job',
        SpanKind.CONSUMER,
        { a: 'b' },
        links,
      );
    });

    it('should describe both samplers', () => {
      expect(sampler.toString()).toBe(
        'CopiedParentSampler{fromCopy=AlwaysOffSampler, otherwise=AlwaysOnSampler}',
      );
    });
  });
});
