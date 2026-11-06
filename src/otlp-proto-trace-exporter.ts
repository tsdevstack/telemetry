import { ExportResultCode, type ExportResult } from '@opentelemetry/core';
import { ProtobufTraceSerializer } from '@opentelemetry/otlp-transformer';
import type { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace';
import {
  EXPORT_ERROR_BODY_LIMIT,
  EXPORT_TIMEOUT_MS,
  OTLP_PROTOBUF_CONTENT_TYPE,
} from './constants/telemetry';
import type { ExportHeadersFactory } from './types';

interface OtlpProtoTraceExporterOptions {
  /** Full traces URL (…/v1/traces) */
  url: string;
  /** Extra headers per request: a Google token, an AWS signature */
  getHeaders?: ExportHeadersFactory;
  /** Told once when sending starts failing, again after a success */
  onExportError: (message: string) => void;
}

/**
 * Sends spans as OTLP/HTTP protobuf, to Jaeger locally, to Google or to
 * X-Ray. One exporter for every destination: what differs is the URL and
 * the headers, computed per request because AWS signs the body.
 */
export class OtlpProtoTraceExporter implements SpanExporter {
  private failing = false;
  private stopped = false;
  private readonly pending = new Set<Promise<void>>();

  constructor(private readonly options: OtlpProtoTraceExporterOptions) {}

  export(
    spans: ReadableSpan[],
    resultCallback: (result: ExportResult) => void,
  ): void {
    if (this.stopped) {
      resultCallback({
        code: ExportResultCode.FAILED,
        error: new Error('The trace exporter is shut down'),
      });
      return;
    }

    const request: Promise<void> = this.send(spans)
      .then(
        () => {
          this.failing = false;
          resultCallback({ code: ExportResultCode.SUCCESS });
        },
        (error: unknown) => {
          const failure =
            error instanceof Error ? error : new Error(String(error));
          if (!this.failing) {
            this.failing = true;
            this.options.onExportError(
              `Sending traces to ${this.options.url} failed: ${failure.message}`,
            );
          }
          resultCallback({ code: ExportResultCode.FAILED, error: failure });
        },
      )
      .finally(() => {
        this.pending.delete(request);
      });
    this.pending.add(request);
  }

  async forceFlush(): Promise<void> {
    await Promise.all(this.pending);
  }

  async shutdown(): Promise<void> {
    this.stopped = true;
    await this.forceFlush();
  }

  private async send(spans: ReadableSpan[]): Promise<void> {
    const body = ProtobufTraceSerializer.serializeRequest(spans);
    if (!body) {
      throw new Error('the spans could not be serialized');
    }

    const extraHeaders = this.options.getHeaders
      ? await this.options.getHeaders(this.options.url, body)
      : {};
    const response = await fetch(this.options.url, {
      method: 'POST',
      headers: { 'content-type': OTLP_PROTOBUF_CONTENT_TYPE, ...extraHeaders },
      body,
      signal: AbortSignal.timeout(EXPORT_TIMEOUT_MS),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      const detail = text.trim().slice(0, EXPORT_ERROR_BODY_LIMIT);
      throw new Error(`HTTP ${response.status}${detail ? `: ${detail}` : ''}`);
    }
  }
}
