import { substituteVariablesInRequest } from '../utils/variableSubstitution';
import { AuthConfig, RequestBody } from '../../shared/models';

export interface RequestPayload {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: RequestBody;
  auth?: AuthConfig;
}

export interface ResponseData {
  body: string;
  status: string;
  headers: Record<string, string>;
  time?: number;
  isError?: boolean;
  errorType?: 'network' | 'timeout' | 'invalid_url' | 'unknown' | 'unresolved_variables';
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
        // Check if this is due to unresolved variables
        const hasUnresolvedVars = substitutedPayload.url.includes('{{') && substitutedPayload.url.includes('}}');

        if (hasUnresolvedVars) {
          return {
            body: `Invalid URL: "${substitutedPayload.url}"

This URL contains unresolved environment variables (e.g., {{port}}).
This usually means the environment is not selected or the variable is not defined.

Please check:
1. You have selected an environment in the request panel or sidebar
2. The environment contains all required variables
3. The variable names are spelled correctly`,
            status: 'Invalid URL',
            headers: {},
            isError: true,
            errorType: 'unresolved_variables' as const
          };
        } else {
          return {
            body: `Invalid URL: "${substitutedPayload.url}"\n\nPlease enter a valid URL starting with http:// or https://`,
            status: 'Invalid URL',
            headers: {},
            isError: true,
            errorType: 'invalid_url' as const
          };
        }
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
          const credentials = btoa(`${auth.basic.username}:${auth.basic.password}`);
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
      if (substitutedPayload.body && substitutedPayload.body.mode !== 'none' && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(substitutedPayload.method)) {
        const body = substitutedPayload.body;

        if (body.mode === 'raw') {
          // Set appropriate content-type if not already set
          if (!headers['Content-Type']) {
            if (body.rawType === 'json') {
              headers['Content-Type'] = 'application/json';
            } else if (body.rawType === 'html') {
              headers['Content-Type'] = 'text/html';
            } else if (body.rawType === 'xml') {
              headers['Content-Type'] = 'application/xml';
            } else if (body.rawType === 'text' || body.rawType === 'javascript') {
              headers['Content-Type'] = 'text/plain';
            }
          }
          options.body = body.value;
        } else if (body.mode === 'form-data') {
          const formData = new FormData();
          body.rows.forEach((row: any) => {
            if (row.active && row.key) {
              formData.append(row.key, row.value || '');
            }
          });
          // Do NOT set Content-Type for form-data, let fetch handle it with boundary
          options.body = formData;
        } else if (body.mode === 'x-www-form-urlencoded') {
          const params = new URLSearchParams();
          body.rows.forEach((row: any) => {
            if (row.active && row.key) {
              params.append(row.key, row.value || '');
            }
          });
          if (!headers['Content-Type']) {
            headers['Content-Type'] = 'application/x-www-form-urlencoded';
          }
          options.body = params.toString();
        }
      }

      const startTime = Date.now();
      const response = await fetch(parsedUrl.toString(), options);
      const text = await response.text();
      const endTime = Date.now();
      const duration = endTime - startTime;

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      return {
        body: text,
        status: `${response.status} ${response.statusText}`,
        headers: responseHeaders,
        time: duration,
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