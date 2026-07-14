import { defineConfig } from 'vitest/config';
import path from 'path';
import react from '@vitejs/plugin-react';

// Vitest config kept separate from vite.config.ts so the production build
// is unaffected. Run with `npm run test` (one-shot) or
// `npm run test:watch` (watch mode) from the frontend/ directory.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      reporter: ['text', 'html'],
      include: ['src/app/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/**/*.d.ts'],
    },
  },
});
