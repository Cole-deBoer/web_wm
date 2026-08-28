import { layout } from "./src/layout/layout.js";
import layoutHtml from "./src/layout/layout.html?raw";
import { home } from "./src/home/home.js";
import homeHtml from "./src/home/home.html?raw";

// Hash-based routing: the route lives entirely in `location.hash`, which the
// browser never sends to the server. That keeps this working on GitHub Pages
// (or any static host) with no server-side rewrite rules, regardless of the
// base path the site is served under.
const routes = {
    "": { html: homeHtml, mount: home },
    demo: { html: layoutHtml, mount: layout },
};

const normalizeHash = (hash) => hash.replace(/^#\/?/, "");

const render = () => {
    const route = routes[normalizeHash(window.location.hash)] ?? routes[""];
    document.getElementById("app").innerHTML = route.html;
    route.mount();
    window.scrollTo(0, 0);
};

window.addEventListener("hashchange", render);
document.addEventListener("DOMContentLoaded", render);
