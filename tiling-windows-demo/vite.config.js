// vite.config.js
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
    base: process.env.DEMO_BASE_PATH || "/",
    plugins: [tailwindcss()],
});
