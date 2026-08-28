import { describe, it, expect, vi } from "vitest";
import { GridStrategy } from "./GridStrategy.js";

function fakeWindow() {
    return { calculateLayout: vi.fn() };
}

describe("GridStrategy.addWindow", () => {
    it("rejects a 5th window", () => {
        const strategy = new GridStrategy();
        strategy.windows.push(
            fakeWindow(),
            fakeWindow(),
            fakeWindow(),
            fakeWindow(),
        );

        const added = strategy.addWindow(fakeWindow());

        expect(added).toBe(false);
        expect(strategy.windows.length).toBe(4);
    });
});

describe("GridStrategy.calculateLayout", () => {
    const bounds = {
        position: { x: 0, y: 0 },
        size: { width: 200, height: 100 },
    };

    it("gives a single window the full bounds", () => {
        const strategy = new GridStrategy();
        const w1 = fakeWindow();
        strategy.windows.push(w1);

        strategy.calculateLayout(bounds);

        expect(w1.calculateLayout).toHaveBeenCalledWith(bounds);
    });

    it("splits two windows side by side, full height each", () => {
        const strategy = new GridStrategy();
        const w1 = fakeWindow();
        const w2 = fakeWindow();
        strategy.windows.push(w1, w2);

        strategy.calculateLayout(bounds);

        expect(w1.calculateLayout).toHaveBeenCalledWith({
            position: { x: 0, y: 0 },
            size: { width: 100, height: 100 },
        });
        expect(w2.calculateLayout).toHaveBeenCalledWith({
            position: { x: 100, y: 0 },
            size: { width: 100, height: 100 },
        });
    });

    it("gives 3 windows the corrected shape: 2 equal top, 1 double-size bottom", () => {
        const strategy = new GridStrategy();
        const [w1, w2, w3] = [fakeWindow(), fakeWindow(), fakeWindow()];
        strategy.windows.push(w1, w2, w3);

        strategy.calculateLayout(bounds);

        expect(w1.calculateLayout).toHaveBeenCalledWith({
            position: { x: 0, y: 0 },
            size: { width: 100, height: 50 },
        });
        expect(w2.calculateLayout).toHaveBeenCalledWith({
            position: { x: 100, y: 0 },
            size: { width: 100, height: 50 },
        });
        // Spans the full width at the same height as the two above it
        // combined - exactly double their individual area.
        expect(w3.calculateLayout).toHaveBeenCalledWith({
            position: { x: 0, y: 50 },
            size: { width: 200, height: 50 },
        });
    });

    it("gives 4 windows a true 2x2 equal grid", () => {
        const strategy = new GridStrategy();
        const [w1, w2, w3, w4] = [
            fakeWindow(),
            fakeWindow(),
            fakeWindow(),
            fakeWindow(),
        ];
        strategy.windows.push(w1, w2, w3, w4);

        strategy.calculateLayout(bounds);

        expect(w1.calculateLayout).toHaveBeenCalledWith({
            position: { x: 0, y: 0 },
            size: { width: 100, height: 50 },
        });
        expect(w2.calculateLayout).toHaveBeenCalledWith({
            position: { x: 100, y: 0 },
            size: { width: 100, height: 50 },
        });
        expect(w3.calculateLayout).toHaveBeenCalledWith({
            position: { x: 0, y: 50 },
            size: { width: 100, height: 50 },
        });
        expect(w4.calculateLayout).toHaveBeenCalledWith({
            position: { x: 100, y: 50 },
            size: { width: 100, height: 50 },
        });
    });
});

describe("GridStrategy resize opt-out", () => {
    it("never reports resize handles, regardless of window count", () => {
        const strategy = new GridStrategy();
        strategy.windows.push(fakeWindow(), fakeWindow(), fakeWindow());

        expect(
            strategy.getResizeHandles({
                position: { x: 0, y: 0 },
                size: { width: 200, height: 100 },
            }),
        ).toEqual([]);
    });

    it("never accepts a resize, regardless of input", () => {
        const strategy = new GridStrategy();
        strategy.windows.push(fakeWindow(), fakeWindow());

        expect(strategy.resizeHandle({ firstId: 1, secondId: 2 }, 0.7)).toBe(
            false,
        );
    });
});
