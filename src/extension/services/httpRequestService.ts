import { substituteVariablesInRequest } from '../utils/variableSubstitution';
import { AuthConfig, RequestBody, FormDataRow } from '../../shared/models';
import FormData from 'form-data';

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
  errorType?: 'network' | 'timeout' | 'invalid_url' | 'unknown' | 'unresolved_variables' | 'cancelled';
  setCookieHeaders?: string[];
}

export interface RequestOptions {
  signal?: AbortSignal;
  timeout?: number;
  cookieString?: string;
  resolvedOAuth2Token?: string;
}


export class HttpRequestService {
  private static readonly DEFAULT_TIMEOUT = 30000;
  private static readonly MAX_REDIRECTS = 20;

  static async sendRequest(
    payload: RequestPayload, 
    environmentVariables: Record<string, string> = {},
    options: RequestOptions = {}
  ): Promise<ResponseData> {
    const { signal, timeout = HttpRequestService.DEFAULT_TIMEOUT, cookieString } = options;
    
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), timeout);
    
    const combinedSignal = signal 
      ? AbortSignal.any([signal, timeoutController.signal])
      : timeoutController.signal;

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
      // Note: OAuth2 tokens should be resolved before calling sendRequest
      // The caller should get the access token and pass it via resolvedOAuth2Token option
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
            parsedUrl.searchParams.set(auth.apikey.key, auth.apikey.value);
          }
        } else if (auth.type === 'oauth2' && options.resolvedOAuth2Token) {
          headers['Authorization'] = `Bearer ${options.resolvedOAuth2Token}`;
        }
      }

      // Inject cookies from cookie jar if not already set by user
      if (cookieString && !headers['Cookie'] && !headers['cookie']) {
        headers['Cookie'] = cookieString;
      }

      const fetchOptions: RequestInit = {
        method: substitutedPayload.method,
        headers,
        signal: combinedSignal,
        redirect: 'manual'
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
          fetchOptions.body = body.value;
        } else if (body.mode === 'form-data') {
          const formData = new FormData();
          const sanitize = (s: string) => s.replace(/[\r\n"]/g, '_');
          
          body.rows.forEach((row: FormDataRow) => {
            if (row.active && row.key) {
              const rowType = row.type || 'text';
              const fieldName = sanitize(row.key);
              
              if (rowType === 'file') {
                if (row.file) {
                  const buffer = Buffer.from(row.file.data, 'base64');
                  formData.append(fieldName, buffer, {
                    filename: sanitize(row.file.name),
                    contentType: row.file.type || 'application/octet-stream'
                  });
                }
              } else {
                formData.append(fieldName, row.value || '');
              }
            }
          });
          
          const formHeaders = formData.getHeaders();
          for (const [key, value] of Object.entries(formHeaders)) {
            headers[key] = value;
          }
          fetchOptions.body = formData.getBuffer() as unknown as BodyInit;
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
          fetchOptions.body = params.toString();
        }
      }

      const startTime = Date.now();
      
      // Manual redirect handling to capture Set-Cookie headers from all redirects
      let currentUrl = parsedUrl.toString();
      let currentOptions = { ...fetchOptions };
      let response: Response;
      const allSetCookieHeaders: string[] = [];
      let redirectCount = 0;

      while (true) {
        response = await fetch(currentUrl, currentOptions);
        
        // Collect Set-Cookie headers from this response
        if (typeof (response.headers as any).getSetCookie === 'function') {
          allSetCookieHeaders.push(...(response.headers as any).getSetCookie());
        }

        // Check if this is a redirect
        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('location');
          if (!location) {
            break; // No location header, treat as final response
          }

          redirectCount++;
          if (redirectCount > HttpRequestService.MAX_REDIRECTS) {
            return {
              body: `Too many redirects (>${HttpRequestService.MAX_REDIRECTS})`,
              status: 'Redirect Error',
              headers: {},
              isError: true,
              errorType: 'network' as const
            };
          }

          // Resolve relative URLs
          currentUrl = new URL(location, currentUrl).toString();
          
          // For 303 or POST->GET redirects, switch to GET and remove body
          if (response.status === 303 || (response.status === 301 || response.status === 302) && currentOptions.method === 'POST') {
            currentOptions = { ...currentOptions, method: 'GET', body: undefined };
          }
          
          // Update Cookie header with accumulated cookies for the new request
          if (allSetCookieHeaders.length > 0) {
            const existingCookies = (currentOptions.headers as Record<string, string>)?.['Cookie'] || '';
            const newCookies = allSetCookieHeaders.map(c => c.split(';')[0]).join('; ');
            const combinedCookies = existingCookies ? `${existingCookies}; ${newCookies}` : newCookies;
            currentOptions = {
              ...currentOptions,
              headers: { ...(currentOptions.headers as Record<string, string>), Cookie: combinedCookies }
            };
          }
        } else {
          break; // Not a redirect, this is the final response
        }
      }

      clearTimeout(timeoutId);
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
        isError: response.status >= 400,
        setCookieHeaders: allSetCookieHeaders
      };

    } catch (error) {
      clearTimeout(timeoutId);
      
      // Handle abort errors (cancellation or timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        if (signal?.aborted) {
          return {
            body: 'Request Cancelled\n\nThe request was cancelled by the user.',
            status: 'Cancelled',
            headers: {},
            isError: true,
            errorType: 'cancelled'
          };
        }
        return {
          body: `Request Timeout\n\nThe server took too long to respond (timeout: ${timeout / 1000}s).`,
          status: 'Timeout',
          headers: {},
          isError: true,
          errorType: 'timeout'
        };
      }

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

      // Timeout errors (legacy check for non-AbortError timeouts)
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