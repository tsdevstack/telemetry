/** Where the process runs; decides where traces are sent */
export type TelemetryProvider = 'local' | 'gcp' | 'aws' | 'azure';

export interface RegisterTelemetryOptions {
  /**
   * service.name of every span.
   * Default: WORKER_NAME, then SERVICE_NAME, then 'unknown-service'
   */
  serviceName?: string;

  /** service.version of every span. Default: '1.0.0' */
  serviceVersion?: string;

  /**
   * Where the process runs. Default: the TELEMETRY_PROVIDER env var;
   * unset means local.
   */
  provider?: string;

  /**
   * OTLP base endpoint for local runs (on Azure, the deploy sets the full
   * traces URL as OTEL_EXPORTER_OTLP_TRACES_ENDPOINT instead).
   * Default: OTEL_EXPORTER_OTLP_ENDPOINT, else http://localhost:4318 locally
   */
  endpoint?: string;

  /**
   * Whether a request's incoming traceparent continues its trace. False for
   * a process that takes requests straight from the internet (the Next.js
   * frontend): it starts its own trace for every request, so outside
   * clients can't pick the trace; its outgoing calls still carry the trace.
   * Default: true (services behind Kong continue Kong's trace)
   */
  continueIncomingTraces?: boolean;

  /**
   * Called when sending traces starts failing, with what went wrong. Called
   * again only after a later export succeeded. Default: console.warn
   */
  onExportError?: (message: string) => void;
}

export interface TelemetryHandle {
  /** Sends the spans not sent yet */
  forceFlush(): Promise<void>;

  /** Sends the spans not sent yet and stops the tracer provider */
  shutdown(): Promise<void>;
}

/** Headers for one export request, from its body */
export type ExportHeadersFactory = (
  url: string,
  body: Uint8Array,
) => Promise<Record<string, string>>;
