import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

mkdirSync('dist', { recursive: true });

// app bundle
const app = await build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'es2020',
  write: false,
});

// headless smoke bundle for node
await build({
  entryPoints: ['src/smoke.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'es2020',
  outfile: 'dist/smoke.cjs',
});

const js = app.outputFiles[0].text;
const css = readFileSync('src/styles.css', 'utf8');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Ringveil — v0 prototype</title>
<style>
${css}
</style>
</head>
<body>
<div id="app"></div>
<script>
${js}
</script>
</body>
</html>`;

writeFileSync('dist/ringveil.html', html);
console.log(`built dist/ringveil.html (${(html.length / 1024).toFixed(1)} KB)`);
