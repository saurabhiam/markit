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
bun run bench          # Run Playwright performance benchmarks
```

### Making changes

1. Create a feature branch from `main`.
2. Make your changes. Keep commits focused and descriptive.
3. Run `bun run format` to auto-format.
4. Run `bun run build && bun run test && bun run typecheck` to verify everything passes.
5. Add a changeset (see below).
6. Open a pull request against `main`.

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

We use [Changesets](https://github.com/changesets/changesets) for versioning and changelogs.

**Before opening a PR with user-facing changes**, run:

```bash
bunx changeset
```

This prompts you to:

1. Select which package(s) changed.
2. Choose the semver bump type (patch / minor / major).
3. Write a summary of the change.

A markdown file is created in `.changeset/` — commit it with your PR. CI will warn if a changeset is missing.

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

The release process is documented in [RELEASING.md](RELEASING.md). In short:

1. Add a changeset to your PR with `bunx changeset`
2. After merge, a bot opens a "Version Packages" PR with bumped versions and changelogs
3. When a maintainer merges that PR, packages are published to npm automatically

Contributors only need to worry about step 1 — the rest is handled by automation.

## Questions?

Open an issue or start a discussion. All questions are welcome.
