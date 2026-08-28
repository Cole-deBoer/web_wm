import { OrderedListStrategy } from "../OrderedListStrategy.js";

/**
 * A single row of equal-width columns, ordered left to right. No tree,
 * no ratios - just an ordered list of windows.
 */
export class ColumnsStrategy extends OrderedListStrategy {
    /**
     * @param {{position: {x: number, y: number}, size: {width: number, height: number}}} bounds - The bounds of the structure
     */
    calculateLayout(bounds) {
        const count = this.windows.length;
        if (count === 0) return;

        const columnWidth = bounds.size.width / count;

        this.windows.forEach((window, index) => {
            window.calculateLayout({
                position: {
                    x: bounds.position.x + columnWidth * index,
                    y: bounds.position.y,
                },
                size: {
                    width: columnWidth,
                    height: bounds.size.height,
                },
            });
        });
    }
}
