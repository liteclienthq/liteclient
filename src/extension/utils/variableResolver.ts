import { EnvironmentVariable, Environment } from '../../shared/models';

export interface ResolverInput {
    globals?: Environment;
    environment?: Environment;
    collectionVariables?: EnvironmentVariable[];
    overrides?: Record<string, string>;
}

export function resolveVariables(input: ResolverInput): Record<string, string> {
    const result: Record<string, string> = {};

    const layers: EnvironmentVariable[][] = [
        input.globals?.variables ?? [],
        input.collectionVariables ?? [],
        input.environment?.variables ?? [],
    ];

    for (const variables of layers) {
        for (const variable of variables) {
            if (!variable.enabled) {
                continue;
            }
            result[variable.name] = input.overrides?.[variable.name] ?? variable.currentValue ?? variable.initialValue;
        }
    }

    return result;
}
