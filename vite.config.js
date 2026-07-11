import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: '/beijing-weather-window/',
  build: {
    outDir: 'docs',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        map: resolve(import.meta.dirname, 'index.html'),
        list: resolve(import.meta.dirname, 'list.html'),
      },
    },
  },
  test: {
    environment: 'jsdom',
  },
});
