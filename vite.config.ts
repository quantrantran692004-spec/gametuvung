import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null,
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,ico,json}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [{
          urlPattern: ({ request }) => request.destination === 'image' || request.destination === 'audio',
          handler: 'CacheFirst',
          options: { cacheName: 'game-media', expiration: { maxEntries: 80, maxAgeSeconds: 30 * 24 * 60 * 60 } },
        }],
      },
    }),
  ],
  resolve: { dedupe: ['react', 'react-dom'] },
  optimizeDeps: { include: ['react', 'react-dom/client', 'motion/react'] },
  build: { outDir: 'dist', emptyOutDir: true },
  server: { host: '127.0.0.1' },
});
