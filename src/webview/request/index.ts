/**
 * LiteClient Request Panel Webview
 * Entry point for the request panel UI built with Lit
 */

import { html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { LcBaseElement } from '../shared/base-element.js';
import { onMessage, postMessage, type ExtensionMessage, type RequestBody, type AuthConfig, type ScriptTestResult, type ScriptConsoleEntry } from '../shared/messaging.js';
import type { EnvironmentVariable } from '../../shared/models.js';

interface OriginalRequestState {
  method: string;
  url: string;
  headers: Array<{ key: string; value: string; active: boolean }>;
  body: RequestBody;
  auth: AuthConfig;
  params: Array<{ key: string; value: string; active: boolean }>;
  preRequestScript: string;
  postResponseScript: string;
}

// Import components
import './components/lc-status-bar.js';
import './components/lc-tabs.js';
import './components/lc-response-view.js';
import './components/lc-headers-table.js';
import './components/lc-cookies-table.js';
import './components/lc-url-bar.js';
import './components/lc-request-meta.js';
import './components/lc-test-results.js';
import type { ParsedCookie } from '../shared/messaging.js';




import type { Tab } from './components/lc-tabs.js';

/**
 * Main request panel component
 */
@customElement('lc-request-panel')
export class LcRequestPanel extends LcBaseElement {
  static styles = css`
    .request-panel {
      display: flex;
      flex-direction: column;
      height: 100vh;
      box-sizing: border-box;
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      overflow: hidden;
    }

    .main-container {
      display: flex;
      flex: 1;
      min-height: 0;
      gap: 0;
      padding: 0;
    }

    .request-panel.vertical .main-container {
      flex-direction: column;
    }

    .request-panel.horizontal .main-container {
      flex-direction: row;
    }

    .request-section {
      flex: 0 0 var(--split-position, 50%);
      display: flex;
      flex-direction: column;
      min-height: 0;
      min-width: 200px;
      box-sizing: border-box;
    }

    .response-section {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 200px;
      min-height: 0;
      box-sizing: border-box;
    }

    .request-panel.horizontal .request-section {
      padding: 0 12px 12px 12px;
    }
    .request-panel.horizontal .response-section {
      padding: 0 12px 12px 12px;
    }

    .request-panel.vertical .request-section {
      padding: 0 12px 0 12px;
    }
    .request-panel.vertical .response-section {
      padding: 0 12px 12px 12px;
    }

    .resizer {
      background: var(--vscode-panel-border);
      transition: background 0.15s;
      z-index: 10;
      flex-shrink: 0;
      position: relative;
    }

    .resizer:hover, .resizer.resizing {
      background: var(--vscode-sash-hoverBorder, var(--vscode-focusBorder));
    }

    .request-panel.horizontal .resizer {
      width: 4px;
      cursor: col-resize;
    }

    .request-panel.horizontal .resizer::after {
      content: '';
      position: absolute;
      top: 0;
      bottom: 0;
      left: -2px;
      right: -2px;
    }

    .request-panel.vertical .resizer {
      height: 4px;
      cursor: row-resize;
    }

    .request-panel.vertical .resizer::after {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      top: -2px;
      bottom: -2px;
    }

    .response-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 0;
    }

    .response-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
      overflow-y: auto;
    }


    .tab-panel {
      flex: 1;
      display: none;
      flex-direction: column;
      min-height: 0;
    }

    .tab-panel.active {
      display: flex;
    }
  `;


  @state() status = '-';
  @state() size = '-';
  @state() time = '-';
  @state() isError = false;
  @state() responseBody = '';
  @state() responseHeaders: Record<string, string> = {};
  @state() responseCookies: ParsedCookie[] = [];
  @state() responseContentType = '';
  @state() activeTab = 'response';
  @state() loading = false;
  @state() responseState: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  @state() layout: 'vertical' | 'horizontal' = 'horizontal';
  @state() private splitPosition = 50;
  @state() private isResizing = false;



  @state() testResults: ScriptTestResult[] = [];
  @state() consoleLogs: ScriptConsoleEntry[] = [];
  @state() scriptError = '';

  @state() requestMethod = 'GET';
  @state() requestUrl = '';
  @state() requestParams: any[] = [];
  @state() requestHeaders: any[] = [];
  @state() requestBody: RequestBody = { mode: 'none' };
  @state() requestAuth: any = { type: 'none' };
  @state() preRequestScript = '';
  @state() postResponseScript = '';
  @state() collectionId: string | undefined;
  @state() collectionVariables: EnvironmentVariable[] = [];
  @state() requestName = 'New Request';
  @state() selectedEnvironmentId: string | null = null;
  @state() environments: any[] = [];

  @state() private isDirty = false;
  private originalRequest: OriginalRequestState | null = null;



  private get tabs(): Tab[] {
    const headerCount = Object.keys(this.responseHeaders).length;
    const cookieCount = this.responseCookies.length;
    const testCount = this.testResults.length;
    return [
      { id: 'response', label: 'Response' },
      { id: 'headers', label: 'Headers', indicator: headerCount > 0 ? headerCount : undefined },
      { id: 'cookies', label: 'Cookies', indicator: cookieCount > 0 ? cookieCount : undefined },
      { id: 'tests', label: 'Tests', indicator: testCount > 0 ? testCount : undefined }
    ];
  }

  connectedCallback() {
    super.connectedCallback();
    this.setupMessageListener();
    this.setupKeyboardShortcuts();

    // Bind handlers
    this.handleGlobalMouseMove = this.handleGlobalMouseMove.bind(this);
    this.handleGlobalMouseUp = this.handleGlobalMouseUp.bind(this);
  }

  private setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this.handleSaveRequest();
      }
    });
  }


  private setupMessageListener() {
    onMessage((message: ExtensionMessage) => {
      if (message.type === 'response') {
        this.handleResponse(message);
      } else if (message.type === 'load-request') {
        this.handleLoadRequest(message);
      } else if (message.type === 'collection-state') {
        this.handleCollectionState(message);
      } else if (message.type === 'environments-list') {
        this.handleEnvironmentsList(message);
      } else if (message.type === 'set-environment') {
        this.handleSetEnvironment(message);
      } else if (message.type === 'oauth2-token-result') {
        this.handleOAuth2TokenResult(message);
      }
    });
  }

  private handleSetEnvironment(message: any) {
    const { environmentId } = message;
    // Update both the URL bar and the local state
    const urlBar = this.renderRoot?.querySelector('lc-url-bar') as any;
    if (urlBar) {
      urlBar.selectedEnvironmentId = environmentId;
    }
    this.selectedEnvironmentId = environmentId;
  }

  private handleEnvironmentsList(message: any) {
    const { environments, selectedEnvironmentId } = message;
    // Store environments in local state
    this.environments = environments;
    // Update the URL bar with the environment data
    const urlBar = this.renderRoot?.querySelector('lc-url-bar') as any;
    if (urlBar) {
      urlBar.environments = environments;
      urlBar.selectedEnvironmentId = selectedEnvironmentId;
    }
    // Also update the local state
    this.selectedEnvironmentId = selectedEnvironmentId;
  }

  private handleLoadRequest(message: any) {
    const { payload } = message;
    this.requestMethod = payload.method;
    this.requestUrl = payload.url;

    // Handle body loading (with backward compatibility)
    if (payload.body && typeof payload.body === 'object' && 'mode' in payload.body) {
      this.requestBody = payload.body;
    } else if (typeof payload.body === 'string') {
      this.requestBody = {
        mode: 'raw',
        rawType: 'json',
        value: payload.body
      };
    } else {
      this.requestBody = { mode: 'none' };
    }

    this.requestAuth = payload.auth || { type: 'none' };
    this.preRequestScript = payload.preRequestScript || '';
    this.postResponseScript = payload.postResponseScript || '';
    this.collectionId = payload.collectionId;
    this.collectionVariables = payload.collectionVariables || [];
    this.requestName = payload.name || 'New Request';

    // Map headers and params Record to arrays for the editor
    this.requestHeaders = Object.entries(payload.headers || {}).map(([key, value]) => ({
      key, value, active: true
    }));

    // Handle params
    if (payload.params && payload.params.length > 0) {
      this.requestParams = payload.params;
    } else {
      this.updateParamsFromUrl();
    }

    // Ensure there's always an empty row for new params if none exist
    if (this.requestParams.length === 0) {
      this.requestParams = [{ id: crypto.randomUUID(), key: '', value: '', active: true }];
    }

    // Store original state for dirty tracking (deep copy)
    this.storeOriginalRequest();
    this.setDirtyState(false);
  }

  private handleCollectionState(message: { collectionId: string; variables: EnvironmentVariable[] }) {
    if (this.collectionId !== message.collectionId) {
      return;
    }
    this.collectionVariables = message.variables || [];
  }

  private storeOriginalRequest() {
    this.originalRequest = {
      method: this.requestMethod,
      url: this.requestUrl,
      headers: JSON.parse(JSON.stringify(this.requestHeaders)),
      body: JSON.parse(JSON.stringify(this.requestBody)),
      auth: JSON.parse(JSON.stringify(this.requestAuth)),
      params: JSON.parse(JSON.stringify(this.requestParams)),
      preRequestScript: this.preRequestScript,
      postResponseScript: this.postResponseScript
    };
  }

  private checkDirtyState(): boolean {
    if (!this.originalRequest) {
      return false;
    }

    if (this.requestMethod !== this.originalRequest.method) {
      return true;
    }
    if (this.requestUrl !== this.originalRequest.url) {
      return true;
    }
    if (JSON.stringify(this.requestBody) !== JSON.stringify(this.originalRequest.body)) {
      return true;
    }
    if (JSON.stringify(this.requestAuth) !== JSON.stringify(this.originalRequest.auth)) {
      return true;
    }

    // Compare headers (ignoring empty rows)
    const currentHeaders = this.requestHeaders.filter(h => h.key);
    const originalHeaders = this.originalRequest.headers.filter(h => h.key);
    if (JSON.stringify(currentHeaders) !== JSON.stringify(originalHeaders)) {
      return true;
    }

    // Compare params (ignoring empty rows)
    const currentParams = this.requestParams.filter(p => p.key);
    const originalParams = this.originalRequest.params.filter(p => p.key);
    if (JSON.stringify(currentParams) !== JSON.stringify(originalParams)) {
      return true;
    }

    if (this.preRequestScript !== this.originalRequest.preRequestScript) {return true;}
    if (this.postResponseScript !== this.originalRequest.postResponseScript) {return true;}

    return false;
  }

  private setDirtyState(dirty: boolean) {
    if (this.isDirty !== dirty) {
      this.isDirty = dirty;
      postMessage({ type: 'dirty-state', isDirty: dirty });
    }
  }

  private updateDirtyState() {
    this.setDirtyState(this.checkDirtyState());
  }

  private handleSaveRequest() {
    this.sendExtensionMessage('save-request');
    // Reset dirty state after save (extension will show success/failure toast)
    this.storeOriginalRequest();
    this.setDirtyState(false);
  }

  private handleOAuth2TokenResult(message: any) {
    const requestMeta = this.renderRoot?.querySelector('lc-request-meta') as any;
    if (requestMeta) {
      const authPanel = requestMeta.renderRoot?.querySelector('lc-auth-panel') as any;
      if (authPanel?.handleOAuth2TokenResult) {
        authPanel.handleOAuth2TokenResult(message);
      }
    }
  }

  private sendExtensionMessage(type: 'send-request' | 'save-request') {
    const headersRecord: Record<string, string> = {};
    this.requestHeaders.forEach(h => {
      if (h.key && h.active) {
        headersRecord[h.key] = h.value;
      }
    });

    if (type === 'save-request') {
      postMessage({
        type: 'save-request',
        name: this.requestName,
        collectionId: this.collectionId,
        payload: {
          method: this.requestMethod,
          url: this.requestUrl,
          headers: headersRecord,
          body: this.requestBody,
          auth: this.requestAuth,
          preRequestScript: this.preRequestScript,
          postResponseScript: this.postResponseScript
        }
      });
    } else {
      // Use the local state for the selected environment ID
      const selectedEnvironmentId = this.selectedEnvironmentId;

      postMessage({
        type: 'send-request',
        method: this.requestMethod,
        url: this.requestUrl,
        headers: headersRecord,
        body: this.requestBody,
        auth: this.requestAuth,
        name: this.requestName,
        environmentId: selectedEnvironmentId,
        preRequestScript: this.preRequestScript,
        postResponseScript: this.postResponseScript
      });
    }
  }


  private handleResponse(message: { body: string; status: string; headers: Record<string, string>; cookies: ParsedCookie[]; time?: number; isError: boolean; testResults?: ScriptTestResult[]; consoleLogs?: ScriptConsoleEntry[]; scriptError?: string }) {
    this.loading = false;
    this.responseState = message.isError ? 'error' : 'success';
    this.responseBody = message.body;
    this.status = message.status;
    this.responseHeaders = message.headers;
    this.responseCookies = message.cookies || [];
    this.isError = message.isError;
    this.time = message.time ? `${message.time} ms` : '-- ms';
    this.testResults = message.testResults || [];
    this.consoleLogs = message.consoleLogs || [];
    this.scriptError = message.scriptError || '';

    // Find content type
    this.responseContentType = '';
    for (const [key, value] of Object.entries(message.headers)) {
      if (key.toLowerCase() === 'content-type') {
        this.responseContentType = value;
        break;
      }
    }

    // Calculate size
    const bytes = new TextEncoder().encode(message.body).length;
    if (bytes < 1024) {
      this.size = `${bytes} B`;
    } else {
      this.size = `${(bytes / 1024).toFixed(1)} KB`;
    }
  }


  private handleTabChange(e: CustomEvent<{ tabId: string }>) {
    this.activeTab = e.detail.tabId;
  }



  private handleMethodChange(e: CustomEvent<{ method: string }>) {
    this.requestMethod = e.detail.method;
    this.updateDirtyState();
  }

  private handleUrlChange(e: CustomEvent<{ url: string }>) {
    this.requestUrl = e.detail.url;
    this.updateParamsFromUrl();
    this.updateDirtyState();
  }

  private handleSendRequest() {
    this.loading = true;
    this.responseState = 'loading';
    this.status = '-';
    this.size = '-';
    this.time = '-- ms';
    this.isError = false;
    this.responseBody = '';
    this.responseHeaders = {};
    this.responseCookies = [];
    this.testResults = [];
    this.consoleLogs = [];
    this.scriptError = '';

    this.sendExtensionMessage('send-request');
  }

  private handleCancelRequest() {
    postMessage({ type: 'cancel-request' });
  }


  private handleParamsChange(e: CustomEvent) {
    this.requestParams = e.detail.items;
    this.updateUrlFromParams();
    this.updateDirtyState();
  }

  private updateUrlFromParams() {
    try {
      const urlStr = this.requestUrl.startsWith('http') ? this.requestUrl : `http://${this.requestUrl}`;
      const url = new URL(urlStr);
      const params = new URLSearchParams();

      this.requestParams.forEach(p => {
        if (p.key && p.active) {
          params.append(p.key, p.value);
        }
      });

      const queryString = params.toString();
      const baseUrl = this.requestUrl.split('?')[0];
      this.requestUrl = queryString ? `${baseUrl}?${queryString}` : baseUrl;
    } catch (err) {
      // Ignore
    }
  }

  private updateParamsFromUrl() {
    try {
      const urlStr = this.requestUrl.startsWith('http') ? this.requestUrl : `http://${this.requestUrl}`;
      const url = new URL(urlStr);
      const params: any[] = [];

      url.searchParams.forEach((value, key) => {
        params.push({ id: crypto.randomUUID(), key, value, active: true });
      });

      // Maintain the "empty last row" behavior
      params.push({ id: crypto.randomUUID(), key: '', value: '', active: true });
      this.requestParams = params;
    } catch (err) {
      // Ignore
    }
  }


  private handleHeadersChange(e: CustomEvent) {
    this.requestHeaders = e.detail.items;
    this.updateDirtyState();
  }

  private handleResizerMouseDown(e: MouseEvent) {
    e.preventDefault();
    this.isResizing = true;
    document.addEventListener('mousemove', this.handleGlobalMouseMove);
    document.addEventListener('mouseup', this.handleGlobalMouseUp);
    document.body.style.cursor = this.layout === 'horizontal' ? 'col-resize' : 'row-resize';
  }

  private handleGlobalMouseMove(e: MouseEvent) {
    if (!this.isResizing) {
      return;
    }

    const container = this.renderRoot.querySelector('.main-container');
    if (!container) {
      return;
    }


    const rect = container.getBoundingClientRect();
    let newPos: number;

    if (this.layout === 'horizontal') {
      newPos = ((e.clientX - rect.left) / rect.width) * 100;
    } else {
      newPos = ((e.clientY - rect.top) / rect.height) * 100;
    }

    // Constraints
    if (newPos > 10 && newPos < 90) {
      this.splitPosition = newPos;
    }
  }

  private handleGlobalMouseUp() {
    this.isResizing = false;
    document.removeEventListener('mousemove', this.handleGlobalMouseMove);
    document.removeEventListener('mouseup', this.handleGlobalMouseUp);
    document.body.style.cursor = 'default';
  }


  render() {
    return html`
      <div class="request-panel ${this.layout}" style="--split-position: ${this.splitPosition}%">
        <lc-url-bar
          .method=${this.requestMethod}
          .url=${this.requestUrl}
          ?loading=${this.loading}
          .environments=${this.environments}
          .collectionVariables=${this.collectionVariables}
          .selectedEnvironmentId=${this.selectedEnvironmentId}
          @method-change=${this.handleMethodChange}
          @url-change=${this.handleUrlChange}
          @send-request=${this.handleSendRequest}
          @save-request=${this.handleSaveRequest}
          @layout-toggle=${() => this.layout = this.layout === 'vertical' ? 'horizontal' : 'vertical'}
          @set-environment=${(e: CustomEvent) => {
        this.selectedEnvironmentId = e.detail.environmentId;
        postMessage({ type: 'set-environment', environmentId: e.detail.environmentId });
      }}
        ></lc-url-bar>

        <div class="main-container">
          <div class="request-section">
            <lc-request-meta
              .params=${this.requestParams}
              .headers=${this.requestHeaders}
              .body=${this.requestBody}
              .auth=${this.requestAuth}
              .environments=${this.environments}
              .collectionVariables=${this.collectionVariables}
              .selectedEnvironmentId=${this.selectedEnvironmentId}
              .preRequestScript=${this.preRequestScript}
              .postResponseScript=${this.postResponseScript}
              @params-change=${this.handleParamsChange}
              @headers-change=${this.handleHeadersChange}
              @body-change=${(e: CustomEvent) => { this.requestBody = e.detail.body; this.updateDirtyState(); }}
              @auth-change=${(e: CustomEvent) => { this.requestAuth = e.detail.auth; this.updateDirtyState(); }}
              @scripts-change=${(e: CustomEvent) => { this.preRequestScript = e.detail.preRequestScript; this.postResponseScript = e.detail.postResponseScript; this.updateDirtyState(); }}
            ></lc-request-meta>
          </div>

          <div 
            class="resizer ${this.isResizing ? 'resizing' : ''}"
            @mousedown=${this.handleResizerMouseDown}
          ></div>

          <div class="response-section">

            <div class="response-header">
              <lc-status-bar
                status=${this.status}
                size=${this.size}
                time=${this.time}
                ?isError=${this.isError}
                responseState=${this.responseState}
              ></lc-status-bar>
            </div>


            <lc-tabs
              .tabs=${this.tabs}
              activeTab=${this.activeTab}
              @tab-change=${this.handleTabChange}
            ></lc-tabs>

            <div class="response-content">
              <div class="tab-panel ${this.activeTab === 'response' ? 'active' : ''}">
                <lc-response-view
                  .body=${this.responseBody}
                  contentType=${this.responseContentType}
                  ?loading=${this.loading}
                  @cancel-request=${this.handleCancelRequest}
                ></lc-response-view>
              </div>
              
              <div class="tab-panel ${this.activeTab === 'headers' ? 'active' : ''}">
                <lc-headers-table
                  .headers=${this.responseHeaders}
                ></lc-headers-table>
              </div>

              <div class="tab-panel ${this.activeTab === 'cookies' ? 'active' : ''}">
                <lc-cookies-table
                  .cookies=${this.responseCookies}
                ></lc-cookies-table>
              </div>

              <div class="tab-panel ${this.activeTab === 'tests' ? 'active' : ''}">
                <lc-test-results
                  .testResults=${this.testResults}
                  .consoleLogs=${this.consoleLogs}
                  .scriptError=${this.scriptError}
                ></lc-test-results>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

}

// Initialize the panel
document.body.style.margin = '0';
document.body.style.padding = '0';
document.body.style.overflow = 'hidden';
document.body.innerHTML = '<lc-request-panel></lc-request-panel>';
