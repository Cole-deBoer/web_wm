import { describe, it, expect, vi } from "vitest";
import { Window } from "./dataStructures.js";

const MARGIN = { horizontal: 8, vertical: 8 };

function makeRenderer() {
    return {
        getBounds: vi.fn(),
        setBounds: vi.fn(),
        remove: vi.fn(),
    };
}

describe("Window", () => {
    it("throws when id is null or undefined", () => {
        expect(
            () => new Window(null, null, {}, MARGIN, makeRenderer()),
        ).toThrow();
        expect(
            () => new Window(null, undefined, {}, MARGIN, makeRenderer()),
        ).toThrow();
    });

    it("throws when id is not a number", () => {
        expect(
            () => new Window(null, "1", {}, MARGIN, makeRenderer()),
        ).toThrow();
    });

    it("throws when renderer does not implement the required methods", () => {
        expect(() => new Window(null, 1, {}, MARGIN, {})).toThrow();
        expect(() => new Window(null, 1, {}, MARGIN, null)).toThrow();
    });

    it("throws when margin is null or undefined", () => {
        expect(() => new Window(null, 1, {}, null, makeRenderer())).toThrow();
        expect(
            () => new Window(null, 1, {}, undefined, makeRenderer()),
        ).toThrow();
    });

    it("constructs with valid arguments", () => {
        const ref = {};
        const renderer = makeRenderer();
        const window = new Window(null, 7, ref, MARGIN, renderer);

        expect(window.id).toBe(7);
        expect(window.ref).toBe(ref);
        expect(window.margin).toBe(MARGIN);
        expect(window.isDragging).toBe(false);
    });

    it("insets the ref's bounds by margin when laid out", () => {
        const ref = {};
        const renderer = makeRenderer();
        const window = new Window(null, 1, ref, MARGIN, renderer);

        window.calculateLayout({
            position: { x: 10, y: 20 },
            size: { width: 100, height: 50 },
        });

        expect(renderer.setBounds).toHaveBeenCalledWith(ref, {
            position: { x: 18, y: 28 },
            size: { width: 84, height: 34 },
        });
    });

    it("does not update bounds while dragging", () => {
        const renderer = makeRenderer();
        const window = new Window(null, 1, {}, MARGIN, renderer);
        window.isDragging = true;

        window.calculateLayout({
            position: { x: 10, y: 20 },
            size: { width: 100, height: 50 },
        });

        expect(renderer.setBounds).not.toHaveBeenCalled();
    });

    it("contributes no resize handles - a leaf owns no divider", () => {
        const window = new Window(null, 1, {}, MARGIN, makeRenderer());

        expect(
            window.collectResizeHandles({
                position: { x: 0, y: 0 },
                size: { width: 100, height: 100 },
            }),
        ).toEqual([]);
    });

    it("delegates getBounds/remove to the renderer", () => {
        const ref = {};
        const renderer = makeRenderer();
        const bounds = {
            left: 0,
            top: 0,
            right: 10,
            bottom: 10,
            width: 10,
            height: 10,
        };
        renderer.getBounds.mockReturnValue(bounds);
        const window = new Window(null, 1, ref, MARGIN, renderer);

        expect(window.getBounds()).toEqual(bounds);
        expect(renderer.getBounds).toHaveBeenCalledWith(ref);

        window.remove();
        expect(renderer.remove).toHaveBeenCalledWith(ref);
    });
});
