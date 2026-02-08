# LiteClient Development Guide

This document provides architectural context and workflow guidance for AI coding assistants working on LiteClient, a VS Code REST API client extension.

## Project Overview

LiteClient is a native VS Code extension that provides a lightweight REST API client. All data persists locally in VS Code's global storage. The extension prioritizes performance, privacy, and native IDE integration.

## Architecture Overview

### Three-Tier Architecture

The extension follows a three-tier architecture:

1. **Extension Module** - Handles business logic, file I/O, HTTP requests
2. **Message Protocol** - Typed communication between extension and webview
3. **Webview Module** - UI built with Lit web components

### Extension Module

Runs in the VS Code extension host process (Node.js).

**Components:**
- **Commands** - User-invokable actions registered in package.json
- **Services** - Business logic for collections, environments, history, HTTP, cookies, OAuth2
- **Providers** - Bridge between extension and webview UIs
- **Storage** - JSON file persistence in globalStorageUri

### Webview Module

Runs in the webview context (browser-like environment).

**Components:**
- **Request Panel** - URL bar, headers, body, auth, response views
- **Sidebar** - Collections, environments, history tabs
- **Cookie Manager** - Cookie management interface
- **Shared** - Base elements, CodeMirror editor, messaging utilities

## Module Responsibilities

### Extension Module

The extension module handles backend operations.

**Entry Point**
- extension.ts initializes all services and registers providers
- Services are instantiated once and injected into commands and providers
- URI handler receives OAuth2 callbacks
- Providers manage webview lifecycle and message routing

### Services Layer

| Service | File | Responsibility |
|---------|------|----------------|
| CollectionService | collectionService.ts | CRUD for collections, folders, requests, Postman import/export |
| EnvironmentService | environmentService.ts | Environment and variable management, includes globals |
| HistoryService | historyService.ts | Request execution history with day-grouped organization |
| HttpRequestService | httpRequestService.ts | HTTP client with variable substitution, timeout, redirects |
| CookieJarService | cookieJarService.ts | Cookie persistence per domain using tough-cookie |
| OAuth2TokenService | oauth2TokenService.ts | OAuth2 token acquisition, caching, and refresh |
| SettingsService | settingsService.ts | User preferences in workspace state |

**Service Patterns:**
- All services receive StorageService via constructor injection
- Follow async/await patterns for I/O
- Throw descriptive errors for invalid operations

### Providers Layer

| Provider | Purpose |
|----------|---------|
| SidebarProvider | Sidebar webview (Collections, Environments, History) |
| RequestPanelManager | Creates/manages request editor panels, handles OAuth2 flows |
| CookieManagerProvider | Cookie management webview panel |

### Commands Layer

| File | Commands |
|------|----------|
| collectionCommands.ts | Collection CRUD, import/export |
| environmentCommands.ts | Environment and variable operations |
| historyCommands.ts | History access and management |
| requestCommands.ts | New request creation |
| cookieCommands.ts | Cookie management commands |

### Webview Components

**Request Editor:**
- lc-url-bar - URL input with method selector
- lc-tabs - Tab navigation
- lc-headers-table - Header editor
- lc-body-panel - Body editor
- lc-auth-panel - Authentication configuration
- lc-form-data-editor - Form-data with file uploads
- lc-variable-autocomplete - Environment variable autocomplete
- lc-response-view - Response display
- lc-cookies-table - Response cookies
- lc-status-bar - Response status/timing
- lc-request-meta - Request metadata

**Sidebar:**
- lc-sidebar-panel - Main container with tabs
- lc-collection-tree - Hierarchical collection browser
- lc-env-switcher - Environment selector
- lc-environment-list - Environment management
- lc-history-list - Day-grouped history
- lc-cookie-manager - Cookie management UI

### Shared Module

**models.ts** - Data types: AuthConfig, RequestBody, Environment, cookies
**messages.ts** - Typed message definitions for IPC
**variableSubstitution.ts** - {{variableName}} substitution logic

## Data Storage

### Storage Files

| File | Contents |
|------|----------|
| collections.json | Collections, folders, requests |
| environments.json | Environments and variables |
| history.json | Request execution history |
| cookies.json | Serialized cookie jar |
| settings.json | User preferences |

### Storage Service

StorageService provides atomic file writes with backup on corruption.

## Feature Implementation Details

### Variable Substitution

Environment variables use {{variableName}} syntax. Substitution occurs in:
- URL
- Headers (keys and values)
- Request body (all modes)
- Authentication credentials

### OAuth 2.0 Authentication

Three grant types supported:
1. Authorization Code - Traditional flow with browser authentication
2. Authorization Code with PKCE - Enhanced security for public clients
3. Client Credentials - Machine-to-machine authentication

Tokens stored in VS Code's SecretStorage.

### Cookie Management

Cookies persisted per domain using tough-cookie. Automatically:
- Sends relevant cookies on requests
- Captures Set-Cookie headers
- Persists across sessions

### Postman Compatibility

- Import: Postman Collection v2.1 with nested folders
- Export: Full collection with metadata

### Request Execution Flow

User clicks Send → lc-url-bar sends 'send-request' message → RequestPanelManager receives → HttpRequestService.substitutes variables → Fetch API executes → Response returned → 'response' message sent to webview → lc-response-view displays → HistoryService records → Sidebar refreshes

## Implementation Patterns

### Adding a New Command

1. Define command in package.json under contributes.commands
2. Create handler in commands/ directory
3. Register in commands/index.ts
4. Add to CommandDependencies interface

### Adding a New Service

1. Create service class in services/
2. Accept StorageService in constructor
3. Add async CRUD methods
4. Instantiate in extension.ts
5. Add to CommandDependencies if needed

### Adding a Webview Component

1. Create lc-component-name.ts in appropriate folder
2. Extend LcBaseElement
3. Use @customElement decorator
4. Import in parent component
5. Add message handler if extension communication needed

### Adding a Message Type

1. Define interface in messages.ts
2. Add handler in provider
3. Send from webview using postMessage()
4. Update union types

## Code Conventions

### General
- No comments unless complex logic requires explanation
- Follow existing patterns in neighboring code
- Prefer VS Code native UI over custom dialogs

### TypeScript
- Strict mode enabled
- Avoid any - use proper types or unknown
- Shared types in src/shared/

### Lit Components
- Prefix with lc-
- Use @customElement decorator
- Extend LcBaseElement

### Naming
- Files: camelCase (current convention)
- Classes: PascalCase
- Functions/variables: camelCase
- Commands: liteclient.verbNoun

## Quick Reference

### Extension Initialization

extension.activate() → Create StorageService → Instantiate all services → Register SidebarProvider → Register RequestPanelManager → Register CookieManagerProvider → Register URI handler for OAuth → Register all commands

### Message Flow Examples

**Webview → Extension (Request Send):**
{ type: 'send-request', method, url, headers, body, auth, environmentId }

**Extension → Webview (Response):**
{ type: 'response', body, status, headers, cookies, time, isError }

**Extension → Webview (State Sync):**
{ type: 'history-list', items }
{ type: 'collections-list', collections }
{ type: 'environments-list', environments, selectedEnvironmentId }

## Related Documentation

- [CONTRIBUTING.md](./CONTRIBUTING.md) - General contributor workflow
- [MAINTAINING.md](./MAINTAINING.md) - Release and maintainer guide
