import { describe, it, expect, beforeEach, afterEach } from '@rstest/core';
import { buildTelemetryResource } from './build-telemetry-resource';

const ENV_KEYS = [
  'GCP_PROJECT_ID',
  'AWS_REGION',
  'OTEL_RESOURCE_ATTRIBUTES',
  'OTEL_SERVICE_NAME',
] as const;

describe('buildTelemetryResource', () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = saved[key];
      }
    }
  });

  describe('Standard use cases', () => {
    it('should name the service and version', () => {
      const resource = buildTelemetryResource({
        serviceName: 'auth-service',
        serviceVersion: '2.0.0',
        provider: 'local',
      });
      expect(resource.attributes['service.name']).toBe('auth-service');
      expect(resource.attributes['service.version']).toBe('2.0.0');
      expect(resource.attributes['cloud.provider']).toBeUndefined();
    });

    it('should carry the project on GCP', () => {
      process.env.GCP_PROJECT_ID = 'shop-dev';
      const resource = buildTelemetryResource({
        serviceName: 'auth-service',
        serviceVersion: '1.0.0',
        provider: 'gcp',
      });
      expect(resource.attributes['cloud.provider']).toBe('gcp');
      expect(resource.attributes['gcp.project_id']).toBe('shop-dev');
    });

    it('should carry the region on AWS and add OTEL_RESOURCE_ATTRIBUTES', () => {
      process.env.AWS_REGION = 'eu-west-1';
      process.env.OTEL_RESOURCE_ATTRIBUTES =
        'aws.log.group.names=/ecs/shop/auth-service';
      const resource = buildTelemetryResource({
        serviceName: 'auth-service',
        serviceVersion: '1.0.0',
        provider: 'aws',
      });
      expect(resource.attributes['cloud.provider']).toBe('aws');
      expect(resource.attributes['cloud.region']).toBe('eu-west-1');
      expect(resource.attributes['aws.log.group.names']).toBe(
        '/ecs/shop/auth-service',
      );
    });
  });

  describe('Edge cases', () => {
    it('should keep its own service name over OTEL_SERVICE_NAME', () => {
      process.env.OTEL_SERVICE_NAME = 'other';
      const resource = buildTelemetryResource({
        serviceName: 'auth-worker',
        serviceVersion: '1.0.0',
        provider: 'azure',
      });
      expect(resource.attributes['service.name']).toBe('auth-worker');
      expect(resource.attributes['cloud.provider']).toBe('azure');
    });

    it('should default the AWS region', () => {
      const resource = buildTelemetryResource({
        serviceName: 'auth-service',
        serviceVersion: '1.0.0',
        provider: 'aws',
      });
      expect(resource.attributes['cloud.region']).toBe('us-east-1');
    });
  });
});
