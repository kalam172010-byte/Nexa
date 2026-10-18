import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

/**
 * Cloudflare SPA Routing Plugin:
 * Cloudflare Workers / Pages natively routes all unmatched paths to `index.html`
 * when configured with `not_found_handling: "single-page-application"`.
 *
 * This plugin strips out any legacy `_redirects` or secondary HTML files (e.g. 200.html)
 * that would otherwise cause infinite redirect loops [code: 100324] in Cloudflare's asset router.
 */
function cloudflareSpaPlugin(): Plugin {
  const purgeDistRedirects = () => {
    const distRedirects = path.resolve(import.meta.dirname, 'dist/_redirects');
    try {
      if (fs.existsSync(distRedirects)) {
        fs.unlinkSync(distRedirects);
      }
    } catch {
      // Safe ignore
    }
  };

  const purgeAllConflictingFiles = () => {
    const conflictingFiles = [
      path.resolve(import.meta.dirname, 'dist/_redirects'),
      path.resolve(import.meta.dirname, 'public/_redirects'),
      path.resolve(import.meta.dirname, '_redirects'),
      path.resolve(import.meta.dirname, 'dist/200.html'),
      path.resolve(import.meta.dirname, 'public/200.html'),
    ];

    for (const file of conflictingFiles) {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      } catch {
        // Safe ignore
      }
    }
  };

  return {
    name: 'cloudflare-spa-cleaner',
    buildStart() {
      purgeAllConflictingFiles();
    },
    writeBundle() {
      // Explicitly delete any _redirects file written to dist
      purgeDistRedirects();
    },
    closeBundle() {
      // Explicitly delete any _redirects file upon build completion
      purgeDistRedirects();
      purgeAllConflictingFiles();
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), cloudflareSpaPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
      sourcemap: false,
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
