# Publishing @crosscurve/sdk to npm

## Prerequisites

1. **npm account** with access to the `@crosscurve` organization
2. **Node.js** >= 18.0.0
3. **Clean working directory** (no uncommitted changes)

## Authentication

Login to npm with your credentials:

```bash
npm login
```

Verify you're logged in and have access to the org:

```bash
npm whoami
npm org ls crosscurve
```

## Build & Publish Process

### 1. Clean and Build

```bash
# Remove old build artifacts
npm run clean

# Build the package
npm run build
```

### 2. Run Tests

```bash
# Run all tests
npm test

# Or run specific test suites
npm run test:unit
npm run test:integration
```

### 3. Version Bump

Choose the appropriate version bump:

```bash
# For alpha/beta releases
npm version prerelease --preid=alpha    # 0.0.42-alpha → 0.0.43-alpha
npm version prerelease --preid=beta     # 0.0.42-alpha → 0.0.43-beta

# For stable releases
npm version patch    # 0.0.42 → 0.0.43 (bug fixes)
npm version minor    # 0.0.42 → 0.1.0  (new features, backward compatible)
npm version major    # 0.0.42 → 1.0.0  (breaking changes)
```

This automatically:
- Updates `package.json` version
- Creates a git commit
- Creates a git tag

### 4. Test Locally (Optional but Recommended)

Before publishing, test the package locally:

```bash
# Create a tarball
npm pack

# This creates: crosscurve-sdk-<version>.tgz
# Install it in a test project:
cd /path/to/test-project
npm install /path/to/crosscurve-sdk-<version>.tgz
```

### 5. Publish

```bash
# For alpha/beta (tagged release)
npm publish --access public --tag alpha

# For stable release
npm publish --access public
```

### 6. Push to Git

```bash
git push origin main --tags
```

## Quick Reference

### Full Release Workflow

```bash
# 1. Ensure clean state
git status

# 2. Build and test
npm run clean && npm run build && npm test

# 3. Bump version
npm version patch  # or minor/major/prerelease

# 4. Publish
npm publish --access public

# 5. Push
git push origin main --tags
```

### Alpha Release Workflow

```bash
npm run clean && npm run build && npm test
npm version prerelease --preid=alpha
npm publish --access public --tag alpha
git push origin main --tags
```

## Verify Publication

After publishing, verify:

```bash
# Check npm registry
npm view @crosscurve/sdk

# Check specific version
npm view @crosscurve/sdk versions

# Test installation
npm install @crosscurve/sdk@latest
```

## Troubleshooting

### "You must be logged in to publish"

```bash
npm login
```

### "You do not have permission to publish"

Contact the `@crosscurve` org admin to add you as a member.

### "Cannot publish over existing version"

You cannot republish the same version. Bump the version first:

```bash
npm version patch
```

### Package not found after publish

Scoped packages are private by default. Ensure you use `--access public`:

```bash
npm publish --access public
```

## Package Contents

The published package includes only:
- `dist/` - Compiled JavaScript and TypeScript declarations
- `LICENSE` - MIT license file

Excluded from package (via `files` field):
- `src/` - Source TypeScript files
- `tests/` - Test files
- `playground/` - Test playground
- `docs/` - Documentation
- Config files (tsconfig, vitest, etc.)
