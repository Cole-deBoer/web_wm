import { describe, it, expect, vi } from "vitest";
import { ColumnsStrategy } from "./ColumnsStrategy.js";

function fakeWindow() {
    return { calculateLayout: vi.fn() };
}

describe("ColumnsStrategy.calculateLayout", () => {
    it("does nothing when there are no windows", () => {
        const strategy = new ColumnsStrategy();
        expect(() =>
            strategy.calculateLayout({
                position: { x: 0, y: 0 },
                size: { width: 100, height: 100 },
            }),
        ).not.toThrow();
    });

    it("divides the width evenly across all windows, full height each", () => {
        const strategy = new ColumnsStrategy();
        const w1 = fakeWindow();
        const w2 = fakeWindow();
        const w3 = fakeWindow();
        strategy.windows.push(w1, w2, w3);

        strategy.calculateLayout({
            position: { x: 10, y: 20 },
            size: { width: 300, height: 90 },
        });

        expect(w1.calculateLayout).toHaveBeenCalledWith({
            position: { x: 10, y: 20 },
            size: { width: 100, height: 90 },
        });
        expect(w2.calculateLayout).toHaveBeenCalledWith({
            position: { x: 110, y: 20 },
            size: { width: 100, height: 90 },
        });
        expect(w3.calculateLayout).toHaveBeenCalledWith({
            position: { x: 210, y: 20 },
            size: { width: 100, height: 90 },
        });
    });

    it("divides width proportionally to custom weights", () => {
        const strategy = new ColumnsStrategy();
        const w1 = fakeWindow();
        w1.id = 1;
        const w2 = fakeWindow();
        w2.id = 2;
        strategy.windows.push(w1, w2);
        strategy.weights.set(1, 3);
        strategy.weights.set(2, 1);

        strategy.calculateLayout({
            position: { x: 0, y: 0 },
            size: { width: 400, height: 100 },
        });

        expect(w1.calculateLayout).toHaveBeenCalledWith({
            position: { x: 0, y: 0 },
            size: { width: 300, height: 100 },
        });
        expect(w2.calculateLayout).toHaveBeenCalledWith({
            position: { x: 300, y: 0 },
            size: { width: 100, height: 100 },
        });
    });
});
