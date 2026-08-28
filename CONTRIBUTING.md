# Contributing

## Dev setup

```sh
corepack enable
pnpm install
```

Node version is pinned in [`.nvmrc`](./.nvmrc); use a version manager (`nvm`,
`fnm`, ...) that respects it.

## Repo layout

- `tiling-windows/` - core layout engine (framework/DOM-agnostic)
- `tiling-windows-dom/` - reference `HTMLElement` renderer
- `tiling-windows-demo/` - demo app (private, not published)

## Running things

```sh
pnpm build              # build all packages (turbo, cached)
pnpm test                # run all test suites
pnpm lint                # eslint across the repo
pnpm format:check        # prettier --check across the repo
pnpm format               # prettier --write across the repo
pnpm dev                  # run the demo app

pnpm --filter <package> <script>   # run a script in just one package
```

## Adding a changeset

Any change to `tiling-windows` or `tiling-windows-dom` that should ship in the
next release needs a changeset:

```sh
pnpm changeset
```

This asks which packages changed and how (patch/minor/major), and writes a
markdown file under `.changeset/` describing the change - commit it alongside
your PR. `tiling-windows-demo` is unpublished and never needs a changeset.

## PR process

CI (lint, format check, tests, build) must pass before merging. Once merged
to `main` with pending changesets, a "Version Packages" PR is opened
automatically; merging that PR publishes the updated packages to npm.
