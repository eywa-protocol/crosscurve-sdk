/**
 * @fileoverview HTTP request construction helpers
 */

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
   */
  static buildUrl(baseUrl: string, path: string, params?: Record<string, string>): string {
    const url = new URL(path, baseUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }
    return url.toString();
  }

  /**
   * Build authorization headers
   */
  static buildAuthHeaders(apiKey?: string): Record<string, string> {
    if (!apiKey) return {};
    return {
      'Authorization': `Bearer ${apiKey}`,
    };
  }
}
