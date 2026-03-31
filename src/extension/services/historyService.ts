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
    const rawHistory = await this.storage.readJson<any[]>(HistoryService.HISTORY_FILE, []);

    if (rawHistory.length === 0) {
      return [];
    }

    const needsMigration = this.detectLegacyFormat(rawHistory[0]);

    if (needsMigration && !this.migrationDone) {
      const migrated = await this.storage.updateJson<any[]>(
        HistoryService.HISTORY_FILE, [],
        (current) => {
          if (current.length === 0 || !this.detectLegacyFormat(current[0])) {
            return current;
          }
          return current.map(item => this.migrateLegacyItem(item));
        }
      );
      this.migrationDone = true;
      return migrated as RequestExecution[];
    }

    return rawHistory as RequestExecution[];
  }

  async add(execution: RequestExecution): Promise<void> {
    await this.storage.updateJson<RequestExecution[]>(
      HistoryService.HISTORY_FILE, [],
      (history) => {
        history.unshift(execution);
        return history.slice(0, HistoryService.MAX_HISTORY_ITEMS);
      }
    );
  }

  async clear(): Promise<void> {
    await this.storage.writeJson(HistoryService.HISTORY_FILE, []);
  }

  async delete(id: string): Promise<void> {
    await this.storage.updateJson<RequestExecution[]>(
      HistoryService.HISTORY_FILE, [],
      (history) => history.filter(h => h.id !== id)
    );
  }

  async deleteBulk(ids: string[]): Promise<void> {
    const idSet = new Set(ids);
    await this.storage.updateJson<RequestExecution[]>(
      HistoryService.HISTORY_FILE, [],
      (history) => history.filter(h => !idSet.has(h.id))
    );
  }

  createExecution(
    request: { name?: string; method: string; url: string; headers: Record<string, string>; body: any; auth?: any; preRequestScript?: string; postResponseScript?: string },
    source: RequestExecutionSource,
    status: string,
    durationMs?: number
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
        auth: request.auth,
        preRequestScript: request.preRequestScript,
        postResponseScript: request.postResponseScript,
      },
      result: { status, durationMs }
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
