/* Build: inlines everything into ONE self-contained HTML file (no external requests at runtime).
 * Output (app/):
 *   Pinestone-Construction-OS.html   — double-click on a laptop; fully offline
 *   index.html + sw.js + manifest + icons/ — same app, for installing to an iPhone Home Screen from any static host
 * Run: node tools/build.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const R = (p) => path.join(__dirname, '..', p);
const read = (p) => fs.readFileSync(R(p), 'utf8');

const scripts = ['vendor/pdf-lib.min.js', 'src/questions.js', 'src/library.js', 'src/engine.js', 'src/demo.js', 'src/storage.js', 'src/pdf.js', 'src/app.js'];
const safeScript = (code) => code.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
let html = read('src/index.html')
  .replace('<!--STYLES-->', () => `<style>\n${read('src/styles.css')}\n</style>`)
  .replace('<!--SCRIPTS-->', () => scripts.map((s) => `<script data-src="${s}">\n${safeScript(read(s))}\n</script>`).join('\n'));
const build = crypto.createHash('sha256').update(html).digest('hex').slice(0, 10);
html = html.replace('<title>Pinestone Construction OS</title>', `<title>Pinestone Construction OS</title>\n<meta name="pcos-build" content="${build}">`);

const dist = R('app');
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(path.join(dist, 'icons'), { recursive: true });
fs.writeFileSync(path.join(dist, 'index.html'), html);
fs.writeFileSync(path.join(dist, 'Pinestone-Construction-OS.html'), html);
fs.writeFileSync(path.join(dist, 'sw.js'), read('src/sw.js').replace('__BUILD__', build));
fs.copyFileSync(R('src/manifest.webmanifest'), path.join(dist, 'manifest.webmanifest'));
for (const f of fs.readdirSync(R('src/icons'))) fs.copyFileSync(R('src/icons/' + f), path.join(dist, 'icons', f));
// External-reference audit: the built app must not load anything from the network.
const ext = html.match(/\b(?:src|href)\s*=\s*["']https?:\/\/[^"']+/gi) || [];
const imports = html.match(/\bimport\s*\(\s*["']https?:/g) || [];
if (ext.length || imports.length) { console.error('External references found:', ext, imports); process.exit(1); }
console.log(`Built app/ (build ${build}) — ${(html.length / 1024).toFixed(0)} KB single file, no external references.`);
