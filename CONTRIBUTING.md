# Contributing to LiteClient

This is the canonical contributor guide for the repository.

## Before You Start

- Node.js 18+
- VS Code
- Git

## Local Setup

1. Fork the repository if you are contributing from your own account.
2. Clone the repo: `git clone https://github.com/liteclienthq/liteclient.git`
3. Install dependencies: `npm install`
4. Open the project in VS Code.
5. Press `F5` to launch an Extension Development Host.

## Project Areas

- `src/extension/`: extension host code, services, providers, commands, storage
- `src/webview/`: Lit-based webviews
- `src/shared/`: shared models and message types
- `src/test/`: automated tests
- `docs/`: Mintlify documentation site

## Workflow

1. Create a branch from `main`.
2. Make focused changes.
3. Test manually in the Extension Development Host.
4. Run checks before committing.
5. Open a pull request against `main`.

Suggested branch prefixes:

| Prefix | Purpose |
|---|---|
| `feature/` | New features |
| `fix/` | Bug fixes |
| `docs/` | Documentation changes |
| `refactor/` | Internal restructuring |
| `chore/` | Maintenance work |

## Checks

Run the relevant commands before you submit:

```bash
npm run check
npm run lint
npm test
```

`npm test` runs through the extension test workflow and may take longer than the static checks.

## Code Expectations

- Follow existing patterns in nearby files before introducing new structure.
- Keep TypeScript strict and avoid `any`.
- Prefer shared types in `src/shared/` when data crosses the extension/webview boundary.
- Keep comments rare and only use them when the logic is genuinely non-obvious.
- Prefer VS Code native UX patterns over custom UI where possible.

## Documentation Changes

Use one source of truth per audience:

- Update `README.md` for repository-level product overview and onboarding.
- Update `docs/` for end-user documentation published on the docs site.
- Update `MAINTAINING.md` only for release and maintainer workflow changes.
- Update `AGENTS.md` only for AI assistant guidance and repo-specific implementation constraints.

If you change behavior, update the user-facing docs in the same pull request when practical.

## Commit Messages

Conventional commit style is preferred:

```text
feat: add request scripting support
fix: preserve response scroll position
docs: tighten contributing guide
refactor: extract storage scope helpers
chore: update dependencies
test: add variable resolver coverage
```

## Pull Requests

Include:

- What changed
- Why it changed
- Any manual test coverage
- Screenshots or recordings for visible UI changes when useful

## AI Assistants

AI coding agents should also follow [AGENTS.md](./AGENTS.md). Human contributors do not need it for normal development.

## License

By contributing, you agree that your contributions are licensed under the MIT License.
