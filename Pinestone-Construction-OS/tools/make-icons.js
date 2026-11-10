// Generates neutral app icons (charcoal tile, white "PCOS" letterform). Replace with the official logo files if desired.
const sharp = require('/opt/npm-tools/node_modules/sharp');
const path = require('path');
const out = path.join(__dirname, '../src/icons');
const svg = (s) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 512 512"><rect width="512" height="512" fill="#2b2d30"/><text x="256" y="268" font-family="DejaVu Sans, Helvetica, Arial, sans-serif" font-weight="700" font-size="118" letter-spacing="14" fill="#ffffff" text-anchor="middle">PINE</text><rect x="126" y="300" width="260" height="4" fill="#9a9fa6"/><text x="256" y="372" font-family="DejaVu Sans, Helvetica, Arial, sans-serif" font-size="46" letter-spacing="18" fill="#c9ccd1" text-anchor="middle">OS</text></svg>`);
(async () => { for (const [n, s] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) await sharp(svg(s)).resize(s, s).png().toFile(path.join(out, n)); console.log('icons ok'); })();
