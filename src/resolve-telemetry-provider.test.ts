import { describe, it, expect } from '@rstest/core';
import { resolveTelemetryProvider } from './resolve-telemetry-provider';

describe('resolveTelemetryProvider', () => {
  describe('Standard use cases', () => {
    it('should name the cloud', () => {
      expect(resolveTelemetryProvider('gcp')).toBe('gcp');
      expect(resolveTelemetryProvider('aws')).toBe('aws');
      expect(resolveTelemetryProvider('azure')).toBe('azure');
    });

    it('should be local when unset or local', () => {
      expect(resolveTelemetryProvider(undefined)).toBe('local');
      expect(resolveTelemetryProvider('local')).toBe('local');
    });
  });

  describe('Edge cases', () => {
    it('should ignore case and spaces', () => {
      expect(resolveTelemetryProvider(' GCP ')).toBe('gcp');
    });

    it('should be local for an unknown value', () => {
      expect(resolveTelemetryProvider('k8s')).toBe('local');
    });
  });
});
