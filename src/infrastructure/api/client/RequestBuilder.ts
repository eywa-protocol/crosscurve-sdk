/**
 * @fileoverview HTTP request construction helpers
 */

/**
 * Allowed API hosts for security
 * Users can override via config if needed
 */
const ALLOWED_HOSTS = [
  'api.crosscurve.io',
  'api.crosscurve.fi', // Test/staging
  'localhost',
];

/**
 * Request builder for API calls
 */
export class RequestBuilder {
  /**
   * Build fetch options for JSON POST request
   */
  static buildPostOptions(body: any, headers?: Record<string, string>): RequestInit {
    return {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    };
  }

  /**
   * Build fetch options for GET request
   */
  static buildGetOptions(headers?: Record<string, string>): RequestInit {
    return {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };
  }

  /**
   * Build URL with query parameters
   * @throws Error if baseUrl is invalid or uses untrusted host
   */
  static buildUrl(baseUrl: string, path: string, params?: Record<string, string>): string {
    // Validate baseUrl format
    let parsedBase: URL;
    try {
      parsedBase = new URL(baseUrl);
    } catch {
      throw new Error(`Invalid base URL: ${baseUrl}`);
    }

    // Validate host is allowed
    if (!ALLOWED_HOSTS.includes(parsedBase.hostname)) {
      throw new Error(
        `Untrusted API host: ${parsedBase.hostname}. Allowed hosts: ${ALLOWED_HOSTS.join(', ')}`
      );
    }

    const url = new URL(path, baseUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }
    return url.toString();
  }

  /**
   * Build partner/integrator headers for fee sharing
   */
  static buildPartnerHeaders(apiKey?: string): Record<string, string> {
    if (!apiKey) return {};
    return {
      'X-Integrator-Id': apiKey,
    };
  }
}
