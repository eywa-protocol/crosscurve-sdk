/**
 * @fileoverview Core HTTP client using fetch API
 */

import { ApiError, NetworkError } from '../errors/index.js';
import { RetryHandler, type RetryConfig } from './RetryHandler.js';
import { RequestBuilder, type BuildUrlOptions } from './RequestBuilder.js';

/**
 * HTTP client configuration
 */
export interface HttpClientConfig {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
  /** Retry configuration */
  retry?: Partial<RetryConfig>;
  /** Security configuration */
  security?: {
    /** Additional allowed hosts beyond defaults */
    allowedHosts?: string[];
    /** Enforce HTTPS for non-local hosts (default: true) */
    enforceHttps?: boolean;
  };
}

/**
 * Core HTTP client implementation
 */
export class HttpClient {
  private readonly retryHandler: RetryHandler;
  private readonly timeout: number;
  private readonly securityOptions: BuildUrlOptions;

  constructor(private readonly config: HttpClientConfig) {
    // Build retry config from provided settings
    const retryConfig = config.retry ? {
      maxTotalTime: config.retry.maxTotalTime ?? 90000,
      initialDelay: config.retry.initialDelay ?? 1000,
      backoffMultiplier: config.retry.backoffMultiplier ?? 2,
    } : undefined;
    this.retryHandler = new RetryHandler(retryConfig);
    this.timeout = config.timeout ?? 90000; // 1.5 minutes default
    this.securityOptions = {
      allowedHosts: config.security?.allowedHosts,
      enforceHttps: config.security?.enforceHttps,
    };
  }

  /**
   * Execute GET request
   */
  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = RequestBuilder.buildUrl(this.config.baseUrl, path, params, this.securityOptions);
    const headers = RequestBuilder.buildPartnerHeaders(this.config.apiKey);
    const options = RequestBuilder.buildGetOptions(headers);

    return this.retryHandler.execute(async () => {
      return this.fetchWithTimeout<T>(url, options);
    });
  }

  /**
   * Execute POST request
   */
  async post<T>(path: string, body: unknown): Promise<T> {
    const url = RequestBuilder.buildUrl(this.config.baseUrl, path, undefined, this.securityOptions);
    const headers = RequestBuilder.buildPartnerHeaders(this.config.apiKey);
    const options = RequestBuilder.buildPostOptions(body, headers);

    return this.retryHandler.execute(async () => {
      return this.fetchWithTimeout<T>(url, options);
    });
  }

  /**
   * Stream NDJSON (newline-delimited JSON) from a POST endpoint.
   * Yields parsed objects as they arrive. No retry — streams are not idempotent.
   * Malformed lines yield { error: string } instead of throwing.
   */
  async *streamNdjson<T>(
    path: string,
    body: unknown,
    signal?: AbortSignal,
  ): AsyncGenerator<T | { error: string }> {
    const url = RequestBuilder.buildUrl(this.config.baseUrl, path, undefined, this.securityOptions);
    const headers = {
      'Content-Type': 'application/json',
      ...RequestBuilder.buildPartnerHeaders(this.config.apiKey),
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new ApiError(`HTTP ${response.status}: ${response.statusText}`, response.status, text);
    }

    if (!response.body) {
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            yield JSON.parse(trimmed) as T;
          } catch {
            yield { error: `parse error: ${trimmed}` };
          }
        }
      }

      if (buffer.trim()) {
        try {
          yield JSON.parse(buffer.trim()) as T;
        } catch {
          yield { error: `parse error: ${buffer.trim()}` };
        }
      }
    } finally {
      reader.releaseLock();
    }
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

        // Debug: Log full error for troubleshooting
        if (process.env.DEBUG_API_ERRORS === 'true') {
          console.error('[API Error Debug]', url, response.status, errorBody);
        }

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
