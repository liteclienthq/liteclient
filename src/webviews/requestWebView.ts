import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class RequestWebView {
  static getHtmlContent(context: vscode.ExtensionContext): string {
    // Read the HTML template file
    const templatePath = path.join(context.extensionPath, 'media', 'requestWebViewTemplate.html');
    return fs.readFileSync(templatePath, 'utf8');
  }
}