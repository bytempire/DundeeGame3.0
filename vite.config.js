import { defineConfig } from 'vite';

export default defineConfig({
  base: '/DundeeGame3.0/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  server: {
    host: true,
    port: 5173,
  },
});
