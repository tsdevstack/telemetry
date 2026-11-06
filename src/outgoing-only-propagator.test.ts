import { describe, it, expect } from '@rstest/core';
import {
  ROOT_CONTEXT,
  defaultTextMapGetter,
  defaultTextMapSetter,
  trace,
} from '@opentelemetry/api';
import { OutgoingOnlyPropagator } from './outgoing-only-propagator';

const TRACEPARENT = '00-5759e988bd862e3fe1be46a994272793-53995c3f42cd8ad8-01';

describe('OutgoingOnlyPropagator', () => {
  const propagator = new OutgoingOnlyPropagator();

  describe('Standard use cases', () => {
    it('should write the active trace into outgoing headers', () => {
      const span = trace.wrapSpanContext({
        traceId: '5759e988bd862e3fe1be46a994272793',
        spanId: '7d0e9b68a33bca06',
        traceFlags: 1,
      });
      const headers: Record<string, string> = {};

      propagator.inject(
        trace.setSpan(ROOT_CONTEXT, span),
        headers,
        defaultTextMapSetter,
      );

      expect(headers).toEqual({
        traceparent: '00-5759e988bd862e3fe1be46a994272793-7d0e9b68a33bca06-01',
      });
    });

    it("should not take the trace from a request's headers", () => {
      const context = propagator.extract(
        ROOT_CONTEXT,
        { traceparent: TRACEPARENT },
        defaultTextMapGetter,
      );

      expect(trace.getSpanContext(context)).toBeUndefined();
    });
  });

  describe('Edge cases', () => {
    it('should name the W3C header it writes', () => {
      expect(propagator.fields()).toContain('traceparent');
    });
  });
});
