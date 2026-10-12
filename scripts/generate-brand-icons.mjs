import { mkdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dependencyRoot = process.argv[2] ? path.resolve(process.argv[2]) : root;
const require = createRequire(path.join(dependencyRoot, 'package.json'));
const { chromium } = require('@playwright/test');

const targets = [
  ['assets/brand/trofia-mark.svg', 'trofia-favicon-32.png', 32],
  ['assets/brand/trofia-mark.svg', 'trofia-apple-touch-icon.png', 180],
  ['assets/brand/trofia-mark.svg', 'trofia-icon-192.png', 192],
  ['assets/brand/trofia-mark.svg', 'trofia-icon-512.png', 512],
  ['assets/brand/trofia-mark.svg', 'android/app/src/main/res/mipmap-mdpi/ic_launcher.png', 48],
  ['assets/brand/trofia-mark-round.svg', 'android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png', 48],
  ['assets/brand/trofia-mark.svg', 'android/app/src/main/res/mipmap-hdpi/ic_launcher.png', 72],
  ['assets/brand/trofia-mark-round.svg', 'android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png', 72],
  ['assets/brand/trofia-mark.svg', 'android/app/src/main/res/mipmap-xhdpi/ic_launcher.png', 96],
  ['assets/brand/trofia-mark-round.svg', 'android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png', 96],
  ['assets/brand/trofia-mark.svg', 'android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png', 144],
  ['assets/brand/trofia-mark-round.svg', 'android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png', 144],
  ['assets/brand/trofia-mark.svg', 'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png', 192],
  ['assets/brand/trofia-mark-round.svg', 'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png', 192],
  ['assets/brand/trofia-mark-foreground.svg', 'android/app/src/main/res/mipmap-mdpi/ic_launcher_foreground.png', 108],
  ['assets/brand/trofia-mark-foreground.svg', 'android/app/src/main/res/mipmap-hdpi/ic_launcher_foreground.png', 162],
  ['assets/brand/trofia-mark-foreground.svg', 'android/app/src/main/res/mipmap-xhdpi/ic_launcher_foreground.png', 216],
  ['assets/brand/trofia-mark-foreground.svg', 'android/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.png', 324],
  ['assets/brand/trofia-mark-foreground.svg', 'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png', 432],
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  for (const [source, output, size] of targets) {
    const svg = await readFile(path.join(root, source), 'utf8');
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<style>*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden}svg{display:block;width:100%;height:100%}</style>${svg}`);
    const destination = path.join(root, output);
    await mkdir(path.dirname(destination), { recursive: true });
    await page.screenshot({ path: destination, omitBackground: true });
  }
} finally {
  await browser.close();
}

console.log(`Generated ${targets.length} Trofia icon assets.`);
