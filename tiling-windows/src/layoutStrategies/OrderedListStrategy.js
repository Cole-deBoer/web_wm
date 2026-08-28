import { LayoutStrategy } from "./LayoutStrategy.js";
import { SplitDirection } from "../splitDirection.js";
import { clampResizeRatio, RESIZE_HANDLE_THICKNESS } from "../resize.js";

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
        /**
         * Per-window weight (relative share of the row). Missing entries
         * default to 1 via getWeight, so a freshly-added window (or every
         * window before any resize ever happens) reproduces even division
         * exactly. Keyed by windowId (not index) so a window's custom
         * weight survives being reordered by drag-and-drop elsewhere in
         * the list.
         * @type {Map<number, number>}
         */
        this.weights = new Map();
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
     * @param {number} windowId
     * @returns {number}
     */
    getWeight(windowId) {
        return this.weights.get(windowId) ?? 1;
    }

    /**
     * Divides `bounds` into one bounds rect per window, left to right,
     * proportional to each window's weight. Pure geometry - shared by
     * calculateLayout (ColumnsStrategy) and getResizeHandles below, so
     * there is exactly one place this math is written.
     * @param {{position: {x: number, y: number}, size: {width: number, height: number}}} bounds - The bounds of the structure
     * @returns {Array<{position: {x: number, y: number}, size: {width: number, height: number}}>}
     */
    computeColumnBounds(bounds) {
        const totalWeight =
            this.windows.reduce(
                (sum, window) => sum + this.getWeight(window.id),
                0,
            ) || this.windows.length;

        let x = bounds.position.x;
        return this.windows.map((window) => {
            const width = totalWeight
                ? (this.getWeight(window.id) / totalWeight) * bounds.size.width
                : 0;
            const columnBounds = {
                position: { x, y: bounds.position.y },
                size: { width, height: bounds.size.height },
            };
            x += width;
            return columnBounds;
        });
    }

    /**
     * Default assumes a single-axis, left-to-right arrangement (as used
     * by ColumnsStrategy). Subclasses with different geometry (e.g.
     * GridStrategy) must override this - and resizeHandle - to disable
     * resizing rather than reporting misleading handles.
     * @param {{position: {x: number, y: number}, size: {width: number, height: number}}} bounds - The bounds of the structure
     * @returns {Array<{handle: {firstId: number, secondId: number}, bounds: {position: {x: number, y: number}, size: {width: number, height: number}}, splitDirection: import("../splitDirection.js").SplitDirectionValue}>}
     */
    getResizeHandles(bounds) {
        if (this.windows.length < 2) return [];

        const columnBounds = this.computeColumnBounds(bounds);
        const handles = [];
        for (let i = 0; i < this.windows.length - 1; i++) {
            const boundaryX =
                columnBounds[i].position.x + columnBounds[i].size.width;
            handles.push({
                handle: {
                    firstId: this.windows[i].id,
                    secondId: this.windows[i + 1].id,
                },
                bounds: {
                    position: {
                        x: boundaryX - RESIZE_HANDLE_THICKNESS / 2,
                        y: bounds.position.y,
                    },
                    size: {
                        width: RESIZE_HANDLE_THICKNESS,
                        height: bounds.size.height,
                    },
                },
                splitDirection: SplitDirection.Vertical,
            });
        }
        return handles;
    }

    /**
     * @param {unknown} handle - expected to be {firstId, secondId} from getResizeHandles
     * @param {number} ratio
     * @returns {boolean} whether the caller should redraw
     */
    resizeHandle(handle, ratio) {
        const { firstId, secondId } =
            /** @type {{firstId?: number, secondId?: number}} */ (
                handle ?? {}
            );
        const firstIndex = this.indexOf(/** @type {number} */ (firstId));
        const secondIndex = this.indexOf(/** @type {number} */ (secondId));

        if (firstIndex === -1 || secondIndex === -1) return false;
        if (secondIndex !== firstIndex + 1) return false;

        const totalWeight =
            this.getWeight(/** @type {number} */ (firstId)) +
            this.getWeight(/** @type {number} */ (secondId));
        if (totalWeight <= 0) return false;

        const clampedRatio = clampResizeRatio(ratio);
        this.weights.set(
            /** @type {number} */ (firstId),
            totalWeight * clampedRatio,
        );
        this.weights.set(
            /** @type {number} */ (secondId),
            totalWeight * (1 - clampedRatio),
        );
        return true;
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

        if (removeFromDOM) {
            window.remove();
            this.weights.delete(windowId);
        }

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
