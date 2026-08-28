# web_wm

[![CI](https://github.com/web_wm/web_wm/actions/workflows/ci.yml/badge.svg)](https://github.com/web_wm/web_wm/actions/workflows/ci.yml)
[![npm @web_wm/tiling-windows](https://img.shields.io/npm/v/%40web_wm%2Ftiling-windows?label=%40web_wm%2Ftiling-windows)](https://www.npmjs.com/package/@web_wm/tiling-windows)
[![npm @web_wm/tiling-windows-dom](https://img.shields.io/npm/v/%40web_wm%2Ftiling-windows-dom?label=%40web_wm%2Ftiling-windows-dom)](https://www.npmjs.com/package/@web_wm/tiling-windows-dom)

A framework-agnostic tiling window manager for web UIs - think Hyprland, but
for the DOM. `tiling-windows` owns the layout logic (BSP, columns, grid) and
never touches a real element; a `Renderer` implementation adapts that to a
concrete surface. `tiling-windows-dom` is the reference `HTMLElement`
renderer; the same contract can back a React, Vue, or canvas integration.

## Packages

| Package                                                  | Description                           |
| -------------------------------------------------------- | ------------------------------------- |
| [`@web_wm/tiling-windows`](./tiling-windows)             | Core, renderer-agnostic layout engine |
| [`@web_wm/tiling-windows-dom`](./tiling-windows-dom)     | Reference `HTMLElement` renderer      |
| [`tiling-windows-demo`](./tiling-windows-demo) (private) | Live demo app                         |

## Quickstart

```sh
corepack enable
pnpm install
pnpm build
pnpm test
pnpm dev
```

## Live demo

Deployed from `tiling-windows-demo` to GitHub Pages on every push to `main`.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

License TBD - a `LICENSE` file has not been added yet.
