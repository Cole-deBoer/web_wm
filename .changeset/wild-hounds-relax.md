---
"@web_wm/tiling-windows": minor
---

Added pane resizing support. `BspStrategy` and `ColumnsStrategy` now expose `getResizeHandles(bounds)` and `resizeHandle(handle, ratio)` (also available on `WindowManager` as `getResizeHandles()`/`resizeHandle(handle, ratio)`), letting a consumer discover divider geometry and adjust the ratio/weight between two adjacent panes. `GridStrategy` explicitly opts out - its cells stay fixed-size. Also exports `MIN_RESIZE_RATIO`/`clampResizeRatio` from the package root.
