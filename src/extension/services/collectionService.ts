import { StorageService } from '../storage/storageService';
import { AuthConfig } from './httpRequestService';

export interface RequestItem {
  id: string;
  name: string;
  type: 'request';
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string | null;
  auth?: AuthConfig;
}

export interface FolderItem {
  id: string;
  name: string;
  type: 'folder';
  items: CollectionItem[];
}

export type CollectionItem = RequestItem | FolderItem;

export interface Collection {
  id: string;
  name: string;
  items: CollectionItem[];
}

// Legacy interface for migration
interface LegacyCollection {
  id: string;
  name: string;
  requests?: any[];
  items?: CollectionItem[];
}

export class CollectionService {
  private static readonly COLLECTIONS_FILE = 'collections.json';

  constructor(private storage: StorageService) { }

  async load(): Promise<Collection[]> {
    await this.storage.ensureExists(CollectionService.COLLECTIONS_FILE, []);
    const rawCollections = await this.storage.readJson<LegacyCollection[]>(CollectionService.COLLECTIONS_FILE);

    // Migration: Transform legacy requests to items
    const collections: Collection[] = rawCollections.map(c => {
      let items = c.items || [];
      if (c.requests && c.requests.length > 0) {
        // Migrate legacy requests
        const migratedRequests = c.requests.map((r: any) => ({
          ...r,
          type: 'request'
        } as RequestItem));
        items = [...items, ...migratedRequests];
      }
      return {
        id: c.id,
        name: c.name,
        items: items
      };
    });

    return collections;
  }

  async save(collections: Collection[]): Promise<void> {
    await this.storage.writeJson(CollectionService.COLLECTIONS_FILE, collections);
  }

  async addCollection(name: string): Promise<void> {
    const collections = await this.load();
    const newCollection: Collection = {
      id: this.generateId(),
      name,
      items: []
    };
    collections.push(newCollection);
    await this.save(collections);
  }

  async addFolder(collectionId: string, name: string, parentId?: string): Promise<void> {
    const collections = await this.load();
    const collection = collections.find(c => c.id === collectionId);
    if (!collection) {
      throw new Error(`Collection with id ${collectionId} not found`);
    }

    const newFolder: FolderItem = {
      id: this.generateId(),
      name,
      type: 'folder',
      items: []
    };

    if (parentId) {
      const parent = this.findFolder(collection.items, parentId);
      if (parent) {
        parent.items.push(newFolder);
      } else {
        throw new Error(`Parent folder with id ${parentId} not found`);
      }
    } else {
      collection.items.push(newFolder);
    }

    await this.save(collections);
  }

  async addRequest(collectionId: string, request: Omit<RequestItem, 'type'>, parentId?: string): Promise<void> {
    const collections = await this.load();
    const collection = collections.find(c => c.id === collectionId);

    if (!collection) {
      throw new Error(`Collection with id ${collectionId} not found`);
    }

    const newRequest: RequestItem = {
      ...request,
      type: 'request',
      id: request.id || this.generateId()
    };

    if (parentId) {
      const parent = this.findFolder(collection.items, parentId);
      if (parent) {
        parent.items.push(newRequest);
      } else {
        throw new Error(`Parent folder with id ${parentId} not found`);
      }
    } else {
      collection.items.push(newRequest);
    }

    await this.save(collections);
  }

  async updateRequest(collectionId: string, request: RequestItem): Promise<void> {
    const collections = await this.load();
    const collection = collections.find(c => c.id === collectionId);

    if (!collection) {
      throw new Error(`Collection with id ${collectionId} not found`);
    }

    if (this.updateItemInTree(collection.items, request)) {
      await this.save(collections);
    } else {
      throw new Error(`Request with id ${request.id} not found`);
    }
  }

  async deleteItem(collectionId: string, itemId: string): Promise<void> {
    const collections = await this.load();
    const collection = collections.find(c => c.id === collectionId);

    if (!collection) {
      throw new Error(`Collection with id ${collectionId} not found`);
    }

    if (this.deleteItemFromTree(collection.items, itemId)) {
      await this.save(collections);
    } else {
      throw new Error(`Item with id ${itemId} not found`);
    }
  }

  async renameCollection(collectionId: string, newName: string): Promise<void> {
    const collections = await this.load();
    const collection = collections.find(c => c.id === collectionId);

    if (collection) {
      collection.name = newName;
      await this.save(collections);
    } else {
      throw new Error(`Collection with id ${collectionId} not found`);
    }
  }

  async renameItem(collectionId: string, itemId: string, newName: string): Promise<void> {
    const collections = await this.load();
    const collection = collections.find(c => c.id === collectionId);

    if (!collection) {
      throw new Error(`Collection with id ${collectionId} not found`);
    }

    const item = this.findItem(collection.items, itemId);
    if (item) {
      item.name = newName;
      await this.save(collections);
    } else {
      throw new Error(`Item with id ${itemId} not found`);
    }
  }

  async deleteCollection(collectionId: string): Promise<void> {
    const collections = await this.load();
    const filteredCollections = collections.filter(c => c.id !== collectionId);

    if (filteredCollections.length !== collections.length) {
      await this.save(filteredCollections);
    } else {
      throw new Error(`Collection with id ${collectionId} not found`);
    }
  }

  // --- Helper Methods ---

  async findRequestInCollections(requestId: string): Promise<{ collection: Collection, request: RequestItem } | undefined> {
    const collections = await this.load();
    for (const collection of collections) {
      const request = this.findRequestInTree(collection.items, requestId);
      if (request) {
        return { collection, request };
      }
    }
    return undefined;
  }

  requestExistsInCollection(collection: Collection, requestId: string): boolean {
    return !!this.findRequestInTree(collection.items, requestId);
  }

  private findRequestInTree(items: CollectionItem[], requestId: string): RequestItem | undefined {
    for (const item of items) {
      if (item.id === requestId && item.type === 'request') {
        return item as RequestItem;
      }
      if (item.type === 'folder') {
        const found = this.findRequestInTree(item.items, requestId);
        if (found) { return found; }
      }
    }
    return undefined;
  }

  private findFolder(items: CollectionItem[], folderId: string): FolderItem | undefined {
    for (const item of items) {
      if (item.type === 'folder') {
        if (item.id === folderId) {
          return item;
        }
        const found = this.findFolder(item.items, folderId);
        if (found) { return found; }
      }
    }
    return undefined;
  }

  private findItem(items: CollectionItem[], itemId: string): CollectionItem | undefined {
    for (const item of items) {
      if (item.id === itemId) {
        return item;
      }
      if (item.type === 'folder') {
        const found = this.findItem(item.items, itemId);
        if (found) { return found; }
      }
    }
    return undefined;
  }

  private updateItemInTree(items: CollectionItem[], updatedItem: RequestItem): boolean {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.id === updatedItem.id && item.type === 'request') {
        items[i] = updatedItem;
        return true;
      }
      if (item.type === 'folder') {
        if (this.updateItemInTree(item.items, updatedItem)) {
          return true;
        }
      }
    }
    return false;
  }

  private deleteItemFromTree(items: CollectionItem[], itemId: string): boolean {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.id === itemId) {
        items.splice(i, 1);
        return true;
      }
      if (item.type === 'folder') {
        if (this.deleteItemFromTree(item.items, itemId)) {
          return true;
        }
      }
    }
    return false;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }
}