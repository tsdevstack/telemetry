import { describe, it, expect } from '@rstest/core';
import {
  ROOT_CONTEXT,
  SpanKind,
  TraceFlags,
  trace,
  type Context,
} from '@opentelemetry/api';
import { SamplingDecision } from '@opentelemetry/sdk-trace';
import { createTraceSampler } from './create-trace-sampler';

const TRACE_ID = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

function remoteParent(sampled: boolean): Context {
  return trace.setSpanContext(ROOT_CONTEXT, {
    traceId: TRACE_ID,
    spanId: 'bbbbbbbbbbbbbbbb',
    traceFlags: sampled ? TraceFlags.SAMPLED : TraceFlags.NONE,
    isRemote: true,
  });
}

function decide(rate: number, parent: Context): SamplingDecision {
  return createTraceSampler(rate).shouldSample(
    parent,
    TRACE_ID,
    'GET /x',
    SpanKind.SERVER,
    {},
    [],
  ).decision;
}

describe('createTraceSampler', () => {
  describe('Standard use cases', () => {
    it('should follow a sampled parent, whatever the rate', () => {
      expect(decide(0, remoteParent(true))).toBe(
        SamplingDecision.RECORD_AND_SAMPLED,
      );
    });

    it('should use the rate without a parent', () => {
      expect(decide(1, ROOT_CONTEXT)).toBe(SamplingDecision.RECORD_AND_SAMPLED);
      expect(decide(0, ROOT_CONTEXT)).toBe(SamplingDecision.NOT_RECORD);
    });
  });

  describe('Health checks', () => {
    function decideFor(
      attributes: Record<string, string>,
      kind: SpanKind = SpanKind.SERVER,
      parent: Context = ROOT_CONTEXT,
    ): SamplingDecision {
      return createTraceSampler(1).shouldSample(
        parent,
        TRACE_ID,
        'GET',
        kind,
        attributes,
        [],
      ).decision;
    }

    it("should not trace a Next.js health probe (its root span's http.target)", () => {
      expect(decideFor({ 'http.target': '/health' })).toBe(
        SamplingDecision.NOT_RECORD,
      );
    });

    it('should not trace a health probe by url.path, or a metrics scrape', () => {
      expect(decideFor({ 'url.path': '/health/ping' })).toBe(
        SamplingDecision.NOT_RECORD,
      );
      expect(decideFor({ 'url.path': '/metrics' })).toBe(
        SamplingDecision.NOT_RECORD,
      );
    });

    it('should not trace a health probe that brings a sampled parent', () => {
      expect(
        decideFor(
          { 'http.target': '/health' },
          SpanKind.SERVER,
          remoteParent(true),
        ),
      ).toBe(SamplingDecision.NOT_RECORD);
    });

    it('should trace other requests', () => {
      expect(decideFor({ 'http.target': '/api/auth/login' })).toBe(
        SamplingDecision.RECORD_AND_SAMPLED,
      );
    });

    it('should leave client and internal spans to the rate (a call to /health)', () => {
      expect(decideFor({ 'url.path': '/health' }, SpanKind.CLIENT)).toBe(
        SamplingDecision.RECORD_AND_SAMPLED,
      );
    });
  });

  describe('Edge cases', () => {
    it("should not let an unsampled parent (Cloud Run's) switch tracing off", () => {
      expect(decide(1, remoteParent(false))).toBe(
        SamplingDecision.RECORD_AND_SAMPLED,
      );
      expect(decide(0, remoteParent(false))).toBe(SamplingDecision.NOT_RECORD);
    });
  });
});
