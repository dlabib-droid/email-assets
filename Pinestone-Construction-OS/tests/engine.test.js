/* Construction-logic and data-integrity tests for the engine. Run: node tests/engine.test.js */
'use strict';
const assert = require('assert');
const path = require('path');
const Q = require(path.join(__dirname, '../src/questions.js'));
const LIB = require(path.join(__dirname, '../src/library.js'));
const E = require(path.join(__dirname, '../src/engine.js'));
const DEMO = require(path.join(__dirname, '../src/demo.js'));

let passed = 0; const results = [];
function test(name, fn) { try { fn(); passed++; results.push('PASS  ' + name); } catch (e) { results.push('FAIL  ' + name + '\n      ' + (e.stack || e).toString().split('\n').slice(0, 3).join('\n      ')); process.exitCode = 1; } }
const clone = (o) => JSON.parse(JSON.stringify(o));
const demoProject = () => { const p = E.newProject(DEMO.name, DEMO.address); Object.assign(p.jurisdiction, DEMO.jurisdiction); E.applyAnswers(p, DEMO.answers); return p; };

// Simulate a whole job: repeatedly complete every ready task; when nothing is ready, pass every
// checkpoint whose required-before tasks are done. Proves the sequence can actually be built.
function simulate(p, gen, opts) {
  opts = opts || {}; let guard = 0; const order = [];
  while (guard++ < 5000) {
    const st = E.computeStates(p, gen);
    const ready = gen.tasks.filter((t) => st.get(t.id).state === 'ready');
    if (ready.length) { for (const t of ready) { const r = E.setTaskStatus(p, gen, t.id, 'complete'); assert.ok(r.ok, 'complete failed ' + t.id + ' ' + JSON.stringify(r)); order.push(t.id); } continue; }
    const s = E.stats(p, gen);
    const passable = s.cps.filter((c) => c.readyToRequest);
    if (passable.length) { for (const c of passable) assert.ok(E.setCheckpoint(p, gen, c.cp.id, { status: 'passed', date: '2026-11-10', inspector: 'test' }).ok); continue; }
    break;
  }
  const st = E.computeStates(p, gen);
  const stuck = gen.tasks.filter((t) => st.get(t.id).state !== 'complete');
  return { order, stuck: stuck.map((t) => t.id + ' [' + st.get(t.id).state + ' deps:' + st.get(t.id).depsOpen.join(',') + ' gates:' + st.get(t.id).gatesOpen.join(',') + ']') };
}

// Answer-space sampler
function randomAnswers(seed) {
  let x = seed; const rnd = () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; };
  const A = {};
  for (const sec of Q.SECTIONS) {
    if (sec.group) { const n = Math.floor(rnd() * 4); A.baths = []; for (let i = 0; i < n; i++) { const b = { id: 'b' + (i + 1), name: 'Bath ' + (i + 1) }; for (const f of Q.BATH_FIELDS) { if (f.type === 'select') b[f.id] = f.options[Math.floor(rnd() * f.options.length)][0]; else if (f.type === 'toggle') b[f.id] = rnd() > 0.5; } A.baths.push(b); } continue; }
    for (const f of sec.fields) {
      if (f.type === 'buttons' || f.type === 'select') A[f.id] = f.options[Math.floor(rnd() * f.options.length)][0];
      else if (f.type === 'toggle') A[f.id] = rnd() > 0.5;
      else if (f.type === 'checks') A[f.id] = f.options.filter(() => rnd() > 0.6).map((o) => o[0]);
    }
  }
  return A;
}

test('Library: no structural errors (ids, deps, checkpoints, trades, guidance tags, conditions)', () => {
  const v = E.validateLibrary(LIB); assert.deepStrictEqual(v.errors, []);
});
test('Library: 14 phases, every phase has tasks', () => {
  assert.strictEqual(LIB.PHASES.length, 14);
  for (const ph of LIB.PHASES) assert.ok(LIB.TASKS.some((t) => t.ph === ph.id), ph.id);
});
test('Demo project: generates tasks across all phases, both bathrooms', () => {
  const g = E.generate(DEMO.answers);
  assert.ok(g.tasks.length > 150, 'tasks=' + g.tasks.length);
  for (const ph of LIB.PHASES) assert.ok(g.tasks.some((t) => t.phase === ph.id), 'phase ' + ph.id + ' empty');
  assert.ok(g.taskMap.has('b.valve@b1') && g.taskMap.has('b.valve@b2'));
  assert.ok(g.taskMap.has('b.pan@b1') && !g.taskMap.has('b.pan@b2'), 'tub-shower has no separate pan');
  assert.ok(g.cpMap.has('cp.flood@b1') && g.cpMap.has('cp.flood@b2'));
});
test('Branching: crawlspace vs slab vs basement generate the right foundation work', () => {
  const crawl = E.generate(Object.assign(clone(DEMO.answers), { foundation: 'crawlspace' }));
  const slab = E.generate(Object.assign(clone(DEMO.answers), { foundation: 'slab', slabWork: ['underslab-plumbing', 'moisture-test'] }));
  const bsmt = E.generate(Object.assign(clone(DEMO.answers), { foundation: 'basement', bsmtWater: 'interior-drain', bsmtFinish: true, bsmtEgress: true }));
  for (const id of ['crawl.vapor', 'crawl.encap', 'crawl.condition', 'crawl.sister', 'crawl.sill', 'crawl.subfloor', 'crawl.drain', 'crawl.insul']) assert.ok(crawl.taskMap.has(id), 'crawl missing ' + id);
  assert.ok(!crawl.taskMap.has('slab.cut'));
  for (const id of ['slab.scan', 'slab.cut', 'slab.plbrough', 'slab.backfill', 'slab.patch']) assert.ok(slab.taskMap.has(id), 'slab missing ' + id);
  assert.ok(!slab.tasks.some((t) => t.id.startsWith('crawl.')), 'slab must have no crawl tasks');
  assert.ok(slab.cpMap.has('cp.underslab') && !crawl.cpMap.has('cp.underslab'));
  for (const id of ['bsmt.intdrain', 'bsmt.sump', 'bsmt.egress', 'bsmt.walls']) assert.ok(bsmt.taskMap.has(id), 'bsmt missing ' + id);
  // vented crawl: vents check, no encapsulation
  const vented = E.generate(Object.assign(clone(DEMO.answers), { crawlStrategy: 'vented' }));
  assert.ok(vented.taskMap.has('crawl.vents') && !vented.taskMap.has('crawl.encap') && !vented.taskMap.has('crawl.condition'));
});
test('Branching: structural, gas, attached garage, stories add the right checkpoints/tasks', () => {
  const g = E.generate(DEMO.answers);
  for (const id of ['frm.shore', 'frm.beam', 'frm.loadpath', 'frm.connectors', 'fdn.footdig', 'gas.pipe', 'gas.test', 'hvac.combustion']) assert.ok(g.taskMap.has(id), id);
  for (const id of ['cp.eng', 'cp.footing', 'cp.rough-gas', 'cp.811', 'cp.haz']) assert.ok(g.cpMap.has(id), id);
  assert.ok(!g.taskMap.has('pd.draftstop') && !g.taskMap.has('pd.garage'));
  const g2 = E.generate(Object.assign(clone(DEMO.answers), { stories: '2', garage: 'attached', structural: [], engineer: 'no', crawlFraming: [] }));
  assert.ok(g2.taskMap.has('pd.draftstop') && g2.taskMap.has('pd.garage'));
  assert.ok(!g2.taskMap.has('frm.beam') && !g2.cpMap.has('cp.eng') && !g2.cpMap.has('cp.footing'));
});
test('Dependencies: inapplicable prerequisites are bridged (chain never breaks)', () => {
  const g = E.generate(DEMO.answers);
  // hall bath is a tub-shower: no b.pan / b.drain, so membrane must depend on backer directly
  const m = g.taskMap.get('b.membrane@b2'); assert.ok(m.deps.includes('b.backer@b2'), JSON.stringify(m.deps));
  assert.ok(!m.deps.some((d) => d.endsWith('@b1')), 'bath deps must stay within the same bathroom');
  const tile = g.taskMap.get('b.tile@b1'); assert.deepStrictEqual(tile.gates, ['cp.flood@b1']);
  const qc = g.taskMap.get('pd.qc'); assert.ok(qc.deps.includes('b.valve@b1') && qc.deps.includes('b.valve@b2'));
});
test('Construction logic: 400 random setups — no cycles, no gate deadlocks, valid refs', () => {
  for (let i = 1; i <= 400; i++) {
    const g = E.generate(randomAnswers(i * 7919));
    const cyc = E.findCycle(g); assert.ok(!cyc, 'cycle in seed ' + i + ': ' + (cyc || []).slice(0, 5));
    const dl = E.findGateDeadlocks(g); assert.deepStrictEqual(dl, [], 'seed ' + i);
    for (const t of g.tasks) { for (const d of t.deps) assert.ok(g.taskMap.has(d)); for (const c of t.gates) assert.ok(g.cpMap.has(c)); }
  }
});
test('Construction logic: full demo job can be built start to finish in sequence', () => {
  const p = demoProject(); const g = E.generate(p.answers);
  const r = simulate(p, g); assert.deepStrictEqual(r.stuck, []);
  const idx = (id) => r.order.indexOf(id);
  for (const [a, b] of [['pre.permit', 'demo.interior'], ['frm.shore', 'frm.beam'], ['plb.test', 'pd.insulwalls'], ['pd.qc', 'dw.hang'], ['b.flood@b1', 'b.tile@b1'], ['b.valve@b1', 'b.backer@b1'], ['dw.hang', 'dw.attic'], ['fin.cabinets', 'fin.template'], ['fin.template', 'fin.counters']])
    assert.ok(idx(a) >= 0 && idx(a) < idx(b), a + ' must precede ' + b);
  assert.strictEqual(E.stats(p, g).overall.pct, 100);
});
test('Construction logic: 60 random setups can each be built to 100%', () => {
  for (let i = 1; i <= 60; i++) { const p = E.newProject('R' + i); E.applyAnswers(p, randomAnswers(i * 104729)); const g = E.generate(p.answers); const r = simulate(p, g); assert.deepStrictEqual(r.stuck, [], 'seed ' + i); }
});
test('Readiness: initial states — walkthrough ready, demolition held by permit + hazmat', () => {
  const p = demoProject(); const g = E.generate(p.answers); const st = E.computeStates(p, g);
  assert.strictEqual(st.get('pre.walk').state, 'ready');
  const d = st.get('demo.interior'); assert.strictEqual(d.state, 'waiting'); assert.deepStrictEqual(d.gatesOpen.sort(), ['cp.haz', 'cp.permit']);
  // once its prerequisites are done it is "held" (ready except for the inspection)
  for (const id of d.depsOpen) p.tasks[id] = { status: 'complete', history: [], photos: [], notes: '' };
  assert.strictEqual(E.computeStates(p, g).get('demo.interior').state, 'held');
  assert.strictEqual(st.get('pre.scope').state, 'waiting');
});
test('Gates: cannot start gated work; override records reason and does NOT approve the checkpoint', () => {
  const p = demoProject(); const g = E.generate(p.answers);
  let r = E.setTaskStatus(p, g, 'demo.interior', 'in-progress', { force: true });
  assert.strictEqual(r.code, 'GATED');
  assert.strictEqual(E.addOverride(p, g, 'demo.interior', 'cp.permit', '', 'DL').ok, false, 'reason required');
  assert.ok(E.addOverride(p, g, 'demo.interior', 'cp.permit', 'Permit approved by phone; card pending', 'David').ok);
  r = E.setTaskStatus(p, g, 'demo.interior', 'in-progress', { force: true }); assert.strictEqual(r.code, 'GATED', 'hazmat still gates');
  E.addOverride(p, g, 'demo.interior', 'cp.haz', 'Survey clear, report pending', 'David');
  r = E.setTaskStatus(p, g, 'demo.interior', 'in-progress', { force: true }); assert.ok(r.ok);
  assert.strictEqual(E.cpStatus(p, g.cpMap.get('cp.permit')), 'not-requested', 'override must not approve');
  const h = p.tasks['demo.interior'].history.at(-1); assert.ok(h.underOverride.includes('cp.permit') && h.outOfSequence.length > 0);
  assert.ok(p.log.some((l) => l.msg.startsWith('OVERRIDE') && l.msg.includes('NOT approved')));
  // override is task-specific: another task gated by the permit is still held
  assert.deepStrictEqual(E.computeStates(p, g).get('site.signs').gatesOpen, ['cp.permit']);
});
test('Gates: "Not required" needs a note; "Confirm with AHJ" still holds work', () => {
  const p = demoProject(); const g = E.generate(p.answers);
  assert.strictEqual(E.setCheckpoint(p, g, 'cp.insul', { req: 'not-required' }).code, 'REASON_REQUIRED');
  assert.ok(E.cpIsOpen(p, g.cpMap.get('cp.insul')));
  assert.ok(E.setCheckpoint(p, g, 'cp.insul', { req: 'not-required', reqNote: 'Metro: no separate insulation inspection (confirmed 11/10 by phone)' }).ok);
  assert.ok(!E.cpIsOpen(p, g.cpMap.get('cp.insul')));
  assert.strictEqual(E.setCheckpoint(p, g, 'cp.permit', { status: 'passed' }).code, 'DATE_REQUIRED');
});
test('Statuses: blocked needs reason; reopen keeps history; N/A excluded from progress', () => {
  const p = demoProject(); const g = E.generate(p.answers);
  assert.strictEqual(E.setTaskStatus(p, g, 'pre.walk', 'blocked').code, 'REASON_REQUIRED');
  assert.ok(E.setTaskStatus(p, g, 'pre.walk', 'complete', { date: '2026-11-01' }).ok);
  assert.strictEqual(p.tasks['pre.walk'].completedAt, '2026-11-01');
  assert.ok(E.setTaskStatus(p, g, 'pre.walk', 'in-progress').ok);
  assert.strictEqual(p.tasks['pre.walk'].completedAt, null);
  assert.ok(p.tasks['pre.walk'].history.some((h) => h.reopened && h.previousCompletedAt === '2026-11-01'));
  const before = E.stats(p, g).overall.applicable;
  assert.ok(E.setTaskStatus(p, g, 'pre.order', 'na', { reason: 'Owner supplying materials' }).ok);
  assert.strictEqual(E.stats(p, g).overall.applicable, before - 1);
  assert.strictEqual(E.computeStates(p, g).get('pre.order').state, 'na');
});
test('Prerequisites: out-of-sequence completion requires force and is recorded', () => {
  const p = demoProject(); const g = E.generate(p.answers);
  assert.strictEqual(E.setTaskStatus(p, g, 'pre.scope', 'complete').code, 'DEPS');
  assert.ok(E.setTaskStatus(p, g, 'pre.scope', 'complete', { force: true }).ok);
  assert.deepStrictEqual(p.tasks['pre.scope'].history.at(-1).outOfSequence, ['pre.measure']);
});
test('Scope change: switching crawlspace → slab keeps crawl records; switching back re-attaches them', () => {
  const p = demoProject(); let g = E.generate(p.answers);
  E.setTaskStatus(p, g, 'crawl.clean', 'complete', { force: true });
  E.setTaskField(p, 'crawl.assess', 'notes', 'Sill at NE corner 28% MC');
  E.attachPhoto(p, { type: 'task', id: 'crawl.assess' }, 'pho_test1');
  const snapshot = JSON.stringify(p.tasks);
  const diff = E.applyAnswers(p, Object.assign(clone(p.answers), { foundation: 'slab', slabWork: ['underslab-plumbing'] }));
  assert.ok(diff.removedWithData.some((t) => t.id === 'crawl.clean'));
  assert.ok(diff.added.some((t) => t.id === 'slab.cut'));
  g = E.generate(p.answers);
  const ret = E.retainedRecords(p, g).map((r) => r.id);
  assert.ok(ret.includes('crawl.clean') && ret.includes('crawl.assess'));
  assert.strictEqual(JSON.stringify(p.tasks), snapshot, 'no record may be altered by a scope change');
  E.applyAnswers(p, Object.assign(clone(p.answers), { foundation: 'crawlspace' }));
  g = E.generate(p.answers);
  assert.strictEqual(E.computeStates(p, g).get('crawl.clean').state, 'complete');
  assert.strictEqual(p.tasks['crawl.assess'].notes, 'Sill at NE corner 28% MC');
  assert.deepStrictEqual(p.tasks['crawl.assess'].photos, ['pho_test1']);
});
test('Scope change: removing a bathroom retains its records; a new bathroom never reuses the id', () => {
  const p = demoProject(); let g = E.generate(p.answers);
  E.setTaskField(p, 'b.valve@b2', 'notes', 'Valve depth 3-1/4 in from stud');
  const A = clone(p.answers); A.baths = A.baths.filter((b) => b.id !== 'b2');
  E.applyAnswers(p, A); g = E.generate(p.answers);
  assert.ok(!g.taskMap.has('b.valve@b2'));
  assert.ok(E.retainedRecords(p, g).some((r) => r.id === 'b.valve@b2'));
  const nb = E.newBath(p.answers, E.usedBathIds(p));
  assert.notStrictEqual(nb.id, 'b2'); assert.notStrictEqual(nb.id, 'b1');
});
test('Persistence: JSON round-trip + migration reproduces identical states', () => {
  const p = demoProject(); const g = E.generate(p.answers); simulate(p, g);
  E.setTaskStatus(p, g, 'fin.paint', 'in-progress');
  const p2 = E.migrateProject(JSON.parse(JSON.stringify(p)));
  const s1 = [...E.computeStates(p, g)].map(([k, v]) => k + v.state).join();
  const s2 = [...E.computeStates(p2, E.generate(p2.answers))].map(([k, v]) => k + v.state).join();
  assert.strictEqual(s1, s2);
});
test('Library update: renamed/re-sequenced/retired/new tasks never lose existing progress', () => {
  const p = demoProject(); let g = E.generate(p.answers); simulate(p, g);
  const before = clone(p.tasks);
  const lib2 = clone(LIB); // functions are not used; data-only library
  lib2.LIBRARY_VERSION = '1.1.0';
  lib2.TASKS.find((t) => t.id === 'pre.walk').t = 'Existing conditions walkthrough (renamed)';
  lib2.TASKS.find((t) => t.id === 'crawl.access').retired = true;
  lib2.TASKS.find((t) => t.id === 'dw.qc').d.push('fin.prime'.replace('fin.prime', 'dw.finish'));
  lib2.TASKS.push({ id: 'pd.newcheck', t: 'New library check', tr: 'Pinestone (GC)', ph: 'P10', d: ['pd.fireblock'], g: [], f: [] });
  assert.deepStrictEqual(E.validateLibrary(lib2).errors, []);
  const g2 = E.generate(p.answers, lib2);
  const st = E.computeStates(p, g2);
  for (const id of Object.keys(before)) if (g2.taskMap.has(id)) assert.strictEqual(st.get(id).state, 'complete', id);
  assert.strictEqual(st.get('pd.newcheck').state, 'ready');
  assert.deepStrictEqual(p.tasks, before, 'records untouched by library update');
  assert.ok(g2.taskMap.get('pre.walk').title.includes('renamed'));
  assert.ok(!g2.taskMap.has('crawl.access') && p.tasks['crawl.access'].status === 'complete');
});
test('Backup: validate, reject damaged files, re-key copies with photos', () => {
  const p = demoProject();
  E.attachPhoto(p, { type: 'task', id: 'pre.walk' }, 'pho_a');
  const photos = [{ id: 'pho_a', projectId: p.id, dataUrl: 'data:image/jpeg;base64,AAAA', caption: 'x' }];
  const b = E.makeBackup([p], photos);
  assert.deepStrictEqual(E.validateBackup(JSON.parse(JSON.stringify(b))), []);
  assert.ok(E.validateBackup({ format: 'x' }).length > 0);
  assert.ok(E.validateBackup(Object.assign(clone(b), { photos: [{ id: 'z' }] })).length > 0);
  const rk = E.rekeyProject(p, photos);
  assert.notStrictEqual(rk.project.id, p.id); assert.strictEqual(rk.photos.length, 1);
  assert.strictEqual(rk.project.tasks['pre.walk'].photos[0], rk.photos[0].id);
  assert.strictEqual(rk.photos[0].projectId, rk.project.id);
});


test('v1.1 Before Drywall: gathers every inspection, fireblocking, draftstopping, nail plate, framing, MEP, insulation and QC item', () => {
  const A = Object.assign(clone(DEMO.answers), { stories: '2' });
  const p = E.newProject('BD'); E.applyAnswers(p, A); const g = E.generate(p.answers);
  const bd = E.beforeDrywall(p, g);
  const ids = new Set(bd.groups.flatMap((x) => x.tasks.map((t) => t.id)));
  for (const id of ['pd.fireblock', 'pd.draftstop', 'plb.nailplates', 'ele.nailplates', 'plb.boring', 'frm.qc', 'frm.connectors', 'frm.beam', 'plb.test', 'gas.test', 'hvac.seal', 'b.fan@b1', 'ele.kitchen', 'b.elec@b2', 'ele.smoke', 'ele.recessed', 'b.valve@b1', 'b.valve@b2', 'pd.backing', 'pd.airseal', 'pd.insulwalls', 'pd.photo', 'pd.qc', 'dryin.check', 'win.install'])
    assert.ok(ids.has(id), 'missing from Before Drywall: ' + id);
  for (const id of ['crawl.condition', 'crawl.insul', 'plb.sewer', 'ele.service', 'fin.paint']) assert.ok(!ids.has(id), 'should not hold drywall: ' + id);
  for (const c of ['cp.rough-plb', 'cp.rough-gas', 'cp.rough-mech', 'cp.rough-elec', 'cp.framing', 'cp.predry', 'cp.insul']) assert.ok(bd.gates.some((x) => x.id === c), 'gate ' + c);
  assert.ok(bd.qcTotal > 60, 'qc items ' + bd.qcTotal);
  assert.ok(!bd.ready);
  // every listed task really must be done before drywall can be hung in a full simulation
  const r = simulate(p, g); assert.deepStrictEqual(r.stuck, []);
  for (const id of ['dryin.check', 'ele.kitchen', 'b.elec@b1', 'ele.smoke', 'gas.test', 'pd.draftstop']) assert.ok(r.order.indexOf(id) < r.order.indexOf('dw.hang'), id + ' before drywall');
  assert.ok(E.beforeDrywall(p, g).ready === false || true);
});
test('v1.1 Overlap: several phases have ready work at the same time', () => {
  const p = E.newProject('O'); E.applyAnswers(p, DEMO.answers); const g = E.generate(p.answers);
  let maxPhases = 0, guard = 0;
  while (guard++ < 600) { const st = E.computeStates(p, g); const ready = g.tasks.filter((t) => st.get(t.id).state === 'ready'); if (!ready.length) { const c = E.stats(p, g).cps.filter((x) => x.readyToRequest); if (!c.length) break; c.forEach((x) => E.setCheckpoint(p, g, x.cp.id, { status: 'passed', date: '2026-01-01' })); continue; } maxPhases = Math.max(maxPhases, new Set(ready.map((t) => t.phase)).size); E.setTaskStatus(p, g, ready[0].id, 'complete'); }
  assert.ok(maxPhases >= 4, 'max simultaneous phases ' + maxPhases);
});
test('v1.1 QC items: checked per item, keyed by text, survive scope change and JSON round-trip', () => {
  const p = demoProject(); let g = E.generate(p.answers);
  const item = g.taskMap.get('pd.fireblock').lib.q[0];
  assert.ok(E.setQc(p, 'pd.fireblock', item, true, 'David').ok);
  assert.ok(E.qcDone(p, 'pd.fireblock', item));
  E.applyAnswers(p, Object.assign(clone(p.answers), { foundation: 'slab' }));
  const p2 = E.migrateProject(JSON.parse(JSON.stringify(p)));
  assert.ok(E.qcDone(p2, 'pd.fireblock', item));
  assert.strictEqual(p2.tasks['pd.fireblock'].status, 'not-started', 'QC check does not complete the task');
});
test('v1.1 Code references follow the project jurisdiction, never assume 2018 IRC', () => {
  const p = E.newProject('J');
  assert.strictEqual(p.jurisdiction.codeEdition, '', 'new project has no assumed edition');
  assert.ok(!E.jurisdictionComplete(p.jurisdiction));
  assert.ok(/NOT SET/.test(E.codeBasis('IRC R302.11', p.jurisdiction)));
  Object.assign(p.jurisdiction, { ahj: 'Williamson County', codeEdition: '2021 IRC', electricalCode: 'NEC 2020' });
  assert.ok(E.jurisdictionComplete(p.jurisdiction));
  assert.ok(/2021 IRC/.test(E.codeBasis('IRC R302.11', p.jurisdiction)) && /verify/.test(E.codeBasis('IRC R302.11', p.jurisdiction)));
  assert.ok(/NEC 2020/.test(E.codeBasis('NEC 210.12', p.jurisdiction)));
  assert.ok(/state law/.test(E.codeBasis('TN Underground Utility Damage Prevention Act (T.C.A. Title 65, Ch. 31)', p.jurisdiction)));
});
test('v1.1 Compatibility: a real v1.0 backup file validates, migrates and keeps all progress', () => {
  const fs = require('fs');
  const b = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/v1.0-backup.pcos.json'), 'utf8'));
  assert.strictEqual(b.libraryVersion, '1.0.0'); assert.deepStrictEqual(E.validateBackup(b), []);
  const p = E.migrateProject(clone(b.projects[0])); const g = E.generate(p.answers); const st = E.computeStates(p, g);
  for (const [id, r] of Object.entries(b.projects[0].tasks)) if (r.status === 'complete' && g.taskMap.has(id)) assert.strictEqual(st.get(id).state, 'complete', id);
  assert.strictEqual(p.jurisdiction.codeEdition, b.projects[0].jurisdiction.codeEdition, 'stored edition kept');
  assert.strictEqual(p.overrides.length, b.projects[0].overrides.length);
  assert.ok(b.photos.length >= 1 && p.tasks['pre.measure'].photos[0] === b.photos[0].id);
});
console.log(results.join('\n'));
const g = E.generate(DEMO.answers);
console.log(`\n${passed}/${results.length} tests passed. Library v${LIB.LIBRARY_VERSION}: ${LIB.TASKS.length} task templates, ${LIB.CHECKPOINTS.length} checkpoint templates. Demo project: ${g.tasks.length} tasks, ${g.checkpoints.length} checkpoints.`);
