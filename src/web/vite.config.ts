import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import checker from 'vite-plugin-checker';
import tsconfigPaths from 'vite-tsconfig-paths';
import type { ConfigEnv, UserConfig } from 'vite';

// @vitejs/plugin-react@4.0.0
// vite@4.4.0
// vite-plugin-checker@0.6.0
// vite-tsconfig-paths@4.2.0

export default defineConfig(({ mode }: ConfigEnv): UserConfig => {
  const isDevelopment = mode === 'development';

  return {
    server: {
      port: 3000,
      host: true,
      open: true,
      cors: true,
      proxy: {
        // API proxy configuration
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
        // WebSocket proxy for real-time updates
        '/ws': {
          target: 'ws://localhost:8000',
          ws: true,
          changeOrigin: true,
        },
      },
      hmr: {
        overlay: true,
        clientPort: 3000,
      },
    },

    build: {
      outDir: 'dist',
      sourcemap: true,
      minify: 'terser',
      // Target modern browsers as per requirements
      target: ['chrome90', 'firefox88', 'safari14', 'edge90'],
      cssCodeSplit: true,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          // Manual chunk splitting for optimal loading
          manualChunks: {
            vendor: ['react', 'react-dom', '@reduxjs/toolkit'],
            ui: ['@headlessui/react', '@heroicons/react'],
            forms: ['react-hook-form', 'yup'],
            utils: ['date-fns', 'lodash'],
          },
        },
      },
      terserOptions: {
        compress: {
          // Remove console logs and debugger statements in production
          drop_console: !isDevelopment,
          drop_debugger: !isDevelopment,
        },
      },
    },

    plugins: [
      // React plugin with Fast Refresh support
      react({
        fastRefresh: true,
      }),
      // TypeScript type checking in development
      checker({
        typescript: true,
        overlay: true,
        enableBuild: false,
      }),
      // TypeScript path aliases resolution
      tsconfigPaths(),
    ],

    resolve: {
      alias: {
        '@': '/src',
        '@components': '/src/components',
        '@hooks': '/src/hooks',
        '@utils': '/src/utils',
      },
    },

    css: {
      postcss: './postcss.config.js',
      modules: {
        localsConvention: 'camelCase',
        scopeBehaviour: 'local',
        generateScopedName: '[name]__[local]___[hash:base64:5]',
      },
      preprocessorOptions: {
        scss: {
          additionalData: '@import "@/styles/variables.scss";',
        },
      },
    },

    define: {
      'process.env': process.env,
    },

    optimizeDeps: {
      // Dependencies to pre-bundle
      include: ['react', 'react-dom', '@reduxjs/toolkit'],
      // Exclude large dependencies that don't need pre-bundling
      exclude: ['@anthropic-ai/sdk'],
    },

    // Performance optimizations
    esbuild: {
      logOverride: { 'this-is-undefined-in-esm': 'silent' },
      target: 'es2020',
    },
  };
});