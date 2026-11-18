import {
  defaultTextMapSetter,
  type Context,
  type TextMapGetter,
  type TextMapPropagator,
  type TextMapSetter,
} from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import {
  PARENT_FROM_COPY_KEY,
  TRACEPARENT_COPY_HEADER,
} from './constants/telemetry';

const TRACEPARENT = 'traceparent';

/**
 * W3C trace context, with a copy of traceparent in TRACEPARENT_COPY_HEADER.
 *
 * A platform in front of a container can rewrite traceparent on the way:
 * Cloud Run points it at its own span, with its own sampling decision. The
 * copy passes untouched, so the callee continues the trace its caller sent.
 *
 * inject: traceparent and tracestate, and the copy of traceparent.
 * extract: the copy when the request has a valid one, marked in the context
 * (PARENT_FROM_COPY_KEY) so the sampler follows its decision; otherwise
 * traceparent as usual (a request that came past no framework hop).
 */
export class TraceparentCopyPropagator implements TextMapPropagator {
  private readonly w3c = new W3CTraceContextPropagator();

  inject(context: Context, carrier: unknown, setter: TextMapSetter): void {
    const written: Record<string, string> = {};
    this.w3c.inject(context, written, defaultTextMapSetter);
    for (const [key, value] of Object.entries(written)) {
      setter.set(carrier, key, value);
    }
    if (written[TRACEPARENT]) {
      setter.set(carrier, TRACEPARENT_COPY_HEADER, written[TRACEPARENT]);
    }
  }

  extract(context: Context, carrier: unknown, getter: TextMapGetter): Context {
    const copy = getter.get(carrier, TRACEPARENT_COPY_HEADER);
    if (copy !== undefined) {
      const fromCopy = this.w3c.extract(context, carrier, {
        keys: (c) => getter.keys(c),
        get: (c, key) => (key === TRACEPARENT ? copy : getter.get(c, key)),
      });
      // The W3C reader hands the context back unchanged when it rejects
      // the value: then traceparent is read as usual
      if (fromCopy !== context) {
        return fromCopy.setValue(PARENT_FROM_COPY_KEY, true);
      }
    }
    return this.w3c.extract(context, carrier, getter);
  }

  fields(): string[] {
    return [...this.w3c.fields(), TRACEPARENT_COPY_HEADER];
  }
}
