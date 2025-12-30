import { Resvg } from '@resvg/resvg-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the SVG file
const svgPath = path.join(__dirname, '../public/icon.svg');
const svgContent = fs.readFileSync(svgPath, 'utf-8');

// Generate 192x192 icon
const resvg192 = new Resvg(svgContent, {
  fitTo: {
    mode: 'width',
    value: 192,
  },
});
const png192 = resvg192.render();
const png192Data = png192.asPng();
fs.writeFileSync(path.join(__dirname, '../public/icon-192.png'), png192Data);

// Generate 512x512 icon
const resvg512 = new Resvg(svgContent, {
  fitTo: {
    mode: 'width',
    value: 512,
  },
});
const png512 = resvg512.render();
const png512Data = png512.asPng();
fs.writeFileSync(path.join(__dirname, '../public/icon-512.png'), png512Data);

console.log('✅ Icons generated successfully!');
console.log('   - icon-192.png (192x192)');
console.log('   - icon-512.png (512x512)');

