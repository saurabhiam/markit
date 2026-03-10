# Contributing to MarkIt

Thanks for your interest in contributing! This guide covers the essentials.

## Prerequisites

- [Bun](https://bun.sh/) v1.3+ (used as the package manager and script runner)
- [Node.js](https://nodejs.org/) v20+ (required by Angular build tooling)

## Setup

```bash
git clone https://github.com/saurabhiam/markit.git
cd markit
bun install
```

## Development Workflow

### Branch naming

Create a branch off `main` using this convention:

| Type    | Pattern                   | Example                       |
| ------- | ------------------------- | ----------------------------- |
| Feature | `feature/<ticket>-<desc>` | `feature/CX-123-batch-render` |
| Bug fix | `fix/<ticket>-<desc>`     | `fix/CX-456-overlay-position` |
| Chore   | `chore/<desc>`            | `chore/update-deps`           |
| Docs    | `docs/<desc>`             | `docs/batch-size-guide`       |

### Common commands

```bash
bun run build          # Build all packages
bun run test           # Run unit & integration tests
bun run typecheck      # TypeScript type checking
bun run format         # Auto-format with Prettier
bun run format:check   # Verify formatting (used in CI)
bun run docs:dev       # Start the docs site locally
bun run bench          # Full Playwright performance benchmarks
bun run e2e            # Playwright smoke tests (1K nodes; same as CI)
```

### Making changes

1. Create a feature branch from `main`.
2. Make your changes. Keep commits focused and descriptive.
3. Run `bun run format` to auto-format.
4. Run `bun run build && bun run test && bun run typecheck` to verify everything passes.
5. Open a pull request against `main`.

You do **not** need to add a changeset. Releases are cut by maintainers using the Prepare Release and Publish Release workflows (see [RELEASING.md](RELEASING.md)).

## Commit messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add fuzzy search support
fix: overlay position off by 1px in Safari
docs: update React batching example
chore: bump vitest to v3.1
refactor: extract match resolver into separate module
test: add edge case for nested highlights
```

## Changesets

Releases use [Changesets](https://github.com/changesets/changesets) under the hood, but **contributors do not run `bun run changeset`**. Maintainers (repo admins) run the **Prepare Release** workflow, which creates the changeset and bumps versions using GitHub-generated release notes. If you’re curious how versioning works, see [RELEASING.md](RELEASING.md).

## Pull Request Guidelines

- PRs must target `main`.
- CI checks (build, test, typecheck, format) must pass.
- Keep PRs focused — one feature or fix per PR when possible.
- Add or update tests for any behavior changes.
- Update documentation if the public API changes.

## Project Structure

```
markit/
├── packages/
│   ├── core/       # Framework-agnostic highlighting engine
│   ├── react/      # React hook + component wrapper
│   └── angular/    # Angular directive + service wrapper
├── apps/
│   ├── docs/       # VitePress documentation site
│   └── e2e-bench/  # Playwright performance benchmarks
```

## Code Style

- **Prettier** handles all formatting — no manual style debates.
- **TypeScript strict mode** is enabled across all packages.
- Prefer explicit types for public API surfaces; inferred types are fine internally.
- Avoid `any` — use `unknown` and narrow with type guards.

## Releasing

Releases are documented in [RELEASING.md](RELEASING.md). In short:

1. Maintainers merge PRs to `main` (no changesets in PRs).
2. When ready to release, an **admin** runs the **Prepare Release** workflow (chooses bump type per package: none / patch / minor / major). It detects changed packages, generates a changeset, bumps versions, and opens a PR with a suggested **release tag** (e.g. `release-2025-03-10-01`).
3. After merging that PR, the admin runs **Finalize Release** with the release tag. It creates the release tag, package tags only for bumped packages, and **one** draft GitHub Release.
4. The admin runs **Publish Release** with the same release tag. It runs tests, publishes to npm, uploads package tarballs and source zip to the single Release, and publishes it.

Package versions can differ (independent versioning). Contributors only need to merge their PRs — the rest is done by maintainers via these workflows.

## Questions?

Open an issue or start a discussion. All questions are welcome.
