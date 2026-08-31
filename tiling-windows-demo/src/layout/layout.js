import { WindowManager, BspStrategy, SplitDirection } from "tiling-windows";
import { DomRenderer } from "tiling-windows-dom";
import {
    createStatTile,
    createBarChartPanel,
    createStatusPanel,
    createMeterPanel,
} from "./dashboardPanels.js";
import { setupResizeHandles } from "./resizeHandles.js";

export const layout = () => {
    document.title = "tiling-windows - layout demo";

    const workspaceElement = document.getElementById("layout");

    // Swap the trailing `new BspStrategy()` for `new ColumnsStrategy()` or
    // `new GridStrategy()` to try the other layouts. GridStrategy caps at
    // 4 windows - the last 2 dashboard panels below will be rejected and
    // never appear, by design.
    const windowManager = new WindowManager(
        workspaceElement,
        new DomRenderer(),
        new BspStrategy(),
    );
    const windowElements = new Map();

    windowManager.onActiveWindowChange((windowId, previousWindowId) => {
        const previousElement = windowElements.get(previousWindowId);
        if (previousElement) delete previousElement.dataset.active;

        const activeElement = windowElements.get(windowId);
        if (activeElement) activeElement.dataset.active = "true";
    });

    setupResizeHandles(windowManager);

    createDashboardWindow(
        windowManager,
        windowElements,
        createStatTile({
            label: "Revenue",
            value: "$482K",
            delta: {
                text: "+12.4% vs last month",
                direction: "up",
                isGood: true,
            },
            trend: [38, 41, 40, 44, 47, 45, 50, 54, 52, 58, 62],
        }),
    );
    createDashboardWindow(
        windowManager,
        windowElements,
        createStatTile({
            label: "Active users",
            value: "12.9K",
            delta: {
                text: "-3.1% vs last week",
                direction: "down",
                isGood: false,
            },
            trend: [72, 74, 70, 71, 68, 66, 67, 64, 63, 60, 59, 58],
        }),
        SplitDirection.Vertical,
    );
    createDashboardWindow(
        windowManager,
        windowElements,
        createBarChartPanel({
            label: "Weekly signups",
            headline: "128 this week",
            values: [12, 18, 9, 22, 30, 25, 34],
            dayLabels: ["M", "T", "W", "T", "F", "S", "S"],
        }),
        SplitDirection.Horizontal,
    );
    createDashboardWindow(
        windowManager,
        windowElements,
        createStatusPanel({
            label: "System status",
            services: [
                { name: "API", status: "operational" },
                { name: "Database", status: "operational" },
                { name: "Cache", status: "degraded" },
                { name: "CDN", status: "operational" },
            ],
        }),
        SplitDirection.Vertical,
    );
    createDashboardWindow(
        windowManager,
        windowElements,
        createMeterPanel({
            label: "Goal progress",
            percent: 72,
            caption: "$720K of $1M quarterly target",
        }),
        SplitDirection.Horizontal,
    );
};

/**
 * @param {WindowManager} windowManager
 * @param {Map<number, HTMLElement>} windowElements
 * @param {HTMLElement} element
 * @param {import("./splitDirection.js").SplitDirectionValue} [splitDirection]
 */
const createDashboardWindow = (
    windowManager,
    windowElements,
    element,
    splitDirection,
) => {
    element.classList.add("window");
    windowManager.workspaceRef.appendChild(element);
    const window = windowManager.createWindow(element);

    const added = windowManager.addWindow(window, splitDirection);
    if (!added) {
        element.remove();
        return;
    }

    windowElements.set(window.id, element);
    testWindowEvents(windowManager, window);
};
/**
 * @param {WindowManager} windowManager
 * @param {Window} window
 */
const testWindowEvents = (windowManager, window) => {
    const dragOffset = {
        x: 0,
        y: 0,
    };
    const workspace = windowManager.workspaceRef;

    const onPointerMove = (event) => {
        if (!window.isDragging) return;

        const workspaceBounds = workspace.getBoundingClientRect();
        window.ref.style.left = `${event.clientX - workspaceBounds.left - dragOffset.x}px`;
        window.ref.style.top = `${event.clientY - workspaceBounds.top - dragOffset.y}px`;
    };

    const onPointerUp = (event) => {
        if (!window.isDragging) return;

        window.ref.style.opacity = 1;
        window.ref.style.zIndex = "";
        window.ref.classList.add("transition-all");

        const workspaceBounds = workspace.getBoundingClientRect();

        windowManager.endDrag(
            window,
            {
                x: event.clientX - workspaceBounds.left,
                y: event.clientY - workspaceBounds.top,
            },
            SplitDirection.Vertical,
        );
    };

    window.ref.addEventListener("pointerdown", (event) => {
        if (event.button === 2) {
            windowManager.removeWindow(window.id, true);
            workspace.removeEventListener("pointermove", onPointerMove);
            workspace.removeEventListener("pointerup", onPointerUp);
            return;
        }

        const windowBounds = window.ref.getBoundingClientRect();
        const xOffset = event.clientX - windowBounds.left;
        const yOffset = event.clientY - windowBounds.top;

        dragOffset.x = xOffset;
        dragOffset.y = yOffset;

        window.ref.style.opacity = 0.5;
        window.ref.style.zIndex = 1000;
        window.ref.classList.remove("transition-all");

        windowManager.beginDrag(window);
    });

    workspace.addEventListener("pointermove", onPointerMove);
    workspace.addEventListener("pointerup", onPointerUp);
    workspace.addEventListener("contextmenu", (event) => {
        event.preventDefault();
    });
};
