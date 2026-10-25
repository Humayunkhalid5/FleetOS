const target = process.env.VITE_API_PROXY_TARGET || 'http://localhost:5000';

export default {
  server: {
    port: 5174,
    // Fonts and the socket client are shared from ../client.
    fs: { allow: ['..'] },
    proxy: {
      '/api': { target, changeOrigin: true },
      // Live updates share the console origin.
      '/socket.io': { target, changeOrigin: true, ws: true },
    },
  },
  // Pre-bundle every React entry up front. `react-dom` is only imported from
  // ui.jsx, and discovering it late left the dev server in a reload loop.
  optimizeDeps: { include: ['react', 'react-dom', 'react-dom/client', 'react/jsx-dev-runtime'] },
  // Replace old hashed bundles so deployments never retain stale assets.
  build: { outDir: 'dist', emptyOutDir: true },
};
