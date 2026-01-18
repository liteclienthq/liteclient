import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';


export class StorageService {
  private storagePath: string;
  private writeLocks = new Map<string, Promise<void>>();

  constructor(private context: vscode.ExtensionContext) {
    this.storagePath = context.globalStorageUri.fsPath;
  }

  getFilePath(fileName: string): string {
    return path.join(this.storagePath, fileName);
  }

  async ensureExists(fileName: string, defaultContent: any): Promise<void> {
    const filePath = this.getFilePath(fileName);
    
    try {
      await fs.access(filePath);
    } catch {
      // File doesn't exist, create the directory if needed and write default content
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
        // File doesn't exist, return default value
        return defaultValue ?? ({} as T);
      }
      if (error instanceof SyntaxError) {
        // JSON parse error - file is corrupted
        const backupPath = `${filePath}.backup.${Date.now()}`;
        let backupSucceeded = false;

        try {
          await fs.rename(filePath, backupPath);
          backupSucceeded = true;
        } catch {
          // Ignore backup errors
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
    const existingLock = this.writeLocks.get(fileName);
    if (existingLock) {
      await existingLock;
    }

    const writeOperation = this._writeJsonAtomic(fileName, data);
    this.writeLocks.set(fileName, writeOperation);

    try {
      await writeOperation;
    } finally {
      if (this.writeLocks.get(fileName) === writeOperation) {
        this.writeLocks.delete(fileName);
      }
    }
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