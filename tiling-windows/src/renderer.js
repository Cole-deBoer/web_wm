/**
 * Platform boundary between the layout engine and whatever actually
 * draws windows (a real DOM, a React tree, a game canvas, ...). Core
 * never touches a window's `ref` directly - it always goes through a
 * Renderer, so the same tree math works under any integration that
 * implements this contract.
 */
export class Renderer {
    /**
     * @param {unknown} ref
     * @returns {{left: number, top: number, right: number, bottom: number, width: number, height: number}}
     */
    getBounds(ref) {
        throw new Error("Not implemented");
    }

    /**
     * @param {unknown} ref
     * @param {{position: {x: number, y: number}, size: {width: number, height: number}}} bounds - already margin-adjusted
     */
    setBounds(ref, bounds) {
        throw new Error("Not implemented");
    }

    /**
     * Detaches a window's ref entirely.
     * @param {unknown} ref
     */
    remove(ref) {
        throw new Error("Not implemented");
    }

    /**
     * @param {unknown} workspaceRef
     * @returns {{left: number, top: number, right: number, bottom: number, width: number, height: number}}
     */
    getWorkspaceBounds(workspaceRef) {
        throw new Error("Not implemented");
    }

    /**
     * @param {unknown} workspaceRef
     * @returns {{width: number, height: number}}
     */
    getWorkspaceSize(workspaceRef) {
        throw new Error("Not implemented");
    }

    /**
     * @param {() => void} callback
     * @returns {() => void} unsubscribe
     */
    onResize(callback) {
        throw new Error("Not implemented");
    }
}
