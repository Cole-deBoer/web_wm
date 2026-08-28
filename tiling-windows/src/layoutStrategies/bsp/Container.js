import { Structure } from "../../dataStructures.js";
import { assert } from "../../assert.js";
import { SplitDirection } from "../../splitDirection.js";

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
     * @param {{position: {x: number, y: number}, size: {width: number, height: number}}} bounds - The bounds of the structure
     */
    calculateLayout(bounds) {
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
            if (this.firstChild) {
                this.firstChild.calculateLayout(firstChildBounds);
            }

            if (this.secondChild) {
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
                this.secondChild.calculateLayout(secondChildBounds);
            }
        } else {
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
            if (this.firstChild) {
                this.firstChild.calculateLayout(firstChildBounds);
            }

            if (this.secondChild) {
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
                this.secondChild.calculateLayout(secondChildBounds);
            }
        }
    }
}
