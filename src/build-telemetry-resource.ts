import type { Attributes } from '@opentelemetry/api';
import {
  detectResources,
  envDetector,
  resourceFromAttributes,
  type Resource,
} from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import {
  AWS_DEFAULT_REGION,
  RESOURCE_ATTR_CLOUD_PROVIDER,
  RESOURCE_ATTR_CLOUD_REGION,
  RESOURCE_ATTR_GCP_PROJECT_ID,
} from './constants/telemetry';
import type { TelemetryProvider } from './types';

interface TelemetryResourceParams {
  serviceName: string;
  serviceVersion: string;
  provider: TelemetryProvider;
}

/**
 * What every span says about its process: service name and version, the
 * cloud, and on GCP the project (Google rejects spans without it).
 * OTEL_RESOURCE_ATTRIBUTES adds more (AWS: the log group, so X-Ray finds a
 * trace's logs); the service name and version set here win.
 */
export function buildTelemetryResource(
  params: TelemetryResourceParams,
): Resource {
  const attributes: Attributes = {
    [ATTR_SERVICE_NAME]: params.serviceName,
    [ATTR_SERVICE_VERSION]: params.serviceVersion,
  };

  if (params.provider === 'gcp') {
    attributes[RESOURCE_ATTR_CLOUD_PROVIDER] = 'gcp';
    if (process.env.GCP_PROJECT_ID) {
      attributes[RESOURCE_ATTR_GCP_PROJECT_ID] = process.env.GCP_PROJECT_ID;
    }
  } else if (params.provider === 'aws') {
    attributes[RESOURCE_ATTR_CLOUD_PROVIDER] = 'aws';
    attributes[RESOURCE_ATTR_CLOUD_REGION] =
      process.env.AWS_REGION || AWS_DEFAULT_REGION;
  } else if (params.provider === 'azure') {
    attributes[RESOURCE_ATTR_CLOUD_PROVIDER] = 'azure';
  }

  return detectResources({ detectors: [envDetector] }).merge(
    resourceFromAttributes(attributes),
  );
}
