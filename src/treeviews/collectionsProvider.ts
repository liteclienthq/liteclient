import * as vscode from 'vscode';
import { CollectionService, Collection, RequestItem } from '../services/collectionService';

export class CollectionNode extends vscode.TreeItem {
  constructor(public readonly collection: Collection) {
    super(collection.name, vscode.TreeItemCollapsibleState.Expanded);
    this.contextValue = "collection";
  }
}

export class RequestNode extends vscode.TreeItem {
  constructor(public readonly request: RequestItem) {
    super(request.name, vscode.TreeItemCollapsibleState.None);
    this.description = `${request.method} ${request.url}`;
    this.contextValue = "collectionRequest";
  }
}

export class CollectionsProvider implements vscode.TreeDataProvider<CollectionNode | RequestNode> {
  private _onDidChangeTreeData = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private collectionService: CollectionService) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: CollectionNode | RequestNode): vscode.TreeItem {
    if (element instanceof CollectionNode) {
      element.iconPath = new vscode.ThemeIcon('folder');
      element.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
    } else if (element instanceof RequestNode) {
      element.iconPath = new vscode.ThemeIcon('file');
      element.collapsibleState = vscode.TreeItemCollapsibleState.None;
      element.command = {
        command: "liteclient.openCollectionRequest",
        title: "Open Request",
        arguments: [element.request]
      };
    }
    return element;
  }

  async getChildren(element?: CollectionNode | RequestNode): Promise<(CollectionNode | RequestNode)[]> {
    if (!element) {
      // Root level: return all collections
      const collections = await this.collectionService.load();
      return collections.map(collection => new CollectionNode(collection));
    } else if (element instanceof CollectionNode) {
      // Collection level: return its requests
      const collection = element.collection;
      return collection.requests.map(request => new RequestNode(request));
    }
    
    // For request items, return no children
    return [];
  }
}