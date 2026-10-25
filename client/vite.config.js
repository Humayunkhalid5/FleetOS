import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import process from 'node:process'

// Public pages that belong in the sitemap. Signed-in routes are excluded on
// purpose — they are also disallowed in public/robots.txt.
const SEO_ROUTES = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/company/register', changefreq: 'monthly', priority: '0.9' },
  { path: '/about', changefreq: 'monthly', priority: '0.7' },
  { path: '/contact', changefreq: 'monthly', priority: '0.7' },
  { path: '/register', changefreq: 'monthly', priority: '0.6' },
  { path: '/login', changefreq: 'yearly', priority: '0.4' },
];

// Emit /sitemap.xml for the public pages. Search engines need absolute URLs,
// so this only writes a file when the deploy origin is known:
//
//   VITE_SITE_URL=https://your-domain.tld npm run build
function sitemapPlugin() {
  return {
    name: 'fleetos-sitemap',
    apply: 'build',
    generateBundle() {
      const base = String(process.env.VITE_SITE_URL || '').trim().replace(/\/+$/, '');
      if (!base) {
        this.warn('VITE_SITE_URL is not set — skipping sitemap.xml (set it to your public origin).');
        return;
      }
      const urls = SEO_ROUTES.map(({ path, changefreq, priority }) => [
        '  <url>',
        `    <loc>${base}${path}</loc>`,
        `    <changefreq>${changefreq}</changefreq>`,
        `    <priority>${priority}</priority>`,
        '  </url>',
      ].join('\n')).join('\n');
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
      });
    },
    closeBundle() {
      const distDir = fileURLToPath(new URL('./dist', import.meta.url));
      const base = String(process.env.VITE_SITE_URL || '').trim().replace(/\/+$/, '');

      // public/robots.txt is copied as-is; point it at the sitemap once the
      // deploy origin is known.
      if (base) {
        try {
          const file = `${distDir}/robots.txt`;
          const text = readFileSync(file, 'utf8');
          if (!text.includes('Sitemap:')) writeFileSync(file, `${text.trimEnd()}\n\nSitemap: ${base}/sitemap.xml\n`);
        } catch {
          // No built robots.txt (unexpected): the sitemap file is still emitted.
        }
      }

      // Two head tags can only be written once the bundle exists: the icon
      // font preload (hashed name) and, when the origin is known, the
      // canonical link and absolute social URLs.
      try {
        const file = `${distDir}/index.html`;
        let html = readFileSync(file, 'utf8');
        const assets = readdirSync(`${distDir}/assets`);
        const font = assets.find((name) => name.startsWith('material-symbols-outlined') && name.endsWith('.woff2'));
        if (font && !html.includes('rel="preload" as="font"')) {
          html = html.replace('</head>', `  <link rel="preload" as="font" type="font/woff2" href="/assets/${font}" crossorigin />\n  </head>`);
        }
        if (base) {
          const image = `${base}/og-image.png`;
          // Replace the relative social image rather than appending a second
          // tag: crawlers read the first one they find.
          html = html
            .replace(/(<meta property="og:image" content=")\/og-image\.png(")/, `$1${image}$2`)
            .replace(/(<meta name="twitter:image" content=")\/og-image\.png(")/, `$1${image}$2`)
            .replace('</head>', `    <link rel="canonical" href="${base}/" />\n    <meta property="og:url" content="${base}/" />\n  </head>`);
        }
        writeFileSync(file, html);
      } catch {
        // Asset directory missing: nothing to inject.
      }
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), sitemapPlugin()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('framer-motion') || id.includes('/motion')) {
              return 'motion-vendor';
            }
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router') || id.includes('scheduler')) {
              return 'react-vendor';
            }
            if (id.includes('node_modules/three')) {
              return 'three-vendor';
            }
            if (id.includes('socket.io') || id.includes('engine.io')) {
              return 'realtime-vendor';
            }
            if (id.includes('leaflet')) {
              return 'map-vendor';
            }
            return 'vendor';
          }
        },
      },
    },
  },
  resolve: {
    alias: {
      '@constants': fileURLToPath(new URL('./src/constants/index.js', import.meta.url)),
      '@utils': fileURLToPath(new URL('./src/utils/helpers.js', import.meta.url)),
      '@context': fileURLToPath(new URL('./src/context/AppContext.jsx', import.meta.url)),
      '@hooks': fileURLToPath(new URL('./src/hooks/useAuth.js', import.meta.url)),
      '@services': fileURLToPath(new URL('./src/services/api.js', import.meta.url)),
    },
  },
  // `vite preview` mirrors the dev proxy so a production build can be checked
  // against the local API without editing the config.
  preview: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:5000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:5000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:5000',
        changeOrigin: true,
      },
      // Live updates share the page origin, so no extra CORS or port config.
      '/socket.io': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:5000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
