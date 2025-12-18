import { StorageService } from '../storage/storageService';
import { AuthConfig } from './httpRequestService';

export interface RequestItem {
  id: string;
  name: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string | null;
  auth?: AuthConfig;
}

export interface Collection {
  id: string;
  name: string;
  requests: RequestItem[];
}

export class CollectionService {
  private static readonly COLLECTIONS_FILE = 'collections.json';

  constructor(private storage: StorageService) { }

  async load(): Promise<Collection[]> {
    await this.storage.ensureExists(CollectionService.COLLECTIONS_FILE, []);
    const collections = await this.storage.readJson<Collection[]>(CollectionService.COLLECTIONS_FILE);
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
      requests: []
    };
    collections.push(newCollection);
    await this.save(collections);
  }

  async addRequest(collectionId: string, request: RequestItem): Promise<void> {
    const collections = await this.load();
    const collectionIndex = collections.findIndex(c => c.id === collectionId);

    if (collectionIndex !== -1) {
      // Add a unique ID to the request if it doesn't have one
      if (!request.id) {
        request.id = this.generateId();
      }
      collections[collectionIndex].requests.push(request);
      await this.save(collections);
    } else {
      throw new Error(`Collection with id ${collectionId} not found`);
    }
  }

  async updateRequest(collectionId: string, request: RequestItem): Promise<void> {
    const collections = await this.load();
    const collectionIndex = collections.findIndex(c => c.id === collectionId);

    if (collectionIndex !== -1) {
      const requestIndex = collections[collectionIndex].requests.findIndex(r => r.id === request.id);

      if (requestIndex !== -1) {
        collections[collectionIndex].requests[requestIndex] = request;
        await this.save(collections);
      } else {
        throw new Error(`Request with id ${request.id} not found in collection ${collectionId}`);
      }
    } else {
      throw new Error(`Collection with id ${collectionId} not found`);
    }
  }

  async deleteRequest(collectionId: string, requestId: string): Promise<void> {
    const collections = await this.load();
    const collectionIndex = collections.findIndex(c => c.id === collectionId);

    if (collectionIndex !== -1) {
      collections[collectionIndex].requests = collections[collectionIndex].requests
        .filter(request => request.id !== requestId);
      await this.save(collections);
    } else {
      throw new Error(`Collection with id ${collectionId} not found`);
    }
  }

  async renameCollection(collectionId: string, newName: string): Promise<void> {
    const collections = await this.load();
    const collectionIndex = collections.findIndex(c => c.id === collectionId);

    if (collectionIndex !== -1) {
      collections[collectionIndex].name = newName;
      await this.save(collections);
    } else {
      throw new Error(`Collection with id ${collectionId} not found`);
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

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }
}