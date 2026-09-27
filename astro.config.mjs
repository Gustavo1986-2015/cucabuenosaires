// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://cucabuenosaires.pages.dev',
  build: { inlineStylesheets: 'auto' },
  vite: { build: { chunkSizeWarningLimit: 700 } },
});
