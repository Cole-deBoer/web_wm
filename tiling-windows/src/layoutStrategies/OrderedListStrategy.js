import { LayoutStrategy } from "./LayoutStrategy.js";

/**
 * Shared base for strategies that arrange windows as a flat ordered
 * list (Columns, Grid, ...) rather than a tree. Handles list bookkeeping,
 * default "insert after active" placement, and drag capture/restore/drop
 * hit-testing; leaves only calculateLayout's geometry (and any add
 * policy, e.g. a capacity cap) to subclasses.
 */
export class OrderedListStrategy extends LayoutStrategy {
    constructor() {
        super();
        /**
         * @type {import("../dataStructures.js").Window[]}
         */
        this.windows = [];
    }

    get windowCount() {
        return this.windows.length;
    }

    /**
     * @param {number} windowId
     * @returns {number}
     */
    indexOf(windowId) {
        return this.windows.findIndex((window) => window.id === windowId);
    }

    /**
     * Inserts a window immediately after the current active window (or
     * at the end if there is none), and makes it active.
     * @param {import("../dataStructures.js").Window} window - The window to append
     * @returns {boolean} whether the window was added
     */
    addWindow(window) {
        const activeIndex = this.indexOf(this.getActiveWindowId());
        const insertAt =
            activeIndex === -1 ? this.windows.length : activeIndex + 1;

        this.windows.splice(insertAt, 0, window);
        this.setActiveWindowId(window.id);
        return true;
    }

    /**
     * @param {number} windowId - The id of the window to remove
     * @param {boolean} removeFromDOM
     * @returns {boolean} whether the caller should redraw
     */
    removeWindow(windowId, removeFromDOM = false) {
        const index = this.indexOf(windowId);
        if (index === -1) return false;

        const [window] = this.windows.splice(index, 1);

        if (removeFromDOM) window.remove();

        if (removeFromDOM && this.getActiveWindowId() === windowId) {
            const fallback = this.windows[index] ?? this.windows[index - 1];
            this.setActiveWindowId(fallback ? fallback.id : null);
        }

        return removeFromDOM;
    }

    /**
     * @param {number} windowId
     * @returns {{index: number} | null}
     */
    capturePosition(windowId) {
        const index = this.indexOf(windowId);
        return index === -1 ? null : { index };
    }

    /**
     * @param {import("../dataStructures.js").Window} window
     * @param {{index: number} | null} position
     * @returns {boolean} whether a prior position was found and restored
     */
    restoreWindow(window, position) {
        if (!position) return false;

        const index = Math.min(position.index, this.windows.length);
        this.windows.splice(index, 0, window);
        this.setActiveWindowId(window.id);
        return true;
    }

    /**
     * Attaches a window to the layout
     * @param {import("../dataStructures.js").Window} window - The window to attach
     * @param {{x: number, y: number}} mousePosition - The position of the mouse
     * @param {import("../splitDirection.js").SplitDirectionValue} defaultSplitDirection - unused (no split direction in a flat list)
     * @param {{capturedPosition: unknown, workspaceBounds: {left: number, top: number, right: number, bottom: number, width: number, height: number}}} context
     */
    insertWindow(window, mousePosition, defaultSplitDirection, context) {
        const { capturedPosition, workspaceBounds } = context;

        let targetIndex = null;

        for (let i = 0; i < this.windows.length; i++) {
            const candidate = this.windows[i];
            const rawBounds = candidate.getBounds();
            const left = rawBounds.left - workspaceBounds.left;
            const right = rawBounds.right - workspaceBounds.left;
            const top = rawBounds.top - workspaceBounds.top;
            const bottom = rawBounds.bottom - workspaceBounds.top;

            if (
                mousePosition.x >= left &&
                mousePosition.x <= right &&
                mousePosition.y >= top &&
                mousePosition.y <= bottom
            ) {
                const droppedOnRightHalf =
                    mousePosition.x - left > (right - left) / 2;
                targetIndex = droppedOnRightHalf ? i + 1 : i;
                break;
            }
        }

        if (targetIndex !== null) {
            this.windows.splice(targetIndex, 0, window);
            this.setActiveWindowId(window.id);
        } else if (
            !this.restoreWindow(
                window,
                /** @type {{index: number} | null} */ (capturedPosition),
            )
        ) {
            this.windows.push(window);
            this.setActiveWindowId(window.id);
        }
    }
}
