import { OrderedListStrategy } from "../OrderedListStrategy.js";

const MAX_WINDOWS = 4;

/**
 * A balanced 2-row grid, same shape BSP would produce for these counts:
 * 1 window fills the space; 2 sit side by side; 3 puts 2 equal windows
 * in the top row and stretches the 3rd across the full width of the
 * bottom row (so it's exactly the size of the 2 above it combined);
 * 4 is a true 2x2 equal grid. Every cell is always covered - nothing is
 * ever left blank. Capped at 4 windows since a 3rd row/column would
 * break the "top row is at most 2, bottom row is the remainder" rule.
 */
export class GridStrategy extends OrderedListStrategy {
    /**
     * @param {import("../../dataStructures.js").Window} window - The window to append
     * @returns {boolean} whether the window was added
     */
    addWindow(window) {
        if (this.windows.length >= MAX_WINDOWS) return false;
        return super.addWindow(window);
    }

    /**
     * @param {{position: {x: number, y: number}, size: {width: number, height: number}}} bounds - The bounds of the structure
     */
    calculateLayout(bounds) {
        const count = this.windows.length;
        if (count === 0) return;

        const rowCounts =
            count <= 2
                ? [count]
                : [Math.ceil(count / 2), Math.floor(count / 2)];

        const rowHeight = bounds.size.height / rowCounts.length;

        let windowIndex = 0;
        rowCounts.forEach((columnsInRow, rowIndex) => {
            const columnWidth = bounds.size.width / columnsInRow;

            for (let column = 0; column < columnsInRow; column++) {
                const window = this.windows[windowIndex];
                windowIndex++;

                window.calculateLayout({
                    position: {
                        x: bounds.position.x + columnWidth * column,
                        y: bounds.position.y + rowHeight * rowIndex,
                    },
                    size: {
                        width: columnWidth,
                        height: rowHeight,
                    },
                });
            }
        });
    }

    /**
     * Grid cells are fixed-size by design (see class doc above) -
     * resizing is explicitly unsupported for this strategy.
     * @param {{position: {x: number, y: number}, size: {width: number, height: number}}} bounds - unused
     * @returns {Array<never>}
     */
    getResizeHandles(bounds) {
        return [];
    }

    /**
     * @param {unknown} handle - unused
     * @param {number} ratio - unused
     * @returns {boolean} always false
     */
    resizeHandle(handle, ratio) {
        return false;
    }
}
