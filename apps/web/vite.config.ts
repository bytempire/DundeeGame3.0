import { defineConfig } from "vite";

export default defineConfig({
  // Project site: https://bytempire.github.io/DundeeGame3.0/
  base: "/DundeeGame3.0/",
  server: {
    port: 5173,
    host: true,
    allowedHosts: true,
  },
  preview: {
    allowedHosts: true,
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
  },
});
