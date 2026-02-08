# Contributing to LiteClient

Thank you for your interest in contributing to LiteClient! This guide covers everything you need to know to contribute effectively.

## Getting Started

### Prerequisites

- Node.js 18+
- VS Code (for development)
- Git

### Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/liteclienthq/liteclient.git`
3. Install dependencies: `npm install`
4. Open in VS Code and press `F5` to launch the Extension Development Host

## Development Workflow

### Branch Naming

Create a branch from `main` using these prefixes:

| Prefix | Purpose | Example |
|--------|---------|---------|
| `feature/` | New features | `feature/oauth-support` |
| `fix/` | Bug fixes | `fix/response-scroll-issue` |
| `docs/` | Documentation | `docs/update-readme` |
| `refactor/` | Code refactoring | `refactor/extract-commands` |
| `chore/` | Maintenance | `chore/update-dependencies` |

### Making Changes

1. Create your branch: `git checkout -b feature/your-feature`
2. Make changes incrementally
3. Test manually using the Extension Development Host (`F5`)
4. Run checks: `npm run check`
5. Commit with clear messages (see below)

### Before Submitting

- [ ] Run `npm run check` (must pass with no errors)
- [ ] Test the feature manually
- [ ] Update documentation if needed

## Commit Messages

Use conventional commit messages:

```
<type>: <description>

Types:
- feat: A new feature
- fix: A bug fix
- docs: Documentation only changes
- refactor: Code refactoring (no behavior change)
- chore: Maintenance tasks
- test: Adding or updating tests
```

Examples:
```
feat: add OAuth 2.0 authentication support
fix: resolve scroll position reset in response panel
docs: update README with new features
refactor: extract command handlers to separate files
chore: update dependencies
```

## Pull Request Process

1. Push your branch to your fork
2. Open a Pull Request against `main`
3. Ensure all CI checks pass
4. Describe what your PR does and why
5. Link any related issues

## Code Style

### TypeScript

- Strict mode enabled
- Avoid `any` — use proper types or `unknown`
- Shared types in `src/shared/`

### Lit Components

- Prefix with `lc-`
- Extend `LcBaseElement`
- Use `@customElement` decorator

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | camelCase | `collectionService.ts` |
| Classes | PascalCase | `CollectionService` |
| Functions/variables | camelCase | `getCollection()` |
| Commands | `liteclient.verbNoun` | `liteclient.sendRequest` |

### General

- No comments unless complex logic requires explanation
- Follow existing patterns in neighboring code
- Prefer VS Code native UI over custom dialogs

## Testing

### Manual Testing

Press `F5` in VS Code to launch the Extension Development Host.

### Automated Testing

```bash
npm test          # Run all tests
npm run check     # TypeScript type checking
npm run lint      # ESLint validation
```

## Questions?

- Open an issue for bugs or feature requests
- Check existing issues before creating new ones
- See [AGENTS.md](./AGENTS.md) for AI coding conventions

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
