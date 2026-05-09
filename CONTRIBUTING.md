# Contributing to LiteClient

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

## Development Workflow

1. Start from an up-to-date `main`.
2. Create a focused branch.
3. Make the change.
4. Test manually in the Extension Development Host when the change affects UI, persistence, or request execution.
5. Run the relevant checks.
6. Merge back to `main` when the change is ready.

Suggested branch prefixes:

| Prefix | Purpose |
|---|---|
| `feature/` | New features |
| `fix/` | Bug fixes |
| `docs/` | Documentation changes |
| `refactor/` | Internal restructuring |
| `chore/` | Maintenance work |

## Checks

Run relevant checks before merging or releasing:

```bash
npm run check
npm run lint
npm test
```

`npm test` runs through the extension test workflow and may take longer than the static checks.

## Code Expectations

- Follow existing patterns in nearby files before introducing new structure.
- Keep TypeScript strict and avoid `any` unless existing boundaries make it unavoidable.
- Prefer shared types in `src/shared/` when data crosses the extension/webview boundary.
- Keep comments rare and only use them when the logic is genuinely non-obvious.
- Prefer VS Code native UX patterns over custom UI where possible.

## Documentation Changes

- Update `README.md` for repository-level product overview and onboarding.
- Update `docs/` for end-user documentation published on the docs site.
- Update `CONTRIBUTING.md` for development and release workflow changes.
- Update `AGENTS.md` only for AI assistant guidance and repo-specific implementation constraints.

If you change user-facing behavior, update the user-facing docs in the same branch when practical.

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

## Release Workflow

- Use Semantic Versioning.
- Keep `CHANGELOG.md` as the release source of truth.
- Release only from `main`.
- Release only from a clean working tree.
- Tag only after both marketplace publishes succeed.

| Change type | Version bump |
|---|---|
| Breaking change | Major |
| Backward-compatible feature | Minor |
| Backward-compatible fix | Patch |

### Prepare

1. Make sure intended changes are merged into `main`.
2. Review and finalize the `Unreleased` section in `CHANGELOG.md`.
3. Bump the version in `package.json`.
4. Rename `Unreleased` in `CHANGELOG.md` to the new version and date.
5. Add a fresh empty `Unreleased` section at the top.
6. Commit the release prep changes, usually as `chore: release vX.Y.Z`.

### Credentials

- `VSCE_PAT` for VS Code Marketplace publishing
- `OVSX_PAT` for Open VSX publishing
- `gh` authenticated with permission to create releases

Setup:

```bash
npx vsce login liteclienthq
export VSCE_PAT=your-vscode-marketplace-token
export OVSX_PAT=your-open-vsx-token
gh auth login
```

### Check

```bash
npm run release:check
npm run release:dry
```

### Publish

```bash
npm run release
```

The release command validates the prepared version, runs checks, publishes to both marketplaces, pushes tag `v<package.json version>`, and creates the GitHub release from the matching `CHANGELOG.md` section.

## AI Assistants

AI coding agents should also follow `AGENTS.md`.

## License

By contributing, you agree that your contributions are licensed under the MIT License.
