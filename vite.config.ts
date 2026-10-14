import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  build: { rollupOptions: { output: { manualChunks(id) {
    if (id.includes('/node_modules/three/build/three.core.js')) return 'three-core';
    if (id.includes('/node_modules/three/')) return 'three-renderer';
    if (id.includes('/node_modules/three-stdlib/')) return 'three-addons';
    if (/\/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react';
  } } } },
});
