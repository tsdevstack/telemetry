import { HEALTH_CHECK_PATH, METRICS_PATH } from './constants/telemetry';

/**
 * Whether a request path is a health probe or a metrics scrape: `/health`,
 * `/health/...` or `/metrics`. The query string is ignored.
 */
export function isHealthCheckPath(target: string): boolean {
  const pathname = target.split('?')[0];
  return (
    pathname === METRICS_PATH ||
    pathname === HEALTH_CHECK_PATH ||
    pathname.startsWith(`${HEALTH_CHECK_PATH}/`)
  );
}
