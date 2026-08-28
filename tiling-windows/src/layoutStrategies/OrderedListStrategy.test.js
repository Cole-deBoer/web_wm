import { describe, it, expect } from "vitest";
import { OrderedListStrategy } from "./OrderedListStrategy.js";
import { createTestWindow, rect } from "../test-utils.js";
import { SplitDirection } from "../splitDirection.js";
import { MIN_RESIZE_RATIO } from "../resize.js";

describe("OrderedListStrategy.addWindow", () => {
    it("appends to the end when there is no active window", () => {
        const strategy = new OrderedListStrategy();
        const w1 = createTestWindow(1);
        const w2 = createTestWindow(2);

        strategy.addWindow(w1);
        strategy.setActiveWindowId(null);
        strategy.addWindow(w2);

        expect(strategy.windows.map((w) => w.id)).toEqual([1, 2]);
    });

    it("inserts immediately after the active window", () => {
        const strategy = new OrderedListStrategy();
        const w1 = createTestWindow(1);
        const w2 = createTestWindow(2);
        const w3 = createTestWindow(3);
        strategy.addWindow(w1);
        strategy.addWindow(w2);
        strategy.setActiveWindowId(1);

        strategy.addWindow(w3);

        expect(strategy.windows.map((w) => w.id)).toEqual([1, 3, 2]);
        expect(strategy.getActiveWindowId()).toBe(3);
    });
});

describe("OrderedListStrategy.removeWindow", () => {
    it("reassigns active to the window that slid into the removed index", () => {
        const strategy = new OrderedListStrategy();
        [1, 2, 3].forEach((id) => strategy.addWindow(createTestWindow(id)));
        strategy.setActiveWindowId(2);

        const shouldRedraw = strategy.removeWindow(2, true);

        expect(shouldRedraw).toBe(true);
        expect(strategy.windows.map((w) => w.id)).toEqual([1, 3]);
        expect(strategy.getActiveWindowId()).toBe(3);
    });

    it("falls back to the previous window when the removed window was last", () => {
        const strategy = new OrderedListStrategy();
        [1, 2, 3].forEach((id) => strategy.addWindow(createTestWindow(id)));
        strategy.setActiveWindowId(3);

        strategy.removeWindow(3, true);

        expect(strategy.getActiveWindowId()).toBe(2);
    });

    it("does not touch active id when removeFromDOM is false", () => {
        const strategy = new OrderedListStrategy();
        [1, 2].forEach((id) => strategy.addWindow(createTestWindow(id)));
        strategy.setActiveWindowId(1);

        const shouldRedraw = strategy.removeWindow(1, false);

        expect(shouldRedraw).toBe(false);
        expect(strategy.windows.map((w) => w.id)).toEqual([2]);
        expect(strategy.getActiveWindowId()).toBe(1);
    });
});

describe("OrderedListStrategy capturePosition/restoreWindow", () => {
    it("restores a window to the index it was captured from", () => {
        const strategy = new OrderedListStrategy();
        const windows = [1, 2, 3].map((id) => createTestWindow(id));
        windows.forEach((w) => strategy.addWindow(w));
        const w2 = windows[1];

        const position = strategy.capturePosition(2);
        strategy.removeWindow(2, false);
        strategy.restoreWindow(w2, position);

        expect(strategy.windows.map((w) => w.id)).toEqual([1, 2, 3]);
    });

    it("returns false when there is no captured position", () => {
        const strategy = new OrderedListStrategy();
        expect(strategy.restoreWindow(createTestWindow(1), null)).toBe(false);
    });
});

describe("OrderedListStrategy.insertWindow", () => {
    const workspaceBounds = rect(0, 0, 1000, 1000);

    it("inserts before the target when dropped on its left half", () => {
        const strategy = new OrderedListStrategy();
        const w1 = createTestWindow(1, rect(0, 0, 100, 100));
        strategy.addWindow(w1);
        const w2 = createTestWindow(2);

        strategy.insertWindow(w2, { x: 20, y: 20 }, null, {
            capturedPosition: null,
            workspaceBounds,
        });

        expect(strategy.windows.map((w) => w.id)).toEqual([2, 1]);
    });

    it("inserts after the target when dropped on its right half", () => {
        const strategy = new OrderedListStrategy();
        const w1 = createTestWindow(1, rect(0, 0, 100, 100));
        strategy.addWindow(w1);
        const w2 = createTestWindow(2);

        strategy.insertWindow(w2, { x: 80, y: 20 }, null, {
            capturedPosition: null,
            workspaceBounds,
        });

        expect(strategy.windows.map((w) => w.id)).toEqual([1, 2]);
    });

    it("falls back to restoring the captured position when the drop misses", () => {
        const strategy = new OrderedListStrategy();
        const windows = [1, 2, 3].map((id) =>
            createTestWindow(id, rect(id * 200, 0, 100, 100)),
        );
        windows.forEach((w) => strategy.addWindow(w));
        const w2 = windows[1];

        const position = strategy.capturePosition(2);
        strategy.removeWindow(2, false);

        strategy.insertWindow(w2, { x: 9999, y: 9999 }, null, {
            capturedPosition: position,
            workspaceBounds,
        });

        expect(strategy.windows.map((w) => w.id)).toEqual([1, 2, 3]);
    });

    it("falls back to pushing to the end when there is nothing to restore", () => {
        const strategy = new OrderedListStrategy();
        const w1 = createTestWindow(1, rect(0, 0, 100, 100));
        strategy.addWindow(w1);
        const w2 = createTestWindow(2);

        strategy.insertWindow(w2, { x: 9999, y: 9999 }, null, {
            capturedPosition: null,
            workspaceBounds,
        });

        expect(strategy.windows.map((w) => w.id)).toEqual([1, 2]);
    });
});

describe("OrderedListStrategy.getWeight / computeColumnBounds", () => {
    it("defaults every window's weight to 1", () => {
        const strategy = new OrderedListStrategy();
        expect(strategy.getWeight(1)).toBe(1);
    });

    it("matches even division by default", () => {
        const strategy = new OrderedListStrategy();
        [1, 2, 3].forEach((id) => strategy.addWindow(createTestWindow(id)));

        const columnBounds = strategy.computeColumnBounds({
            position: { x: 10, y: 20 },
            size: { width: 300, height: 90 },
        });

        expect(columnBounds).toEqual([
            { position: { x: 10, y: 20 }, size: { width: 100, height: 90 } },
            { position: { x: 110, y: 20 }, size: { width: 100, height: 90 } },
            { position: { x: 210, y: 20 }, size: { width: 100, height: 90 } },
        ]);
    });

    it("honors custom weights", () => {
        const strategy = new OrderedListStrategy();
        [1, 2].forEach((id) => strategy.addWindow(createTestWindow(id)));
        strategy.weights.set(1, 3);
        strategy.weights.set(2, 1);

        const columnBounds = strategy.computeColumnBounds({
            position: { x: 0, y: 0 },
            size: { width: 400, height: 100 },
        });

        expect(columnBounds[0].size.width).toBe(300);
        expect(columnBounds[1].size.width).toBe(100);
        expect(columnBounds[1].position.x).toBe(300);
    });
});

describe("OrderedListStrategy.getResizeHandles", () => {
    it("returns no handles for 0 or 1 windows", () => {
        const strategy = new OrderedListStrategy();
        const bounds = {
            position: { x: 0, y: 0 },
            size: { width: 100, height: 100 },
        };

        expect(strategy.getResizeHandles(bounds)).toEqual([]);

        strategy.addWindow(createTestWindow(1));
        expect(strategy.getResizeHandles(bounds)).toEqual([]);
    });

    it("returns one handle per adjacent pair, keyed by window id", () => {
        const strategy = new OrderedListStrategy();
        [1, 2, 3].forEach((id) => strategy.addWindow(createTestWindow(id)));

        const handles = strategy.getResizeHandles({
            position: { x: 0, y: 0 },
            size: { width: 300, height: 100 },
        });

        expect(handles).toHaveLength(2);
        expect(handles[0].handle).toEqual({ firstId: 1, secondId: 2 });
        expect(handles[0].splitDirection).toBe(SplitDirection.Vertical);
        expect(handles[1].handle).toEqual({ firstId: 2, secondId: 3 });
    });
});

describe("OrderedListStrategy.resizeHandle", () => {
    it("redistributes the pair's combined weight per ratio, leaving others untouched", () => {
        const strategy = new OrderedListStrategy();
        [1, 2, 3].forEach((id) => strategy.addWindow(createTestWindow(id)));

        const result = strategy.resizeHandle({ firstId: 1, secondId: 2 }, 0.25);

        expect(result).toBe(true);
        expect(strategy.getWeight(1)).toBe(0.5);
        expect(strategy.getWeight(2)).toBe(1.5);
        expect(strategy.getWeight(3)).toBe(1);
    });

    it("clamps ratio to the [MIN_RESIZE_RATIO, 1 - MIN_RESIZE_RATIO] range", () => {
        const strategy = new OrderedListStrategy();
        [1, 2].forEach((id) => strategy.addWindow(createTestWindow(id)));

        strategy.resizeHandle({ firstId: 1, secondId: 2 }, 0);

        expect(strategy.getWeight(1)).toBe(2 * MIN_RESIZE_RATIO);
        expect(strategy.getWeight(2)).toBe(2 * (1 - MIN_RESIZE_RATIO));
    });

    it("returns false for unknown ids", () => {
        const strategy = new OrderedListStrategy();
        [1, 2].forEach((id) => strategy.addWindow(createTestWindow(id)));

        expect(strategy.resizeHandle({ firstId: 1, secondId: 999 }, 0.5)).toBe(
            false,
        );
    });

    it("returns false for ids that are no longer adjacent", () => {
        const strategy = new OrderedListStrategy();
        [1, 2, 3].forEach((id) => strategy.addWindow(createTestWindow(id)));

        expect(strategy.resizeHandle({ firstId: 1, secondId: 3 }, 0.5)).toBe(
            false,
        );
    });

    it("preserves a window's weight across a mid-drag round trip, but clears it on real removal", () => {
        const strategy = new OrderedListStrategy();
        const windows = [1, 2].map((id) => createTestWindow(id));
        windows.forEach((w) => strategy.addWindow(w));
        strategy.resizeHandle({ firstId: 1, secondId: 2 }, 0.75);
        expect(strategy.getWeight(1)).toBe(1.5);

        const position = strategy.capturePosition(1);
        strategy.removeWindow(1, false); // mid-drag pickup
        expect(strategy.getWeight(1)).toBe(1.5); // untouched

        strategy.restoreWindow(windows[0], position);
        expect(strategy.getWeight(1)).toBe(1.5); // survived the round trip

        strategy.removeWindow(1, true); // real removal
        expect(strategy.getWeight(1)).toBe(1); // default again - entry cleared
    });
});
