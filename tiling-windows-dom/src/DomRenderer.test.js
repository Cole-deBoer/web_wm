import { describe, it, expect, vi, afterEach } from "vitest";
import { DomRenderer } from "./DomRenderer.js";

describe("DomRenderer.setBounds", () => {
    it("positions the element with absolute inline styles", () => {
        const element = document.createElement("div");
        const renderer = new DomRenderer();

        renderer.setBounds(element, {
            position: { x: 18, y: 28 },
            size: { width: 84, height: 34 },
        });

        expect(element.style.position).toBe("absolute");
        expect(element.style.left).toBe("18px");
        expect(element.style.top).toBe("28px");
        expect(element.style.width).toBe("84px");
        expect(element.style.height).toBe("34px");
    });
});

describe("DomRenderer.getBounds", () => {
    it("delegates to the element's getBoundingClientRect", () => {
        const element = document.createElement("div");
        const rect = {
            left: 1,
            top: 2,
            right: 3,
            bottom: 4,
            width: 5,
            height: 6,
        };
        element.getBoundingClientRect = () => rect;
        const renderer = new DomRenderer();

        expect(renderer.getBounds(element)).toBe(rect);
    });
});

describe("DomRenderer.remove", () => {
    it("detaches the element from its parent", () => {
        const parent = document.createElement("div");
        const child = document.createElement("div");
        parent.appendChild(child);
        const renderer = new DomRenderer();

        renderer.remove(child);

        expect(parent.contains(child)).toBe(false);
    });

    it("does nothing when the element has no parent", () => {
        const element = document.createElement("div");
        const renderer = new DomRenderer();

        expect(() => renderer.remove(element)).not.toThrow();
    });
});

describe("DomRenderer.getWorkspaceBounds / getWorkspaceSize", () => {
    it("reads bounds from getBoundingClientRect and size from client dimensions", () => {
        const element = document.createElement("div");
        const rect = {
            left: 10,
            top: 20,
            right: 110,
            bottom: 220,
            width: 100,
            height: 200,
        };
        element.getBoundingClientRect = () => rect;
        Object.defineProperty(element, "clientWidth", { value: 90 });
        Object.defineProperty(element, "clientHeight", { value: 180 });
        const renderer = new DomRenderer();

        expect(renderer.getWorkspaceBounds(element)).toBe(rect);
        expect(renderer.getWorkspaceSize(element)).toEqual({
            width: 90,
            height: 180,
        });
    });
});

describe("DomRenderer.onResize", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("wires the callback to the window's resize event and returns an unsubscribe", () => {
        const addSpy = vi.spyOn(window, "addEventListener");
        const removeSpy = vi.spyOn(window, "removeEventListener");
        const callback = vi.fn();
        const renderer = new DomRenderer();

        const unsubscribe = renderer.onResize(callback);
        expect(addSpy).toHaveBeenCalledWith("resize", callback);

        unsubscribe();
        expect(removeSpy).toHaveBeenCalledWith("resize", callback);
    });
});
