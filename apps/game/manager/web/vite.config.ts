import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  root: import.meta.dirname,
  plugins: [react()],
  clearScreen: false,
  envPrefix: ['VITE_', 'TAURI_ENV_'],
  resolve: {
    alias: {
      '@contract': resolve(import.meta.dirname, '../tauri/contract'),
      '@': resolve(import.meta.dirname, 'src')
    }
  },
  server: {
    port: 1420,
    strictPort: true,
    watch: { ignored: ['**/tauri/**'] }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'chrome110',
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1024
  }
});
