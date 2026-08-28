import { SplitDirection } from "tiling-windows";

/**
 * How far a grab strip reaches into a pane from its own edge. Purely a
 * rendering/hit-test choice - the strip never extends into the gap or
 * the neighboring pane, so there is nothing "divider-shaped" to select.
 * @type {number}
 */
const EDGE_GRAB_THICKNESS = 8;

/**
 * Overlays draggable edge-grab strips on a WindowManager's panes, wired
 * to getResizeHandles()/resizeHandle(). Wraps redrawWindows() - the
 * single choke point every layout mutation (add/remove/drag/native
 * resize) already runs through - so the overlay stays in sync with the
 * layout with no separate listeners to wire up at each call site.
 * @param {import("tiling-windows").WindowManager} windowManager
 * @returns {() => void} render - re-syncs the divider overlay on demand
 */
export const setupResizeHandles = (windowManager) => {
    const workspace = windowManager.workspaceRef;
    const handleElements = [];
    let isDraggingHandle = false;

    const render = () => {
        for (const el of handleElements) el.remove();
        handleElements.length = 0;

        for (const {
            handle,
            bounds,
            splitDirection,
        } of windowManager.getResizeHandles()) {
            const isVertical = splitDirection === SplitDirection.Vertical;

            // There is no shared "divider" a user can select - each pane
            // that touches this boundary gets its own grab strip, inset
            // into that pane's own edge (mirrors komorebi: you drag a
            // window's border, not an object living in the gap between
            // windows). A boundary can touch more than one pane on a
            // side (e.g. two stacked panes sharing one vertical divider),
            // so this may add more than two strips per handle.
            for (const pane of findAdjacentPanes(bounds, isVertical)) {
                const el = document.createElement("div");
                el.dataset.resizeHandle = "true";
                el.className = `absolute z-40 ${
                    isVertical ? "cursor-col-resize" : "cursor-row-resize"
                }`;
                el.style.left = `${isVertical ? pane.edgePosition : pane.crossStart}px`;
                el.style.top = `${isVertical ? pane.crossStart : pane.edgePosition}px`;
                el.style.width = `${isVertical ? EDGE_GRAB_THICKNESS : pane.crossEnd - pane.crossStart}px`;
                el.style.height = `${isVertical ? pane.crossEnd - pane.crossStart : EDGE_GRAB_THICKNESS}px`;

                el.addEventListener("pointerdown", (event) =>
                    beginResize(event, handle, isVertical, bounds),
                );

                workspace.appendChild(el);
                handleElements.push(el);
            }
        }
    };

    /**
     * The dragged pane (and anything nested inside its subtree) tracks
     * the cursor in real time via a resizeHandle() call on every pointer
     * move - resizeHandle() only changes one container's ratio, so any
     * window outside that container's two subtrees recomputes to the
     * exact bounds it already had. Nothing outside the drag visibly
     * moves; it just isn't worth re-syncing the grab-strip overlay for
     * every intermediate frame (isDraggingHandle skips that in the
     * redrawWindows wrap below), so it's resynced once on release
     * instead.
     */
    const beginResize = (event, handle, isVertical, bounds) => {
        event.preventDefault();
        const span = measurePaneSpan(bounds, isVertical);
        if (!span) return;

        const workspaceBounds = workspace.getBoundingClientRect();
        const previousCursor = document.body.style.cursor;
        const previousUserSelect = document.body.style.userSelect;
        document.body.style.cursor = isVertical ? "col-resize" : "row-resize";
        document.body.style.userSelect = "none";
        isDraggingHandle = true;

        const onPointerMove = (moveEvent) => {
            const axisPosition = isVertical
                ? moveEvent.clientX - workspaceBounds.left
                : moveEvent.clientY - workspaceBounds.top;

            windowManager.resizeHandle(
                handle,
                (axisPosition - span.start) / (span.end - span.start),
            );
        };

        const onPointerUp = () => {
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerup", onPointerUp);
            document.body.style.cursor = previousCursor;
            document.body.style.userSelect = previousUserSelect;
            isDraggingHandle = false;
            render();
        };

        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
    };

    /**
     * getResizeHandles() only reports a divider's thin hit-rect, not the
     * panes on either side of it - so membership in "this boundary's
     * pair" is derived from the panes' own rendered bounds instead. The
     * divider's cross-axis extent is exact (it comes straight from the
     * pane's layout bounds), so it's used to find every pane belonging
     * to this boundary without needing access to the layout tree: any
     * rendered pane whose cross-axis extent falls inside it is part of
     * this container's subtree, and nothing else can coincidentally
     * match since panes never overlap.
     * @param {{position: {x: number, y: number}, size: {width: number, height: number}}} bounds
     * @param {boolean} isVertical
     * @returns {Array<{axisStart: number, axisEnd: number, crossStart: number, crossEnd: number}>}
     */
    const paneRectsInBoundary = (bounds, isVertical) => {
        const workspaceBounds = workspace.getBoundingClientRect();
        const crossStart = isVertical ? bounds.position.y : bounds.position.x;
        const crossEnd =
            crossStart + (isVertical ? bounds.size.height : bounds.size.width);
        const tolerance = 2;

        const rects = [];

        for (const child of workspace.children) {
            if (child.dataset.resizeHandle) continue;

            const rect = child.getBoundingClientRect();
            const left = rect.left - workspaceBounds.left;
            const top = rect.top - workspaceBounds.top;
            const axisStart = isVertical ? left : top;
            const axisEnd = isVertical ? left + rect.width : top + rect.height;
            const crossMin = isVertical ? top : left;
            const crossMax = isVertical ? top + rect.height : left + rect.width;

            if (
                crossMin < crossStart - tolerance ||
                crossMax > crossEnd + tolerance
            )
                continue;

            rects.push({
                axisStart,
                axisEnd,
                crossStart: crossMin,
                crossEnd: crossMax,
            });
        }

        return rects;
    };

    /**
     * The pixel span (start/end along the resize axis) shared by the two
     * panes on either side of a divider, used to convert a pointer
     * position into a ratio.
     * @param {{position: {x: number, y: number}, size: {width: number, height: number}}} bounds
     * @param {boolean} isVertical
     * @returns {{start: number, end: number} | null}
     */
    const measurePaneSpan = (bounds, isVertical) => {
        const boundary = isVertical
            ? bounds.position.x + bounds.size.width / 2
            : bounds.position.y + bounds.size.height / 2;
        const tolerance = 2;

        let start = Infinity;
        let end = -Infinity;

        for (const pane of paneRectsInBoundary(bounds, isVertical)) {
            if (pane.axisEnd <= boundary + tolerance) {
                start = Math.min(start, pane.axisStart);
            } else if (pane.axisStart >= boundary - tolerance) {
                end = Math.max(end, pane.axisEnd);
            }
        }

        if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
            return null;

        const margin = isVertical
            ? windowManager.windowMargin.horizontal
            : windowManager.windowMargin.vertical;

        return { start: start - margin, end: end + margin };
    };

    /**
     * The panes whose own edge sits directly on this boundary - each
     * gets a grab strip inset into its own rect, never into the gap or
     * the pane on the other side.
     * @param {{position: {x: number, y: number}, size: {width: number, height: number}}} bounds
     * @param {boolean} isVertical
     * @returns {Array<{edgePosition: number, crossStart: number, crossEnd: number}>}
     */
    const findAdjacentPanes = (bounds, isVertical) => {
        const boundary = isVertical
            ? bounds.position.x + bounds.size.width / 2
            : bounds.position.y + bounds.size.height / 2;
        // A pane's rendered edge sits `margin` px short of the boundary,
        // not on it - Window insets its own bounds by its margin on
        // every side (see tiling-windows/src/dataStructures.js).
        const margin = isVertical
            ? windowManager.windowMargin.horizontal
            : windowManager.windowMargin.vertical;
        const tolerance = 2;

        return paneRectsInBoundary(bounds, isVertical)
            .map((pane) => {
                if (Math.abs(pane.axisEnd - (boundary - margin)) <= tolerance) {
                    return {
                        edgePosition: pane.axisEnd - EDGE_GRAB_THICKNESS,
                        crossStart: pane.crossStart,
                        crossEnd: pane.crossEnd,
                    };
                }
                if (
                    Math.abs(pane.axisStart - (boundary + margin)) <= tolerance
                ) {
                    return {
                        edgePosition: pane.axisStart,
                        crossStart: pane.crossStart,
                        crossEnd: pane.crossEnd,
                    };
                }
                return null;
            })
            .filter(Boolean);
    };

    const originalRedraw = windowManager.redrawWindows.bind(windowManager);
    windowManager.redrawWindows = () => {
        originalRedraw();
        if (!isDraggingHandle) {
            render();
            document.querySelectorAll(".window").forEach((window) => {
                window.classList.remove("transition-none");
            });
        } else {
            document.querySelectorAll(".window").forEach((window) => {
                window.classList.add("transition-none");
            });
        }
    };

    render();
    return render;
};
