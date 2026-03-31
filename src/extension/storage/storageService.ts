import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

export type StorageScope = 'global' | 'workspace';

export class StorageService {
  private storagePath: string;
  private writeLocks = new Map<string, Promise<void>>();
  private _scope: StorageScope = 'global';
  private _workspacePath: string | undefined;

  constructor(private context: vscode.ExtensionContext) {
    this.storagePath = context.globalStorageUri.fsPath;

    const config = vscode.workspace.getConfiguration('liteclient');
    const configuredScope = config.get<StorageScope>('storageScope');

    if (configuredScope === 'workspace' && vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
      this._workspacePath = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, '.liteclient');
      this._scope = 'workspace';
    }
  }

  get scope(): StorageScope {
    return this._scope;
  }

  get globalStoragePath(): string {
    return this.storagePath;
  }

  get workspaceStoragePath(): string | undefined {
    if (this._workspacePath) {
      return this._workspacePath;
    }
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
      return path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, '.liteclient');
    }
    return undefined;
  }

  setScope(scope: StorageScope): void {
    this._scope = scope;
    if (scope === 'workspace' && vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
      this._workspacePath = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, '.liteclient');
    } else {
      this._scope = 'global';
      this._workspacePath = undefined;
    }
  }

  getFilePath(fileName: string): string {
    if (this._scope === 'workspace' && this._workspacePath) {
      return path.join(this._workspacePath, fileName);
    }
    return path.join(this.storagePath, fileName);
  }

  async ensureExists(fileName: string, defaultContent: any): Promise<void> {
    const filePath = this.getFilePath(fileName);
    
    try {
      await fs.access(filePath);
    } catch {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await this.writeJson(fileName, defaultContent);
    }
  }

  async readJson<T>(fileName: string, defaultValue?: T): Promise<T> {
    const filePath = this.getFilePath(fileName);
    
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return defaultValue ?? ({} as T);
      }
      if (error instanceof SyntaxError) {
        const backupPath = `${filePath}.backup.${Date.now()}`;
        let backupSucceeded = false;

        try {
          await fs.rename(filePath, backupPath);
          backupSucceeded = true;
        } catch {
        }

        const friendlyName = fileName.replace('.json', '');
        const message = backupSucceeded
          ? `LiteClient: Your ${friendlyName} data file was corrupted and has been backed up. Your data may be recoverable.`
          : `LiteClient: Your ${friendlyName} data file was corrupted and could not be read.`;

        const action = backupSucceeded ? 'Open Backup File' : undefined;
        vscode.window.showWarningMessage(message, ...(action ? [action] : [])).then(async selected => {
          if (selected === action) {
            const doc = await vscode.workspace.openTextDocument(backupPath);
            await vscode.window.showTextDocument(doc);
          }
        });

        return defaultValue ?? ({} as T);
      }
      throw error;
    }
  }

  async writeJson(fileName: string, data: any): Promise<void> {
    await this.enqueue(fileName, () => this._writeJsonAtomic(fileName, data));
  }

  /**
   * Atomically read-modify-write a JSON file.
   * The entire read → mutate → write cycle is serialized per file,
   * preventing stale-read overwrites from concurrent operations.
   */
  async updateJson<T>(
    fileName: string,
    defaultValue: T,
    mutator: (current: T) => T | Promise<T>
  ): Promise<T> {
    return this.enqueue(fileName, async () => {
      const current = await this.readJson<T>(fileName, defaultValue);
      const next = await mutator(current);
      await this._writeJsonAtomic(fileName, next);
      return next;
    });
  }

  private enqueue<R>(fileName: string, fn: () => Promise<R>): Promise<R> {
    const existingLock = this.writeLocks.get(fileName);

    const operation = (existingLock ? existingLock.then(fn, fn) : fn());

    const voidOp = operation.then(() => {}, () => {});
    this.writeLocks.set(fileName, voidOp);

    return operation.finally(() => {
      if (this.writeLocks.get(fileName) === voidOp) {
        this.writeLocks.delete(fileName);
      }
    });
  }

  private async _writeJsonAtomic(fileName: string, data: any): Promise<void> {
    const filePath = this.getFilePath(fileName);
    const tempPath = `${filePath}.tmp.${crypto.randomBytes(4).toString('hex')}`;

    await fs.mkdir(path.dirname(filePath), { recursive: true });

    const jsonContent = JSON.stringify(data, null, 2);
    await fs.writeFile(tempPath, jsonContent, 'utf8');

    await fs.rename(tempPath, filePath);
  }
}
