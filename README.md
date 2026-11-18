# @tsdevstack/telemetry

Traces for tsdevstack services and Next.js frontends. One [OpenTelemetry](https://opentelemetry.io/) setup that sends traces to Cloud Trace (GCP), X-Ray (AWS) or Azure Monitor in the cloud, and to Jaeger locally. Each service signs in with its own cloud identity: no keys, no connection strings.

NestJS services and workers get it through `@tsdevstack/nest-common`, with nothing to call. Next.js frontends call it from `instrumentation.ts`.

## Installation

```bash
npm install @tsdevstack/telemetry
```

## Next.js

```typescript
// instrumentation.ts
import packageJson from './package.json';

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { registerTelemetry, logConsoleAsJson } = await import(
      '@tsdevstack/telemetry'
    );
    logConsoleAsJson({ serviceName: packageJson.name });
    registerTelemetry({
      serviceName: packageJson.name,
      serviceVersion: packageJson.version,
      continueIncomingTraces: false,
    });
  }
}
```

Pass the trace on to the services you call:

```typescript
import { injectTraceContext } from '@tsdevstack/telemetry';

client.interceptors.request.use(injectTraceContext);
```

## API

- `registerTelemetry(options?)`: registers the tracer provider, the async context and the W3C `traceparent` propagator (which also sends and reads a copy of `traceparent` in `X-Tsdevstack-Traceparent`, since Cloud Run's front end can rewrite `traceparent`; a request with the copy follows that hop's decision, kept or dropped). Options: `serviceName`, `serviceVersion`, `provider` (`gcp`, `aws`, `azure`, `local`; default `TELEMETRY_PROVIDER`), `endpoint` (local OTLP endpoint), `continueIncomingTraces` (default `true`), `onExportError`. Returns `{ forceFlush(), shutdown() }`.
- `injectTraceContext(config)`: an axios request interceptor that writes `traceparent` and its copy.
- `resolveTelemetryProvider(value?)`: the cloud the process runs on.
- `toXrayTraceId(traceId)`: a W3C trace ID in X-Ray's form.
- `logConsoleAsJson({ serviceName, provider?, gcpProjectId? })`: in the cloud, turns `console.debug`, `log`, `info`, `warn` and `error` into one JSON line each (`level`, `time`, `service`, `msg`, the active span's trace fields, and the first error's `name`, `message` and `stack`; on GCP also `severity` and `stack_trace` for Error Reporting). Next.js's own server errors become one entry each. Locally it changes nothing.
- `buildTraceLogFields(spanContext, provider, gcpProjectId)` and `toGcpSeverity(level)`: the trace fields and the GCP severity of a log line.

The tsdevstack deploy sets the variables the package reads: `TELEMETRY_PROVIDER`, `TRACE_SAMPLE_RATE` (0 to 1, default 1), and per cloud `GCP_PROJECT_ID`, `AWS_REGION` or `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`. Locally, traces go to `OTEL_EXPORTER_OTLP_ENDPOINT`, else `http://localhost:4318`.

## Documentation

- [Traces and Dashboards](https://tsdevstack.dev/docs/features/traces-and-dashboards)
- [Package reference](https://tsdevstack.dev/docs/packages/telemetry)

## Community

Join the Discord: [discord.gg/2EMFkqc8QR](https://discord.gg/2EMFkqc8QR)

## License

Apache-2.0
