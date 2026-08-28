import { Renderer } from "@web_wm/tiling-windows";

/**
 * Reference tiling-windows integration for plain HTMLElements: refs are
 * elements, positioned with `position: absolute` + inline style, measured
 * with getBoundingClientRect/clientWidth/clientHeight, and reflowed on the
 * browser's native resize event.
 */
export class DomRenderer extends Renderer {
    /**
     * @param {HTMLElement} ref
     */
    getBounds(ref) {
        return ref.getBoundingClientRect();
    }

    /**
     * @param {HTMLElement} ref
     * @param {{position: {x: number, y: number}, size: {width: number, height: number}}} bounds
     */
    setBounds(ref, bounds) {
        ref.style.position = "absolute";
        ref.style.left = `${bounds.position.x}px`;
        ref.style.top = `${bounds.position.y}px`;
        ref.style.width = `${bounds.size.width}px`;
        ref.style.height = `${bounds.size.height}px`;
    }

    /**
     * @param {HTMLElement} ref
     */
    remove(ref) {
        if (ref.parentElement) ref.parentElement.removeChild(ref);
    }

    /**
     * @param {HTMLElement} workspaceRef
     */
    getWorkspaceBounds(workspaceRef) {
        return workspaceRef.getBoundingClientRect();
    }

    /**
     * @param {HTMLElement} workspaceRef
     */
    getWorkspaceSize(workspaceRef) {
        return {
            width: workspaceRef.clientWidth,
            height: workspaceRef.clientHeight,
        };
    }

    /**
     * @param {() => void} callback
     * @returns {() => void} unsubscribe
     */
    onResize(callback) {
        window.addEventListener("resize", callback);
        return () => window.removeEventListener("resize", callback);
    }
}
