import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const API_TARGET = process.env.VITE_API_URL || 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@/': `${path.resolve(__dirname, './src')}/`,
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-i18n': ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
          'vendor-icons': ['lucide-react'],
          'vendor-ui': ['sonner'],
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      // No rewrite here: storefront backend routes include the /api prefix
      // (/api/brand, /api/landing-ai-agent, /api/v1). This is intentional —
      // merchant-dashboard strips /api because its routes are at /auth, /merchant,
      // etc. Both are correct for their respective backend route trees.
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
      },
      '/s/': {
        target: API_TARGET,
        changeOrigin: true,
        bypass: (req) => {
          if (req.headers.accept?.includes('text/html')) {
            return '/index.html';
          }
        },
      },
      '/storage/': {
        target: API_TARGET,
        changeOrigin: true,
      },
      '/marketplace': {
        target: API_TARGET,
        changeOrigin: true,
        bypass: (req) => {
          if (req.headers.accept?.includes('text/html')) {
            return '/index.html';
          }
        },
      },
    },
  },
});
