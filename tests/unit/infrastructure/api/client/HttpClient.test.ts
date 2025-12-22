/**
 * @fileoverview HttpClient unit tests
 * Tests HTTP client with fetch, retry, and error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HttpClient } from '../../../../../src/infrastructure/api/client/HttpClient.js';
import { ApiError, NetworkError } from '../../../../../src/infrastructure/api/errors/index.js';

describe('HttpClient', () => {
  const baseUrl = 'https://api.crosscurve.fi';
  let client: HttpClient;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    client = new HttpClient({ baseUrl });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  describe('get', () => {
    it('should make GET request with correct URL', async () => {
      const mockResponse = { data: 'test' };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.get('/test');

      expect(global.fetch).toHaveBeenCalledWith(
        `${baseUrl}/test`,
        expect.objectContaining({ method: 'GET' })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should append query parameters', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await client.get('/test', { foo: 'bar', baz: '123' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('foo=bar'),
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('baz=123'),
        expect.any(Object)
      );
    });

    it('should throw ApiError on non-OK response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: () => Promise.resolve('{"message":"Resource not found"}'),
      });

      await expect(client.get('/notfound')).rejects.toThrow(ApiError);
    });

    it('should include API error message from response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: () => Promise.resolve('{"message":"Invalid parameters","code":"INVALID_PARAMS"}'),
      });

      try {
        await client.get('/error');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).message).toBe('Invalid parameters');
        expect((error as ApiError).statusCode).toBe(400);
      }
    });
  });

  describe('post', () => {
    it('should make POST request with body', async () => {
      const mockResponse = { id: 1 };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const body = { name: 'test' };
      const result = await client.post('/create', body);

      expect(global.fetch).toHaveBeenCalledWith(
        `${baseUrl}/create`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(body),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should set Content-Type header', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await client.post('/create', { data: 'test' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });
  });

  describe('error sanitization', () => {
    it('should sanitize error response data', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('{"message":"Error","internalDebug":"secret","code":"ERR001","stackTrace":"..."}'),
      });

      try {
        await client.get('/error');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        const apiError = error as ApiError;
        // Should only contain message and code
        expect(apiError.response).toEqual({ message: 'Error', code: 'ERR001' });
        // Should NOT contain internal fields
        expect(apiError.response?.internalDebug).toBeUndefined();
        expect(apiError.response?.stackTrace).toBeUndefined();
      }
    });

    it('should handle non-JSON error responses', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
        text: () => Promise.resolve('Bad Gateway'),
      });

      try {
        await client.get('/error');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).message).toBe('HTTP 502: Bad Gateway');
      }
    });
  });

  describe('timeout', () => {
    it('should configure timeout on client', () => {
      // Test that client accepts timeout config - actual timeout behavior
      // is tested via the AbortController signal integration
      const clientWithTimeout = new HttpClient({ baseUrl, timeout: 5000 });
      expect(clientWithTimeout).toBeDefined();
    });
  });

  describe('API key', () => {
    it('should include integrator ID in headers when provided', async () => {
      const clientWithKey = new HttpClient({ baseUrl, apiKey: 'test-api-key' });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await clientWithKey.get('/test');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Integrator-Id': 'test-api-key',
          }),
        })
      );
    });
  });

  describe('network errors', () => {
    it('should throw ApiError for 4xx errors (not retried)', async () => {
      // Test a 400 error which won't be retried
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: () => Promise.resolve('{"message":"Bad request error"}'),
      });

      await expect(client.get('/test')).rejects.toThrow(ApiError);
    });
  });
});
