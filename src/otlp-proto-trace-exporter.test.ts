import { describe, it, expect, rs, beforeEach, afterEach } from '@rstest/core';
import { ExportResultCode, type ExportResult } from '@opentelemetry/core';
import {
  InMemorySpanExporter,
  SimpleSpanProcessor,
  TracerProvider,
  type ReadableSpan,
} from '@opentelemetry/sdk-trace';
import { OtlpProtoTraceExporter } from './otlp-proto-trace-exporter';

const URL = 'http://localhost:4318/v1/traces';

function makeSpans(): ReadableSpan[] {
  const memory = new InMemorySpanExporter();
  const provider = new TracerProvider({
    spanProcessors: [new SimpleSpanProcessor({ exporter: memory })],
  });
  provider.getTracer('test').startSpan('GET /x').end();
  return memory.getFinishedSpans();
}

function exportOnce(exporter: OtlpProtoTraceExporter): Promise<ExportResult> {
  return new Promise((resolve) => exporter.export(makeSpans(), resolve));
}

describe('OtlpProtoTraceExporter', () => {
  const mockFetch = rs.fn();

  beforeEach(() => {
    mockFetch.mockReset();
    rs.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    rs.unstubAllGlobals();
  });

  describe('Standard use cases', () => {
    it('should POST the spans as protobuf with the extra headers', async () => {
      mockFetch.mockResolvedValue(new Response(null, { status: 200 }));
      const getHeaders = rs
        .fn()
        .mockResolvedValue({ authorization: 'Bearer t' });
      const exporter = new OtlpProtoTraceExporter({
        url: URL,
        getHeaders,
        onExportError: rs.fn(),
      });

      const result = await exportOnce(exporter);

      expect(result.code).toBe(ExportResultCode.SUCCESS);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(URL);
      expect(init.method).toBe('POST');
      expect(init.headers).toEqual({
        'content-type': 'application/x-protobuf',
        authorization: 'Bearer t',
      });
      expect(init.body).toBeInstanceOf(Uint8Array);
      expect(init.body.length).toBeGreaterThan(0);
      expect(getHeaders).toHaveBeenCalledWith(URL, init.body);
    });

    it('should say once that sending fails, and again after a success', async () => {
      const onExportError = rs.fn();
      const exporter = new OtlpProtoTraceExporter({ url: URL, onExportError });

      mockFetch.mockResolvedValue(
        new Response('Permission denied', { status: 403 }),
      );
      const failed = await exportOnce(exporter);
      await exportOnce(exporter);
      expect(failed.code).toBe(ExportResultCode.FAILED);
      expect(onExportError).toHaveBeenCalledTimes(1);
      expect(onExportError).toHaveBeenCalledWith(
        `Sending traces to ${URL} failed: HTTP 403: Permission denied`,
      );

      mockFetch.mockResolvedValue(new Response(null, { status: 200 }));
      await exportOnce(exporter);
      mockFetch.mockRejectedValue(new Error('connect ECONNREFUSED'));
      await exportOnce(exporter);
      expect(onExportError).toHaveBeenCalledTimes(2);
      expect(onExportError).toHaveBeenLastCalledWith(
        `Sending traces to ${URL} failed: connect ECONNREFUSED`,
      );
    });
  });

  describe('Edge cases', () => {
    it('should fail when the headers cannot be made', async () => {
      const onExportError = rs.fn();
      const exporter = new OtlpProtoTraceExporter({
        url: URL,
        getHeaders: rs.fn().mockRejectedValue(new Error('no credentials')),
        onExportError,
      });

      const result = await exportOnce(exporter);

      expect(result.code).toBe(ExportResultCode.FAILED);
      expect(mockFetch).not.toHaveBeenCalled();
      expect(onExportError).toHaveBeenCalledWith(
        `Sending traces to ${URL} failed: no credentials`,
      );
    });

    it('should wait for exports in flight on shutdown and refuse new ones', async () => {
      let answer: (response: Response) => void = () => undefined;
      mockFetch.mockReturnValue(
        new Promise<Response>((resolve) => {
          answer = resolve;
        }),
      );
      const exporter = new OtlpProtoTraceExporter({
        url: URL,
        onExportError: rs.fn(),
      });

      const inFlight = exportOnce(exporter);
      await Promise.resolve();
      const shutdown = exporter.shutdown();
      answer(new Response(null, { status: 200 }));
      await shutdown;

      expect((await inFlight).code).toBe(ExportResultCode.SUCCESS);
      expect((await exportOnce(exporter)).code).toBe(ExportResultCode.FAILED);
    });
  });
});
