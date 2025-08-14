// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/pbr-renderer/',
  
  // Configure build for GitHub Pages
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  },
  
  // Configure dev server
  server: {
    port: 3000,
    open: true
  },
  
  // Make sure .glsl files are treated as assets
  assetsInclude: ['**/*.glsl']
});