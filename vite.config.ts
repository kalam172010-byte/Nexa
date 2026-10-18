import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

function removeRedirectsPlugin() {
  const clean = () => {
    const targets = [
      path.resolve(import.meta.dirname, 'public/_redirects'),
      path.resolve(import.meta.dirname, 'dist/_redirects'),
      path.resolve(import.meta.dirname, '_redirects'),
    ];
    for (const file of targets) {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      } catch {
        // ignore
      }
    }
  };
  return {
    name: 'remove-redirects',
    buildStart() {
      clean();
    },
    closeBundle() {
      clean();
      try {
        const indexPath = path.resolve(import.meta.dirname, 'dist/index.html');
        const fallback200 = path.resolve(import.meta.dirname, 'dist/200.html');
        if (fs.existsSync(indexPath) && !fs.existsSync(fallback200)) {
          fs.copyFileSync(indexPath, fallback200);
        }
      } catch {
        // ignore
      }
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), removeRedirectsPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
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
