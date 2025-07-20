// vite.config.prod.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/RotasApi/',
  publicDir: 'public',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      filename: 'firebase-messaging-sw.js', 
      srcDir: 'public',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'robots.txt', 'logo192.png'], // ✅ fundo.png não incluso
      manifest: {
        name: 'TechRoutes',
        short_name: 'TechRoutes',
        description: 'TechRoutes Mybusiness',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'logo192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'logo512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,json,ico,webmanifest}'], // ✅ fundo.png ignorado
        // OU use isso se quiser manter .png mas evitar fundo grande
        // globIgnores: ['**/fundo.png'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/rotasapi-dfed\.onrender\.com\/.*$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 3600
              }
            }
          }
        ]
      }
    })
  ]
});
