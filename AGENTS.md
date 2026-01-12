# Agent Guidelines

This file provides context for AI coding assistants working on LiteClient.

## Project Overview

LiteClient is a VS Code extension providing a lightweight REST API client. It uses:
- **Extension host**: TypeScript, VS Code Extension API
- **Webview UI**: Lit web components, CodeMirror for code editing
- **Storage**: JSON files in VS Code's globalStorage

## Commands

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Watch mode (development)
npm run watch

# Type check (run before committing)
npm run check

# Lint
npm run lint

# Run tests
npm test
```

## Project Structure

```
src/
├── extension/                 # VS Code extension (Node.js)
│   ├── commands/              # Command handlers
│   │   ├── index.ts           # Registers all commands
│   │   ├── historyCommands.ts
│   │   ├── collectionCommands.ts
│   │   ├── environmentCommands.ts
│   │   └── requestCommands.ts
│   ├── providers/webviews/    # Webview providers
│   │   ├── requestPanelManager.ts   # Manages request editor panels
│   │   ├── sidebarProvider.ts       # Sidebar webview provider
│   │   ├── requestWebView.ts        # Request panel HTML generator
│   │   └── sidebarWebView.ts        # Sidebar HTML generator
│   ├── services/              # Business logic
│   │   ├── collectionService.ts     # Collection CRUD
│   │   ├── environmentService.ts    # Environment CRUD
│   │   ├── historyService.ts        # Request history
│   │   ├── httpRequestService.ts    # HTTP client
│   │   ├── settingsService.ts       # User settings
│   │   ├── importers/               # Import formats (Postman)
│   │   └── exporters/               # Export formats (Postman)
│   ├── storage/
│   │   └── storageService.ts        # JSON file I/O wrapper
│   ├── utils/                       # Shared utilities
│   └── extension.ts                 # Entry point, command registration
├── webview/                   # Webview UI (Lit components)
│   ├── request/               # Request editor panel
│   │   └── components/        # lc-url-bar, lc-body-panel, etc.
│   ├── sidebar/               # Sidebar panel
│   │   └── components/        # lc-history-list, lc-collection-tree, etc.
│   └── shared/                # Shared webview utilities
├── shared/                    # Shared types (extension + webview)
│   ├── models.ts              # AuthConfig, RequestBody, etc.
│   └── messages.ts            # Typed message protocol
└── test/                      # Tests
```

## Architecture Notes

### Extension ↔ Webview Communication
- Uses `postMessage` API for bidirectional communication
- Messages are typed in `src/shared/messages.ts`
- Sidebar: `SidebarProvider` ↔ `lc-sidebar-panel`
- Request panels: `RequestPanelManager` ↔ request webview

### Data Storage
- All data stored as JSON in VS Code's `globalStorageUri`
- Files: `collections.json`, `environments.json`, `history.json`, `settings.json`
- `StorageService` handles all file I/O

### Services Pattern
- Each domain has a service: `CollectionService`, `EnvironmentService`, `HistoryService`
- Services receive `StorageService` via constructor injection
- Services are instantiated once in `extension.ts`

## Code Conventions

### General
- No comments unless code is complex and requires context
- Use existing patterns — look at neighboring code before writing new code
- Prefer VS Code's native UI (QuickPick, InputBox) over custom webview dialogs

### TypeScript
- Strict mode enabled
- Avoid `any` — use proper types or `unknown`
- Shared types go in `src/shared/`

### Lit Components
- Prefix all components with `lc-` (e.g., `lc-url-bar`)
- Use `@customElement` decorator
- Extend `LcBaseElement` for shared styles

### Naming
- Files: kebab-case (`collection-service.ts` style, though current files use camelCase)
- Classes: PascalCase (`CollectionService`)
- Functions/variables: camelCase (`loadCollections`)
- Commands: `liteclient.verbNoun` (e.g., `liteclient.newRequest`)

## Testing

```bash
# Run all tests
npm test

# Tests use @vscode/test-electron
# Test files: src/test/*.test.ts
```

## Manual Testing

1. Press `F5` in VS Code to launch Extension Development Host
2. Open the LiteClient sidebar from the Activity Bar
3. Test the feature you're working on

## Before Committing

Always run:
```bash
npm run check
```

This runs TypeScript type checking for both extension and webview code.

## Common Tasks

### Adding a new command
1. Define command in `package.json` under `contributes.commands`
2. Register handler in `extension.ts` (or future `commands/` folder)
3. Add to `context.subscriptions`

### Adding a new webview component
1. Create `lc-component-name.ts` in appropriate `components/` folder
2. Extend `LcBaseElement`
3. Import in parent component

### Adding a new service method
1. Add method to relevant service in `src/extension/services/`
2. Follow existing async/await patterns
3. Use `StorageService` for persistence

### Adding a new message type
1. Add handler in `sidebarProvider.ts` or `requestPanelManager.ts`
2. Send from webview using `postMessage({ type: 'your-type', ... })`
