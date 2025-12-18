import { StorageService } from '../storage/storageService';
import { AuthConfig } from './httpRequestService';

export interface HistoryItem {
  id: string;
  name?: string;
  timestamp: number;
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string | null;
  auth?: AuthConfig;
  status: string;
}

export class HistoryService {
  private static readonly HISTORY_FILE = 'history.json';
  private static readonly MAX_HISTORY_ITEMS = 50;

  constructor(private storage: StorageService) { }

  async load(): Promise<HistoryItem[]> {
    await this.storage.ensureExists(HistoryService.HISTORY_FILE, []);
    const history = await this.storage.readJson<HistoryItem[]>(HistoryService.HISTORY_FILE);
    return history;
  }

  async add(item: HistoryItem): Promise<void> {
    let history = await this.load();

    // Check if an item with the same method and URL already exists
    const existingIndex = history.findIndex(h => h.method === item.method && h.url === item.url);

    if (existingIndex !== -1) {
      // Update the existing item with new data and move it to the top
      const existingItem = history[existingIndex];
      existingItem.timestamp = item.timestamp;
      existingItem.headers = item.headers;
      existingItem.body = item.body;
      existingItem.status = item.status;
      // Preserve the name if it exists
      if (item.name) {
        existingItem.name = item.name;
      }

      // Remove the item from its current position
      history.splice(existingIndex, 1);
      // Add it to the beginning
      history.unshift(existingItem);
    } else {
      // Add new item to the beginning
      history.unshift(item);
    }

    // Cap the history at 50 items by removing older entries
    if (history.length > HistoryService.MAX_HISTORY_ITEMS) {
      history = history.slice(0, HistoryService.MAX_HISTORY_ITEMS);
    }

    await this.storage.writeJson(HistoryService.HISTORY_FILE, history);
  }

  async clear(): Promise<void> {
    await this.storage.writeJson(HistoryService.HISTORY_FILE, []);
  }

  async delete(id: string): Promise<void> {
    const history = await this.load();
    const filtered = history.filter(h => h.id !== id);
    await this.storage.writeJson(HistoryService.HISTORY_FILE, filtered);
  }

  async rename(id: string, newName: string): Promise<void> {
    const history = await this.load();
    const index = history.findIndex(h => h.id === id);
    if (index !== -1) {
      history[index].name = newName || undefined; // Use undefined if empty string to keep it clean
      await this.storage.writeJson(HistoryService.HISTORY_FILE, history);
    }
  }
}