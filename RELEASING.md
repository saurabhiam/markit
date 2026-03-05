# Releasing

This guide covers the complete release process for MarkIt. It is intended for maintainers with npm publish access.

For contributing changes (including how to add changesets), see [CONTRIBUTING.md](CONTRIBUTING.md).

---

## How It Works

MarkIt uses [Changesets](https://github.com/changesets/changesets) for versioning and changelog generation, with GitHub Actions automating the publish pipeline.

The release process has two steps:

1. **Version PR** — When PRs with changesets merge to `main`, a bot opens (or updates) a "Version Packages" pull request that bumps versions and updates changelogs.
2. **Publish** — When a maintainer merges the Version PR, the release workflow publishes all bumped packages to npm and creates GitHub Releases.

This two-step model ensures a human always reviews version bumps and changelog entries before anything is published.

---

## Versioning Strategy

All packages (`@markitjs/core`, `@markitjs/react`, `@markitjs/angular`) use **fixed versioning** — they always share the same version number. When any package gets a changeset, all three are bumped together.

This is configured in `.changeset/config.json` via the `fixed` array.

### Semantic Versioning

| Bump  | When                              | Example         |
| ----- | --------------------------------- | --------------- |
| Patch | Bug fix, no API changes           | `1.0.0 → 1.0.1` |
| Minor | New feature, backwards-compatible | `1.0.0 → 1.1.0` |
| Major | Breaking change                   | `1.0.0 → 2.0.0` |

### Pre-1.0

While packages are at `0.x.y`, minor bumps may contain breaking changes. This is standard semver for pre-stable software.

---

## Stable Release (Step by Step)

### 1. Add a changeset to your PR

Before opening a PR with user-facing changes:

```bash
bunx changeset
```

This prompts you to:

- Select which packages changed (all are bumped together due to fixed versioning)
- Choose the semver bump type (patch / minor / major)
- Write a human-readable summary of the change

A `.changeset/<random-id>.md` file is created. Commit it with your PR.

### 2. PR merges to main

CI validates: format, typecheck, build, test, bundle size, and changeset presence.

After merge, the release workflow (`release.yml`) runs and the `changesets/action` detects pending changeset files. It opens (or updates) a pull request titled **"chore: version packages"**.

### 3. Review the Version PR

The Version PR contains:

- Version bumps in all `package.json` files
- Updated `CHANGELOG.md` in each package directory
- All `.changeset/*.md` files consumed

If more PRs with changesets merge while the Version PR is open, it auto-updates to include them. The highest bump type wins (e.g., one patch + one minor = minor).

### 4. Merge the Version PR

This triggers the release workflow again. This time there are no pending changesets, so `changesets/action` runs `changeset publish`:

- Publishes all bumped packages to npm (under the `latest` tag)
- Creates git tags (`@markitjs/core@x.y.z`, `@markitjs/react@x.y.z`, `@markitjs/angular@x.y.z`)
- Creates GitHub Releases with links to changelogs and npm

### 5. Verify

- Check [npmjs.com/package/@markitjs/core](https://www.npmjs.com/package/@markitjs/core) for the new version
- Check the [Releases page](https://github.com/saurabhiam/markit/releases) for GitHub Releases
- Documentation auto-deploys to GitHub Pages on the same `main` push

---

## Prerelease (Alpha / Beta / RC)

Prereleases allow publishing unstable versions for testing without affecting the `latest` npm tag.

### Enter prerelease mode

```bash
git checkout -b next main

# Choose the prerelease type: alpha, beta, or rc
bunx changeset pre enter beta

git add .changeset/pre.json
git commit -m "chore: enter beta prerelease mode"
git push -u origin next
```

### Develop on the next branch

Work normally — create PRs targeting `next`, add changesets. When PRs merge to `next`, the prerelease workflow (`prerelease.yml`) handles versioning and publishing automatically.

Published versions look like: `1.0.0-beta.0`, `1.0.0-beta.1`, etc.

### npm dist-tags for prereleases

| Prerelease type | npm tag | Install command                    |
| --------------- | ------- | ---------------------------------- |
| `alpha`         | `alpha` | `npm install @markitjs/core@alpha` |
| `beta`          | `beta`  | `npm install @markitjs/core@beta`  |
| `rc`            | `next`  | `npm install @markitjs/core@next`  |

### Exit prerelease mode and go stable

```bash
bunx changeset pre exit
git add .changeset/pre.json
git commit -m "chore: exit prerelease mode"
```

Merge the `next` branch back to `main` via a PR. The next release from `main` will be a stable version.

---

## npm Setup

### Token creation

1. Go to [npmjs.com](https://www.npmjs.com) → Access Tokens → Generate New Token
2. Select **Granular Access Token**:
   - Token name: `github-actions-markit`
   - Expiration: 365 days (set a calendar reminder to rotate)
   - Packages: Read and write
   - Scope: `@markit`
3. Copy the token

### GitHub configuration

1. Go to the repository → Settings → Environments → **npm-publish**
2. Add environment secret: `NPM_TOKEN` = the token value
3. Configure protection rules:
   - **Required reviewers**: Add maintainer(s)
   - **Deployment branches**: Only `main` (and `next` if using prereleases)

The release workflow uses `actions/setup-node` with `registry-url` to configure npm authentication at runtime. No `.npmrc` file is needed in the repository.

### Token rotation

Rotate the npm token annually:

1. Generate a new token on npmjs.com
2. Update the `NPM_TOKEN` secret in the `npm-publish` GitHub Environment
3. Delete the old token on npmjs.com

---

## GitHub Environment Setup

The release workflow uses a GitHub Environment called `npm-publish` for additional protection:

1. **Settings → Environments → New environment**: `npm-publish`
2. **Required reviewers**: Add yourself (the release will pause and wait for approval)
3. **Deployment branches**: Restrict to `main` only
4. **Environment secrets**: Add `NPM_TOKEN` here (more secure than repo-level secrets)

This means every release requires explicit human approval, even after the Version PR is merged.

---

## Troubleshooting

### Version PR not appearing

The `changesets/action` only creates a Version PR when `.changeset/*.md` files exist (excluding `README.md`). Verify:

```bash
ls .changeset/*.md
```

If no files exist, no changeset was added. Run `bunx changeset` to create one.

### Publish failed

1. Check the [Actions tab](https://github.com/saurabhiam/markit/actions/workflows/release.yml) for the failed run
2. Common causes:
   - **npm token expired**: Rotate the token (see npm Setup above)
   - **Build failure**: Fix the build, the next push to `main` will re-trigger
   - **Package name conflict**: Ensure `@markit` scope is available on npm
3. After fixing, re-run the release workflow manually via `workflow_dispatch`

### Version PR has wrong bump level

Edit the changeset `.md` files before merging the Version PR. Or close the Version PR, update the changesets on `main`, and let the bot create a new one.

### Stuck Version PR

If the Version PR gets stale or conflicts:

1. Close the existing Version PR
2. Manually trigger the release workflow via Actions → Release → Run workflow
3. The action will create a fresh Version PR

### Accidentally published a bad version

npm packages cannot be unpublished after 72 hours. Instead, deprecate:

```bash
npm deprecate @markitjs/core@1.2.3 "This version has a critical bug. Please use 1.2.4."
npm deprecate @markitjs/react@1.2.3 "This version has a critical bug. Please use 1.2.4."
npm deprecate @markitjs/angular@1.2.3 "This version has a critical bug. Please use 1.2.4."
```

Then publish a patch fix as quickly as possible.

Within 72 hours, you can unpublish:

```bash
npm unpublish @markitjs/core@1.2.3
```

---

## Hotfix Release

For critical fixes that need to ship immediately:

1. Create a branch from `main`: `git checkout -b fix/critical-issue main`
2. Fix the issue
3. Add a changeset: `bunx changeset` (select `patch`)
4. Open and merge PR to `main`
5. The Version PR will appear — merge it immediately
6. Packages publish automatically

---

## Maintainer Checklist

### Before merging a Version PR

```
[ ] CHANGELOG entries are accurate and describe user-facing impact
[ ] Version bump level is correct (patch / minor / major)
[ ] No unintended packages being bumped
[ ] Breaking changes (if any) are clearly documented
[ ] CI checks pass on the Version PR
```

### After publish (automated, but verify)

```
[ ] Packages visible on npmjs.com with correct version
[ ] npm install @markitjs/core@<version> works
[ ] GitHub Releases created with changelog links
[ ] Documentation site updated (auto-deploys)
```

### Quarterly maintenance

```
[ ] npm token is valid and not nearing expiration
[ ] GitHub Environment protection rules are still correct
[ ] Review and clean up any stale prerelease tags on npm
```

---

## Workflow Files Reference

| Workflow          | File                                      | Trigger                        | Purpose                                     |
| ----------------- | ----------------------------------------- | ------------------------------ | ------------------------------------------- |
| CI                | `.github/workflows/ci.yml`                | Push/PR to `main`              | Build, test, typecheck, format, node compat |
| Release           | `.github/workflows/release.yml`           | Push to `main`, manual         | Version PR management + npm publish         |
| Prerelease        | `.github/workflows/prerelease.yml`        | Push to `next`                 | Prerelease version management + publish     |
| Docs              | `.github/workflows/docs.yml`              | Push to `main` (path-filtered) | Build and deploy documentation              |
| Bundle Size       | `.github/workflows/bundle-size.yml`       | PR to `main`                   | Measure and report bundle sizes             |
| Dependency Review | `.github/workflows/dependency-review.yml` | PR to `main`                   | Block vulnerable/problematic dependencies   |
