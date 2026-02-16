import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vite.dev/config/
export default defineConfig({
  server: { host: '0.0.0.0', port: 8080, allowedHosts: true },
  plugins: [
    react(),
    dts({ tsconfigPath: './tsconfig-build.json' }),
    tsconfigPaths(),
  ],
  publicDir: 'demo/public',
  build: {
    lib: {
      entry: 'lib/main.ts',
      formats: ['es'],
    },
    copyPublicDir: false,
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
        assetFileNames: 'assets/[name][extname]',
        entryFileNames: '[name].js',
      },
    },
  },
});
