import { context, propagation } from '@opentelemetry/api';

interface RequestConfigWithHeaders {
  headers?: object;
}

/**
 * Axios request interceptor: writes the current trace (traceparent) into
 * the request, so the called service continues it. Added to the generated
 * service clients; a call outside any trace gets no header.
 *
 * @example
 * client.instance.interceptors.request.use(injectTraceContext);
 */
export function injectTraceContext<T extends RequestConfigWithHeaders>(
  config: T,
): T {
  if (config.headers) {
    propagation.inject(context.active(), config.headers);
  }
  return config;
}
