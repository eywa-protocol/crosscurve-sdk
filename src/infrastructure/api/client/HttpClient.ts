/**
 * @fileoverview Core HTTP client using fetch API
 */

import { ApiError, NetworkError } from '../errors/index.js';
import { RetryHandler } from './RetryHandler.js';
import { RequestBuilder } from './RequestBuilder.js';

/**
 * HTTP client configuration
 */
export interface HttpClientConfig {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
}

/**
 * Core HTTP client implementation
 */
export class HttpClient {
  private readonly retryHandler: RetryHandler;
  private readonly timeout: number;

  constructor(private readonly config: HttpClientConfig) {
    this.retryHandler = new RetryHandler();
    this.timeout = config.timeout ?? 90000; // 1.5 minutes default
  }

  /**
   * Execute GET request
   */
  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = RequestBuilder.buildUrl(this.config.baseUrl, path, params);
    const headers = RequestBuilder.buildPartnerHeaders(this.config.apiKey);
    const options = RequestBuilder.buildGetOptions(headers);

    return this.retryHandler.execute(async () => {
      return this.fetchWithTimeout<T>(url, options);
    });
  }

  /**
   * Execute POST request
   */
  async post<T>(path: string, body: any): Promise<T> {
    const url = RequestBuilder.buildUrl(this.config.baseUrl, path);
    const headers = RequestBuilder.buildPartnerHeaders(this.config.apiKey);
    const options = RequestBuilder.buildPostOptions(body, headers);

    return this.retryHandler.execute(async () => {
      return this.fetchWithTimeout<T>(url, options);
    });
  }

  /**
   * Fetch with timeout
   */
  private async fetchWithTimeout<T>(url: string, options: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        let errorData: { message?: string; code?: string } | string;
        try {
          errorData = JSON.parse(errorBody);
        } catch {
          errorData = errorBody;
        }

        const message = typeof errorData === 'object' && errorData?.message
          ? errorData.message
          : `HTTP ${response.status}: ${response.statusText}`;

        // Sanitize error data - only include safe fields
        const sanitizedData = typeof errorData === 'object' && errorData !== null
          ? { message: errorData.message, code: errorData.code }
          : { message: errorBody };

        throw new ApiError(message, response.status, sanitizedData);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ApiError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new NetworkError(`Request timeout after ${this.timeout}ms`);
      }

      throw new NetworkError(`Network request failed: ${(error as Error).message}`, error as Error);
    }
  }
}
