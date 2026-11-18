/**
 * Log lines: the fields each cloud reads from a JSON line, shared by the
 * services' logger (nest-common) and the Next.js console (logConsoleAsJson)
 */

/**
 * Cloud Logging severity for each log level: GCP reads `severity` from a
 * JSON line, and the console colors and filters lines by it
 */
export const GCP_SEVERITY_BY_LEVEL: Readonly<Record<string, string>> = {
  trace: 'DEBUG',
  debug: 'DEBUG',
  info: 'INFO',
  warn: 'WARNING',
  error: 'ERROR',
  fatal: 'CRITICAL',
};

/** Fields Cloud Logging reads to link a line to its trace and span */
export const GCP_LOG_TRACE_FIELD = 'logging.googleapis.com/trace';
export const GCP_LOG_SPAN_ID_FIELD = 'logging.googleapis.com/spanId';
export const GCP_LOG_TRACE_SAMPLED_FIELD =
  'logging.googleapis.com/trace_sampled';

/** The first field Error Reporting reads a stack trace from in a JSON line */
export const GCP_ERROR_REPORTING_STACK_FIELD = 'stack_trace';

/** The level of each console method's lines */
export const CONSOLE_METHOD_LEVELS = {
  debug: 'debug',
  log: 'info',
  info: 'info',
  warn: 'warn',
  error: 'error',
} as const;

/** Marks a console already turned into JSON lines (shared across copies) */
export const JSON_CONSOLE_MARKER = Symbol.for(
  'tsdevstack.telemetry.jsonConsole',
);

/** The marker Next.js puts before its own lines (⨯ error, ⚠ warn, ...) */
export const NEXTJS_LOG_MARKER_PATTERN = /^[⨯⚠○✓»▲]\s+/u;
