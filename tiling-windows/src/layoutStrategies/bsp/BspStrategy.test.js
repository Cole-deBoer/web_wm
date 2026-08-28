import { describe, it, expect } from "vitest";
import { BspStrategy } from "./BspStrategy.js";
import { Container } from "./Container.js";
import { Window } from "../../dataStructures.js";
import { SplitDirection } from "../../splitDirection.js";
import { createTestWindow, rect } from "../../test-utils.js";
import { MIN_RESIZE_RATIO } from "../../resize.js";

describe("BspStrategy.addWindow", () => {
    it("makes the first window the root", () => {
        const strategy = new BspStrategy();
        const w1 = createTestWindow(1);

        expect(strategy.addWindow(w1, SplitDirection.Vertical)).toBe(true);

        expect(strategy.root).toBe(w1);
        expect(strategy.windowCount).toBe(1);
        expect(strategy.getActiveWindowId()).toBe(1);
    });

    it("wraps the root and the second window in a Container", () => {
        const strategy = new BspStrategy();
        const w1 = createTestWindow(1);
        const w2 = createTestWindow(2);
        strategy.addWindow(w1, SplitDirection.Vertical);

        strategy.addWindow(w2, SplitDirection.Horizontal);

        expect(strategy.root).toBeInstanceOf(Container);
        expect(strategy.root.splitDirection).toBe(SplitDirection.Horizontal);
        expect(strategy.root.ratio).toBe(0.5);
        expect(strategy.root.firstChild).toBe(w1);
        expect(strategy.root.secondChild).toBe(w2);
        expect(strategy.getActiveWindowId()).toBe(2);
    });

    it("splits off whichever window is active, not always the root's firstChild", () => {
        const strategy = new BspStrategy();
        const w1 = createTestWindow(1);
        const w2 = createTestWindow(2);
        const w3 = createTestWindow(3);
        strategy.addWindow(w1, SplitDirection.Vertical);
        strategy.addWindow(w2, SplitDirection.Vertical);
        // w2 is active (it was just added). Force w1 active instead.
        strategy.setActiveWindowId(1);

        strategy.addWindow(w3, SplitDirection.Horizontal);

        // w1's old slot (root.firstChild) should now hold a new Container(w1, w3).
        const splitOffW1 = strategy.root.firstChild;
        expect(splitOffW1).toBeInstanceOf(Container);
        expect(splitOffW1.firstChild).toBe(w1);
        expect(splitOffW1.secondChild).toBe(w3);
        // w2's slot is untouched.
        expect(strategy.root.secondChild).toBe(w2);
    });

    it("throws a clear error instead of crashing when activeWindowId is stale", () => {
        const strategy = new BspStrategy();
        const w1 = createTestWindow(1);
        const w2 = createTestWindow(2);
        const w3 = createTestWindow(3);
        strategy.addWindow(w1, SplitDirection.Vertical);
        strategy.addWindow(w2, SplitDirection.Vertical);
        strategy.setActiveWindowId(9999); // no window with this id exists

        expect(() => strategy.addWindow(w3, SplitDirection.Vertical)).toThrow(
            "Active window id does not correspond to any window in the tree",
        );
    });
});

describe("BspStrategy.removeWindow", () => {
    it("clears the root when removing the only window", () => {
        const strategy = new BspStrategy();
        const w1 = createTestWindow(1);
        strategy.addWindow(w1, SplitDirection.Vertical);

        const shouldRedraw = strategy.removeWindow(1, true);

        expect(shouldRedraw).toBe(true);
        expect(strategy.root).toBeNull();
        expect(strategy.windowCount).toBe(0);
        expect(strategy.getActiveWindowId()).toBeNull();
    });

    it("promotes the sibling to root when removing one of two windows", () => {
        const strategy = new BspStrategy();
        const w1 = createTestWindow(1);
        const w2 = createTestWindow(2);
        strategy.addWindow(w1, SplitDirection.Vertical);
        strategy.addWindow(w2, SplitDirection.Vertical);

        const shouldRedraw = strategy.removeWindow(1, true);

        expect(shouldRedraw).toBe(true);
        expect(strategy.root).toBe(w2);
        expect(w2.parent).toBeNull();
        expect(strategy.getActiveWindowId()).toBe(2);
    });

    it("does not reflow siblings or touch active id when removeFromDOM is false (mid-drag)", () => {
        const strategy = new BspStrategy();
        const w1 = createTestWindow(1);
        const w2 = createTestWindow(2);
        strategy.addWindow(w1, SplitDirection.Vertical);
        strategy.addWindow(w2, SplitDirection.Vertical);
        strategy.setActiveWindowId(1);

        const shouldRedraw = strategy.removeWindow(1, false);

        expect(shouldRedraw).toBe(false);
        // Structurally still promoted (removeWindow always mutates the tree)...
        expect(strategy.root).toBe(w2);
        // ...but active id is left untouched, matching the deferred-redraw contract.
        expect(strategy.getActiveWindowId()).toBe(1);
    });

    it("relinks the grandparent's secondChild when removing a nested window", () => {
        const strategy = new BspStrategy();
        const w1 = createTestWindow(1);
        const w2 = createTestWindow(2);
        const w3 = createTestWindow(3);
        const inner = new Container(null, SplitDirection.Vertical, 0.5, w2, w3);
        const root = new Container(
            null,
            SplitDirection.Horizontal,
            0.5,
            w1,
            inner,
        );
        strategy.root = root;
        strategy.windows = new Set([1, 2, 3]);

        strategy.removeWindow(2, true);

        expect(strategy.root.secondChild).toBe(w3);
        expect(w3.parent).toBe(root);
    });

    it("relinks the grandparent's firstChild when removing a nested window", () => {
        const strategy = new BspStrategy();
        const w1 = createTestWindow(1);
        const w2 = createTestWindow(2);
        const w3 = createTestWindow(3);
        const inner = new Container(null, SplitDirection.Vertical, 0.5, w2, w3);
        const root = new Container(
            null,
            SplitDirection.Horizontal,
            0.5,
            inner,
            w1,
        );
        strategy.root = root;
        strategy.windows = new Set([1, 2, 3]);

        strategy.removeWindow(3, true);

        expect(strategy.root.firstChild).toBe(w2);
        expect(w2.parent).toBe(root);
    });
});

describe("BspStrategy capturePosition/restoreWindow", () => {
    it("restores a removed window to the exact slot it was captured from", () => {
        const strategy = new BspStrategy();
        const w1 = createTestWindow(1);
        const w2 = createTestWindow(2);
        const w3 = createTestWindow(3);
        strategy.addWindow(w1, SplitDirection.Vertical);
        strategy.addWindow(w2, SplitDirection.Vertical);
        strategy.addWindow(w3, SplitDirection.Horizontal);

        const originalRoot = strategy.root;
        const originalParent = w3.parent;
        const position = strategy.capturePosition(3);
        strategy.removeWindow(3, false); // mid-drag pickup

        strategy.restoreWindow(w3, position);

        expect(strategy.root).toBe(originalRoot);
        expect(w3.parent).toBe(originalParent);
        expect(originalParent.secondChild).toBe(w3);
        expect(strategy.windowCount).toBe(3);
        expect(strategy.getActiveWindowId()).toBe(3);
    });

    it("restores an absolute-root window (single-window case)", () => {
        const strategy = new BspStrategy();
        const w1 = createTestWindow(1);
        strategy.addWindow(w1, SplitDirection.Vertical);

        const position = strategy.capturePosition(1);
        strategy.removeWindow(1, false);

        strategy.restoreWindow(w1, position);

        expect(strategy.root).toBe(w1);
        expect(w1.parent).toBeNull();
    });

    it("returns false when there is no position to restore", () => {
        const strategy = new BspStrategy();
        const w1 = createTestWindow(1);
        expect(strategy.restoreWindow(w1, null)).toBe(false);
    });
});

describe("BspStrategy.findAnyWindow", () => {
    it("returns null for a null structure", () => {
        const strategy = new BspStrategy();
        expect(strategy.findAnyWindow(null)).toBeNull();
    });

    it("finds a real leaf Window in a multi-level tree without crashing", () => {
        const strategy = new BspStrategy();
        const w1 = createTestWindow(1);
        const w2 = createTestWindow(2);
        const w3 = createTestWindow(3);
        const inner = new Container(null, SplitDirection.Vertical, 0.5, w2, w3);
        const root = new Container(
            null,
            SplitDirection.Horizontal,
            0.5,
            w1,
            inner,
        );

        expect(strategy.findAnyWindow(root)).toBeInstanceOf(Window);
    });
});

describe("BspStrategy.insertWindow", () => {
    const workspaceBounds = rect(0, 0, 1000, 1000);

    it("splits Vertical when dropped in the top-left quadrant sliver", () => {
        const strategy = new BspStrategy();
        const w1 = createTestWindow(1, rect(0, 0, 100, 100));
        strategy.addWindow(w1, SplitDirection.Vertical);
        const w2 = createTestWindow(2);

        strategy.insertWindow(w2, { x: 10, y: 20 }, SplitDirection.Horizontal, {
            capturedPosition: null,
            workspaceBounds,
        });

        expect(strategy.root).toBeInstanceOf(Container);
        expect(strategy.root.splitDirection).toBe(SplitDirection.Vertical);
        expect(strategy.root.firstChild).toBe(w1);
        expect(strategy.root.secondChild).toBe(w2);
    });

    it("splits Horizontal when dropped in the bottom-right quadrant sliver", () => {
        const strategy = new BspStrategy();
        const w1 = createTestWindow(1, rect(0, 0, 100, 100));
        strategy.addWindow(w1, SplitDirection.Vertical);
        const w2 = createTestWindow(2);

        strategy.insertWindow(w2, { x: 80, y: 90 }, SplitDirection.Vertical, {
            capturedPosition: null,
            workspaceBounds,
        });

        expect(strategy.root.splitDirection).toBe(SplitDirection.Horizontal);
    });

    it("falls back to restoring the captured position when the drop misses every window", () => {
        const strategy = new BspStrategy();
        const w1 = createTestWindow(1, rect(0, 0, 100, 100));
        const w2 = createTestWindow(2, rect(200, 0, 100, 100));
        strategy.addWindow(w1, SplitDirection.Vertical);
        strategy.addWindow(w2, SplitDirection.Vertical);

        const originalRoot = strategy.root;
        const position = strategy.capturePosition(2);
        strategy.removeWindow(2, false);

        strategy.insertWindow(
            w2,
            { x: 9999, y: 9999 },
            SplitDirection.Vertical,
            {
                capturedPosition: position,
                workspaceBounds,
            },
        );

        expect(strategy.root).toBe(originalRoot);
        expect(originalRoot.secondChild).toBe(w2);
    });

    it("falls back to attaching next to any window when there is nothing to restore", () => {
        const strategy = new BspStrategy();
        const w1 = createTestWindow(1, rect(0, 0, 100, 100));
        const w2 = createTestWindow(2, rect(200, 0, 100, 100));
        strategy.addWindow(w1, SplitDirection.Vertical);
        strategy.addWindow(w2, SplitDirection.Vertical);
        const w3 = createTestWindow(3);

        strategy.insertWindow(
            w3,
            { x: 9999, y: 9999 },
            SplitDirection.Horizontal,
            {
                capturedPosition: null,
                workspaceBounds,
            },
        );

        expect(strategy.windowCount).toBe(3);
        expect(strategy.findStructure(strategy.root, 3)).toBe(w3);
    });
});

describe("BspStrategy.getResizeHandles", () => {
    const bounds = {
        position: { x: 0, y: 0 },
        size: { width: 100, height: 100 },
    };

    it("returns no handles when there is no root", () => {
        const strategy = new BspStrategy();
        expect(strategy.getResizeHandles(bounds)).toEqual([]);
    });

    it("returns no handles for a single-window tree", () => {
        const strategy = new BspStrategy();
        strategy.addWindow(createTestWindow(1), SplitDirection.Vertical);

        expect(strategy.getResizeHandles(bounds)).toEqual([]);
    });

    it("returns one handle for a two-window tree, identified by the root Container", () => {
        const strategy = new BspStrategy();
        strategy.addWindow(createTestWindow(1), SplitDirection.Vertical);
        strategy.addWindow(createTestWindow(2), SplitDirection.Vertical);

        const handles = strategy.getResizeHandles(bounds);

        expect(handles).toHaveLength(1);
        expect(handles[0].handle).toBe(strategy.root);
    });

    it("returns one handle per Container for a nested tree", () => {
        const strategy = new BspStrategy();
        strategy.addWindow(createTestWindow(1), SplitDirection.Vertical);
        strategy.addWindow(createTestWindow(2), SplitDirection.Vertical);
        strategy.addWindow(createTestWindow(3), SplitDirection.Horizontal);

        const handles = strategy.getResizeHandles(bounds);

        expect(handles).toHaveLength(2);
        expect(handles.map((h) => h.handle)).toContain(strategy.root);
    });
});

describe("BspStrategy.resizeHandle", () => {
    it("clamps and sets the ratio on the happy path, returning true", () => {
        const strategy = new BspStrategy();
        strategy.addWindow(createTestWindow(1), SplitDirection.Vertical);
        strategy.addWindow(createTestWindow(2), SplitDirection.Vertical);
        const container = strategy.root;

        const result = strategy.resizeHandle(container, 0.7);

        expect(result).toBe(true);
        expect(container.ratio).toBe(0.7);
    });

    it("clamps ratio to the [MIN_RESIZE_RATIO, 1 - MIN_RESIZE_RATIO] range", () => {
        const strategy = new BspStrategy();
        strategy.addWindow(createTestWindow(1), SplitDirection.Vertical);
        strategy.addWindow(createTestWindow(2), SplitDirection.Vertical);
        const container = strategy.root;

        strategy.resizeHandle(container, 0);
        expect(container.ratio).toBe(MIN_RESIZE_RATIO);

        strategy.resizeHandle(container, 1);
        expect(container.ratio).toBe(1 - MIN_RESIZE_RATIO);

        strategy.resizeHandle(container, NaN);
        expect(container.ratio).toBe(MIN_RESIZE_RATIO);
    });

    it("returns false and does not mutate for a non-Container handle", () => {
        const strategy = new BspStrategy();
        strategy.addWindow(createTestWindow(1), SplitDirection.Vertical);
        strategy.addWindow(createTestWindow(2), SplitDirection.Vertical);

        expect(strategy.resizeHandle({ not: "a container" }, 0.7)).toBe(false);
        expect(strategy.resizeHandle(null, 0.7)).toBe(false);
    });

    it("returns false for a Container no longer reachable from root", () => {
        const strategy = new BspStrategy();
        strategy.addWindow(createTestWindow(1), SplitDirection.Vertical);
        strategy.addWindow(createTestWindow(2), SplitDirection.Vertical);
        const detached = strategy.root;
        strategy.removeWindow(2, true); // root becomes w1, detached Container is orphaned

        expect(strategy.resizeHandle(detached, 0.7)).toBe(false);
        expect(detached.ratio).toBe(0.5);
    });
});
