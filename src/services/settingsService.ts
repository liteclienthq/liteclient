import * as vscode from 'vscode';

export class SettingsService {
  private static readonly SELECTED_ENVIRONMENT_KEY = 'liteclient.selectedEnvironmentId';

  constructor(private context: vscode.ExtensionContext) {}

  async getSelectedEnvironmentId(): Promise<string | undefined> {
    return this.context.globalState.get<string>(SettingsService.SELECTED_ENVIRONMENT_KEY);
  }

  async setSelectedEnvironmentId(environmentId: string | undefined): Promise<void> {
    await this.context.globalState.update(SettingsService.SELECTED_ENVIRONMENT_KEY, environmentId);
  }
}