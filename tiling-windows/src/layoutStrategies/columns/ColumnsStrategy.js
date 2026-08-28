import { OrderedListStrategy } from "../OrderedListStrategy.js";

/**
 * A single row of columns, ordered left to right, sized proportionally
 * to each window's weight (see OrderedListStrategy.computeColumnBounds -
 * default weight 1 for every window reproduces even division exactly).
 * getResizeHandles/resizeHandle are inherited from OrderedListStrategy
 * unchanged.
 */
export class ColumnsStrategy extends OrderedListStrategy {
    /**
     * @param {{position: {x: number, y: number}, size: {width: number, height: number}}} bounds - The bounds of the structure
     */
    calculateLayout(bounds) {
        if (this.windows.length === 0) return;

        const columnBounds = this.computeColumnBounds(bounds);
        this.windows.forEach((window, index) => {
            window.calculateLayout(columnBounds[index]);
        });
    }
}
