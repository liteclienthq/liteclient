# Contributing to LiteClient

Thank you for your interest in contributing to LiteClient! This guide will help you get started.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/liteclienthq/liteclient.git`
3. Install dependencies: `npm install`
4. Open in VS Code and press `F5` to launch the Extension Development Host

## Development Workflow

### Branch Naming

Create a branch from `main` using one of these prefixes:

- `feature/` — New features (e.g., `feature/oauth-support`)
- `fix/` — Bug fixes (e.g., `fix/response-scroll-issue`)
- `docs/` — Documentation only (e.g., `docs/update-readme`)
- `refactor/` — Code refactoring (e.g., `refactor/extract-commands`)

### Making Changes

1. Create your branch: `git checkout -b feature/your-feature`
2. Make changes incrementally
3. Test manually using the Extension Development Host (`F5`)
4. Run checks: `npm run check`
5. Commit with clear messages (see below)

### Commit Messages

Use clear, descriptive commit messages:

```
feat: add OAuth 2.0 authentication support
fix: resolve scroll position reset in response panel
docs: update README with new features
refactor: extract command handlers to separate files
chore: update dependencies
```

Prefix format:
- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation
- `refactor:` — Code refactoring
- `chore:` — Maintenance tasks
- `test:` — Adding or updating tests

### Before Submitting

- [ ] Run `npm run check` (must pass)
- [ ] Test the feature manually
- [ ] Update documentation if needed

## Pull Request Process

1. Push your branch to your fork
2. Open a Pull Request against `main`
3. Describe what your PR does and why
4. Link any related issues

## Code Style

- TypeScript with strict mode
- No `any` types — use proper types or `unknown`
- Follow existing patterns in the codebase
- See [AGENTS.md](./AGENTS.md) for detailed conventions

## Questions?

- Open an issue for bugs or feature requests
- Check existing issues before creating new ones

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
