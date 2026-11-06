import { describe, it, expect, rs, beforeEach, afterEach } from '@rstest/core';

const {
  mockExporter,
  gcpHeaders,
  awsHeaders,
  azureHeaders,
  mockAwsSignedHeaders,
} = rs.hoisted(() => {
  const gcp = async () => ({ authorization: 'Bearer t' });
  const aws = async () => ({ authorization: 'AWS4-HMAC-SHA256 x' });
  const azure = async () => ({ authorization: 'Bearer entra' });
  return {
    mockExporter: rs.fn(),
    gcpHeaders: gcp,
    awsHeaders: aws,
    azureHeaders: azure,
    mockAwsSignedHeaders: rs.fn(() => aws),
  };
});

rs.mock('./otlp-proto-trace-exporter', () => ({
  OtlpProtoTraceExporter: class {
    constructor(options: unknown) {
      mockExporter(options);
    }
  },
}));
rs.mock('./gcp/create-gcp-auth-headers', () => ({
  createGcpAuthHeaders: () => gcpHeaders,
}));
rs.mock('./aws/create-aws-signed-headers', () => ({
  createAwsSignedHeaders: mockAwsSignedHeaders,
}));
rs.mock('./azure/create-azure-auth-headers', () => ({
  createAzureAuthHeaders: () => azureHeaders,
}));

import { createTraceExporter } from './create-trace-exporter';

const ENV_KEYS = [
  'AWS_REGION',
  'OTEL_EXPORTER_OTLP_ENDPOINT',
  'OTEL_EXPORTER_OTLP_TRACES_ENDPOINT',
] as const;

describe('createTraceExporter', () => {
  const saved: Record<string, string | undefined> = {};
  const onExportError = (): void => undefined;

  beforeEach(() => {
    rs.clearAllMocks();
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
    it("should send to Google's endpoint with a token on GCP", () => {
      createTraceExporter({ provider: 'gcp', onExportError });
      expect(mockExporter).toHaveBeenCalledWith({
        url: 'https://telemetry.googleapis.com/v1/traces',
        getHeaders: gcpHeaders,
        onExportError,
      });
    });

    it("should send to the region's X-Ray endpoint, signed, on AWS", () => {
      process.env.AWS_REGION = 'eu-west-1';
      createTraceExporter({ provider: 'aws', onExportError });
      expect(mockAwsSignedHeaders).toHaveBeenCalledWith('eu-west-1');
      expect(mockExporter).toHaveBeenCalledWith({
        url: 'https://xray.eu-west-1.amazonaws.com/v1/traces',
        getHeaders: awsHeaders,
        onExportError,
      });
    });

    it('should send to Jaeger locally', () => {
      createTraceExporter({ provider: 'local', onExportError });
      expect(mockExporter).toHaveBeenCalledWith({
        url: 'http://localhost:4318/v1/traces',
        onExportError,
      });
    });
  });

  describe('Edge cases', () => {
    it("should send to Azure Monitor's data collection rule with an Entra token", () => {
      const url =
        'https://dce.westeurope-1.ingest.monitor.azure.com/datacollectionRules/dcr-1/streams/Microsoft-OTLP-Traces/otlp/v1/traces';
      process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT = url;
      createTraceExporter({ provider: 'azure', onExportError });
      expect(mockExporter).toHaveBeenCalledWith({
        url,
        getHeaders: azureHeaders,
        onExportError,
      });
    });

    it('should send nowhere on Azure without the rule URL', () => {
      expect(
        createTraceExporter({ provider: 'azure', onExportError }),
      ).toBeUndefined();
      expect(mockExporter).not.toHaveBeenCalled();
    });
  });
});
