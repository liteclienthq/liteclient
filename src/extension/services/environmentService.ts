import { StorageService } from '../storage/storageService';
import { Environment, EnvironmentVariable } from '../../shared/models';
import { generateId } from '../utils/idUtils';

export class EnvironmentService {
  private static readonly ENVIRONMENTS_FILE = 'environments.json';

  constructor(private storage: StorageService) { }

  async load(): Promise<Environment[]> {
    await this.storage.ensureExists(EnvironmentService.ENVIRONMENTS_FILE, []);
    const raw = await this.storage.readJson<any[]>(EnvironmentService.ENVIRONMENTS_FILE, []);

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

    if (needsMigration) {
      const others = environments.filter(env => env.id !== 'globals');
      await this.save([globals, ...others]);
    }

    const others = environments.filter(env => env.id !== 'globals');
    return [globals, ...others];
  }

  async save(envs: Environment[]): Promise<void> {
    await this.storage.writeJson(EnvironmentService.ENVIRONMENTS_FILE, envs);
  }

  async addEnvironment(name: string): Promise<void> {
    const environments = await this.load();
    const newEnvironment: Environment = {
      id: generateId(),
      name,
      variables: []
    };
    environments.push(newEnvironment);
    await this.save(environments);
  }

  async updateEnvironment(env: Environment): Promise<void> {
    const environments = await this.load();
    const envIndex = environments.findIndex(e => e.id === env.id);

    if (envIndex !== -1) {
      environments[envIndex] = env;
      await this.save(environments);
    } else {
      throw new Error(`Environment with id ${env.id} not found`);
    }
  }

  async deleteEnvironment(id: string): Promise<void> {
    const environments = await this.load();
    const filteredEnvironments = environments.filter(env => env.id !== id);

    if (filteredEnvironments.length !== environments.length) {
      await this.save(filteredEnvironments);
    } else {
      throw new Error(`Environment with id ${id} not found`);
    }
  }

  async getEnvironmentById(id: string): Promise<Environment | undefined> {
    const environments = await this.load();
    return environments.find(env => env.id === id);
  }
}
