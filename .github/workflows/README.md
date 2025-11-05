# GitHub Workflows for Vicinae Extensions

This directory contains GitHub Actions workflows for the Vicinae Extensions monorepo.

## 🏗️ Workflows Overview

### 1. `ci.yml` - Continuous Integration
**Triggers:** Push to main/develop, Pull Requests, Merge Groups

**What it does:**
- ✅ **Smart change detection** - Only builds projects that have changes
- 🔒 **Generates/updates package-lock.json** for each project
- 🧪 **Runs tests and builds** for all affected projects
- 🧹 **Linting and formatting checks**
- 🔍 **Security audit** with `npm audit`
- 📦 **Uploads build artifacts**
- 🤖 **Auto-commits package-lock.json** on main branch pushes

**Projects:** `bitwarden`, `home-assistant-actions`, `port-killer`, `tailscale`, `weather`

### 2. `dependency-update.yml` - Dependency Management
**Triggers:** Weekly schedule (Sundays 2 AM UTC), Manual dispatch

**What it does:**
- 🔍 **Security audits** - Scans for vulnerabilities weekly
- ⬆️ **Dependency updates** - Updates packages to latest versions (manual)
- 🤖 **Auto-creates PRs** for dependency updates
- 📊 **Audit reports** - Saves security scan results
- 🔄 **Bulk lock file regeneration**

## 🚀 Usage

### Automatic Triggers
- **Push/PR**: CI workflow runs automatically on code changes
- **Weekly**: Security audits run every Sunday at 2 AM UTC

### Manual Triggers

#### Update dependencies for all projects:
```bash
# Go to Actions tab → "Dependency Management" → "Run workflow"
# Leave project field empty
```

#### Update dependencies for specific project:
```bash
# Go to Actions tab → "Dependency Management" → "Run workflow"
# Select project from dropdown (e.g., "bitwarden")
```

## 📂 Project Structure

Each project must have:
- `package.json` - Node.js project configuration
- `package-lock.json` - Dependency lock file (auto-generated)

Optional but recommended:
- `npm run build` - Build script
- `npm run lint` - Linting script
- `npm run format` - Formatting script (like port-killer)

## 🔧 How It Works

### Change Detection
The CI workflow is smart about which projects to build:

- **Pull Requests**: Only builds projects with file changes
- **Main branch pushes**: Always builds all projects
- **Manual runs**: Builds all projects

### Matrix Strategy
Both workflows use GitHub Actions matrix strategy to run jobs in parallel:

```yaml
strategy:
  matrix:
    project: [bitwarden, home-assistant-actions, port-killer, tailscale, weather]
```

This means:
- ⚡ **Faster builds** - Projects build in parallel
- 🔄 **Consistent environment** - Same Node.js version across all projects
- 📊 **Individual results** - Each project gets its own build status

### Package Lock File Management

#### During CI:
1. Fresh `npm ci` install from existing lock file
2. If lock file missing, generates one with `npm install --package-lock-only`
3. Validates all dependencies install correctly
4. Auto-commits updated lock files on main branch

#### During Dependency Updates:
1. Backs up existing lock file
2. Runs `npm update` to get latest compatible versions
3. Regenerates lock file for consistency
4. Tests build still works
5. Creates PR if changes detected

## 🛠️ Configuration

### Node.js Version
Currently set to Node.js 18. Update in both workflows if needed:

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '18'  # Change this
```

### Caching
The workflows use npm caching for faster builds:

```yaml
cache: 'npm'
cache-dependency-path: '${{ matrix.project }}/package-lock.json'
```

### Security Audit Levels
- **CI builds**: `--audit-level moderate`
- **Dependency updates**: `--audit-level high`

## 📋 Build Artifacts

The CI workflow uploads build artifacts for each project:
- `dist/`, `build/`, `lib/` directories
- Updated `package-lock.json` files
- Retention: 7 days

Security audit workflow uploads:
- JSON audit reports
- Retention: 30 days

## 🔍 Troubleshooting

### Common Issues

#### "No package.json found"
- Workflow skips projects without `package.json`
- Add `package.json` to the project root

#### "Build failed"
- Check if `npm run build` script exists
- Verify all dependencies are properly listed

#### "Lint failed"
- Add `lint` script to `package.json`, or
- Use `npm run lint --if-present` (already configured)

#### "Package-lock.json conflicts"
- Workflow automatically regenerates lock files
- Manual conflicts should be resolved by deleting and regenerating

### Debug Mode
To see more detailed output, add this to any job:

```yaml
- name: Enable debug
  run: echo "ACTIONS_STEP_DEBUG=true" >> $GITHUB_ENV
```

## 🔐 Security

### Permissions
Workflows use `GITHUB_TOKEN` with these permissions:
- `contents: write` - To commit package-lock.json files
- `pull-requests: write` - To create dependency update PRs

### Audit Levels
- **Moderate**: Warns about moderate+ vulnerabilities
- **High**: Fails on high/critical vulnerabilities

### Dependency Updates
- Creates separate PRs for each project
- Includes testing verification
- Manual review required before merge

## 📈 Future Enhancements

Potential improvements:
- 🎯 **Semantic versioning** automation
- 🏷️ **Release management** workflow
- 🧪 **End-to-end testing** integration
- 🚀 **Deployment** workflows
- 📊 **Dependency vulnerability** notifications