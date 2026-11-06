import type {
  Context,
  TextMapGetter,
  TextMapPropagator,
  TextMapSetter,
} from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';

/**
 * W3C trace context for outgoing calls only.
 *
 * For a process that takes requests straight from the internet (the
 * Next.js frontend): a traceparent sent by a browser or any other client is
 * ignored, so every request starts its own trace and outside clients can't
 * pick the trace or force sampling. Calls the process makes still carry its
 * trace (Kong keeps it for the frontend).
 */
export class OutgoingOnlyPropagator implements TextMapPropagator {
  private readonly w3c = new W3CTraceContextPropagator();

  inject(context: Context, carrier: unknown, setter: TextMapSetter): void {
    this.w3c.inject(context, carrier, setter);
  }

  extract(
    context: Context,
    _carrier: unknown,
    _getter: TextMapGetter,
  ): Context {
    return context;
  }

  fields(): string[] {
    return this.w3c.fields();
  }
}
