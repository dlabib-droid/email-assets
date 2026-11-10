/* Generates docs/TASK-LIBRARY.md and library/task-library.json from src/library.js. Run: node tools/gen-docs.js */
'use strict';
const fs = require('fs'), path = require('path');
const R = (p) => path.join(__dirname, '..', p);
require(R('src/questions.js')); const L = require(R('src/library.js')); const E = require(R('src/engine.js')); const D = require(R('src/demo.js'));
fs.mkdirSync(R('docs'), { recursive: true }); fs.mkdirSync(R('library'), { recursive: true });
fs.writeFileSync(R('library/task-library.json'), JSON.stringify({ libraryVersion: L.LIBRARY_VERSION, phases: L.PHASES, trades: L.TRADES, checkpoints: L.CHECKPOINTS, tasks: L.TASKS }, null, 1));
const tagName = E.TAG_LABEL; const out = [];
out.push(`# Pinestone Construction OS — Master Task Library v${L.LIBRARY_VERSION}`, '',
  `${L.TASKS.length} task templates · ${L.CHECKPOINTS.length} inspection/approval checkpoint templates · ${L.PHASES.length} phases. Generated from \`src/library.js\` (the single source of truth).`, '',
  'Guidance labels: **Code** = model-code section (2018 IRC numbering unless noted — verify the edition and local amendments with the AHJ) · **Verify locally** = varies by AHJ/utility · **Manufacturer** · **Industry standard** (TCNA/ANSI/ACCA/NWFA/GA — not code unless adopted) · **Pinestone practice** (company standard, not code).', '',
  '`Applies when` conditions use the setup answers (`A`) and, for bathroom tasks, the bathroom (`B`). Tasks whose IDs start with `b.` are created once per bathroom.', '');
out.push('## Inspection & approval checkpoints', '', '| ID | Checkpoint | Kind | Default | Applies when | Complete before requesting |', '|---|---|---|---|---|---|');
for (const c of L.CHECKPOINTS) out.push(`| \`${c.id}\` | ${c.name}${c.each ? ' (per bathroom)' : ''} | ${E.KIND_LABEL[c.kind]} | ${E.CP_REQ_LABEL[c.req]} | ${c.w ? '`' + c.w.replace(/\|/g, '\\|') + '`' : 'always'} | ${(c.after || []).join(', ')} |`);
for (const ph of L.PHASES) {
  out.push('', `## ${ph.id.slice(1)} · ${ph.name}`, '');
  for (const t of L.TASKS.filter((x) => x.ph === ph.id)) {
    out.push(`### ${t.t}  \`${t.id}\``, '', `- **Trade:** ${t.tr}${t.each ? ' · **per bathroom**' : ''}${t.photo ? ' · **photograph before concealing**' : ''}`);
    out.push(`- **Applies when:** ${t.w ? '`' + t.w + '`' : 'always'}`);
    if (t.d.length) out.push(`- **Prerequisites:** ${t.d.map((x) => '`' + x + '`').join(', ')}`);
    if (t.g.length) out.push(`- **Hard hold until approved:** ${t.g.map((x) => '`' + x + '`').join(', ')}`);
    if (t.f.length) out.push(`- **Required before requesting:** ${t.f.map((x) => '`' + x + '`').join(', ')}`);
    if (t.q && t.q.length) out.push(`- **QC checks:** ${t.q.join('; ')}`);
    if (t.G) {
      if (t.G.w) out.push(`- **What:** ${t.G.w}`);
      for (const line of t.G.t || []) { const x = E.parseTagged(line); out.push(`  - *${tagName[x.tag]}*${x.ref ? ' — ' + x.ref : ''}: ${x.text}`); }
      if (t.G.m && t.G.m.length) out.push(`- **Common mistakes:** ${t.G.m.join(' · ')}`);
      if (t.G.i) out.push(`- **Inspection:** ${t.G.i}`);
    }
    out.push('');
  }
}
fs.writeFileSync(R('docs/TASK-LIBRARY.md'), out.join('\n'));
// sample sequence listing
const p = E.newProject(D.name, D.address); E.applyAnswers(p, D.answers); const g = E.generate(p.answers);
const seq = [`# Sample generated sequence — ${D.name}`, '', `Crawlspace (encapsulated), bearing-wall removal, full MEP, two tiled baths, kitchen, exterior. ${g.tasks.length} tasks, ${g.checkpoints.length} checkpoints.`, ''];
for (const ph of g.phases) { const ts = g.tasks.filter((t) => t.phase === ph.id); if (!ts.length) continue; seq.push(`## ${ph.id.slice(1)} · ${ph.name}`, ''); for (const t of ts) seq.push(`- [ ] ${t.title} — *${t.trade}*${t.gates.length ? ' — **HOLD:** ' + t.gates.map((x) => g.cpMap.get(x).name).join('; ') : ''}${t.deps.length ? ' — after: ' + t.deps.map((x) => g.taskMap.get(x).title).join('; ') : ''}`); seq.push(''); }
fs.writeFileSync(R('docs/SAMPLE-SEQUENCE.md'), seq.join('\n'));
console.log('docs generated');
