/**
 * Minimum share of a divider's two adjacent regions that either side may
 * be resized down to - prevents a pane collapsing to ~0 size. Exported so
 * consumers can size their own "can't drag further" affordance to match.
 * @type {number}
 */
export const MIN_RESIZE_RATIO = 0.05;

/**
 * Clamps a resize ratio into [MIN_RESIZE_RATIO, 1 - MIN_RESIZE_RATIO].
 * Shared by every strategy's resizeHandle so the collapse guarantee is
 * uniform regardless of how a strategy stores its layout. Non-finite
 * input (e.g. NaN from a bad gesture computation) clamps to the nearest
 * bound rather than propagating NaN into layout state.
 * @param {number} ratio
 * @returns {number}
 */
export function clampResizeRatio(ratio) {
    if (!Number.isFinite(ratio)) return MIN_RESIZE_RATIO;
    return Math.min(Math.max(ratio, MIN_RESIZE_RATIO), 1 - MIN_RESIZE_RATIO);
}

/**
 * Fixed thickness (px) of the divider rect reported by getResizeHandles.
 * Not derived from any Window's margin - a divider's rect is purely a
 * hit-test/rendering affordance the consumer paints; it never feeds back
 * into actual window bounds, so pixel-perfect margin alignment isn't
 * worth the added coupling to Window.margin lookups. Internal only (not
 * part of the public index.js barrel).
 * @type {number}
 */
export const RESIZE_HANDLE_THICKNESS = 8;
