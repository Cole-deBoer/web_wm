import { assert } from "./assert.js";

export class Structure {
    /**
     * @param {Structure | null} parent - The parent of the node, Should be null for the root node
     */
    constructor(parent) {
        this.parent = parent;
    }

    /**
     * @param {{position: {x: number, y: number}, size: {width: number, height: number}}} bounds - The bounds of the structure
     */
    calculateLayout(bounds) {
        throw new Error("Not implemented");
    }
}

export class Window extends Structure {
    /**
     * @param {Structure | null} parent - The parent of the window
     * @param {number} id - The unique id of the window
     * @param {unknown} ref - Opaque handle the renderer knows how to read/write (e.g. an HTMLElement)
     * @param {{horizontal: number, vertical: number}} margin - gap kept around this window's bounds
     * @param {import("./renderer.js").Renderer} renderer - translates layout numbers into platform reads/writes
     */
    constructor(parent, id, ref, margin, renderer) {
        super(parent);
        this.id = id;
        this.ref = ref;
        this.margin = margin;
        this.renderer = renderer;
        this.isDragging = false;

        assert(
            id != null && id != undefined,
            "Id must be not null or undefined",
        );
        assert(typeof id === "number", "Id must be a number");
        assert(
            margin != null && margin != undefined,
            "Margin must be not null or undefined",
        );
        assert(
            renderer &&
                typeof renderer.getBounds === "function" &&
                typeof renderer.setBounds === "function" &&
                typeof renderer.remove === "function",
            "Renderer must implement getBounds, setBounds and remove",
        );
    }

    /**
     * @param {{position: {x: number, y: number}, size: {width: number, height: number}}} bounds - The bounds of the structure
     */
    calculateLayout(bounds) {
        if (this.isDragging) return;

        this.renderer.setBounds(this.ref, {
            position: {
                x: bounds.position.x + this.margin.horizontal,
                y: bounds.position.y + this.margin.vertical,
            },
            size: {
                width: bounds.size.width - this.margin.horizontal * 2,
                height: bounds.size.height - this.margin.vertical * 2,
            },
        });
    }

    /**
     * @returns {{left: number, top: number, right: number, bottom: number, width: number, height: number}}
     */
    getBounds() {
        return this.renderer.getBounds(this.ref);
    }

    /**
     * Detaches this window's ref entirely (used when removeFromDOM is true).
     */
    remove() {
        this.renderer.remove(this.ref);
    }
}
