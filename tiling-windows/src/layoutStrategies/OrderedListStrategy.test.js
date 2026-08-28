import { describe, it, expect } from "vitest";
import { OrderedListStrategy } from "./OrderedListStrategy.js";
import { createTestWindow, rect } from "../test-utils.js";

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
