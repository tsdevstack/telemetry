import type { SpanExporter } from '@opentelemetry/sdk-trace';
import {
  AWS_DEFAULT_REGION,
  DEFAULT_LOCAL_OTLP_ENDPOINT,
  GCP_OTLP_TRACES_URL,
} from './constants/telemetry';
import { createAwsSignedHeaders } from './aws/create-aws-signed-headers';
import { createGcpAuthHeaders } from './gcp/create-gcp-auth-headers';
import { createAzureAuthHeaders } from './azure/create-azure-auth-headers';
import { OtlpProtoTraceExporter } from './otlp-proto-trace-exporter';
import { resolveOtlpTracesUrl } from './resolve-otlp-traces-url';
import type { TelemetryProvider } from './types';

interface TraceExporterParams {
  provider: TelemetryProvider;
  endpoint?: string;
  onExportError: (message: string) => void;
}

/**
 * Where spans go: Cloud Trace on GCP, X-Ray on AWS, Azure Monitor on Azure
 * (the data collection rule's OTLP URL, which the deploy sets as
 * OTEL_EXPORTER_OTLP_TRACES_ENDPOINT), Jaeger locally. Undefined when there
 * is nowhere to send them (Azure without that URL): spans still carry the
 * trace from service to service.
 */
export function createTraceExporter(
  params: TraceExporterParams,
): SpanExporter | undefined {
  const { provider, endpoint, onExportError } = params;

  if (provider === 'gcp') {
    return new OtlpProtoTraceExporter({
      url: GCP_OTLP_TRACES_URL,
      getHeaders: createGcpAuthHeaders(),
      onExportError,
    });
  }

  if (provider === 'aws') {
    const region = process.env.AWS_REGION || AWS_DEFAULT_REGION;
    return new OtlpProtoTraceExporter({
      url: `https://xray.${region}.amazonaws.com/v1/traces`,
      getHeaders: createAwsSignedHeaders(region),
      onExportError,
    });
  }

  const url = resolveOtlpTracesUrl(
    endpoint,
    provider === 'local' ? DEFAULT_LOCAL_OTLP_ENDPOINT : undefined,
  );
  if (!url) {
    return undefined;
  }
  if (provider === 'azure') {
    return new OtlpProtoTraceExporter({
      url,
      getHeaders: createAzureAuthHeaders(),
      onExportError,
    });
  }
  return new OtlpProtoTraceExporter({ url, onExportError });
}
