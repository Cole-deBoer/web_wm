import { Window } from "../../dataStructures.js";
import { Container } from "./Container.js";
import { LayoutStrategy } from "../LayoutStrategy.js";
import { SplitDirection } from "../../splitDirection.js";
import { assert } from "../../assert.js";
import { clampResizeRatio } from "../../resize.js";

/**
 * @typedef {{isAbsoluteRoot: boolean, parent: Container | null} | null} CapturedPosition
 */

export class BspStrategy extends LayoutStrategy {
    constructor() {
        super();
        /**
         * @type {import("../../dataStructures.js").Structure | null}
         */
        this.root = null;
        /**
         * @type {Set<number>}
         */
        this.windows = new Set();
    }

    get windowCount() {
        return this.windows.size;
    }

    /**
     * @param {import("../../dataStructures.js").Structure} structure - The structure to search in
     * @param {number} windowId - The id of the window to search for
     * @returns {Window | null}
     */
    findStructure(structure, windowId) {
        if (structure == null) return null;
        if (structure instanceof Window && structure.id == windowId) {
            return structure;
        }
        if (structure instanceof Container) {
            const isFound = this.findStructure(structure.firstChild, windowId);
            if (isFound) return isFound;
            return this.findStructure(structure.secondChild, windowId);
        }
        return null;
    }

    /**
     * @param {import("../../dataStructures.js").Structure | null} structure - The structure to search in
     * @returns {Window | null} any leaf Window reachable from structure
     */
    findAnyWindow(structure) {
        if (structure == null) return null;
        if (structure instanceof Window) return structure;
        if (structure instanceof Container) {
            return (
                this.findAnyWindow(structure.firstChild) ??
                this.findAnyWindow(structure.secondChild)
            );
        }
        return null;
    }

    /**
     * @param {number} windowId
     * @returns {CapturedPosition}
     */
    capturePosition(windowId) {
        const window = this.findStructure(this.root, windowId);
        if (!window) return null;

        const parentContainer = /** @type {Container | null} */ (window.parent);
        return {
            isAbsoluteRoot: parentContainer === null,
            parent: parentContainer,
        };
    }

    /**
     * Reattaches a window to the exact slot it occupied when `position`
     * was captured, undoing removeWindow's promotion of its sibling.
     * removeWindow never mutates parentContainer's own children/parent
     * links (only the grandparent's pointer to it, and the sibling's
     * parent link) so restoring is just relinking those back.
     * @param {Window} window
     * @param {CapturedPosition} position
     * @returns {boolean} whether a prior position was found and restored
     */
    restoreWindow(window, position) {
        if (!position) return false;

        if (position.isAbsoluteRoot) {
            this.root = window;
            window.parent = null;
        } else {
            const parentContainer = position.parent;
            if (!parentContainer) return false;

            const remainingWindow =
                parentContainer.firstChild === window
                    ? parentContainer.secondChild
                    : parentContainer.firstChild;

            const grandParentContainer = /** @type {Container | null} */ (
                parentContainer.parent
            );

            if (grandParentContainer === null) {
                this.root = parentContainer;
            } else if (grandParentContainer.firstChild === remainingWindow) {
                grandParentContainer.firstChild = parentContainer;
            } else if (grandParentContainer.secondChild === remainingWindow) {
                grandParentContainer.secondChild = parentContainer;
            }

            remainingWindow.parent = parentContainer;
        }

        this.windows.add(window.id);
        this.setActiveWindowId(window.id);
        return true;
    }

    /**
     * @param {Window} window - The window to append
     * @param {import("../../splitDirection.js").SplitDirectionValue} splitDirection - the direction to split the structure
     * @returns {boolean} whether the window was added
     */
    addWindow(window, splitDirection) {
        switch (this.windows.size) {
            case 0:
                this.root = window;
                break;

            case 1:
                this.root = new Container(
                    null,
                    splitDirection,
                    0.5,
                    this.root,
                    window,
                );
                break;

            default: {
                const structure = this.findStructure(
                    this.root,
                    this.getActiveWindowId(),
                );
                assert(
                    structure !== null,
                    "Active window id does not correspond to any window in the tree",
                );
                const oldParent = /** @type {Container} */ (structure.parent);

                const container = new Container(
                    oldParent,
                    splitDirection,
                    0.5,
                    structure,
                    window,
                );

                if (oldParent.firstChild === structure) {
                    oldParent.firstChild = container;
                }

                if (oldParent.secondChild === structure) {
                    oldParent.secondChild = container;
                }

                break;
            }
        }

        this.windows.add(window.id);
        this.setActiveWindowId(window.id);
        return true;
    }

    /**
     * @param {number} windowId - The id of the window to remove
     * @param {boolean} removeFromDOM
     * @returns {boolean} whether the caller should redraw
     */
    removeWindow(windowId, removeFromDOM = false) {
        const window = this.findStructure(this.root, windowId);
        if (!window) return false;

        this.windows.delete(windowId);

        if (removeFromDOM) window.remove();

        const parentContainer = /** @type {Container | null} */ (window.parent);

        if (parentContainer === null) {
            this.root = null;
            if (removeFromDOM) this.setActiveWindowId(null);
            return removeFromDOM;
        }

        const remainingWindow =
            parentContainer.firstChild === window
                ? parentContainer.secondChild
                : parentContainer.firstChild;

        switch (this.windows.size) {
            case 0:
                this.root = null;
                if (removeFromDOM) this.setActiveWindowId(null);
                return removeFromDOM;

            case 1:
                this.root = remainingWindow;
                this.root.parent = null;
                if (removeFromDOM)
                    this.setActiveWindowId(
                        /** @type {Window} */ (remainingWindow).id,
                    );
                return removeFromDOM;

            default: {
                const grandParentContainer = /** @type {Container | null} */ (
                    parentContainer.parent
                );

                if (grandParentContainer === null) {
                    this.root = remainingWindow;
                    remainingWindow.parent = null;
                } else {
                    if (grandParentContainer.firstChild === parentContainer) {
                        grandParentContainer.firstChild = remainingWindow;
                    } else if (
                        grandParentContainer.secondChild === parentContainer
                    ) {
                        grandParentContainer.secondChild = remainingWindow;
                    }
                    remainingWindow.parent = grandParentContainer;
                }

                if (removeFromDOM && this.getActiveWindowId() === windowId) {
                    this.setActiveWindowId(
                        remainingWindow instanceof Window
                            ? remainingWindow.id
                            : null,
                    );
                }

                return removeFromDOM;
            }
        }
    }

    /**
     * Attaches a window to the layout
     * @param {Window} window - The window to attach
     * @param {{x: number, y: number}} mousePosition - The position of the mouse
     * @param {import("../../splitDirection.js").SplitDirectionValue} defaultSplitDirection - the direction to split the structure
     * @param {{capturedPosition: unknown, workspaceBounds: {left: number, top: number, right: number, bottom: number, width: number, height: number}}} context
     */
    insertWindow(window, mousePosition, defaultSplitDirection, context) {
        let targetWindowNode = null;
        let splitDirection = defaultSplitDirection;

        const { capturedPosition, workspaceBounds } = context;

        for (const windowId of this.windows) {
            const trackedWindowNode = this.findStructure(this.root, windowId);
            if (!trackedWindowNode) continue;

            const rawBounds = trackedWindowNode.getBounds();

            const bounds = {
                left: rawBounds.left - workspaceBounds.left,
                top: rawBounds.top - workspaceBounds.top,
                width: rawBounds.width,
                height: rawBounds.height,
                right: rawBounds.right - workspaceBounds.left,
                bottom: rawBounds.bottom - workspaceBounds.top,
            };

            if (
                mousePosition.x >= bounds.left &&
                mousePosition.x <= bounds.right &&
                mousePosition.y >= bounds.top &&
                mousePosition.y <= bounds.bottom
            ) {
                targetWindowNode = trackedWindowNode;

                // 2. Map the drop coordinates to find the split edge orientation
                const mouseXRelative = mousePosition.x - bounds.left;
                const mouseYRelative = mousePosition.y - bounds.top;

                // Calculate the proportions to determine horizontal vs vertical dominance
                const normalizedX = mouseXRelative / bounds.width;
                const normalizedY = mouseYRelative / bounds.height;

                // This math splits the tile into clean quadrants using its bounding diagonals
                if (normalizedX + normalizedY < 1) {
                    // Top or Left Quadrants
                    splitDirection =
                        normalizedX < normalizedY
                            ? SplitDirection.Vertical
                            : SplitDirection.Horizontal;
                } else {
                    // Bottom or Right Quadrants
                    splitDirection =
                        normalizedX > normalizedY
                            ? SplitDirection.Vertical
                            : SplitDirection.Horizontal;
                }
                break; // Stop scanning once the target is located
            }
        }

        // 3. Re-insert the window based on our lookup outcomes
        if (targetWindowNode) {
            // Force the manager to target the window we dropped it on
            this.setActiveWindowId(targetWindowNode.id);
            this.addWindow(window, splitDirection);
        } else if (
            !this.restoreWindow(
                window,
                /** @type {CapturedPosition} */ (capturedPosition),
            )
        ) {
            // 4. Fallback: no drop target and no prior position to restore
            // (shouldn't normally happen) - attach next to any window.
            const fallbackWindow = this.findAnyWindow(this.root);
            if (fallbackWindow) {
                this.setActiveWindowId(fallbackWindow.id);
            }

            this.addWindow(window, defaultSplitDirection);
        }
    }

    /**
     * @param {{position: {x: number, y: number}, size: {width: number, height: number}}} bounds - The bounds of the structure
     */
    calculateLayout(bounds) {
        if (this.root) {
            this.root.calculateLayout(bounds);
        }
    }

    /**
     * @param {import("../../dataStructures.js").Structure | null} structure - The structure to search in
     * @param {Container} target - The container to search for
     * @returns {boolean} whether target is reachable from structure
     */
    containsContainer(structure, target) {
        if (structure == null) return false;
        if (structure === target) return true;
        if (structure instanceof Container) {
            return (
                this.containsContainer(structure.firstChild, target) ||
                this.containsContainer(structure.secondChild, target)
            );
        }
        return false;
    }

    /**
     * @param {{position: {x: number, y: number}, size: {width: number, height: number}}} bounds - The bounds of the structure
     * @returns {Array<{handle: Container, bounds: {position: {x: number, y: number}, size: {width: number, height: number}}, splitDirection: import("../../splitDirection.js").SplitDirectionValue}>}
     */
    getResizeHandles(bounds) {
        if (!this.root) return [];
        return this.root.collectResizeHandles(bounds);
    }

    /**
     * @param {unknown} handle - expected to be a Container returned by getResizeHandles
     * @param {number} ratio
     * @returns {boolean} whether the caller should redraw
     */
    resizeHandle(handle, ratio) {
        if (!(handle instanceof Container)) return false;
        if (!this.containsContainer(this.root, handle)) return false;

        handle.ratio = clampResizeRatio(ratio);
        return true;
    }
}
