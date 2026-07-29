import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDirectory = resolve(projectRoot, 'dist');

const baselineRuntimeFiles = [];

const baselineStaticFiles = [
  'manifest.json',
  'trofia-icon-192.png',
  'trofia-icon-512.png',
  'trofia-favicon-32.png',
  'trofia-apple-touch-icon.png',
];

function copyExplicitStaticFiles() {
  return {
    name: 'copy-explicit-static-files',
    apply: 'build',
    async closeBundle() {
      for (const relativePath of [...baselineRuntimeFiles, ...baselineStaticFiles]) {
        const destination = resolve(outputDirectory, relativePath);
        await mkdir(dirname(destination), { recursive: true });
        await copyFile(resolve(projectRoot, relativePath), destination);
      }
    },
  };
}

function preserveLegacyCssCascadeOrder() {
  return {
    name: 'preserve-legacy-css-cascade-order',
    apply: 'build',
    async writeBundle() {
      const indexPath = resolve(outputDirectory, 'index.html');
      const html = await readFile(indexPath, 'utf8');
      const stylesheetPattern = /[ \t]*<link\b(?=[^>]*\brel="stylesheet")(?=[^>]*\bhref="\.\/assets\/[^"]+\.css")[^>]*>\r?\n?/i;
      const stylesheetMatch = html.match(stylesheetPattern);
      const firstInlineStyleIndex = html.indexOf('  <style>');

      if (!stylesheetMatch || firstInlineStyleIndex < 0) {
        throw new Error('Unable to preserve the legacy CSS cascade order in built index.html');
      }

      const withoutGeneratedStylesheet = html.replace(stylesheetMatch[0], '');
      const insertionIndex = withoutGeneratedStylesheet.indexOf('  <style>');
      const reorderedHtml = [
        withoutGeneratedStylesheet.slice(0, insertionIndex),
        `  ${stylesheetMatch[0].trim()}\n`,
        withoutGeneratedStylesheet.slice(insertionIndex),
      ].join('');

      await writeFile(indexPath, reorderedHtml, 'utf8');
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [
    react({ jsxRuntime: 'classic' }),
    preserveLegacyCssCascadeOrder(),
    copyExplicitStaticFiles(),
  ],
  build: {
    cssMinify: false,
    outDir: outputDirectory,
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(projectRoot, 'index.html'),
    },
  },
});
