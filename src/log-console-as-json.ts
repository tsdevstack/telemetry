/**
 * In the cloud, turn console.debug, log, info, warn and error into one JSON
 * line each (formatConsoleLine): Next.js's own errors, written with
 * console.error, become one log entry with their stack, a level, and the
 * trace ID of the request. Locally (TELEMETRY_PROVIDER unset or `local`) the
 * console stays as it is.
 *
 * Call it once at startup, in the Node.js runtime: in a Next.js app, from
 * instrumentation.ts. A second call changes nothing.
 */

import { trace } from '@opentelemetry/api';
import { formatConsoleLine } from './format-console-line';
import { resolveTelemetryProvider } from './resolve-telemetry-provider';
import { CONSOLE_METHOD_LEVELS, JSON_CONSOLE_MARKER } from './constants/logs';
import type { TelemetryProvider } from './types';

export interface LogConsoleAsJsonOptions {
  /** The app's name on every line (`service`), as the services log it */
  serviceName: string;
  /** Default: TELEMETRY_PROVIDER */
  provider?: TelemetryProvider;
  /** Default: GCP_PROJECT_ID */
  gcpProjectId?: string;
}

/**
 * @returns true when it turned the console into JSON lines now
 */
export function logConsoleAsJson(options: LogConsoleAsJsonOptions): boolean {
  const provider = options.provider ?? resolveTelemetryProvider();
  const marked = console as unknown as Record<symbol, boolean>;
  if (provider === 'local' || marked[JSON_CONSOLE_MARKER]) {
    return false;
  }
  marked[JSON_CONSOLE_MARKER] = true;

  const gcpProjectId = options.gcpProjectId ?? process.env.GCP_PROJECT_ID;
  const methods = console as unknown as Record<
    string,
    (...args: unknown[]) => void
  >;

  for (const [method, level] of Object.entries(CONSOLE_METHOD_LEVELS)) {
    // warn and error keep writing to stderr, the rest to stdout
    const stream =
      level === 'warn' || level === 'error' ? process.stderr : process.stdout;
    methods[method] = (...args: unknown[]): void => {
      stream.write(
        formatConsoleLine(level, args, {
          serviceName: options.serviceName,
          provider,
          gcpProjectId,
          spanContext: trace.getActiveSpan()?.spanContext(),
          time: new Date(),
        }) + '\n',
      );
    };
  }

  return true;
}
