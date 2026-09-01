import { SplitDirection } from "tiling-windows";

/**
 * How far a grab strip reaches into a pane from its own edge. Purely a
 * rendering/hit-test choice - the strip never extends into the gap or
 * the neighboring pane, so there is nothing "divider-shaped" to select.
 * @type {number}
 */
const EDGE_GRAB_THICKNESS = 8;

/**
 * Floor on the live-preview size of the grabbed side, in px. Purely a
 * visual sanity bound for the drag preview - the real clamp (MIN_RESIZE_RATIO)
 * is enforced by resizeHandle() itself when the drag commits.
 * @type {number}
 */
const MIN_PREVIEW_SIZE = 24;

/**
 * Overlays draggable edge-grab strips on a WindowManager's panes, wired to
 * getResizeHandles()/resizeHandle(). firstBounds/secondBounds (the exact
 * regions on either side of a divider, before each leaf's own margin
 * inset) come straight from the layout engine, so the boundary math needs
 * no DOM measurement - only finding which individual panes touch that
 * boundary does. Subscribes via onRedraw - the supported way to know "the
 * layout changed, re-sync your overlay" - so it stays in sync with every
 * mutation (add/remove/drag/resize/native resize) with no separate
 * listeners to wire up at each call site.
 *
 * resizeHandle() always defines both sides of a boundary from one ratio,
 * so calling it on every pointermove would re-render every pane on both
 * sides on every frame. To match komorebi (only the exact pane you grab
 * tracks the cursor; every other pane - including ones that happen to
 * share the same boundary line - sits still until release) each pane
 * touching a boundary gets its own separate grab strip, sized to just
 * that pane's own edge, and dragging one strip only ever restyles that
 * one pane's rendered element directly - no layout-engine call happens
 * until pointerup, when a single resizeHandle() commits the real ratio
 * and the engine reflows both sides to their exact final bounds.
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

        const workspaceOrigin = workspace.getBoundingClientRect();

        for (const {
            handle,
            splitDirection,
            firstBounds,
            secondBounds,
        } of windowManager.getResizeHandles()) {
            const isVertical = splitDirection === SplitDirection.Vertical;

            // There is no shared "divider" a user can select, and no
            // single shared strip either - each individual pane touching
            // this boundary gets its own grab strip sized to just that
            // pane's own edge (mirrors komorebi: you drag one window's
            // border, not a boundary shared by every pane that happens to
            // touch it).
            for (const pane of touchingPanes(
                firstBounds,
                secondBounds,
                isVertical,
                workspaceOrigin,
            )) {
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
                    beginResize(
                        event,
                        handle,
                        isVertical,
                        pane,
                        firstBounds,
                        secondBounds,
                    ),
                );

                workspace.appendChild(el);
                handleElements.push(el);
            }
        }
    };

    /**
     * The individual rendered panes whose own edge sits directly on this
     * boundary, each with its own cross-axis extent (not the boundary's
     * full extent) - a boundary can be touched by more than one pane on a
     * side (e.g. a stack of windows sharing one vertical divider), and
     * each gets a strip scoped to only its own edge so dragging it can
     * never move a sibling that merely happens to share the same line.
     * @param {{position: {x: number, y: number}, size: {width: number, height: number}}} firstBounds
     * @param {{position: {x: number, y: number}, size: {width: number, height: number}}} secondBounds
     * @param {boolean} isVertical
     * @param {{left: number, top: number}} workspaceOrigin
     * @returns {Array<{el: HTMLElement, isFirstSide: boolean, edgePosition: number, crossStart: number, crossEnd: number, axisPos: number, axisSize: number}>}
     */
    const touchingPanes = (
        firstBounds,
        secondBounds,
        isVertical,
        workspaceOrigin,
    ) => {
        const margin = isVertical
            ? windowManager.windowMargin.horizontal
            : windowManager.windowMargin.vertical;
        // Each leaf window insets its own rendered edge by `margin` from
        // the raw boundary between firstBounds/secondBounds - see
        // Window.calculateLayout in tiling-windows/src/dataStructures.js.
        const boundary = isVertical
            ? secondBounds.position.x
            : secondBounds.position.y;
        const regionCrossStart = isVertical
            ? firstBounds.position.y
            : firstBounds.position.x;
        const regionCrossEnd =
            regionCrossStart +
            (isVertical ? firstBounds.size.height : firstBounds.size.width);
        const tolerance = 2;

        const matches = [];
        for (const child of workspace.children) {
            if (child.dataset.resizeHandle) continue;

            const rect = child.getBoundingClientRect();
            const elLeft = rect.left - workspaceOrigin.left;
            const elTop = rect.top - workspaceOrigin.top;
            const elRight = elLeft + rect.width;
            const elBottom = elTop + rect.height;
            const crossMin = isVertical ? elTop : elLeft;
            const crossMax = isVertical ? elBottom : elRight;

            if (
                crossMin < regionCrossStart - tolerance ||
                crossMax > regionCrossEnd + tolerance
            )
                continue;

            const trailingEdge = isVertical ? elRight : elBottom;
            const leadingEdge = isVertical ? elLeft : elTop;
            const axisPos = isVertical ? elLeft : elTop;
            const axisSize = isVertical ? rect.width : rect.height;

            if (Math.abs(trailingEdge - (boundary - margin)) <= tolerance) {
                matches.push({
                    el: child,
                    isFirstSide: true,
                    edgePosition: trailingEdge - EDGE_GRAB_THICKNESS,
                    crossStart: crossMin,
                    crossEnd: crossMax,
                    axisPos,
                    axisSize,
                });
            } else if (
                Math.abs(leadingEdge - (boundary + margin)) <= tolerance
            ) {
                matches.push({
                    el: child,
                    isFirstSide: false,
                    edgePosition: leadingEdge,
                    crossStart: crossMin,
                    crossEnd: crossMax,
                    axisPos,
                    axisSize,
                });
            }
        }
        return matches;
    };

    /**
     * The exact pane grabbed tracks the cursor in real time by restyling
     * its rendered element directly - anchored at the edge that doesn't
     * move (the far edge of the pane's own side of the boundary), scaled
     * along the resize axis only (cross-axis untouched). No other pane -
     * not its neighbor, not a sibling that happens to share this same
     * boundary line - is touched until pointerup, when a single
     * resizeHandle() call commits the real ratio and the engine reflows
     * both sides to their exact final bounds.
     * @param {PointerEvent} event
     * @param {unknown} handle
     * @param {boolean} isVertical
     * @param {{el: HTMLElement, isFirstSide: boolean, axisPos: number, axisSize: number}} pane - the grabbed pane
     * @param {{position: {x: number, y: number}, size: {width: number, height: number}}} firstBounds
     * @param {{position: {x: number, y: number}, size: {width: number, height: number}}} secondBounds
     */
    const beginResize = (
        event,
        handle,
        isVertical,
        pane,
        firstBounds,
        secondBounds,
    ) => {
        event.preventDefault();

        const start = isVertical
            ? firstBounds.position.x
            : firstBounds.position.y;
        const end = isVertical
            ? secondBounds.position.x + secondBounds.size.width
            : secondBounds.position.y + secondBounds.size.height;
        if (end <= start) return;

        const isFirstSide = pane.isFirstSide;

        // The pane's own far edge - the one NOT touching this boundary -
        // never moves, regardless of how deeply this pane is nested inside
        // the grabbed side. Anchoring to the whole region's far edge (as a
        // scaled-subtree preview would) is wrong here: if the grabbed side
        // has further same-axis nested splits, the touching pane's own far
        // edge sits somewhere inside that region, not at its boundary, so
        // scaling relative to the region dragged that inner edge too. Only
        // the pane's near edge (touching the boundary) tracks the cursor.
        const farEdge = isFirstSide
            ? pane.axisPos
            : pane.axisPos + pane.axisSize;

        const workspaceOrigin = workspace.getBoundingClientRect();
        pane.el.classList.add("transition-none");

        const previousCursor = document.body.style.cursor;
        const previousUserSelect = document.body.style.userSelect;
        document.body.style.cursor = isVertical ? "col-resize" : "row-resize";
        document.body.style.userSelect = "none";
        isDraggingHandle = true;

        const axisPositionOf = (pointerEvent) =>
            isVertical
                ? pointerEvent.clientX - workspaceOrigin.left
                : pointerEvent.clientY - workspaceOrigin.top;

        const applyPreview = (axisPosition) => {
            const clamped = isFirstSide
                ? Math.min(
                      Math.max(axisPosition, farEdge + MIN_PREVIEW_SIZE),
                      end - MIN_PREVIEW_SIZE,
                  )
                : Math.max(
                      Math.min(axisPosition, farEdge - MIN_PREVIEW_SIZE),
                      start + MIN_PREVIEW_SIZE,
                  );

            const newPos = isFirstSide ? farEdge : clamped;
            const newSize = isFirstSide ? clamped - farEdge : farEdge - clamped;
            if (isVertical) {
                pane.el.style.left = `${newPos}px`;
                pane.el.style.width = `${newSize}px`;
            } else {
                pane.el.style.top = `${newPos}px`;
                pane.el.style.height = `${newSize}px`;
            }
        };

        const onPointerMove = (moveEvent) => {
            if (windowManager.activeWindowId !== parseInt(pane.el.id)) {
                windowManager.activeWindowId = parseInt(pane.el.id);
            }
            pane.el.classList.add("z-50");
            applyPreview(axisPositionOf(moveEvent));
        };

        const onPointerUp = (upEvent) => {
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("pointerup", onPointerUp);

            const ratio = (axisPositionOf(upEvent) - start) / (end - start);

            // isDraggingHandle flips to false first so the onRedraw
            // listener's own resync (triggered by this resizeHandle call)
            // runs and rebuilds the overlay for the committed geometry.
            isDraggingHandle = false;
            windowManager.resizeHandle(handle, ratio);

            pane.el.classList.remove("transition-none");
            pane.el.classList.remove("z-50");
            document.body.style.cursor = previousCursor;
            document.body.style.userSelect = previousUserSelect;
        };

        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
    };

    windowManager.onRedraw(() => {
        if (!isDraggingHandle) render();
    });

    render();
    return render;
};
