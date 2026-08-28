const SVG_NS = "http://www.w3.org/2000/svg";

function createPanelShell() {
    const panel = document.createElement("div");
    panel.className =
        "w-full h-full bg-bg-accent text-text-dark rounded-md ease-in-out border-2 border-transparent data-[active=true]:border-outline-accent overflow-hidden flex flex-col gap-3 p-4";
    return panel;
}

function createEyebrow(text) {
    const el = document.createElement("span");
    el.className =
        "text-xs font-semibold uppercase tracking-wide text-text-dark/60";
    el.textContent = text;
    return el;
}

/**
 * A 12-point trend line: history in the de-emphasis hue, the latest
 * point called out in the accent.
 */
function createSparklineSvg(values, { width = 120, height = 40 } = {}) {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", String(height));
    svg.setAttribute("preserveAspectRatio", "none");

    const paddingX = 4;
    const paddingY = 6;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const points = values.map((value, index) => ({
        x: paddingX + (index / (values.length - 1)) * (width - paddingX * 2),
        y:
            height -
            paddingY -
            ((value - min) / range) * (height - paddingY * 2),
    }));

    const linePath = points
        .map(
            (p, i) =>
                `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`,
        )
        .join(" ");

    const area = document.createElementNS(SVG_NS, "path");
    const last = points[points.length - 1];
    const first = points[0];
    area.setAttribute(
        "d",
        `${linePath} L${last.x.toFixed(1)},${height} L${first.x.toFixed(1)},${height} Z`,
    );
    area.style.fill = "var(--color-bg-secondary)";
    area.style.opacity = "0.1";
    svg.appendChild(area);

    const line = document.createElementNS(SVG_NS, "path");
    line.setAttribute("d", linePath);
    line.style.fill = "none";
    line.style.stroke = "var(--color-bg-secondary)";
    line.setAttribute("stroke-width", "2");
    line.setAttribute("stroke-linecap", "round");
    line.setAttribute("stroke-linejoin", "round");
    svg.appendChild(line);

    const ring = document.createElementNS(SVG_NS, "circle");
    ring.setAttribute("cx", String(last.x));
    ring.setAttribute("cy", String(last.y));
    ring.setAttribute("r", "6");
    ring.style.fill = "var(--color-bg-accent)";
    svg.appendChild(ring);

    const dot = document.createElementNS(SVG_NS, "circle");
    dot.setAttribute("cx", String(last.x));
    dot.setAttribute("cy", String(last.y));
    dot.setAttribute("r", "4");
    dot.style.fill = "var(--color-text-accent)";
    svg.appendChild(dot);

    return svg;
}

/**
 * @param {{label: string, value: string, delta?: {text: string, direction: "up"|"down", isGood: boolean}, trend?: number[]}} config
 */
export function createStatTile({ label, value, delta, trend }) {
    const panel = createPanelShell();
    panel.appendChild(createEyebrow(label));

    const valueEl = document.createElement("span");
    valueEl.className = "text-3xl font-semibold";
    valueEl.textContent = value;
    panel.appendChild(valueEl);

    if (delta) {
        const deltaEl = document.createElement("span");
        const colorClass = delta.isGood
            ? "text-status-success"
            : "text-status-error";
        deltaEl.className = `text-xs font-medium flex items-center gap-1 ${colorClass}`;
        const arrow = delta.direction === "up" ? "▲" : "▼";
        deltaEl.textContent = `${arrow} ${delta.text}`;
        panel.appendChild(deltaEl);
    }

    if (trend) {
        const trendWrap = document.createElement("div");
        trendWrap.className = "mt-auto";
        trendWrap.appendChild(createSparklineSvg(trend));
        panel.appendChild(trendWrap);
    }

    return panel;
}

/**
 * @param {{label: string, headline?: string, values: number[], dayLabels?: string[]}} config
 */
export function createBarChartPanel({ label, headline, values, dayLabels }) {
    const panel = createPanelShell();
    panel.appendChild(createEyebrow(label));

    if (headline) {
        const headlineEl = document.createElement("span");
        headlineEl.className = "text-2xl font-semibold";
        headlineEl.textContent = headline;
        panel.appendChild(headlineEl);
    }

    const max = Math.max(...values);
    const chart = document.createElement("div");
    chart.className =
        "mt-auto flex items-end gap-[2px] h-16 border-b border-bg-secondary/40";

    for (const value of values) {
        const bar = document.createElement("div");
        const pct = Math.max((value / max) * 100, 4);
        bar.className = "flex-1 rounded-t-[4px] bg-text-accent";
        bar.style.height = `${pct}%`;
        chart.appendChild(bar);
    }

    panel.appendChild(chart);

    if (dayLabels) {
        const labelsRow = document.createElement("div");
        labelsRow.className = "flex gap-[2px] text-[10px] text-text-dark/50";
        for (const dayLabel of dayLabels) {
            const labelEl = document.createElement("span");
            labelEl.className = "flex-1 text-center";
            labelEl.textContent = dayLabel;
            labelsRow.appendChild(labelEl);
        }
        panel.appendChild(labelsRow);
    }

    return panel;
}

const STATUS_STYLES = {
    operational: { dot: "bg-status-success", text: "Operational" },
    degraded: { dot: "bg-status-warning", text: "Degraded" },
    down: { dot: "bg-status-error", text: "Down" },
};

/**
 * @param {{label: string, services: {name: string, status: "operational"|"degraded"|"down"}[]}} config
 */
export function createStatusPanel({ label, services }) {
    const panel = createPanelShell();
    panel.appendChild(createEyebrow(label));

    const list = document.createElement("div");
    list.className = "flex flex-col gap-2.5 mt-1";

    for (const { name, status } of services) {
        const { dot: dotClass, text: statusText } = STATUS_STYLES[status];

        const row = document.createElement("div");
        row.className = "flex items-center gap-2 text-sm";

        const dot = document.createElement("span");
        dot.className = `w-2 h-2 rounded-full shrink-0 ${dotClass}`;

        const nameEl = document.createElement("span");
        nameEl.className = "font-medium";
        nameEl.textContent = name;

        const statusEl = document.createElement("span");
        statusEl.className = "ml-auto text-xs text-text-dark/60";
        statusEl.textContent = statusText;

        row.append(dot, nameEl, statusEl);
        list.appendChild(row);
    }

    panel.appendChild(list);
    return panel;
}

/**
 * @param {{label: string, entries: {time: string, text: string}[]}} config
 */
export function createActivityFeedPanel({ label, entries }) {
    const panel = createPanelShell();
    panel.appendChild(createEyebrow(label));

    const list = document.createElement("div");
    list.className = "flex flex-col gap-2 overflow-auto text-sm";

    for (const { time, text } of entries) {
        const row = document.createElement("div");
        row.className = "flex gap-2";

        const timeEl = document.createElement("span");
        timeEl.className = "text-text-dark/50 shrink-0 tabular-nums";
        timeEl.textContent = time;

        const textEl = document.createElement("span");
        textEl.textContent = text;

        row.append(timeEl, textEl);
        list.appendChild(row);
    }

    panel.appendChild(list);
    return panel;
}

/**
 * @param {{label: string, percent: number, caption?: string}} config
 */
export function createMeterPanel({ label, percent, caption }) {
    const panel = createPanelShell();
    panel.appendChild(createEyebrow(label));

    const valueEl = document.createElement("span");
    valueEl.className = "text-3xl font-semibold";
    valueEl.textContent = `${percent}%`;
    panel.appendChild(valueEl);

    const track = document.createElement("div");
    track.className =
        "w-full h-2 rounded-full bg-text-accent/20 overflow-hidden mt-auto";

    const fill = document.createElement("div");
    fill.className = "h-full rounded-full bg-text-accent";
    fill.style.width = `${percent}%`;
    track.appendChild(fill);
    panel.appendChild(track);

    if (caption) {
        const captionEl = document.createElement("span");
        captionEl.className = "text-xs text-text-dark/60";
        captionEl.textContent = caption;
        panel.appendChild(captionEl);
    }

    return panel;
}
