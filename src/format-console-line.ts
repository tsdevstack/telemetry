/**
 * One console call as a JSON line, the shape of the services' log lines:
 * level, time, service, the trace fields of the active span, msg, and the
 * first Error's name, message and stack under `error`. On GCP also the
 * severity, and the stack in `stack_trace`, where Error Reporting reads it
 * first. The message is the arguments as console.log would join them, an
 * Error as "Name: message", without color codes or Next.js's leading marker.
 */

import { formatWithOptions, stripVTControlCharacters } from 'node:util';
import type { SpanContext } from '@opentelemetry/api';
import { buildTraceLogFields } from './build-trace-log-fields';
import { toGcpSeverity } from './to-gcp-severity';
import {
  GCP_ERROR_REPORTING_STACK_FIELD,
  NEXTJS_LOG_MARKER_PATTERN,
} from './constants/logs';
import type { TelemetryProvider } from './types';

export interface ConsoleLineContext {
  serviceName: string;
  provider: TelemetryProvider;
  /** GCP only: links the line to its trace in Cloud Trace */
  gcpProjectId?: string;
  /** The active span, when there is one */
  spanContext?: SpanContext;
  time: Date;
}

export function formatConsoleLine(
  level: string,
  args: unknown[],
  context: ConsoleLineContext,
): string {
  const error = args.find((arg): arg is Error => arg instanceof Error);
  const msg = stripVTControlCharacters(
    formatWithOptions(
      { colors: false, breakLength: Infinity },
      ...args.map((arg) =>
        arg instanceof Error ? `${arg.name}: ${arg.message}` : arg,
      ),
    ),
  ).replace(NEXTJS_LOG_MARKER_PATTERN, '');

  const line: Record<string, unknown> = {
    level,
    ...(context.provider === 'gcp' && { severity: toGcpSeverity(level) }),
    time: context.time.toISOString(),
    service: context.serviceName,
    ...(context.spanContext &&
      buildTraceLogFields(
        context.spanContext,
        context.provider,
        context.gcpProjectId,
      )),
    msg,
  };
  if (error) {
    line.error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
    if (context.provider === 'gcp' && error.stack) {
      line[GCP_ERROR_REPORTING_STACK_FIELD] = error.stack;
    }
  }

  return JSON.stringify(line);
}
