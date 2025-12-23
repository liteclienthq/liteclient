import { substituteVariablesInRequest } from '../utils/variableSubstitution';

export interface AuthConfig {
  type: 'none' | 'bearer' | 'basic' | 'apikey';
  bearer?: { token: string };
  basic?: { username: string; password: string };
  apikey?: { key: string; value: string; addTo: 'header' | 'query' };
}

export interface RequestPayload {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string | null;
  bodyType: string;
  auth?: AuthConfig;
}

export interface ResponseData {
  body: string;
  status: string;
  headers: Record<string, string>;
  isError?: boolean;
  errorType?: 'network' | 'timeout' | 'invalid_url' | 'unknown';
}

export class HttpRequestService {
  static async sendRequest(payload: RequestPayload, environmentVariables: Record<string, string> = {}): Promise<ResponseData> {
    try {
      // Perform variable substitution on the request payload
      const substitutedPayload = substituteVariablesInRequest(payload, environmentVariables);

      // Validate URL before making request
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(substitutedPayload.url);
      } catch {
        return {
          body: `Invalid URL: "${substitutedPayload.url}"\n\nPlease enter a valid URL starting with http:// or https://`,
          status: 'Invalid URL',
          headers: {},
          isError: true,
          errorType: 'invalid_url'
        };
      }

      // Check for supported protocols
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return {
          body: `Unsupported protocol: "${parsedUrl.protocol}"\n\nOnly http:// and https:// protocols are supported.`,
          status: 'Invalid Protocol',
          headers: {},
          isError: true,
          errorType: 'invalid_url'
        };
      }

      const headers: Record<string, string> = { ...(substitutedPayload.headers || {}) };

      // Apply authentication
      const auth = substitutedPayload.auth;
      if (auth && auth.type !== 'none') {
        if (auth.type === 'bearer' && auth.bearer?.token) {
          headers['Authorization'] = `Bearer ${auth.bearer.token}`;
        } else if (auth.type === 'basic' && auth.basic) {
          const credentials = Buffer.from(`${auth.basic.username}:${auth.basic.password}`).toString('base64');
          headers['Authorization'] = `Basic ${credentials}`;
        } else if (auth.type === 'apikey' && auth.apikey?.key && auth.apikey?.value) {
          if (auth.apikey.addTo === 'header') {
            headers[auth.apikey.key] = auth.apikey.value;
          } else if (auth.apikey.addTo === 'query') {
            // Add API key to query params
            parsedUrl.searchParams.set(auth.apikey.key, auth.apikey.value);
          }
        }
      }

      const options: RequestInit = {
        method: substitutedPayload.method,
        headers
      };

      // Only add body if it exists and method allows it
      if (substitutedPayload.body && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(substitutedPayload.method)) {
        // Set appropriate content-type if not already set
        if (substitutedPayload.bodyType === 'json' && !headers['Content-Type']) {
          headers['Content-Type'] = 'application/json';
        }
        options.body = substitutedPayload.body;
      }

      const response = await fetch(parsedUrl.toString(), options);
      const text = await response.text();

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      return {
        body: text,
        status: `${response.status} ${response.statusText}`,
        headers: responseHeaders,
        isError: response.status >= 400
      };
    } catch (error) {
      // Provide user-friendly error messages based on error type
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Network errors (DNS, connection refused, etc.)
      if (errorMessage.includes('fetch') ||
        errorMessage.includes('network') ||
        errorMessage.includes('ENOTFOUND') ||
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('Failed to fetch')) {
        return {
          body: `Network Error\n\nCould not connect to the server. Please check:\n• The URL is correct\n• The server is running\n• Your internet connection is active\n\nDetails: ${errorMessage}`,
          status: 'Network Error',
          headers: {},
          isError: true,
          errorType: 'network'
        };
      }

      // Timeout errors
      if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
        return {
          body: `Request Timeout\n\nThe server took too long to respond.\n\nDetails: ${errorMessage}`,
          status: 'Timeout',
          headers: {},
          isError: true,
          errorType: 'timeout'
        };
      }

      // Generic error fallback
      return {
        body: `Request Failed\n\nAn unexpected error occurred.\n\nDetails: ${errorMessage}`,
        status: 'Error',
        headers: {},
        isError: true,
        errorType: 'unknown'
      };
    }
  }
}