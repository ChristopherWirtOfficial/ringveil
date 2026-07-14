import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Ringveil ships as one self-contained HTML (open it anywhere, no server, no
// runtime deps). vite-plugin-singlefile inlines JS + CSS to preserve that
// property; `pnpm dev` still gives a normal HMR dev server.
export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    target: 'es2020',
    // singlefile inlines everything; keep the emitted tree flat and predictable
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    cssCodeSplit: false,
  },
});
