import { StorageService } from '../storage/storageService';
import { RequestExecution, RequestExecutionSource } from '../../shared/models';
import { generateId } from '../utils/idUtils';

interface LegacyHistoryItem {
  id: string;
  name?: string;
  timestamp: number;
  method: string;
  url: string;
  headers: Record<string, string>;
  body: any;
  auth?: any;
  status: string;
}

export class HistoryService {
  private static readonly HISTORY_FILE = 'history.json';
  private static readonly MAX_HISTORY_ITEMS = 100;
  private migrationDone = false;

  constructor(private storage: StorageService) { }

  async load(): Promise<RequestExecution[]> {
    await this.storage.ensureExists(HistoryService.HISTORY_FILE, []);
    const rawHistory = await this.storage.readJson<any[]>(HistoryService.HISTORY_FILE);

    if (rawHistory.length === 0) {
      return [];
    }

    const needsMigration = this.detectLegacyFormat(rawHistory[0]);

    if (needsMigration && !this.migrationDone) {
      const migrated = rawHistory.map(item => this.migrateLegacyItem(item));
      await this.storage.writeJson(HistoryService.HISTORY_FILE, migrated);
      this.migrationDone = true;
      return migrated;
    }

    return rawHistory as RequestExecution[];
  }

  async add(execution: RequestExecution): Promise<void> {
    const history = await this.load();

    history.unshift(execution);

    const capped = history.slice(0, HistoryService.MAX_HISTORY_ITEMS);
    await this.storage.writeJson(HistoryService.HISTORY_FILE, capped);
  }

  async clear(): Promise<void> {
    await this.storage.writeJson(HistoryService.HISTORY_FILE, []);
  }

  async delete(id: string): Promise<void> {
    const history = await this.load();
    const filtered = history.filter(h => h.id !== id);
    await this.storage.writeJson(HistoryService.HISTORY_FILE, filtered);
  }

  createExecution(
    request: { name?: string; method: string; url: string; headers: Record<string, string>; body: any; auth?: any },
    source: RequestExecutionSource,
    status: string
  ): RequestExecution {
    return {
      id: generateId(),
      timestamp: Date.now(),
      source,
      request: {
        name: request.name,
        method: request.method,
        url: request.url,
        headers: request.headers,
        body: request.body,
        auth: request.auth
      },
      result: { status }
    };
  }

  private detectLegacyFormat(item: any): boolean {
    return item && typeof item.method === 'string' && !item.request;
  }

  private migrateLegacyItem(legacy: LegacyHistoryItem): RequestExecution {
    return {
      id: legacy.id || generateId(),
      timestamp: legacy.timestamp || Date.now(),
      source: { type: 'unknown' },
      request: {
        name: legacy.name,
        method: legacy.method,
        url: legacy.url,
        headers: legacy.headers || {},
        body: legacy.body || { mode: 'none' },
        auth: legacy.auth
      },
      result: {
        status: legacy.status || 'Unknown'
      }
    };
  }
}
