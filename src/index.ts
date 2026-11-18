export { registerTelemetry } from './register-telemetry';
export { injectTraceContext } from './inject-trace-context';
export { resolveTelemetryProvider } from './resolve-telemetry-provider';
export { toXrayTraceId } from './to-xray-trace-id';
export { logConsoleAsJson } from './log-console-as-json';
export type { LogConsoleAsJsonOptions } from './log-console-as-json';
export { buildTraceLogFields } from './build-trace-log-fields';
export { toGcpSeverity } from './to-gcp-severity';
export type {
  RegisterTelemetryOptions,
  TelemetryHandle,
  TelemetryProvider,
} from './types';
