import * as vscode from 'vscode';
import { HistoryService, HistoryItem } from '../services/historyService';

export class HistoryItemNode extends vscode.TreeItem {
  constructor(public readonly item: HistoryItem) {
    // Use the name if available, otherwise use the URL
    const label = item.name || item.url;
    super(label, vscode.TreeItemCollapsibleState.None);
    // Remove method from description since it will be shown as an icon badge
    this.contextValue = "historyItem";
    this.tooltip = `${item.method} ${item.url}\nStatus: ${item.status}\nTime: ${new Date(item.timestamp).toLocaleString()}`;
  }
}

export class RequestHistoryProvider implements vscode.TreeDataProvider<HistoryItemNode> {
  private _onDidChangeTreeData: vscode.EventEmitter<HistoryItemNode | undefined | void> =
    new vscode.EventEmitter<HistoryItemNode | undefined | void>();
  public readonly onDidChangeTreeData: vscode.Event<HistoryItemNode | undefined | void> =
    this._onDidChangeTreeData.event;

  constructor(private historyService: HistoryService) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: HistoryItemNode): vscode.TreeItem {
    // Set the method badge as the iconPath
    element.iconPath = this.getMethodBadge(element.item.method);
    element.command = {
      command: "liteclient.openHistoryRequest",
      title: "Open Request",
      arguments: [element.item]
    };

    return element;
  }

  async getChildren(): Promise<HistoryItemNode[]> {
    const historyItems = await this.historyService.load();
    return historyItems.map(item => new HistoryItemNode(item));
  }

  private getMethodBadge(method: string): vscode.ThemeIcon | { light: vscode.Uri; dark: vscode.Uri } {
    // Generate a themed SVG badge for the method
    return this.generateMethodBadgeSvg(method.toUpperCase());
  }

  private generateMethodBadgeSvg(method: string): { light: vscode.Uri; dark: vscode.Uri } {
    // Define color mappings based on method
    const getColor = (method: string): string => {
      switch (method) {
        case 'GET':
          return '#3cb371'; // Green
        case 'POST':
          return '#4169e1'; // Blue
        case 'PUT':
          return '#ff8c00'; // Orange
        case 'PATCH':
          return '#daa520'; // Goldenrod
        case 'DELETE':
          return '#dc143c'; // Red
        default:
          return '#666666'; // Gray
      }
    };

    const textColor = getColor(method);

    // Fixed width and height to match VS Code's style for better readability
    const width = 30;
    const height = 20;

    // Create SVG content for the method badge with colored text only, using a fixed viewBox
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <text x="${width / 2}" y="13" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="${textColor}" text-anchor="middle" dominant-baseline="middle">${method.substring(0, 4)}</text>
</svg>`;  // Show only first 4 characters if method name is too long

    // Encode the SVG content for the data URI
    const encodedSvg = encodeURIComponent(svgContent);

    // Create data URIs for the SVG content
    const svgDataUri = `data:image/svg+xml,${encodedSvg}`;

    return {
      light: vscode.Uri.parse(svgDataUri),
      dark: vscode.Uri.parse(svgDataUri)
    };
  }
}