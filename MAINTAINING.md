# Maintainer Guide

This document defines the release workflow for LiteClient. Follow these steps exactly to ensure consistent, error-free releases.

## Versioning

We follow [Semantic Versioning](https://semver.org/):

| Change Type | Version Bump | Example |
|-------------|--------------|---------|
| Breaking changes | Major (X.0.0) | Removing a feature, changing data format |
| New features (backward compatible) | Minor (0.X.0) | Adding OAuth support |
| Bug fixes (backward compatible) | Patch (0.0.X) | Fixing a scroll issue |

## Changelog Format

We follow [Keep a Changelog](https://keepachangelog.com/). Categories:

- **Added** — New features
- **Changed** — Changes to existing features
- **Fixed** — Bug fixes
- **Removed** — Removed features
- **Security** — Security fixes

---

## Release Workflow

When ready to release (features complete, tested, changelog updated):

### Step 1: Merge to Main

```bash
git checkout main
git pull origin main
git merge feature/your-feature-name
```

Or merge via GitHub PR.

### Step 2: Determine Version

Based on changes in `[Unreleased]`:
- Any breaking changes? → Major bump
- New features? → Minor bump
- Only fixes? → Patch bump

### Step 3: Update Version and Changelog

1. Update version in `package.json`:
   ```json
   "version": "0.6.0"
   ```

2. Update CHANGELOG.md — rename `[Unreleased]` to the new version:
   ```markdown
   ## [0.6.0] - 2025-01-12

   ### Added
   - OAuth 2.0 authentication support
   
   ## [0.5.3] - 2025-01-01
   ...
   ```

3. Add empty `[Unreleased]` section at top:
   ```markdown
   ## [Unreleased]

   ## [0.6.0] - 2025-01-12
   ...
   ```

### Step 4: Final Verification

```bash
npm run check
```

Must pass with no errors.

### Step 5: Commit Release

```bash
git add package.json CHANGELOG.md
git commit -m "chore: release v0.6.0"
```

### Step 6: Publish to Marketplaces

**VS Code Marketplace:**
```bash
npx vsce publish
```

**Open VSX Registry:**
```bash
npx ovsx publish
```

> Ensure you have `VSCE_PAT` and `OVSX_PAT` tokens configured.

### Step 7: Tag and Push

Only tag **after** successful publish:

```bash
git tag v0.6.0
git push origin main --tags
```

### Step 8: Create GitHub Release

1. Go to GitHub → Releases → "Create a new release"
2. Select the tag `v0.6.0`
3. Title: `v0.6.0`
4. Description: Copy the changelog entry for this version
5. Publish release

---

## Release Checklist

Copy this checklist for each release:

```markdown
## Release v0.X.0 Checklist

- [ ] All features merged to main
- [ ] `npm run check` passes
- [ ] Manual testing complete
- [ ] CHANGELOG.md updated with version and date
- [ ] package.json version bumped
- [ ] Committed: "chore: release vX.Y.Z"
- [ ] Published to VS Code Marketplace: `npx vsce publish`
- [ ] Published to Open VSX: `npx ovsx publish`
- [ ] Tagged: `git tag vX.Y.Z`
- [ ] Pushed: `git push origin main --tags`
- [ ] GitHub Release created
```

---

## Hotfix Workflow

For urgent fixes to production:

```bash
git checkout main
git checkout -b fix/critical-bug
# Make fix
npm run check
git commit -m "fix: resolve critical bug"
git checkout main
git merge fix/critical-bug
# Follow release workflow (patch bump)
```

---

## Token Setup

### VS Code Marketplace (vsce)

1. Go to https://dev.azure.com
2. Create a Personal Access Token with Marketplace (Publish) scope
3. Run: `npx vsce login liteclienthq`

### Open VSX Registry (ovsx)

1. Go to https://open-vsx.org
2. Get access token from settings
3. Set: `export OVSX_PAT=your-token` or pass via `npx ovsx publish -p $OVSX_PAT`
