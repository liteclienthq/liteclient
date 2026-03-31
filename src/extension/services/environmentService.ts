import { StorageService } from '../storage/storageService';
import { Environment, EnvironmentVariable } from '../../shared/models';
import { generateId } from '../utils/idUtils';

export class EnvironmentService {
  private static readonly ENVIRONMENTS_FILE = 'environments.json';

  constructor(private storage: StorageService) { }

  async load(): Promise<Environment[]> {
    await this.storage.ensureExists(EnvironmentService.ENVIRONMENTS_FILE, []);
    const raw = await this.storage.readJson<any[]>(EnvironmentService.ENVIRONMENTS_FILE, []);
    const { environments, needsMigration } = this.normalizeEnvironments(raw);

    if (needsMigration) {
      await this.storage.updateJson<any[]>(
        EnvironmentService.ENVIRONMENTS_FILE, [],
        (current) => {
          const normalized = this.normalizeEnvironments(current);
          return normalized.needsMigration ? this.sanitize(normalized.environments) : current;
        }
      );
    }

    return environments;
  }

  private sanitize(envs: Environment[]): any[] {
    return envs.map(env => ({
      ...env,
      variables: env.variables.map(({ id, name, initialValue, type, enabled }) => ({
        id, name, initialValue, type, enabled
      }))
    }));
  }

  private async saveRaw(envs: Environment[]): Promise<void> {
    await this.storage.writeJson(EnvironmentService.ENVIRONMENTS_FILE, this.sanitize(envs));
  }

  async save(envs: Environment[]): Promise<void> {
    await this.saveRaw(envs);
  }

  private async mutateEnvironments(
    mutator: (envs: Environment[]) => void | Promise<void>
  ): Promise<void> {
    await this.storage.updateJson<Environment[]>(
      EnvironmentService.ENVIRONMENTS_FILE, [],
      async (raw) => {
        const envs = raw as Environment[];
        await mutator(envs);
        return this.sanitize(envs);
      }
    );
  }

  async addEnvironment(name: string): Promise<void> {
    await this.mutateEnvironments((envs) => {
      envs.push({
        id: generateId(),
        name,
        variables: []
      });
    });
  }

  async updateEnvironment(env: Environment): Promise<void> {
    await this.mutateEnvironments((envs) => {
      const idx = envs.findIndex(e => e.id === env.id);
      if (idx === -1) {
        throw new Error(`Environment with id ${env.id} not found`);
      }
      envs[idx] = env;
    });
  }

  async renameEnvironment(envId: string, name: string): Promise<void> {
    await this.mutateEnvironments((envs) => {
      const env = envs.find(e => e.id === envId);
      if (!env) {
        throw new Error(`Environment with id ${envId} not found`);
      }
      env.name = name;
    });
  }

  async setVariables(envId: string, variables: EnvironmentVariable[]): Promise<void> {
    await this.mutateEnvironments((envs) => {
      const env = envs.find(e => e.id === envId);
      if (!env) {
        throw new Error(`Environment with id ${envId} not found`);
      }
      env.variables = variables;
    });
  }

  async deleteEnvironment(id: string): Promise<void> {
    await this.mutateEnvironments((envs) => {
      const idx = envs.findIndex(e => e.id === id);
      if (idx === -1) {
        throw new Error(`Environment with id ${id} not found`);
      }
      envs.splice(idx, 1);
    });
  }

  async getEnvironmentById(id: string): Promise<Environment | undefined> {
    const environments = await this.load();
    return environments.find(env => env.id === id);
  }

  /**
   * Atomically apply variable updates to an environment.
   * Handles set (value !== null) and unset (value === null) operations.
   * Creates new variables if they don't exist for set operations.
   * Returns the IDs of variables that were removed (for currentValues cleanup).
   */
  async applyVariableUpdates(
    envId: string,
    updates: Record<string, string | null>
  ): Promise<string[]> {
    const removedVarIds: string[] = [];

    await this.mutateEnvironments((envs) => {
      const env = envs.find(e => e.id === envId);
      if (!env) { return; }

      for (const [name, value] of Object.entries(updates)) {
        if (value === null) {
          const idx = env.variables.findIndex(v => v.name === name);
          if (idx !== -1) {
            removedVarIds.push(env.variables[idx].id);
            env.variables.splice(idx, 1);
          }
        } else {
          const existing = env.variables.find(v => v.name === name);
          if (existing) {
            existing.initialValue = value;
          } else {
            env.variables.push({
              id: generateId(),
              name,
              initialValue: value,
              type: 'default',
              enabled: true,
            });
          }
        }
      }
    });

    return removedVarIds;
  }

  async duplicateEnvironment(envId: string, copyName: string): Promise<Environment | undefined> {
    let duplicated: Environment | undefined;

    await this.mutateEnvironments((envs) => {
      const source = envs.find(e => e.id === envId);
      if (!source) {
        return;
      }

      duplicated = {
        id: generateId(),
        name: copyName,
        variables: source.variables.map(variable => ({
          ...variable,
          id: generateId()
        }))
      };

      envs.push(duplicated);
    });

    return duplicated;
  }

  private normalizeEnvironments(raw: any[]): { environments: Environment[]; needsMigration: boolean } {
    let needsMigration = false;
    const environments: Environment[] = raw.map(env => {
      if (Array.isArray(env.variables)) {
        return env as Environment;
      }
      needsMigration = true;
      const variables: EnvironmentVariable[] = Object.entries(env.variables || {}).map(([name, value]) => ({
        id: generateId(),
        name,
        initialValue: value as string,
        type: 'default' as const,
        enabled: true
      }));
      return { id: env.id, name: env.name, variables };
    });

    let globals = environments.find(env => env.id === 'globals');
    if (!globals) {
      globals = { id: 'globals', name: 'Globals', variables: [] };
      environments.unshift(globals);
      needsMigration = true;
    }

    const others = environments.filter(env => env.id !== 'globals');
    return {
      environments: [globals, ...others],
      needsMigration
    };
  }
}
