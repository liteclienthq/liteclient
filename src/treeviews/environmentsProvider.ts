import * as vscode from 'vscode';
import { EnvironmentService, Environment } from '../services/environmentService';

export class EnvironmentNode extends vscode.TreeItem {
  constructor(public readonly env: Environment) {
    super(env.name, vscode.TreeItemCollapsibleState.Collapsed);
    this.contextValue = "environment";
    this.iconPath = new vscode.ThemeIcon('gear');
  }
}

export class VariableNode extends vscode.TreeItem {
  constructor(
    public readonly environmentId: string,
    public readonly variableName: string,
    public readonly variableValue: string
  ) {
    super(`${variableName} = ${variableValue}`, vscode.TreeItemCollapsibleState.None);
    this.contextValue = "variable";
    this.iconPath = new vscode.ThemeIcon('key');
    this.description = variableValue;
  }
}

export class EnvironmentsProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private environmentService: EnvironmentService) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    // If no element is provided, return the root environment nodes
    if (!element) {
      const environments = await this.environmentService.load();
      return environments.map(env => new EnvironmentNode(env));
    }
    // If element is an environment node, return its variable nodes
    else if (element instanceof EnvironmentNode) {
      const variables: VariableNode[] = [];
      const environment = element.env;

      for (const [name, value] of Object.entries(environment.variables)) {
        variables.push(new VariableNode(environment.id, name, value));
      }

      return variables;
    }

    // For other cases, return empty array
    return [];
  }
}