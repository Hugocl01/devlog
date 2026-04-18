// @ts-check

import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

import pagefind from 'astro-pagefind';

// https://astro.build/config
export default defineConfig({
  site: "https://hugocl01-devlog.netlify.app/",
  prefetch: true,
  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [react(), sitemap(), pagefind()],
  markdown: {
    shikiConfig: {
      theme: "github-dark",
      wrap: true,
    }
  }
});