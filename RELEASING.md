# Releasing

This guide covers the release process for MarkIt. It is intended for maintainers with npm publish access.

For contributing (no changesets required in PRs), see [CONTRIBUTING.md](CONTRIBUTING.md).

---

## How It Works

MarkIt uses [Changesets](https://github.com/changesets/changesets) for versioning and changelog generation. Releases are fully automated via three **manual** GitHub Actions runs — only repo **admins** can trigger them. Nothing runs automatically on push.

**Three steps:**

1. **Prepare release** — You run the **Prepare Release** workflow, choose the release type (patch / minor / major). It generates release notes from GitHub, creates a changeset, bumps versions, updates changelogs, commits to a branch `release/vX.Y.Z`, and opens a **pull request** to `main`.
2. **Finalize release** — After the release PR is merged (after CodeQL/checks pass), you run **Finalize Release** with the version (e.g. `1.0.0`). It validates the version on `main`, creates git tags, generates release notes, and creates **draft** GitHub Releases.
3. **Publish release** — When you're ready to ship, you run the **Publish Release** workflow with the version. It runs tests, build, publishes to npm, and publishes the draft GitHub Releases.

There is no "Version PR" — you never run `bunx changeset` in PRs. Prepare creates the changeset when you run it.

---

## Prerequisites (one-time setup)

- **GitHub:** Only users with **admin** role on the repo can run Prepare, Finalize, Publish, and Rollback workflows.
- **npm:** An npm account, the `@markitjs` scope, and a Granular Access Token (write, bypass 2FA). Store it in a GitHub Environment secret (see [npm Setup](#npm-setup) below).
- **GitHub Environment:** Create an environment named `npm-publish` with the `NPM_TOKEN` secret. The Publish and Rollback workflows use it.

---

## Versioning Strategy

All packages (`@markitjs/core`, `@markitjs/react`, `@markitjs/angular`) use **fixed versioning** — they always share the same version number. This is configured in `.changeset/config.json` via the `fixed` array.

### Semantic Versioning

| Bump  | When                              | Example         |
| ----- | --------------------------------- | --------------- |
| Patch | Bug fix, no API changes           | `1.0.0 → 1.0.1` |
| Minor | New feature, backwards-compatible | `1.0.0 → 1.1.0` |
| Major | Breaking change                   | `1.0.0 → 2.0.0` |

You choose the bump when you run **Prepare Release** (patch / minor / major).

---

## Stable Release (step by step)

### 1. Merge PRs to main

Develop as usual. Open PRs, get them merged to `main`. **You do not add changesets** — no `bunx changeset` in PRs. CI still runs (build, test, typecheck, etc.).

### 2. Prepare the release

When you're ready to cut a release:

1. Go to **GitHub → Actions**.
2. Select the **Prepare Release** workflow.
3. Click **Run workflow**.
4. Choose **release_type**: `patch`, `minor`, or `major` (dropdown).
5. Run the workflow.

The workflow will:

- Generate release notes using GitHub's API (from commits/PRs since the last release).
- Create a changeset with that summary and your chosen bump type.
- Run `changeset version` (bump packages, update CHANGELOGs).
- Commit to a branch `release/vX.Y.Z` and push it.
- Open a pull request to `main`.

If there's nothing to release (e.g. no new commits since last tag), the run exits with a message and does nothing.

### 3. Merge the release PR

After the PR passes all checks (CodeQL, build, test, etc.), merge it to `main`.

### 4. Finalize the release

1. Go to **GitHub → Actions**.
2. Select the **Finalize Release** workflow.
3. Click **Run workflow**.
4. Enter **version** (e.g. `1.0.0` — the version from the merged PR).
5. Run the workflow.

The workflow will:

- Validate that the version exists on `main`.
- Create git tags (`@markitjs/core@x.y.z`, etc.).
- Generate release notes.
- Create **draft** GitHub Releases (you can edit the draft body on GitHub if needed).

### 5. Publish the release

When you're happy with the drafts and want to ship:

1. Go to **GitHub → Actions**.
2. Select the **Publish Release** workflow.
3. Click **Run workflow**.
4. Enter **version** (e.g. `1.0.0` — the version that Finalize just created).
5. Run the workflow.

The workflow will:

- Check out the release at that version (by tag).
- Run typecheck, build, test, and CJS/ESM checks.
- Publish all three packages to npm.
- Publish the draft GitHub Releases (they become visible on the Releases page).

### 6. Verify

- Check [npmjs.com/package/@markitjs/core](https://www.npmjs.com/package/@markitjs/core) for the new version.
- Check the [Releases page](https://github.com/saurabhiam/markit/releases) for the new GitHub Releases.

---

## When to use Rollback

Use the **Rollback** workflow when you need to undo a release (e.g. bad publish, wrong version).

1. Go to **GitHub → Actions** → **Rollback**.
2. Click **Run workflow**.
3. Enter **version** (e.g. `1.0.0`) to roll back.
4. Optionally set **confirm_rollback** (e.g. `true` or the version again) so the job doesn't fail with "Set confirm_rollback to confirm."
5. Run the workflow.

The workflow will:

- Validate that the version exists (semver + at least one release/tag).
- Delete the GitHub Releases for that version.
- Delete the git tags.
- Unpublish the packages from npm (or deprecate them if unpublish is no longer allowed, e.g. after 72 hours).
- Revert the "chore: version packages" commit on `main`.

Only repo admins can run Rollback.

---

## Prerelease (Alpha / Beta / RC)

Prereleases allow publishing unstable versions without affecting the `latest` npm tag. The **Prerelease** workflow (if enabled) runs on push to `next`.

### Enter prerelease mode

```bash
git checkout -b next main
bunx changeset pre enter beta   # or alpha, rc
git add .changeset/pre.json
git commit -m "chore: enter beta prerelease mode"
git push -u origin next
```

### Develop on next

Create PRs targeting `next`. When they merge, the prerelease workflow handles versioning and publishing. Versions look like `1.0.0-beta.0`, `1.0.0-beta.1`, etc.

### Exit prerelease mode

```bash
bunx changeset pre exit
git add .changeset/pre.json
git commit -m "chore: exit prerelease mode"
```

Merge `next` back to `main` via a PR when you're ready for the next stable release.

---

## npm Setup

### Prerequisites

- An npm account at [npmjs.com](https://www.npmjs.com)
- The `markitjs` npm organization (owns the `@markitjs` scope)
- Two-factor authentication enabled on your npm account

### Token creation

npm supports **Granular Access Tokens** with a maximum expiration of 90 days for write tokens.

1. Go to [npmjs.com](https://www.npmjs.com) → avatar → **Access Tokens**
2. **Generate New Token** (Granular Access Token)
3. Configure: name, **Packages and scopes** → Read and write for `@markitjs`, **Bypass two-factor authentication** checked (required for CI), expiration 90 days.
4. Copy the token — it is shown only once.

### GitHub Environment

1. Repo → **Settings** → **Environments** → **New environment** → name: `npm-publish`
2. Add protection rules if desired (e.g. required reviewers, deployment branches: `main`, `next`).
3. **Environment secrets** → **Add secret** → Name: `NPM_TOKEN`, Value: the npm token.

The **Publish Release** and **Rollback** workflows use the `npm-publish` environment so they have access to `NPM_TOKEN`.

### Token rotation (every ~80 days)

Set a calendar reminder. Before the token expires:

1. Generate a new token on npm (same settings).
2. Update `NPM_TOKEN` in the GitHub `npm-publish` environment.
3. Delete the old token on npm.

If the token expires, the Publish workflow will fail at the npm step; fix the secret and re-run.

---

## Troubleshooting

### Prepare: "No changes to release"

The workflow found no new commits (or no diff) since the last release. Merge more PRs to `main` and run Prepare again, or confirm the last tag is what you expect.

### Finalize: "Version not found on main"

The version you entered doesn't match the version in `packages/core/package.json` on `main`. Make sure you've merged the release PR first, then run Finalize with the correct version.

### Publish: version not found

You entered a version that wasn't finalized. Run **Finalize Release** first (after merging the release PR), then run **Publish Release** with the version that Finalize produced (check the Finalize run output or the draft releases).

### Publish failed (tests, build, npm)

1. Check the [Actions](https://github.com/saurabhiam/markit/actions) run for the failing step.
2. Common causes: npm token expired (rotate and update `NPM_TOKEN`), build/test failure (fix on `main` and re-run Publish).
3. Re-run the **Publish Release** workflow after fixing.

### Accidentally published a bad version

Use **Rollback** with that version. It will unpublish (if within 72 hours) or deprecate on npm, delete releases and tags, and revert the version commit. After 72 hours, npm only allows deprecation, not unpublish.

---

## First release (one-time)

Before the first publish:

- [ ] npm org `@markitjs` exists, token created, `NPM_TOKEN` in GitHub Environment `npm-publish`
- [ ] `.changeset/config.json` has the fixed group and ignore list

To do the first release:

1. Merge at least one PR to `main` (or have commits since the repo start).
2. Run **Prepare Release** with **release_type** = `minor` (or `major` for 1.0.0).
3. Merge the release PR after checks pass.
4. Run **Finalize Release** with the version shown (e.g. `0.1.0` or `1.0.0`).
5. Run **Publish Release** with the same version.
6. Verify on npm and the Releases page.

---

## Workflow reference

| Workflow          | File                                      | Trigger             | Purpose                                                     |
| ----------------- | ----------------------------------------- | ------------------- | ----------------------------------------------------------- |
| Prepare Release   | `.github/workflows/prepare-release.yml`   | Manual (admin only) | release_type → changeset, version, PR to main               |
| Finalize Release  | `.github/workflows/finalize-release.yml`  | Manual (admin only) | version → validate, tags, draft releases                    |
| Publish Release   | `.github/workflows/publish-release.yml`   | Manual (admin only) | version → test, build, npm publish, publish releases        |
| Rollback          | `.github/workflows/rollback.yml`          | Manual (admin only) | version → delete releases/tags, unpublish/deprecate, revert |
| CI                | `.github/workflows/ci.yml`                | Push/PR to `main`   | Build, test, typecheck, format                              |
| Prerelease        | `.github/workflows/prerelease.yml`        | Push to `next`      | Prerelease version + publish                                |
| Docs              | `.github/workflows/docs.yml`              | Push to `main`      | Build and deploy documentation                              |
| Bundle Size       | `.github/workflows/bundle-size.yml`       | PR to `main`        | Measure bundle sizes                                        |
| Dependency Review | `.github/workflows/dependency-review.yml` | PR to `main`        | Block vulnerable dependencies                               |
