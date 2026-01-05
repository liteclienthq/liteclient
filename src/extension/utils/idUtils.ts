import * as crypto from 'crypto';

/**
 * Generates a unique ID for collections, items, and requests.
 * Uses native crypto.randomUUID() (UUID v4) for robustness and interoperability.
 */
export function generateId(): string {
    return crypto.randomUUID();
}
