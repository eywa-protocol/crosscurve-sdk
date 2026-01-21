import { describe, it, expect } from 'vitest';
import { RequestBuilder } from '../../../../../src/infrastructure/api/client/RequestBuilder.js';

describe('RequestBuilder', () => {
  describe('buildPartnerHeaders', () => {
    it('should use api-key header name', () => {
      const headers = RequestBuilder.buildPartnerHeaders('my-api-key');

      expect(headers).toHaveProperty('api-key', 'my-api-key');
      expect(headers).not.toHaveProperty('X-Integrator-Id');
    });

    it('should return empty object when no apiKey provided', () => {
      const headers = RequestBuilder.buildPartnerHeaders(undefined);

      expect(headers).toEqual({});
    });

    it('should return empty object for empty string apiKey', () => {
      const headers = RequestBuilder.buildPartnerHeaders('');

      expect(headers).toEqual({});
    });
  });
});
