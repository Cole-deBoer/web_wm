import { layout } from "./src/layout/layout.js";
import layoutHtml from "./src/layout/layout.html?raw";

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("app").innerHTML = layoutHtml;
    layout();
});
