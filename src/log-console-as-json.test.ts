import { describe, it, expect, rs, beforeEach, afterEach } from '@rstest/core';
import { trace, TraceFlags, type Span } from '@opentelemetry/api';
import { logConsoleAsJson } from './log-console-as-json';
import { JSON_CONSOLE_MARKER } from './constants/logs';

const METHODS = ['debug', 'log', 'info', 'warn', 'error'] as const;
type ConsoleMethod = (typeof METHODS)[number];

describe('logConsoleAsJson', () => {
  const original = {} as Record<ConsoleMethod, (...args: unknown[]) => void>;
  let stdout: string[];
  let stderr: string[];

  beforeEach(() => {
    for (const method of METHODS) {
      original[method] = console[method];
    }
    stdout = [];
    stderr = [];
    rs.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      stdout.push(String(chunk));
      return true;
    });
    rs.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
      stderr.push(String(chunk));
      return true;
    });
  });

  afterEach(() => {
    for (const method of METHODS) {
      console[method] = original[method];
    }
    delete (console as unknown as Record<symbol, boolean>)[JSON_CONSOLE_MARKER];
    rs.restoreAllMocks();
  });

  describe('Standard use cases', () => {
    it('should turn console.error into one JSON line on stderr', () => {
      expect(
        logConsoleAsJson({ serviceName: 'frontend', provider: 'aws' }),
      ).toBe(true);

      console.error('⨯', new Error('boom'));

      expect(stderr).toHaveLength(1);
      expect(stderr[0].endsWith('\n')).toBe(true);
      const line = JSON.parse(stderr[0]) as Record<string, unknown>;
      expect(line).toMatchObject({
        level: 'error',
        service: 'frontend',
        msg: 'Error: boom',
      });
    });

    it('should write console.log, info and debug to stdout with their levels', () => {
      logConsoleAsJson({ serviceName: 'frontend', provider: 'azure' });

      console.log('a');
      console.info('b');
      console.debug('c');
      console.warn('d');

      expect(
        stdout.map((l) => (JSON.parse(l) as { level: string }).level),
      ).toEqual(['info', 'info', 'debug']);
      expect((JSON.parse(stderr[0]) as { level: string }).level).toBe('warn');
    });

    it("should add the active span's trace ID", () => {
      rs.spyOn(trace, 'getActiveSpan').mockReturnValue({
        spanContext: () => ({
          traceId: '5759e988bd862e3fe1be46a994272793',
          spanId: '53995c3f42cd8ad8',
          traceFlags: TraceFlags.SAMPLED,
        }),
      } as unknown as Span);
      logConsoleAsJson({
        serviceName: 'frontend',
        provider: 'gcp',
        gcpProjectId: 'shop-dev',
      });

      console.log('rendered /cart');

      expect(JSON.parse(stdout[0])).toMatchObject({
        trace_id: '5759e988bd862e3fe1be46a994272793',
        severity: 'INFO',
      });
    });
  });

  describe('Edge cases', () => {
    it('should leave the console as it is locally', () => {
      expect(
        logConsoleAsJson({ serviceName: 'frontend', provider: 'local' }),
      ).toBe(false);

      expect(console.error).toBe(original.error);
    });

    it('should change nothing on a second call', () => {
      logConsoleAsJson({ serviceName: 'frontend', provider: 'aws' });
      const installed = console.error;

      expect(logConsoleAsJson({ serviceName: 'other', provider: 'aws' })).toBe(
        false,
      );
      expect(console.error).toBe(installed);
    });

    it('should read the cloud from TELEMETRY_PROVIDER by default', () => {
      const saved = process.env.TELEMETRY_PROVIDER;
      delete process.env.TELEMETRY_PROVIDER;
      try {
        expect(logConsoleAsJson({ serviceName: 'frontend' })).toBe(false);
      } finally {
        if (saved !== undefined) process.env.TELEMETRY_PROVIDER = saved;
      }
    });
  });
});
