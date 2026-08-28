import { Window } from "./dataStructures.js";

const DEFAULT_MARGIN = { horizontal: 0, vertical: 0 };

/**
 * Minimal Renderer whose getBounds always returns a fixed rect, and whose
 * setBounds/remove just record their last call - enough for strategies to
 * exercise hit-testing and layout without a real platform underneath.
 */
export class FakeRenderer {
    constructor(rect = zeroRect()) {
        this.rect = rect;
        this.lastSetBounds = null;
        this.removed = false;
    }

    getBounds() {
        return this.rect;
    }

    setBounds(ref, bounds) {
        this.lastSetBounds = bounds;
    }

    remove() {
        this.removed = true;
    }
}

/**
 * Builds a Window over a plain ref backed by a FakeRenderer that reports
 * the given rect for hit-testing.
 */
export function createTestWindow(
    id,
    rect = zeroRect(),
    margin = DEFAULT_MARGIN,
) {
    return new Window(null, id, {}, margin, new FakeRenderer(rect));
}

export function rect(left, top, width, height) {
    return {
        left,
        top,
        right: left + width,
        bottom: top + height,
        width,
        height,
    };
}

export function zeroRect() {
    return rect(0, 0, 0, 0);
}
