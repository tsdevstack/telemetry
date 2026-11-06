import { describe, it, expect } from '@rstest/core';
import { toXrayTraceId } from './to-xray-trace-id';

describe('toXrayTraceId', () => {
  describe('Standard use cases', () => {
    it("should write a W3C trace ID in X-Ray's form", () => {
      expect(toXrayTraceId('5759e988bd862e3fe1be46a994272793')).toBe(
        '1-5759e988-bd862e3fe1be46a994272793',
      );
    });
  });

  describe('Edge cases', () => {
    it('should be undefined for anything else', () => {
      expect(toXrayTraceId('')).toBeUndefined();
      expect(
        toXrayTraceId('1-5759e988-bd862e3fe1be46a994272793'),
      ).toBeUndefined();
      expect(toXrayTraceId('5759E988BD862E3FE1BE46A994272793')).toBeUndefined();
    });
  });
});
