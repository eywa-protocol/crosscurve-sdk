/**
 * @fileoverview HTTP request construction helpers
 */

/**
 * Default allowed API hosts for security
 * localhost and 127.0.0.1 are only allowed for development (HTTP)
 */
const DEFAULT_ALLOWED_HOSTS = [
  'api.crosscurve.fi',
];

/**
 * Hosts allowed for local development (no HTTPS required)
 */
const LOCAL_HOSTS = ['localhost', '127.0.0.1'];

/**
 * Options for URL building with security configuration
 */
export interface BuildUrlOptions {
  /** Additional allowed hosts beyond defaults */
  allowedHosts?: string[];
  /** Enforce HTTPS for non-local hosts (default: true) */
  enforceHttps?: boolean;
}

/**
 * Request builder for API calls
 */
export class RequestBuilder {
  /**
   * Build fetch options for JSON POST request
   */
  static buildPostOptions(body: unknown, headers?: Record<string, string>): RequestInit {
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
   * @throws Error if baseUrl is invalid, uses untrusted host, or violates HTTPS requirement
   */
  static buildUrl(
    baseUrl: string,
    path: string,
    params?: Record<string, string>,
    options?: BuildUrlOptions
  ): string {
    // Validate baseUrl format
    let parsedBase: URL;
    try {
      parsedBase = new URL(baseUrl);
    } catch {
      throw new Error(`Invalid base URL: ${baseUrl}`);
    }

    const hostname = parsedBase.hostname;
    const isLocalHost = LOCAL_HOSTS.includes(hostname);

    // Build allowed hosts list from defaults + user config
    const configuredHosts = options?.allowedHosts ?? [];
    const allowedHosts = [...DEFAULT_ALLOWED_HOSTS, ...configuredHosts, ...LOCAL_HOSTS];

    // Validate host is allowed
    if (!allowedHosts.includes(hostname)) {
      throw new Error(
        `Untrusted API host: ${hostname}. Allowed hosts: ${allowedHosts.join(', ')}`
      );
    }

    // Enforce HTTPS for production hosts (non-localhost)
    const enforceHttps = options?.enforceHttps ?? true;
    if (enforceHttps && !isLocalHost && parsedBase.protocol !== 'https:') {
      throw new Error(
        `HTTPS required for production API host: ${hostname}. ` +
        `Use https:// or set enforceHttps: false for testing.`
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
      'api-key': apiKey,
    };
  }
}
