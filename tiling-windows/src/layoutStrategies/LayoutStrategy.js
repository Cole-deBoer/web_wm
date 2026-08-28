import { createSignal } from "../signal.js";

export class LayoutStrategy {
    constructor() {
        /**
         * Active-window tracking is identical bookkeeping regardless of
         * how a strategy stores its windows, so it's implemented here
         * rather than duplicated per-strategy.
         * @type {ReturnType<typeof createSignal<number | null>>}
         */
        this.activeWindowIdSignal = createSignal(null);
    }

    /**
     * @returns {number}
     */
    get windowCount() {
        throw new Error("Not implemented");
    }

    /**
     * @returns {number | null}
     */
    getActiveWindowId() {
        return this.activeWindowIdSignal.get();
    }

    /**
     * @param {number | null} windowId
     */
    setActiveWindowId(windowId) {
        this.activeWindowIdSignal.set(windowId);
    }

    /**
     * @param {(windowId: number | null, previousWindowId: number | null) => void} callback
     * @returns {() => void} unsubscribe
     */
    onActiveWindowChange(callback) {
        return this.activeWindowIdSignal.subscribe(callback);
    }

    /**
     * @param {import("../dataStructures.js").Window} window - The window to append
     * @param {import("../splitDirection.js").SplitDirectionValue} splitDirection - the direction to split the structure
     * @returns {boolean} whether the window was added (a strategy may
     * refuse, e.g. a capacity cap)
     */
    addWindow(window, splitDirection) {
        throw new Error("Not implemented");
    }

    /**
     * @param {import("../dataStructures.js").Window} window - The window to attach
     * @param {{x: number, y: number}} mousePosition - The position of the mouse
     * @param {import("../splitDirection.js").SplitDirectionValue} defaultSplitDirection - the direction to split the structure
     * @param {{capturedPosition: unknown, workspaceBounds: {left: number, top: number, right: number, bottom: number, width: number, height: number}}} context
     */
    insertWindow(window, mousePosition, defaultSplitDirection, context) {
        throw new Error("Not implemented");
    }

    /**
     * @param {number} windowId - The id of the window to remove
     * @param {boolean} removeFromDOM
     * @returns {boolean} whether the caller should redraw
     */
    removeWindow(windowId, removeFromDOM) {
        throw new Error("Not implemented");
    }

    /**
     * Captures whatever this strategy needs to put a window back where
     * it currently is. The returned value is opaque to callers - store
     * it (e.g. on the window) and hand it back to restoreWindow unchanged.
     * @param {number} windowId
     * @returns {unknown}
     */
    capturePosition(windowId) {
        throw new Error("Not implemented");
    }

    /**
     * Reattaches a window using a value previously returned by
     * capturePosition.
     * @param {import("../dataStructures.js").Window} window
     * @param {unknown} position
     * @returns {boolean} whether a prior position was found and restored
     */
    restoreWindow(window, position) {
        throw new Error("Not implemented");
    }

    /**
     * @param {{position: {x: number, y: number}, size: {width: number, height: number}}} bounds - The bounds of the structure
     */
    calculateLayout(bounds) {
        throw new Error("Not implemented");
    }

    /**
     * @param {{position: {x: number, y: number}, size: {width: number, height: number}}} bounds - The bounds of the structure
     * @returns {Array<{handle: unknown, bounds: {position: {x: number, y: number}, size: {width: number, height: number}}, splitDirection: import("../splitDirection.js").SplitDirectionValue}>}
     */
    getResizeHandles(bounds) {
        throw new Error("Not implemented");
    }

    /**
     * @param {unknown} handle - a value previously returned by getResizeHandles
     * @param {number} ratio - 0-1 local fraction: how much of this handle's
     * two adjacent regions should go to the "first" side (first child /
     * earlier-in-list window). Computed by the consumer from wherever
     * their pointer currently sits relative to the handle's reported
     * bounds.
     * @returns {boolean} whether the caller should redraw
     */
    resizeHandle(handle, ratio) {
        throw new Error("Not implemented");
    }
}
