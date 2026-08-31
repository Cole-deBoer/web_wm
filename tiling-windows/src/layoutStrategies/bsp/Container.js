import { Structure } from "../../dataStructures.js";
import { assert } from "../../assert.js";
import { SplitDirection } from "../../splitDirection.js";
import { RESIZE_HANDLE_THICKNESS } from "../../resize.js";

export class Container extends Structure {
    /**
     * @param {Structure} parent - The parent of the container
     * @param {import("../../splitDirection.js").SplitDirectionValue} splitDirection
     * @param {number} ratio - The ratio of the container to the parent. 0 <= ratio <= 1
     * @param {Structure} firstChild - The first child of the container
     * @param {Structure} secondChild - The second child of the container
     */
    constructor(parent, splitDirection, ratio, firstChild, secondChild) {
        super(parent);
        this.splitDirection = splitDirection;
        this.ratio = ratio;
        this.firstChild = firstChild;
        this.secondChild = secondChild;

        assert(ratio >= 0 && ratio <= 1, "Ratio must be between 0 and 1");
        assert(
            splitDirection === SplitDirection.Horizontal ||
                splitDirection === SplitDirection.Vertical,
            "Split direction must be either Horizontal or Vertical",
        );

        if (this.firstChild) {
            assert(
                this.firstChild instanceof Structure,
                "First child must be an instance of Structure if it is not null",
            );
            this.firstChild.parent = this;
        }
        if (this.secondChild) {
            assert(
                this.secondChild instanceof Structure,
                "Second child must be an instance of Structure if it is not null",
            );

            this.secondChild.parent = this;
        }
    }

    /**
     * Pure split geometry: divides `bounds` into this container's two
     * child regions per splitDirection/ratio, without touching the tree.
     * Shared by calculateLayout (which recurses into the children) and
     * collectResizeHandles (which needs the same two rects without
     * recursing) so there is exactly one place this math is written.
     * @param {{position: {x: number, y: number}, size: {width: number, height: number}}} bounds - The bounds of the structure
     * @returns {{firstChildBounds: {position: {x: number, y: number}, size: {width: number, height: number}}, secondChildBounds: {position: {x: number, y: number}, size: {width: number, height: number}}}}
     */
    splitBounds(bounds) {
        if (this.splitDirection === SplitDirection.Horizontal) {
            const firstChildBounds = {
                position: {
                    x: bounds.position.x,
                    y: bounds.position.y,
                },
                size: {
                    width: bounds.size.width,
                    height: bounds.size.height * this.ratio,
                },
            };
            const secondChildBounds = {
                position: {
                    x: bounds.position.x,
                    y: bounds.position.y + firstChildBounds.size.height,
                },
                size: {
                    width: bounds.size.width,
                    height: bounds.size.height * (1 - this.ratio),
                },
            };
            return { firstChildBounds, secondChildBounds };
        }

        const firstChildBounds = {
            position: {
                x: bounds.position.x,
                y: bounds.position.y,
            },
            size: {
                width: bounds.size.width * this.ratio,
                height: bounds.size.height,
            },
        };
        const secondChildBounds = {
            position: {
                x: bounds.position.x + firstChildBounds.size.width,
                y: bounds.position.y,
            },
            size: {
                width: bounds.size.width * (1 - this.ratio),
                height: bounds.size.height,
            },
        };
        return { firstChildBounds, secondChildBounds };
    }

    /**
     * @param {{position: {x: number, y: number}, size: {width: number, height: number}}} bounds - The bounds of the structure
     */
    calculateLayout(bounds) {
        const { firstChildBounds, secondChildBounds } =
            this.splitBounds(bounds);

        if (this.firstChild) {
            this.firstChild.calculateLayout(firstChildBounds);
        }

        if (this.secondChild) {
            this.secondChild.calculateLayout(secondChildBounds);
        }
    }

    /**
     * @param {{position: {x: number, y: number}, size: {width: number, height: number}}} bounds - The bounds of the structure
     * @returns {Array<{handle: unknown, bounds: {position: {x: number, y: number}, size: {width: number, height: number}}, splitDirection: import("../../splitDirection.js").SplitDirectionValue, firstBounds: {position: {x: number, y: number}, size: {width: number, height: number}}, secondBounds: {position: {x: number, y: number}, size: {width: number, height: number}}}>}
     */
    collectResizeHandles(bounds) {
        const { firstChildBounds, secondChildBounds } =
            this.splitBounds(bounds);
        const isHorizontal = this.splitDirection === SplitDirection.Horizontal;

        const ownHandle = {
            handle: this,
            bounds: isHorizontal
                ? {
                      position: {
                          x: bounds.position.x,
                          y:
                              bounds.position.y +
                              firstChildBounds.size.height -
                              RESIZE_HANDLE_THICKNESS / 2,
                      },
                      size: {
                          width: bounds.size.width,
                          height: RESIZE_HANDLE_THICKNESS,
                      },
                  }
                : {
                      position: {
                          x:
                              bounds.position.x +
                              firstChildBounds.size.width -
                              RESIZE_HANDLE_THICKNESS / 2,
                          y: bounds.position.y,
                      },
                      size: {
                          width: RESIZE_HANDLE_THICKNESS,
                          height: bounds.size.height,
                      },
                  },
            splitDirection: this.splitDirection,
            firstBounds: firstChildBounds,
            secondBounds: secondChildBounds,
        };

        const firstHandles = this.firstChild
            ? this.firstChild.collectResizeHandles(firstChildBounds)
            : [];
        const secondHandles = this.secondChild
            ? this.secondChild.collectResizeHandles(secondChildBounds)
            : [];

        return [ownHandle, ...firstHandles, ...secondHandles];
    }
}
