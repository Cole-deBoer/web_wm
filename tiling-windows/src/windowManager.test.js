import { describe, it, expect, vi } from "vitest";
import { WindowManager } from "./windowManager.js";
import { LayoutStrategy } from "./layoutStrategies/LayoutStrategy.js";
import config from "./config.js";

class FakeStrategy extends LayoutStrategy {
    constructor() {
        super();
        this.addWindow = vi.fn(() => true);
        this.removeWindow = vi.fn((id, removeFromDOM) => removeFromDOM);
        this.insertWindow = vi.fn();
        this.calculateLayout = vi.fn();
        this.capturePosition = vi.fn((id) => ({ captured: id }));
        this.restoreWindow = vi.fn(() => true);
        this.getResizeHandles = vi.fn(() => []);
        this.resizeHandle = vi.fn(() => true);
    }

    get windowCount() {
        return 0;
    }
}

function fakeRenderer({ width = 1000, height = 500, left = 0, top = 0 } = {}) {
    return {
        getBounds: vi.fn(),
        setBounds: vi.fn(),
        remove: vi.fn(),
        getWorkspaceBounds: vi.fn(() => ({
            left,
            top,
            right: left + width,
            bottom: top + height,
            width,
            height,
        })),
        getWorkspaceSize: vi.fn(() => ({ width, height })),
        onResize: vi.fn(() => vi.fn()),
    };
}

describe("WindowManager construction", () => {
    it("defaults windowMargin from config when none is given", () => {
        const wm = new WindowManager({}, fakeRenderer(), new FakeStrategy());
        expect(wm.windowMargin).toBe(config.window_margin);
    });

    it("accepts a custom windowMargin", () => {
        const margin = { horizontal: 20, vertical: 10 };
        const wm = new WindowManager(
            {},
            fakeRenderer(),
            new FakeStrategy(),
            margin,
        );
        expect(wm.windowMargin).toBe(margin);
    });

    it("stores the given workspaceRef without looking it up itself", () => {
        const workspaceRef = {};
        const wm = new WindowManager(
            workspaceRef,
            fakeRenderer(),
            new FakeStrategy(),
        );
        expect(wm.workspaceRef).toBe(workspaceRef);
    });

    it("subscribes to the renderer's resize notifications", () => {
        const renderer = fakeRenderer();
        new WindowManager({}, renderer, new FakeStrategy());
        expect(renderer.onResize).toHaveBeenCalledTimes(1);
    });
});

describe("WindowManager.createWindow", () => {
    it("assigns unique, incrementing ids using its own margin", () => {
        const margin = { horizontal: 5, vertical: 5 };
        const wm = new WindowManager(
            {},
            fakeRenderer(),
            new FakeStrategy(),
            margin,
        );

        const w1 = wm.createWindow({});
        const w2 = wm.createWindow({});

        expect(w1.id).toBe(1);
        expect(w2.id).toBe(2);
        expect(w1.margin).toBe(margin);
    });
});

describe("WindowManager.redrawWindows", () => {
    it("computes layout bounds from windowMargin and workspace size", () => {
        const margin = { horizontal: 10, vertical: 5 };
        const strategy = new FakeStrategy();
        const wm = new WindowManager(
            {},
            fakeRenderer({ width: 500, height: 300 }),
            strategy,
            margin,
        );

        wm.redrawWindows();

        expect(strategy.calculateLayout).toHaveBeenCalledWith({
            position: { x: 10, y: 5 },
            size: { width: 480, height: 290 },
        });
    });
});

describe("WindowManager.addWindow / removeWindow redraw gating", () => {
    it("does not redraw when the strategy rejects the window", () => {
        const strategy = new FakeStrategy();
        strategy.addWindow = vi.fn(() => false);
        const wm = new WindowManager({}, fakeRenderer(), strategy);

        const added = wm.addWindow({ id: 1 }, "Vertical");

        expect(added).toBe(false);
        expect(strategy.calculateLayout).not.toHaveBeenCalled();
    });

    it("redraws when the strategy accepts the window", () => {
        const strategy = new FakeStrategy();
        const wm = new WindowManager({}, fakeRenderer(), strategy);

        const added = wm.addWindow({ id: 1 }, "Vertical");

        expect(added).toBe(true);
        expect(strategy.calculateLayout).toHaveBeenCalledTimes(1);
    });

    it("does not redraw when the strategy says removal doesn't require it", () => {
        const strategy = new FakeStrategy();
        const wm = new WindowManager({}, fakeRenderer(), strategy);

        wm.removeWindow(1, false);

        expect(strategy.calculateLayout).not.toHaveBeenCalled();
    });

    it("redraws when the strategy says removal requires it", () => {
        const strategy = new FakeStrategy();
        const wm = new WindowManager({}, fakeRenderer(), strategy);

        wm.removeWindow(1, true);

        expect(strategy.calculateLayout).toHaveBeenCalledTimes(1);
    });
});

describe("WindowManager.insertWindow", () => {
    it("always redraws and passes a null capturedPosition", () => {
        const strategy = new FakeStrategy();
        const renderer = fakeRenderer();
        const wm = new WindowManager({}, renderer, strategy);
        const window = { id: 1 };
        const mousePosition = { x: 10, y: 20 };

        wm.insertWindow(window, mousePosition, "Vertical");

        expect(strategy.insertWindow).toHaveBeenCalledWith(
            window,
            mousePosition,
            "Vertical",
            {
                capturedPosition: null,
                workspaceBounds:
                    renderer.getWorkspaceBounds.mock.results[0].value,
            },
        );
        expect(strategy.calculateLayout).toHaveBeenCalledTimes(1);
    });
});

describe("WindowManager.beginDrag / endDrag", () => {
    it("beginDrag marks dragging, sets active, captures position, and removes without redrawing", () => {
        const strategy = new FakeStrategy();
        const wm = new WindowManager({}, fakeRenderer(), strategy);
        const window = { id: 5, isDragging: false };

        wm.beginDrag(window);

        expect(window.isDragging).toBe(true);
        expect(wm.activeWindowId).toBe(5);
        expect(strategy.capturePosition).toHaveBeenCalledWith(5);
        expect(wm.dragPositions.get(5)).toEqual({ captured: 5 });
        expect(strategy.removeWindow).toHaveBeenCalledWith(5, false);
        expect(strategy.calculateLayout).not.toHaveBeenCalled();
    });

    it("endDrag consumes the captured position, redraws, and clears dragging", () => {
        const strategy = new FakeStrategy();
        const renderer = fakeRenderer();
        const wm = new WindowManager({}, renderer, strategy);
        const window = { id: 5, isDragging: true };
        wm.dragPositions.set(5, { captured: 5 });

        wm.endDrag(window, { x: 1, y: 2 }, "Horizontal");

        expect(window.isDragging).toBe(false);
        expect(wm.dragPositions.has(5)).toBe(false);
        expect(strategy.insertWindow).toHaveBeenCalledWith(
            window,
            { x: 1, y: 2 },
            "Horizontal",
            {
                capturedPosition: { captured: 5 },
                workspaceBounds:
                    renderer.getWorkspaceBounds.mock.results[0].value,
            },
        );
        expect(strategy.calculateLayout).toHaveBeenCalledTimes(1);
    });

    it("endDrag passes a null capturedPosition when nothing was stored for that window", () => {
        const strategy = new FakeStrategy();
        const wm = new WindowManager({}, fakeRenderer(), strategy);
        const window = { id: 99, isDragging: true };

        wm.endDrag(window, { x: 0, y: 0 }, "Vertical");

        expect(
            strategy.insertWindow.mock.calls[0][3].capturedPosition,
        ).toBeNull();
    });
});

describe("WindowManager.getResizeHandles", () => {
    it("calls strategy.getResizeHandles with the same bounds redrawWindows uses", () => {
        const margin = { horizontal: 10, vertical: 5 };
        const strategy = new FakeStrategy();
        const wm = new WindowManager(
            {},
            fakeRenderer({ width: 500, height: 300 }),
            strategy,
            margin,
        );

        wm.getResizeHandles();

        expect(strategy.getResizeHandles).toHaveBeenCalledWith({
            position: { x: 10, y: 5 },
            size: { width: 480, height: 290 },
        });
    });

    it("returns whatever the strategy reports", () => {
        const strategy = new FakeStrategy();
        const handles = [
            { handle: {}, bounds: {}, splitDirection: "Vertical" },
        ];
        strategy.getResizeHandles = vi.fn(() => handles);
        const wm = new WindowManager({}, fakeRenderer(), strategy);

        expect(wm.getResizeHandles()).toBe(handles);
    });
});

describe("WindowManager.resizeHandle", () => {
    it("redraws and returns true when the strategy accepts the resize", () => {
        const strategy = new FakeStrategy();
        const wm = new WindowManager({}, fakeRenderer(), strategy);
        const handle = {};

        const result = wm.resizeHandle(handle, 0.6);

        expect(result).toBe(true);
        expect(strategy.resizeHandle).toHaveBeenCalledWith(handle, 0.6);
        expect(strategy.calculateLayout).toHaveBeenCalledTimes(1);
    });

    it("does not redraw and returns false when the strategy rejects the resize", () => {
        const strategy = new FakeStrategy();
        strategy.resizeHandle = vi.fn(() => false);
        const wm = new WindowManager({}, fakeRenderer(), strategy);

        const result = wm.resizeHandle({}, 0.6);

        expect(result).toBe(false);
        expect(strategy.calculateLayout).not.toHaveBeenCalled();
    });
});

describe("WindowManager.destroy", () => {
    it("unsubscribes from the renderer's resize notifications", () => {
        const unsubscribe = vi.fn();
        const renderer = fakeRenderer();
        renderer.onResize = vi.fn(() => unsubscribe);
        const wm = new WindowManager({}, renderer, new FakeStrategy());

        wm.destroy();

        expect(unsubscribe).toHaveBeenCalledTimes(1);
    });
});
