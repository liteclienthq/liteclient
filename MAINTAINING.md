# Maintainer Guide

This document is the canonical release and maintenance guide for LiteClient.

## Release Principles

- Use Semantic Versioning.
- Keep `CHANGELOG.md` as the release source of truth.
- Tag only after both marketplace publishes succeed.
- Prefer repeatable, checklist-based releases over ad hoc steps.

## Version Bumps

| Change type | Version bump |
|---|---|
| Breaking change | Major |
| Backward-compatible feature | Minor |
| Backward-compatible fix | Patch |

## Release Checklist

### Manual steps (you do these)

1. Make sure the intended changes are already on `main`.
2. Review and finalize the `Unreleased` section in `CHANGELOG.md`.
3. Bump the version in `package.json`.
4. Rename `Unreleased` in `CHANGELOG.md` to the new version and date, then add a fresh empty `Unreleased` section at the top.

### Automated steps (the script does these)

5. Run the release:

```bash
npm run release
```

This single command runs `scripts/release.sh`, which:
- Validates pre-flight conditions (clean tree, tag doesn't exist, CHANGELOG entry present)
- Runs `check`, `lint`, and `test`
- Commits `package.json` and `CHANGELOG.md`
- Publishes to VS Code Marketplace (`vsce publish`)
- Publishes to Open VSX (`ovsx publish`)
- Tags and pushes

Use `npm run release:dry` to preview what would happen without publishing or pushing.

6. Create the GitHub release using the matching changelog entry.

## Required Credentials

- `VSCE_PAT` for VS Code Marketplace publishing
- `OVSX_PAT` for Open VSX publishing

Helpful setup commands:

```bash
npx vsce login liteclienthq
export OVSX_PAT=your-token
```

## Hotfix Flow

1. Branch from `main`.
2. Make the smallest safe fix.
3. Run the standard verification commands.
4. Merge back to `main`.
5. Ship a patch release using the normal release checklist.

## Documentation Ownership

- `README.md`: repo landing page and developer entry point
- `CONTRIBUTING.md`: contributor workflow
- `MAINTAINING.md`: maintainer-only operational workflow
- `CHANGELOG.md`: release history
- `AGENTS.md`: AI assistant instructions

Keep those roles separate. Avoid putting release-only instructions in `README.md` or contributor-only instructions in `AGENTS.md`.
