# LiteClient Agent Guide

AI coding agents must follow `CONTRIBUTING.md`. This file adds only agent-specific rules and repo context.

## Agent Workflow Rules

- Do not make implementation changes on `main`.
- Before editing files, create or switch to a task branch from `main`.
- Use the same branch prefixes as human contributors: `feature/`, `fix/`, `docs/`, `chore/`, or `refactor/`.
- Keep changes focused. Do not mix unrelated UI, release, docs, and refactor work in one branch.
- Run relevant checks when practical:

```bash
npm run check
npm run lint
npm test
```

- Do not run release, publish, tag, or GitHub release commands unless the user explicitly asks for a release.

## Source Of Truth

Read these before making assumptions:

- `CONTRIBUTING.md`: development and release workflow
- `package.json`: commands, extension contributions, settings
- `src/extension/extension.ts`: service/provider wiring
- `src/shared/models.ts`: shared data model
- `src/shared/messages.ts`: extension/webview message contract
- `src/extension/utils/variableResolver.ts`: variable precedence
- `src/extension/storage/storageService.ts`: storage scope behavior

## Architecture Snapshot

LiteClient is a VS Code extension with a typed message boundary between the extension host and Lit webviews.

- `src/extension/`: commands, services, providers, storage, utilities
- `src/webview/`: request editor, sidebar, cookie manager, environment manager, collection manager
- `src/shared/`: models and message definitions used on both sides

Key providers:

- `sidebarProvider.ts`
- `requestPanelManager.ts`
- `cookieManagerProvider.ts`
- `environmentManagerProvider.ts`
- `collectionManagerProvider.ts`

Key services:

- `collectionService.ts`
- `environmentService.ts`
- `historyService.ts`
- `httpRequestService.ts`
- `cookieJarService.ts`
- `oauth2TokenService.ts`
- `settingsService.ts`
- `currentValuesService.ts`
- `scriptRunner.ts`

## Repo-Specific Rules

- Storage is not global-only. LiteClient supports both global storage and workspace storage.
- Variable resolution is layered. Respect the existing precedence in `variableResolver.ts`.
- Some user state lives outside JSON storage, such as selected environment and current-value overrides.
- If a change touches extension/webview communication, update `src/shared/messages.ts` first and keep both sides in sync.
- If a change affects persisted models, verify storage compatibility and migration behavior.
- Postman import/export compatibility matters for collections, variables, and scripts.

## Common Change Paths

### New command

1. Add the command contribution in `package.json`.
2. Implement or register it under `src/extension/commands/`.
3. Wire dependencies through `commands/index.ts` and `extension.ts`.

### New request-panel behavior

1. Update shared message/model types if needed.
2. Update the relevant request webview component.
3. Update `requestPanelManager.ts`.
4. Verify request persistence and replay behavior.

### Variable-related changes

1. Check `models.ts`, `messages.ts`, and `variableResolver.ts`.
2. Verify substitution in URL, headers, auth, and body modes.
3. Verify globals, collection variables, environments, and current-value overrides.

### Storage-related changes

1. Check `storageService.ts`.
2. Verify both global and workspace scope behavior.
3. Consider migration or external file change handling.
