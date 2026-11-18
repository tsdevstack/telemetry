import { describe, it, expect } from '@rstest/core';
import {
  ROOT_CONTEXT,
  SpanKind,
  TraceFlags,
  trace,
  type Context,
} from '@opentelemetry/api';
import { SamplingDecision } from '@opentelemetry/sdk-trace';
import { PARENT_FROM_COPY_KEY } from './constants/telemetry';
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

/** A parent span in the same process (a span inside a request) */
function localParent(sampled: boolean): Context {
  return trace.setSpanContext(ROOT_CONTEXT, {
    traceId: TRACE_ID,
    spanId: 'cccccccccccccccc',
    traceFlags: sampled ? TraceFlags.SAMPLED : TraceFlags.NONE,
    isRemote: false,
  });
}

/** A parent read from the traceparent copy (a framework hop decided) */
function copiedParent(sampled: boolean): Context {
  return remoteParent(sampled).setValue(PARENT_FROM_COPY_KEY, true);
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
    it('should follow a parent span in the same process, whatever the rate', () => {
      expect(decide(0, localParent(true))).toBe(
        SamplingDecision.RECORD_AND_SAMPLED,
      );
      expect(decide(1, localParent(false))).toBe(SamplingDecision.NOT_RECORD);
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

  describe('Parent from the traceparent copy', () => {
    it('should drop a trace the framework hop dropped, whatever the rate', () => {
      expect(decide(1, copiedParent(false))).toBe(SamplingDecision.NOT_RECORD);
    });

    it('should keep a trace the framework hop kept, whatever the rate', () => {
      expect(decide(0, copiedParent(true))).toBe(
        SamplingDecision.RECORD_AND_SAMPLED,
      );
    });

    it('should still keep health probes out', () => {
      expect(
        createTraceSampler(1).shouldSample(
          copiedParent(true),
          TRACE_ID,
          'GET',
          SpanKind.SERVER,
          { 'url.path': '/health' },
          [],
        ).decision,
      ).toBe(SamplingDecision.NOT_RECORD);
    });
  });

  describe('Edge cases', () => {
    it("should not let an unsampled parent from traceparent alone (Cloud Run's) switch tracing off", () => {
      expect(decide(1, remoteParent(false))).toBe(
        SamplingDecision.RECORD_AND_SAMPLED,
      );
      expect(decide(0, remoteParent(false))).toBe(SamplingDecision.NOT_RECORD);
    });

    it("should not let a sampled parent from traceparent alone (Cloud Run's on a scheduled job) keep every trace", () => {
      expect(decide(0, remoteParent(true))).toBe(SamplingDecision.NOT_RECORD);
      expect(decide(1, remoteParent(true))).toBe(
        SamplingDecision.RECORD_AND_SAMPLED,
      );
    });

    it('should decide the same for the same trace at the same rate, so the hops of a job agree', () => {
      const traceIds = Array.from({ length: 20 }, (_, i) =>
        i.toString(16).padStart(2, '0').repeat(16),
      );
      for (const traceId of traceIds) {
        const sampler = createTraceSampler(0.5);
        const first = sampler.shouldSample(
          remoteParent(true),
          traceId,
          'POST /jobs/x',
          SpanKind.SERVER,
          {},
          [],
        ).decision;
        const again = createTraceSampler(0.5).shouldSample(
          ROOT_CONTEXT,
          traceId,
          'POST /jobs/x',
          SpanKind.SERVER,
          {},
          [],
        ).decision;
        expect(again).toBe(first);
      }
    });
  });
});
