# tiling-windows-dom

The reference [`tiling-windows`](../tiling-windows) integration for plain `HTMLElement`s.

`tiling-windows`'s core is platform-agnostic: it never touches a real element, only an
opaque `ref` handed to it through a `Renderer`. `DomRenderer` implements that `Renderer`
contract for the browser DOM - refs are `HTMLElement`s, positioned with absolute inline
styles, measured with `getBoundingClientRect`/`clientWidth`/`clientHeight`, and reflowed
on the window's native `resize` event.

## Usage

```js
import { WindowManager, BspStrategy } from "@web_wm/tiling-windows";
import { DomRenderer } from "@web_wm/tiling-windows-dom";

const workspaceElement = document.getElementById("workspace");
const windowManager = new WindowManager(
    workspaceElement,
    new DomRenderer(),
    new BspStrategy(),
);

const element = document.createElement("div");
workspaceElement.appendChild(element);
windowManager.addWindow(windowManager.createWindow(element));
```

## Writing another integration

A new integration (React, Vue, a canvas, ...) implements the same `Renderer` shape
exported from `tiling-windows`:

- `getBounds(ref)` / `setBounds(ref, bounds)` - read/write a window's position and size
- `remove(ref)` - detach a window's ref entirely
- `getWorkspaceBounds(workspaceRef)` / `getWorkspaceSize(workspaceRef)` - measure the
  area windows are laid out within
- `onResize(callback)` - notify the manager when that area's size may have changed,
  returning an unsubscribe function

`DomRenderer.js` in this package is the shortest complete example of that contract.
