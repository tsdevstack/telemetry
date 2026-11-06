import { describe, it, expect, beforeAll, afterAll } from '@rstest/core';
import {
  ROOT_CONTEXT,
  TraceFlags,
  context,
  propagation,
  trace,
} from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { injectTraceContext } from './inject-trace-context';

const TRACE_ID = '5759e988bd862e3fe1be46a994272793';
const SPAN_ID = '53995c3f42cd8ad8';

describe('injectTraceContext', () => {
  beforeAll(() => {
    context.setGlobalContextManager(
      new AsyncLocalStorageContextManager().enable(),
    );
    propagation.setGlobalPropagator(new W3CTraceContextPropagator());
  });

  afterAll(() => {
    context.disable();
    propagation.disable();
  });

  describe('Standard use cases', () => {
    it('should write the current trace into the request', () => {
      const active = trace.setSpanContext(ROOT_CONTEXT, {
        traceId: TRACE_ID,
        spanId: SPAN_ID,
        traceFlags: TraceFlags.SAMPLED,
      });

      const config = context.with(active, () =>
        injectTraceContext({ headers: { 'x-api-key': 'k' } }),
      );

      expect(config.headers).toEqual({
        'x-api-key': 'k',
        traceparent: `00-${TRACE_ID}-${SPAN_ID}-01`,
      });
    });
  });

  describe('Edge cases', () => {
    it('should add nothing outside a trace', () => {
      expect(injectTraceContext({ headers: {} }).headers).toEqual({});
    });

    it('should leave a request without headers alone', () => {
      const config: { url: string; headers?: object } = { url: '/x' };
      expect(injectTraceContext(config)).toEqual({ url: '/x' });
    });
  });
});
