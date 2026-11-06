import { describe, it, expect, beforeEach, afterEach } from '@rstest/core';
import { resolveOtlpTracesUrl } from './resolve-otlp-traces-url';

const ENV_KEYS = [
  'OTEL_EXPORTER_OTLP_ENDPOINT',
  'OTEL_EXPORTER_OTLP_TRACES_ENDPOINT',
] as const;

describe('resolveOtlpTracesUrl', () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = saved[key];
      }
    }
  });

  describe('Standard use cases', () => {
    it('should add the traces path to the fallback', () => {
      expect(resolveOtlpTracesUrl(undefined, 'http://localhost:4318')).toBe(
        'http://localhost:4318/v1/traces',
      );
    });

    it('should prefer the option, then OTEL_EXPORTER_OTLP_ENDPOINT', () => {
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://jaeger:4318';
      expect(resolveOtlpTracesUrl(undefined, 'http://localhost:4318')).toBe(
        'http://jaeger:4318/v1/traces',
      );
      expect(resolveOtlpTracesUrl('http://other:4318/', undefined)).toBe(
        'http://other:4318/v1/traces',
      );
    });

    it('should use OTEL_EXPORTER_OTLP_TRACES_ENDPOINT as is', () => {
      process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT =
        'http://agent:4318/custom/traces';
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://jaeger:4318';
      expect(resolveOtlpTracesUrl(undefined, undefined)).toBe(
        'http://agent:4318/custom/traces',
      );
    });
  });

  describe('Edge cases', () => {
    it('should be undefined without any endpoint', () => {
      expect(resolveOtlpTracesUrl(undefined, undefined)).toBeUndefined();
    });
  });
});
