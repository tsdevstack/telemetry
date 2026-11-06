/** Where traces go when no cloud is set: Jaeger's OTLP port, locally */
export const DEFAULT_LOCAL_OTLP_ENDPOINT = 'http://localhost:4318';

/** OTLP path for traces, appended to an OTLP base endpoint */
export const OTLP_TRACES_PATH = '/v1/traces';

/** Content type of an OTLP/HTTP protobuf request */
export const OTLP_PROTOBUF_CONTENT_TYPE = 'application/x-protobuf';

/** Google's OTLP endpoint (Cloud Trace) */
export const GCP_OTLP_TRACES_URL = 'https://telemetry.googleapis.com/v1/traces';

/** OAuth scope for Google's OTLP endpoint (the scope Google's docs use) */
export const GCP_CLOUD_PLATFORM_SCOPE =
  'https://www.googleapis.com/auth/cloud-platform';

/** SigV4 signing name of X-Ray's OTLP endpoint */
export const AWS_XRAY_SIGNING_SERVICE = 'xray';

/** Entra scope for Azure Monitor's OTLP endpoint (a data collection rule) */
export const AZURE_MONITOR_SCOPE = 'https://monitor.azure.com/.default';

/** A kept Entra token is renewed this long before it expires */
export const AZURE_TOKEN_REFRESH_MARGIN_MS = 5 * 60_000;

/** Region used when AWS_REGION is not set */
export const AWS_DEFAULT_REGION = 'us-east-1';

/** How long one export request may take */
export const EXPORT_TIMEOUT_MS = 10_000;

/** How much of an error response goes into the export error message */
export const EXPORT_ERROR_BODY_LIMIT = 300;

/** Share of new traces kept when TRACE_SAMPLE_RATE is not set */
export const DEFAULT_TRACE_SAMPLE_RATE = 1;

/** Resource attributes set per cloud */
export const RESOURCE_ATTR_CLOUD_PROVIDER = 'cloud.provider';
export const RESOURCE_ATTR_CLOUD_REGION = 'cloud.region';
/** Google requires it on every span sent to telemetry.googleapis.com */
export const RESOURCE_ATTR_GCP_PROJECT_ID = 'gcp.project_id';

/** Health probes: load balancers and the platform call it every few seconds */
export const HEALTH_CHECK_PATH = '/health';

/** Metrics scrapes (Prometheus, locally) */
export const METRICS_PATH = '/metrics';

/**
 * Span attributes that hold a request's path when the span starts: the
 * current semantic convention, and the older one Next.js sets on its root
 * span (path plus query string)
 */
export const REQUEST_PATH_ATTRIBUTES = ['url.path', 'http.target'] as const;
