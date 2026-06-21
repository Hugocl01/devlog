// @ts-check

// ═══════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE ASTRO
//
// Documentación oficial: https://docs.astro.build/en/reference/configuration-reference/
//
// Modelo de renderizado SSR completo:
//   - Por defecto todas las páginas se renderizan en el servidor (SSR).
//   - Las rutas que añaden `export const prerender = true` se pre-renderizan
//     en build como HTML estático.
// ═══════════════════════════════════════════════════════════════

import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';

export default defineConfig({
  // URL canónica del sitio. Se usa para generar enlaces absolutos en el RSS,
  // el sitemap y las meta tags de Open Graph.
  // Lee SITE_URL del .env en tiempo de build. En el VPS, asegúrate de que
  // el .env tenga SITE_URL=https://tudominio.com antes de ejecutar npm run build.
  site: process.env.SITE_URL ?? "http://localhost:4321",

  // "server" hace que todas las rutas sean SSR por defecto.
  // y solo se renderizan en servidor las que declaran `prerender = false`.
  // Otras opciones: "server" (todo SSR) | "static" (todo estático, sin SSR).
  output: "server",

  // Adaptador Node.js en modo standalone:
  // Genera dist/server/entry.mjs, un servidor HTTP independiente que
  // PM2 arranca con `node ./dist/server/entry.mjs`.
  // Otros adaptadores disponibles: @astrojs/vercel, @astrojs/netlify, etc.
  adapter: node({
    mode: "standalone",
  }),

  // Prefetch de páginas al pasar el cursor por encima de los enlaces.
  // Mejora la percepción de velocidad sin coste visible para el usuario.
  prefetch: true,

  vite: {
    plugins: [
      // Plugin oficial de Tailwind CSS v4 para Vite.
      // Tailwind v4 no usa tailwind.config.js; la configuración va en
      // src/styles/global.css mediante directivas @theme y @layer.
      tailwindcss(),
    ],
  },

  integrations: [
    // Soporte de React para los componentes interactivos (islands).
    // Solo los componentes con directiva client:* se hidratan en el navegador.
    react(),
  ],

  markdown: {
    shikiConfig: {
      // Tema de resaltado de sintaxis para los bloques de código en Markdown.
      // Ver temas disponibles: https://shiki.style/themes
      theme: "github-dark",

      // Ajuste de línea automático en bloques de código largos.
      wrap: true,
    },
  },
});
