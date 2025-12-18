import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';

export class StorageService {
  private storagePath: string;

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

  async readJson<T>(fileName: string): Promise<T> {
    const filePath = this.getFilePath(fileName);
    
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // File doesn't exist, return default value
        return {} as T;
      }
      throw error;
    }
  }

  async writeJson(fileName: string, data: any): Promise<void> {
    const filePath = this.getFilePath(fileName);
    
    // Ensure parent directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    
    // Write the JSON data with 2-space indentation
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  }
}