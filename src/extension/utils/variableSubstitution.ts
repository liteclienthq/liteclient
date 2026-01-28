/**
 * Utility for substituting environment variables in strings using {{variableName}} syntax
 */

export interface Environment {
  id: string;
  name: string;
  variables: Record<string, string>;
}

/**
 * Performs environment variable substitution on a string
 * @param input The input string with {{variableName}} placeholders
 * @param variables The record of variable names to values
 * @returns The string with substitutions performed, leaving unmatched placeholders as-is
 */
export function substituteVariables(input: string, variables: Record<string, string>): string {
  // Regular expression to match {{variableName}} patterns
  // Matches: {{ followed by variable name (alphanumeric, underscore, hyphen), followed by }}
  const regex = /\{\{([a-zA-Z0-9_-]+)\}\}/g;

  // Replace all matches with corresponding variable values
  return input.replace(regex, (match, variableName) => {
    if (variables && typeof variables[variableName] !== 'undefined') {
      // Return the variable value if found
      return variables[variableName];
    }
    // Return the original placeholder if variable not found
    return match;
  });
}

/**
 * Substitutes variables in all request components (URL, headers, body)
 * @param request The request object to substitute variables in
 * @param variables The environment variables to use for substitution
 * @returns A new request object with substitutions applied
 */
export function substituteVariablesInRequest(request: any, variables: Record<string, string>): any {
  // Create a deep copy to avoid modifying the original
  const substitutedRequest = JSON.parse(JSON.stringify(request));

  // Substitute in URL
  if (substitutedRequest.url) {
    substitutedRequest.url = substituteVariables(substitutedRequest.url, variables);
  }

  // Substitute in headers (both keys and values)
  if (substitutedRequest.headers) {
    const newHeaders: Record<string, string> = {};

    for (const [key, value] of Object.entries(substitutedRequest.headers)) {
      // Substitute variable in both key and value
      const substitutedKey = substituteVariables(String(key), variables);
      const substitutedValue = substituteVariables(String(value), variables);
      newHeaders[substitutedKey] = substitutedValue;
    }

    substitutedRequest.headers = newHeaders;
  }

  // Substitute in body
  if (substitutedRequest.body) {
    const body = substitutedRequest.body;
    
    if (body.mode === 'raw' && typeof body.value === 'string') {
      body.value = substituteVariables(body.value, variables);
    } else if (body.mode === 'form-data' && Array.isArray(body.rows)) {
      for (const row of body.rows) {
        if (row.active !== false) {
          row.key = substituteVariables(row.key, variables);
          if (row.type === 'text') {
            row.value = substituteVariables(row.value, variables);
          }
        }
      }
    } else if (body.mode === 'x-www-form-urlencoded' && Array.isArray(body.rows)) {
      for (const row of body.rows) {
        if (row.active !== false) {
          row.key = substituteVariables(row.key, variables);
          row.value = substituteVariables(row.value, variables);
        }
      }
    }
  }

  // Substitute in auth
  if (substitutedRequest.auth) {
    const auth = substitutedRequest.auth;
    if (auth.basic) {
      if (auth.basic.username) {auth.basic.username = substituteVariables(auth.basic.username, variables);}
      if (auth.basic.password) {auth.basic.password = substituteVariables(auth.basic.password, variables);}
    }
    if (auth.bearer && auth.bearer.token) {
      auth.bearer.token = substituteVariables(auth.bearer.token, variables);
    }
    if (auth.apikey) {
      if (auth.apikey.key) {auth.apikey.key = substituteVariables(auth.apikey.key, variables);}
      if (auth.apikey.value) {auth.apikey.value = substituteVariables(auth.apikey.value, variables);}
    }
  }

  return substitutedRequest;

}