import { describe, it, expect } from "vitest";
import { Container } from "./Container.js";
import { Structure } from "../../dataStructures.js";
import { SplitDirection } from "../../splitDirection.js";

class FakeStructure extends Structure {
    constructor() {
        super(null);
        this.calls = [];
    }

    calculateLayout(bounds) {
        this.calls.push(bounds);
    }

    collectResizeHandles() {
        return [];
    }
}

describe("Container", () => {
    it("throws when ratio is out of range", () => {
        expect(
            () =>
                new Container(
                    null,
                    SplitDirection.Horizontal,
                    -0.1,
                    null,
                    null,
                ),
        ).toThrow();
        expect(
            () =>
                new Container(null, SplitDirection.Horizontal, 1.1, null, null),
        ).toThrow();
    });

    it("throws when splitDirection is invalid", () => {
        expect(
            () => new Container(null, "diagonal", 0.5, null, null),
        ).toThrow();
    });

    it("throws when a provided child is not a Structure", () => {
        expect(
            () => new Container(null, SplitDirection.Horizontal, 0.5, {}, null),
        ).toThrow();
        expect(
            () => new Container(null, SplitDirection.Horizontal, 0.5, null, {}),
        ).toThrow();
    });

    it("sets itself as the parent of its children", () => {
        const first = new FakeStructure();
        const second = new FakeStructure();
        const container = new Container(
            null,
            SplitDirection.Horizontal,
            0.5,
            first,
            second,
        );

        expect(first.parent).toBe(container);
        expect(second.parent).toBe(container);
    });

    it("splits Horizontal by height, giving the second child 1 - ratio (not ratio)", () => {
        const first = new FakeStructure();
        const second = new FakeStructure();
        const container = new Container(
            null,
            SplitDirection.Horizontal,
            0.25,
            first,
            second,
        );

        container.calculateLayout({
            position: { x: 0, y: 0 },
            size: { width: 100, height: 100 },
        });

        expect(first.calls[0]).toEqual({
            position: { x: 0, y: 0 },
            size: { width: 100, height: 25 },
        });
        expect(second.calls[0]).toEqual({
            position: { x: 0, y: 25 },
            size: { width: 100, height: 75 },
        });
    });

    it("splits Vertical by width, giving the second child 1 - ratio (not ratio)", () => {
        const first = new FakeStructure();
        const second = new FakeStructure();
        const container = new Container(
            null,
            SplitDirection.Vertical,
            0.25,
            first,
            second,
        );

        container.calculateLayout({
            position: { x: 0, y: 0 },
            size: { width: 100, height: 100 },
        });

        expect(first.calls[0]).toEqual({
            position: { x: 0, y: 0 },
            size: { width: 25, height: 100 },
        });
        expect(second.calls[0]).toEqual({
            position: { x: 25, y: 0 },
            size: { width: 75, height: 100 },
        });
    });
});

describe("Container.splitBounds", () => {
    it("returns the same two rects calculateLayout passes to its children", () => {
        const container = new Container(
            null,
            SplitDirection.Horizontal,
            0.25,
            new FakeStructure(),
            new FakeStructure(),
        );

        const { firstChildBounds, secondChildBounds } = container.splitBounds({
            position: { x: 0, y: 0 },
            size: { width: 100, height: 100 },
        });

        expect(firstChildBounds).toEqual({
            position: { x: 0, y: 0 },
            size: { width: 100, height: 25 },
        });
        expect(secondChildBounds).toEqual({
            position: { x: 0, y: 25 },
            size: { width: 100, height: 75 },
        });
    });
});

describe("Container.collectResizeHandles", () => {
    it("reports its own handle centered on the boundary for a Horizontal split", () => {
        const container = new Container(
            null,
            SplitDirection.Horizontal,
            0.5,
            new FakeStructure(),
            new FakeStructure(),
        );

        const handles = container.collectResizeHandles({
            position: { x: 0, y: 0 },
            size: { width: 100, height: 100 },
        });

        expect(handles[0].handle).toBe(container);
        expect(handles[0].splitDirection).toBe(SplitDirection.Horizontal);
        expect(handles[0].bounds).toEqual({
            position: { x: 0, y: 46 },
            size: { width: 100, height: 8 },
        });
    });

    it("reports its own handle centered on the boundary for a Vertical split", () => {
        const container = new Container(
            null,
            SplitDirection.Vertical,
            0.25,
            new FakeStructure(),
            new FakeStructure(),
        );

        const handles = container.collectResizeHandles({
            position: { x: 0, y: 0 },
            size: { width: 100, height: 100 },
        });

        expect(handles[0].handle).toBe(container);
        expect(handles[0].splitDirection).toBe(SplitDirection.Vertical);
        expect(handles[0].bounds).toEqual({
            position: { x: 21, y: 0 },
            size: { width: 8, height: 100 },
        });
    });

    it("recurses through a nested tree, flattening a leaf's empty contribution", () => {
        const leaf = new FakeStructure();
        const inner = new Container(
            null,
            SplitDirection.Vertical,
            0.5,
            leaf,
            new FakeStructure(),
        );
        const root = new Container(
            null,
            SplitDirection.Horizontal,
            0.5,
            leaf,
            inner,
        );

        const handles = root.collectResizeHandles({
            position: { x: 0, y: 0 },
            size: { width: 100, height: 100 },
        });

        // root's own handle first, then inner's (leaf contributes nothing).
        expect(handles.map((h) => h.handle)).toEqual([root, inner]);
    });
});
