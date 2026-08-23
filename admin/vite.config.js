export default {
  server: { port: 5174, proxy: { '/api': { target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:5000', changeOrigin: true } } },
  build: { outDir: 'dist', emptyOutDir: false },
};
