import { describe, it, expect } from '@rstest/core';
import { isHealthCheckPath } from './is-health-check-path';

describe('isHealthCheckPath', () => {
  describe('Standard use cases', () => {
    it('should match health probes and metrics scrapes', () => {
      expect(isHealthCheckPath('/health')).toBe(true);
      expect(isHealthCheckPath('/health/ping')).toBe(true);
      expect(isHealthCheckPath('/metrics')).toBe(true);
    });

    it('should not match other requests', () => {
      expect(isHealthCheckPath('/')).toBe(false);
      expect(isHealthCheckPath('/api/auth/login')).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should ignore the query string', () => {
      expect(isHealthCheckPath('/health?probe=alb')).toBe(true);
    });

    it('should not match paths that only start with the same letters', () => {
      expect(isHealthCheckPath('/healthy-recipes')).toBe(false);
      expect(isHealthCheckPath('/metrics-report')).toBe(false);
    });
  });
});
