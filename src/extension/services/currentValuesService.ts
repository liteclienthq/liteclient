import * as vscode from 'vscode';
import { Environment } from '../../shared/models';

type CurrentValuesState = Record<string, Record<string, string>>;

export class CurrentValuesService {
  private static readonly STORAGE_KEY = 'liteclient.currentValues';
  private state: CurrentValuesState;

  constructor(private context: vscode.ExtensionContext) {
    this.state = this.context.workspaceState.get<CurrentValuesState>(CurrentValuesService.STORAGE_KEY) ?? {};
  }

  private async persist(): Promise<void> {
    await this.context.workspaceState.update(CurrentValuesService.STORAGE_KEY, this.state);
  }

  getCurrentValue(envId: string, varId: string): string | undefined {
    return this.state[envId]?.[varId];
  }

  async setCurrentValue(envId: string, varId: string, value: string): Promise<void> {
    if (!this.state[envId]) {
      this.state[envId] = {};
    }
    this.state[envId][varId] = value;
    await this.persist();
  }

  async clearCurrentValue(envId: string, varId: string): Promise<void> {
    if (!this.state[envId]) {
      return;
    }
    delete this.state[envId][varId];
    if (Object.keys(this.state[envId]).length === 0) {
      delete this.state[envId];
    }
    await this.persist();
  }

  getEnvOverrides(envId: string): Record<string, string> {
    return { ...this.state[envId] };
  }

  async clearEnvironment(envId: string): Promise<void> {
    delete this.state[envId];
    await this.persist();
  }

  mergeIntoEnvironments(envs: Environment[]): Environment[] {
    return envs.map(env => ({
      ...env,
      variables: env.variables.map(v => {
        const override = this.state[env.id]?.[v.id];
        if (override !== undefined) {
          return { ...v, currentValue: override };
        }
        return v;
      })
    }));
  }
}
