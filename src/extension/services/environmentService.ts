import { StorageService } from '../storage/storageService';

export interface Environment {
  id: string;
  name: string;
  variables: Record<string, string>;
}

export class EnvironmentService {
  private static readonly ENVIRONMENTS_FILE = 'environments.json';

  constructor(private storage: StorageService) {}

  async load(): Promise<Environment[]> {
    await this.storage.ensureExists(EnvironmentService.ENVIRONMENTS_FILE, []);
    let environments = await this.storage.readJson<Environment[]>(EnvironmentService.ENVIRONMENTS_FILE);

    // Filter out any existing globals environment to avoid duplicates
    environments = environments.filter(env => env.id !== 'globals');

    // Always add globals as the first environment
    const globalsEnv: Environment = {
      id: 'globals',
      name: 'Globals',
      variables: {}
    };

    return [globalsEnv, ...environments];
  }

  async save(envs: Environment[]): Promise<void> {
    // Filter out globals before saving to file
    const envsToSave = envs.filter(env => env.id !== 'globals');
    await this.storage.writeJson(EnvironmentService.ENVIRONMENTS_FILE, envsToSave);
  }

  async addEnvironment(name: string): Promise<void> {
    const environments = await this.load();
    const newEnvironment: Environment = {
      id: this.generateId(),
      name,
      variables: {}
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

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }
}