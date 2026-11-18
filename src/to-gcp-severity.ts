import { GCP_SEVERITY_BY_LEVEL } from './constants/logs';

/**
 * The Cloud Logging severity for a log level label (pino's labels; DEFAULT
 * for any other)
 */
export function toGcpSeverity(level: string): string {
  return GCP_SEVERITY_BY_LEVEL[level] ?? 'DEFAULT';
}
