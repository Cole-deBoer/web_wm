import config from "./config.js";
import { Window } from "./dataStructures.js";
import { BspStrategy } from "./layoutStrategies/bsp/BspStrategy.js";

export class WindowManager {
    /**
     * @param {unknown} workspaceRef - Opaque handle for the area windows are laid out within
     * @param {import("./renderer.js").Renderer} renderer - translates layout numbers into platform reads/writes
     * @param {import("./layoutStrategies/LayoutStrategy.js").LayoutStrategy} strategy
     * @param {{horizontal: number, vertical: number}} windowMargin - gap kept around the workspace edge and between windows
     */
    constructor(
        workspaceRef,
        renderer,
        strategy = new BspStrategy(),
        windowMargin = config.window_margin,
    ) {
        /**
         * @type {unknown}
         */
        this.workspaceRef = workspaceRef;

        /**
         * @type {import("./renderer.js").Renderer}
         */
        this.renderer = renderer;

        /**
         * @type {import("./layoutStrategies/LayoutStrategy.js").LayoutStrategy}
         */
        this.strategy = strategy;

        /**
         * @type {{horizontal: number, vertical: number}}
         */
        this.windowMargin = windowMargin;

        /**
         * @type {number}
         */
        this.nextWindowId = 1;

        /**
         * Positions captured by beginDrag, pending a matching endDrag.
         * @type {Map<number, unknown>}
         */
        this.dragPositions = new Map();

        /**
         * @type {Set<() => void>}
         */
        this.redrawListeners = new Set();

        this.bindRedrawWindows();
    }

    /**
     * Creates a Window with a guaranteed-unique id for this manager and
     * this manager's margin. Does not attach it - pass the result to
     * addWindow/insertWindow.
     * @param {unknown} ref
     * @returns {Window}
     */
    createWindow(ref) {
        return new Window(
            null,
            this.nextWindowId++,
            ref,
            this.windowMargin,
            this.renderer,
        );
    }

    get windowCount() {
        return this.strategy.windowCount;
    }

    get activeWindowId() {
        return this.strategy.getActiveWindowId();
    }

    set activeWindowId(windowId) {
        this.strategy.setActiveWindowId(windowId);
    }

    /**
     * @param {(windowId: number | null, previousWindowId: number | null) => void} callback
     * @returns {() => void} unsubscribe
     */
    onActiveWindowChange(callback) {
        return this.strategy.onActiveWindowChange(callback);
    }

    /**
     * Fires after every redrawWindows() call (add/remove/drag/resize/native
     * resize) - the supported way to know "the layout changed, re-sync your
     * overlay" instead of wrapping redrawWindows() directly.
     * @param {() => void} callback
     * @returns {() => void} unsubscribe
     */
    onRedraw(callback) {
        this.redrawListeners.add(callback);
        return () => this.redrawListeners.delete(callback);
    }

    /**
     * Captures whatever the active strategy needs to put a window back
     * where it currently is. Prefer beginDrag/endDrag for drag-and-drop -
     * this is exposed for callers that need capture/restore standalone.
     * @param {number} windowId
     * @returns {unknown}
     */
    capturePosition(windowId) {
        return this.strategy.capturePosition(windowId);
    }

    /**
     * @returns {{left: number, top: number, right: number, bottom: number, width: number, height: number}}
     */
    getWorkspaceBounds() {
        return this.renderer.getWorkspaceBounds(this.workspaceRef);
    }

    bindRedrawWindows() {
        this.unbindRedrawWindows = this.renderer.onResize(() => {
            this.redrawWindows();
        });
    }

    /**
     * Releases the resize subscription. Call when this manager is no
     * longer in use.
     */
    destroy() {
        if (this.unbindRedrawWindows) this.unbindRedrawWindows();
    }

    /**
     * @returns {{position: {x: number, y: number}, size: {width: number, height: number}}}
     */
    computeLayoutBounds() {
        const workspaceSize = this.renderer.getWorkspaceSize(this.workspaceRef);

        return {
            position: {
                x: this.windowMargin.horizontal,
                y: this.windowMargin.vertical,
            },
            size: {
                width: workspaceSize.width - this.windowMargin.horizontal * 2,
                height: workspaceSize.height - this.windowMargin.vertical * 2,
            },
        };
    }

    redrawWindows() {
        this.strategy.calculateLayout(this.computeLayoutBounds());
        for (const listener of this.redrawListeners) listener();
    }

    /**
     * @returns {Array<{handle: unknown, bounds: {position: {x: number, y: number}, size: {width: number, height: number}}, splitDirection: import("./splitDirection.js").SplitDirectionValue, firstBounds: {position: {x: number, y: number}, size: {width: number, height: number}}, secondBounds: {position: {x: number, y: number}, size: {width: number, height: number}}}>}
     */
    getResizeHandles() {
        return this.strategy.getResizeHandles(this.computeLayoutBounds());
    }

    /**
     * Resizes the two regions adjacent to `handle`. No begin/end gesture
     * state is needed here (unlike beginDrag/endDrag) - resizing never
     * restructures the tree/list, it only mutates a numeric ratio/weight,
     * so each call is a complete, stateless operation.
     * @param {unknown} handle - a value previously returned by getResizeHandles
     * @param {number} ratio
     * @returns {boolean} whether a redraw happened
     */
    resizeHandle(handle, ratio) {
        const resized = this.strategy.resizeHandle(handle, ratio);
        if (resized) this.redrawWindows();
        return resized;
    }

    /**
     * @param {import("./dataStructures.js").Window} window - The window to append
     * @param {import("./splitDirection.js").SplitDirectionValue} splitDirection - the direction to split the structure
     * @returns {boolean} whether the window was added (a strategy may
     * refuse, e.g. a capacity cap)
     */
    addWindow(window, splitDirection) {
        const added = this.strategy.addWindow(window, splitDirection);
        if (added) this.redrawWindows();
        return added;
    }

    /**
     * @param {number} windowId - The id of the window to remove
     */
    removeWindow(windowId, removeFromDOM = false) {
        if (this.strategy.removeWindow(windowId, removeFromDOM)) {
            this.redrawWindows();
        }
    }

    /**
     * Attaches a window to the layout
     * @param {import("./dataStructures.js").Window} window - The window to attach
     * @param {{x: number, y: number}} mousePosition - The position of the mouse
     * @param {import("./splitDirection.js").SplitDirectionValue} defaultSplitDirection - the direction to split the structure
     */
    insertWindow(window, mousePosition, defaultSplitDirection) {
        this.strategy.insertWindow(
            window,
            mousePosition,
            defaultSplitDirection,
            {
                capturedPosition: null,
                workspaceBounds: this.getWorkspaceBounds(),
            },
        );
        this.redrawWindows();
    }

    /**
     * Picks a window up for dragging: marks it active, captures its
     * current position (so a dropped-in-empty-space release can restore
     * it), and structurally removes it without redrawing - siblings stay
     * put until endDrag, matching the mid-drag no-reflow behavior.
     * @param {import("./dataStructures.js").Window} window
     */
    beginDrag(window) {
        window.isDragging = true;
        this.activeWindowId = window.id;
        this.dragPositions.set(
            window.id,
            this.strategy.capturePosition(window.id),
        );
        this.removeWindow(window.id, false);
    }

    /**
     * Drops a previously picked-up window: attaches it at mousePosition,
     * falling back to its captured pre-drag position (and then to the
     * strategy's own fallback) if the drop misses every target.
     * @param {import("./dataStructures.js").Window} window
     * @param {{x: number, y: number}} mousePosition - The position of the mouse
     * @param {import("./splitDirection.js").SplitDirectionValue} defaultSplitDirection - the direction to split the structure
     */
    endDrag(window, mousePosition, defaultSplitDirection) {
        window.isDragging = false;
        const capturedPosition = this.dragPositions.get(window.id) ?? null;
        this.dragPositions.delete(window.id);

        this.strategy.insertWindow(
            window,
            mousePosition,
            defaultSplitDirection,
            {
                capturedPosition,
                workspaceBounds: this.getWorkspaceBounds(),
            },
        );
        this.redrawWindows();
    }
}
