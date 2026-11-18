import { describe, it, expect } from '@rstest/core';
import { TraceFlags } from '@opentelemetry/api';
import { formatConsoleLine } from './format-console-line';

const TIME = new Date('2026-11-09T12:00:00.000Z');
const SPAN = {
  traceId: '5759e988bd862e3fe1be46a994272793',
  spanId: '53995c3f42cd8ad8',
  traceFlags: TraceFlags.SAMPLED,
};

function parse(line: string): Record<string, unknown> {
  return JSON.parse(line) as Record<string, unknown>;
}

describe('formatConsoleLine', () => {
  describe('Standard use cases', () => {
    it('should write the level, time, service and message', () => {
      expect(
        parse(
          formatConsoleLine('info', ['Server ready'], {
            serviceName: 'frontend',
            provider: 'aws',
            time: TIME,
          }),
        ),
      ).toEqual({
        level: 'info',
        time: '2026-11-09T12:00:00.000Z',
        service: 'frontend',
        msg: 'Server ready',
      });
    });

    it("should put Next.js's error in one line, with its stack, the trace and GCP's fields", () => {
      const error = new Error('fetch failed');
      const line = parse(
        formatConsoleLine('error', ['\u001b[31m⨯\u001b[39m', error], {
          serviceName: 'frontend',
          provider: 'gcp',
          gcpProjectId: 'shop-dev',
          spanContext: SPAN,
          time: TIME,
        }),
      );

      expect(line.level).toBe('error');
      expect(line.severity).toBe('ERROR');
      expect(line.msg).toBe('Error: fetch failed');
      expect(line.error).toEqual({
        name: 'Error',
        message: 'fetch failed',
        stack: error.stack,
      });
      expect(line.stack_trace).toBe(error.stack);
      expect(line.trace_id).toBe(SPAN.traceId);
      expect(line['logging.googleapis.com/trace']).toBe(
        `projects/shop-dev/traces/${SPAN.traceId}`,
      );
    });

    it("should give the trace ID in X-Ray's form on AWS, and no stack_trace", () => {
      const line = parse(
        formatConsoleLine('error', [new Error('boom')], {
          serviceName: 'frontend',
          provider: 'aws',
          spanContext: SPAN,
          time: TIME,
        }),
      );

      expect(line.xray_trace_id).toBe('1-5759e988-bd862e3fe1be46a994272793');
      expect(line.stack_trace).toBeUndefined();
      expect(line.severity).toBeUndefined();
    });
  });

  describe('Edge cases', () => {
    it('should apply format specifiers as console.log does', () => {
      expect(
        parse(
          formatConsoleLine('info', ['%s items in %dms', 'three', 42], {
            serviceName: 'frontend',
            provider: 'azure',
            time: TIME,
          }),
        ).msg,
      ).toBe('three items in 42ms');
    });

    it('should write an object on one line', () => {
      expect(
        parse(
          formatConsoleLine('warn', ['Slow', { path: '/cart', ms: 900 }], {
            serviceName: 'frontend',
            provider: 'azure',
            time: TIME,
          }),
        ).msg,
      ).toBe("Slow { path: '/cart', ms: 900 }");
    });

    it('should keep a message with line breaks in one line of output', () => {
      const line = formatConsoleLine('info', ['first\nsecond'], {
        serviceName: 'frontend',
        provider: 'aws',
        time: TIME,
      });

      expect(line).not.toContain('\n');
      expect(parse(line).msg).toBe('first\nsecond');
    });

    it('should leave the trace fields out without an active span', () => {
      const line = parse(
        formatConsoleLine('info', ['ok'], {
          serviceName: 'frontend',
          provider: 'gcp',
          gcpProjectId: 'shop-dev',
          time: TIME,
        }),
      );

      expect(line.trace_id).toBeUndefined();
      expect(line.severity).toBe('INFO');
    });
  });
});
