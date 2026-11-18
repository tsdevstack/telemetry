import { describe, it, expect } from '@rstest/core';
import {
  ROOT_CONTEXT,
  TraceFlags,
  defaultTextMapGetter,
  defaultTextMapSetter,
  trace,
  type Context,
} from '@opentelemetry/api';
import { TraceState } from '@opentelemetry/core';
import { PARENT_FROM_COPY_KEY } from './constants/telemetry';
import { TraceparentCopyPropagator } from './traceparent-copy-propagator';

const TRACE_ID = '5759e988bd862e3fe1be46a994272793';
/** What Kong (or the frontend) sent */
const KONG = `00-${TRACE_ID}-53995c3f42cd8ad8-00`;
/** What a platform in front made of it (Cloud Run): its own span, sampled */
const PLATFORM = `00-${TRACE_ID}-a1b2c3d4e5f60718-01`;

function extract(headers: Record<string, string>): Context {
  return new TraceparentCopyPropagator().extract(
    ROOT_CONTEXT,
    headers,
    defaultTextMapGetter,
  );
}

describe('TraceparentCopyPropagator', () => {
  describe('Standard use cases', () => {
    it('should write traceparent, tracestate and the copy', () => {
      const span = trace.wrapSpanContext({
        traceId: TRACE_ID,
        spanId: '7d0e9b68a33bca06',
        traceFlags: TraceFlags.SAMPLED,
        traceState: new TraceState('vendor=1'),
      });
      const headers: Record<string, string> = {};

      new TraceparentCopyPropagator().inject(
        trace.setSpan(ROOT_CONTEXT, span),
        headers,
        defaultTextMapSetter,
      );

      expect(headers).toEqual({
        traceparent: `00-${TRACE_ID}-7d0e9b68a33bca06-01`,
        tracestate: 'vendor=1',
        'x-tsdevstack-traceparent': `00-${TRACE_ID}-7d0e9b68a33bca06-01`,
      });
    });

    it("should continue the caller's copy over a rewritten traceparent", () => {
      const context = extract({
        traceparent: PLATFORM,
        'x-tsdevstack-traceparent': KONG,
      });

      expect(trace.getSpanContext(context)).toEqual({
        traceId: TRACE_ID,
        spanId: '53995c3f42cd8ad8',
        traceFlags: TraceFlags.NONE,
        isRemote: true,
      });
      expect(context.getValue(PARENT_FROM_COPY_KEY)).toBe(true);
    });

    it('should read traceparent as usual without a copy, unmarked', () => {
      const context = extract({ traceparent: PLATFORM });

      expect(trace.getSpanContext(context)?.spanId).toBe('a1b2c3d4e5f60718');
      expect(context.getValue(PARENT_FROM_COPY_KEY)).toBeUndefined();
    });
  });

  describe('Edge cases', () => {
    it('should fall back to traceparent when the copy is not valid', () => {
      const context = extract({
        traceparent: PLATFORM,
        'x-tsdevstack-traceparent': 'not-a-traceparent',
      });

      expect(trace.getSpanContext(context)?.spanId).toBe('a1b2c3d4e5f60718');
      expect(context.getValue(PARENT_FROM_COPY_KEY)).toBeUndefined();
    });

    it('should keep the request tracestate with the copy', () => {
      const context = extract({
        traceparent: PLATFORM,
        tracestate: 'vendor=1',
        'x-tsdevstack-traceparent': KONG,
      });

      expect(trace.getSpanContext(context)?.traceState?.get('vendor')).toBe(
        '1',
      );
    });

    it('should write nothing outside a trace', () => {
      const headers: Record<string, string> = {};

      new TraceparentCopyPropagator().inject(
        ROOT_CONTEXT,
        headers,
        defaultTextMapSetter,
      );

      expect(headers).toEqual({});
    });

    it('should name the headers it uses', () => {
      expect(new TraceparentCopyPropagator().fields()).toEqual([
        'traceparent',
        'tracestate',
        'x-tsdevstack-traceparent',
      ]);
    });
  });
});
