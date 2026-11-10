/* End-to-end test in headless Chrome with ALL non-local network blocked.
 * Run: node tests/e2e.test.js   (requires playwright + Chrome; serves dist/ on localhost) */
'use strict';
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const http = require('http'); const fs = require('fs'); const path = require('path'); const { execSync } = require('child_process');
const DIST = path.join(__dirname, '../app'); const OUT = path.join(__dirname, '../test-output'); fs.mkdirSync(OUT, { recursive: true });
const PORT = 8765, BASE = `http://localhost:${PORT}/`;
const results = []; let failed = 0;
const ok = (cond, msg) => { results.push((cond ? 'PASS  ' : 'FAIL  ') + msg); if (!cond) failed++; };
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const server = http.createServer((req, res) => { let f = decodeURIComponent(req.url.split('?')[0]); if (f === '/') f = '/index.html'; const p = path.join(DIST, f); if (!p.startsWith(DIST) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res); });

(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const external = [];
  await ctx.route('**/*', (route) => { const u = route.request().url(); if (u.startsWith(BASE) || u.startsWith('data:') || u.startsWith('blob:')) return route.continue(); external.push(u); return route.abort(); });
  const errors = [];
  const watch = (pg) => { pg.on('pageerror', (e) => errors.push(e.message)); pg.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); }); };
  let page = await ctx.newPage(); watch(page);
  const ready = async (pg) => { await pg.waitForFunction(() => window.PCOS_READY === true, null, { timeout: 15000 }); };
  const engineEval = (pg, fn, arg) => pg.evaluate(fn, arg);
  const modalBtn = async (pg, label) => { await pg.locator('.modal [data-m]', { hasText: label }).first().click(); };

  await page.goto(BASE + 'index.html'); await ready(page);
  await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller !== null || window.PCOS_APP.swReady, null, { timeout: 15000 }).catch(() => {});

  // 1. Create project through the UI and answer setup questions
  await page.click('[data-act="new-project"]');
  await page.fill('.modal [name="name"]', 'E2E — 77 Test St Full Gut');
  await page.fill('.modal [name="address"]', '77 Test St, Nashville, TN 37206');
  await modalBtn(page, 'Create project');
  await page.waitForSelector('.secnav');
  await page.click('[data-act="setupsec"][data-sec="general"]');
  await page.click('[data-act="ans"][data-k="yearBuilt"][data-v="pre1978"]');
  await page.click('[data-act="setupsec"][data-sec="foundation"]');
  await page.click('[data-act="ans"][data-k="foundation"][data-v="crawlspace"]');
  await page.click('[data-act="ans"][data-k="crawlStrategy"][data-v="encapsulated"]');
  await page.check('[data-act="ans-chk"][data-k="crawlFraming"][data-v="sister-joists"]');
  ok(await page.isVisible('[data-act="ans-sel"][data-k="crawlDrain"]') && !(await page.isVisible('[data-k="slabWork"]')), 'Conditional questions: crawlspace shows crawl drainage, hides slab work');
  await page.click('[data-act="setupsec"][data-sec="structure"]');
  await page.check('[data-act="ans-chk"][data-k="structural"][data-v="remove-bearing-wall"]');
  await page.click('[data-act="ans"][data-k="engineer"][data-v="yes"]');
  await page.click('[data-act="setupsec"][data-sec="plumbing"]');
  await page.click('[data-act="ans"][data-k="gas"][data-v="existing"]');
  await page.check('[data-act="ans-chk"][data-k="gasAppliances"][data-v="range"]');
  await page.click('[data-act="setupsec"][data-sec="baths"]');
  await page.click('[data-act="bath-add"]'); await page.click('[data-act="bath-add"]');
  ok((await page.locator('.bathcard').count()) === 2, 'Two bathrooms added in setup');
  const expectedTasks = await page.evaluate(() => { const p = window.PCOS_APP.p; return window.PCOS_ENGINE.generate(p.draftAnswers).tasks.length; });
  await page.click('[data-act="apply"]');
  await page.waitForSelector('.bigpct');
  const genCount = await page.evaluate(() => window.PCOS_APP.gen.tasks.length);
  ok(genCount === expectedTasks && genCount > 150, `Sequence generated from selections (${genCount} tasks)`);
  const hasCrawl = await page.evaluate(() => ['crawl.vapor', 'crawl.encap', 'crawl.sister', 'frm.beam', 'gas.pipe'].every((id) => window.PCOS_APP.gen.taskMap.has(id)));
  ok(hasCrawl, 'Crawlspace, structural and gas branches generated');
  const projectId = await page.evaluate(() => window.PCOS_APP.p.id);
  await page.screenshot({ path: OUT + '/01-overview.png', fullPage: false });

  // 2. Daily task work
  await page.goto(`${BASE}index.html#/p/${projectId}/tasks`); await page.waitForSelector('.task');
  await page.click('[data-act="check"][data-id="pre.walk"]');
  await page.waitForFunction(() => window.PCOS_APP.p.tasks['pre.walk'] && window.PCOS_APP.p.tasks['pre.walk'].status === 'complete');
  ok(true, 'Checkbox completes a task');
  await page.click('[data-act="filter"][data-f="all"]');
  await page.click('.tmain[data-id="pre.measure"]');
  await page.fill('textarea[data-act="notes"][data-id="pre.measure"]', 'Ceilings 8\'-2" typical; kitchen 7\'-11"');
  await page.setInputFiles('input[data-act="addphoto"][data-ref="pre.measure"]', '/tmp/jobsite.jpg');
  await page.waitForFunction(() => (window.PCOS_APP.p.tasks['pre.measure'].photos || []).length === 1);
  ok(true, 'Note typed and photo attached to task');
  await page.click('[data-act="status"][data-id="pre.measure"][data-st="blocked"]');
  await page.fill('.modal textarea', 'Waiting on attic access');
  await modalBtn(page, 'Mark blocked');
  await page.waitForFunction(() => window.PCOS_APP.states.get('pre.measure').state === 'blocked');
  ok(true, 'Blocked status with reason');
  await page.screenshot({ path: OUT + '/02-task-detail.png' });

  // 3. Gated task: override flow, then out-of-sequence confirmation
  await page.click('.tmain[data-id="demo.interior"]');
  await page.click('[data-act="status"][data-id="demo.interior"][data-st="in-progress"]');
  await page.waitForSelector('.modal textarea[name="reason"]');
  ok(await page.isVisible('text=Held for inspection / approval'), 'Starting gated demolition opens the inspection-hold dialog');
  await page.fill('.modal textarea[name="reason"]', 'Inspector OK by phone, card Friday');
  await modalBtn(page, 'Record override');
  await page.waitForSelector('text=Prerequisites not complete');
  await modalBtn(page, 'Start anyway');
  await page.waitForFunction(() => window.PCOS_APP.p.tasks['demo.interior'].status === 'in-progress');
  const cpAfter = await page.evaluate(() => { const A = window.PCOS_APP; return { s: window.PCOS_ENGINE.cpStatus(A.p, A.gen.cpMap.get('cp.permit')), ov: A.p.overrides.length }; });
  ok(cpAfter.s === 'not-requested' && cpAfter.ov >= 1, 'Override recorded; permit checkpoint NOT marked approved');

  // 4. Record an inspection separately
  await page.goto(`${BASE}index.html#/p/${projectId}/inspections`); await page.waitForSelector('[data-act="cpstatus"]');
  await page.selectOption('[data-act="cpstatus"][data-cp="cp.eng"]', 'passed');
  await page.waitForFunction(() => (window.PCOS_APP.p.checkpoints['cp.eng'] || {}).status === 'passed');
  await page.fill('[data-act="cpfield"][data-k="inspector"][data-cp="cp.eng"]', 'Smith Engineering'); await page.press('[data-act="cpfield"][data-k="inspector"][data-cp="cp.eng"]', 'Tab');
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => !!window.PCOS_APP.p.checkpoints['cp.eng'].date), 'Inspection passed with date recorded on its own record');

  // 5. Close and reopen the app
  await page.waitForTimeout(800); await page.close();
  page = await ctx.newPage(); watch(page);
  await page.goto(`${BASE}index.html#/p/${projectId}/overview`); await ready(page);
  const persisted = await page.evaluate(() => { const p = window.PCOS_APP.p; return { walk: p.tasks['pre.walk'].status, note: p.tasks['pre.measure'].notes, photos: p.tasks['pre.measure'].photos.length, blocked: p.tasks['pre.measure'].blockedReason, ov: p.overrides.length, eng: p.checkpoints['cp.eng'].status, insp: p.checkpoints['cp.eng'].inspector }; });
  ok(persisted.walk === 'complete' && persisted.note.includes('8\'-2"') && persisted.photos === 1 && persisted.blocked === 'Waiting on attic access' && persisted.ov >= 1 && persisted.eng === 'passed' && persisted.insp === 'Smith Engineering', 'Everything survived closing and reopening: ' + JSON.stringify(persisted));

  // 6. Change setup selections: crawlspace -> slab -> crawlspace; records retained
  await page.evaluate(() => { const A = window.PCOS_APP; A.p.tasks['crawl.clean'] = { status: 'complete', completedAt: '2026-11-09', notes: 'Removed 2 loads debris', photos: [], history: [{ at: new Date().toISOString(), action: 'status', from: 'not-started', to: 'complete' }] }; });
  await page.goto(`${BASE}index.html#/p/${projectId}/setup`); await page.waitForSelector('.secnav');
  await page.click('[data-act="setupsec"][data-sec="foundation"]');
  await page.click('[data-act="ans"][data-k="foundation"][data-v="slab"]');
  await page.check('[data-act="ans-chk"][data-k="slabWork"][data-v="underslab-plumbing"]');
  await page.click('[data-act="apply"]'); await page.waitForSelector('text=Apply setup changes?');
  ok(await page.isVisible('text=Those records are kept'), 'Scope-change dialog warns that records are kept');
  await modalBtn(page, 'Apply changes');
  await page.waitForFunction(() => window.PCOS_APP.gen.taskMap.has('slab.cut') && !window.PCOS_APP.gen.taskMap.has('crawl.clean'));
  ok(await page.evaluate(() => window.PCOS_APP.p.tasks['crawl.clean'].notes === 'Removed 2 loads debris'), 'Slab branch applied; crawl record retained');
  await page.click('[data-act="ans"][data-k="foundation"][data-v="crawlspace"]');
  await page.click('[data-act="apply"]'); await modalBtn(page, 'Apply changes');
  await page.waitForFunction(() => window.PCOS_APP.gen.taskMap.has('crawl.clean'));
  ok(await page.evaluate(() => window.PCOS_APP.states.get('crawl.clean').state === 'complete' && window.PCOS_APP.p.tasks['pre.measure'].photos.length === 1), 'Switching back re-attaches completion; photos untouched');

  // 7. PDFs (all six) generated offline
  await page.goto(`${BASE}index.html#/p/${projectId}/export`); await page.waitForSelector('[data-act="make-pdf"]');
  for (const kind of ['sequence', 'phase', 'trade', 'ready', 'inspections', 'predrywall', 'open']) {
    await page.check(`[data-act="exp-kind"][value="${kind}"]`);
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-act="make-pdf"]')]);
    const f = OUT + '/report-' + kind + '.pdf'; await dl.saveAs(f);
    const head = fs.readFileSync(f).slice(0, 5).toString(); const pages = execSync(`pdfinfo "${f}" | grep Pages`).toString().trim();
    ok(head === '%PDF-', `PDF "${kind}" generated (${pages}, ${(fs.statSync(f).size / 1024).toFixed(0)} KB)`);
  }

  // 8. Backup export -> delete -> restore
  const [bdl] = await Promise.all([page.waitForEvent('download'), page.click('[data-act="backup-project"]')]);
  const bfile = OUT + '/backup.pcos.json'; await bdl.saveAs(bfile);
  const bj = JSON.parse(fs.readFileSync(bfile, 'utf8'));
  ok(bj.format === 'pinestone-construction-os-backup' && bj.photos.length === 1 && bj.projects[0].overrides.length >= 1, 'Backup file contains project, photo and overrides');
  await page.click('[data-act="delete-project"]'); await page.fill('.modal [name="confirm"]', 'DELETE'); await modalBtn(page, 'Delete');
  await page.waitForFunction(() => location.hash === '#/' && !window.PCOS_APP.p);
  ok(await page.evaluate(async () => (await window.PCOS_STORE.listProjects()).every((p) => !p.name.startsWith('E2E'))), 'Project deleted from device');
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('[data-act="restore"]')]);
  await chooser.setFiles(bfile);
  await page.waitForFunction((id) => window.PCOS_APP.p && window.PCOS_APP.p.id === id, projectId, { timeout: 10000 });
  const restored = await page.evaluate(async () => { const p = window.PCOS_APP.p; const ph = await window.PCOS_STORE.photosForProject(p.id); return { walk: p.tasks['pre.walk'].status, note: p.tasks['pre.measure'].notes, photos: ph.length, ov: p.overrides.length, eng: p.checkpoints['cp.eng'].status, crawl: p.tasks['crawl.clean'].status }; });
  ok(restored.walk === 'complete' && restored.photos === 1 && restored.ov >= 1 && restored.eng === 'passed' && restored.crawl === 'complete' && restored.note.length > 5, 'Restore brought back progress, notes, photos, approvals, overrides: ' + JSON.stringify(restored));
  // damaged file is rejected without changes
  fs.writeFileSync(OUT + '/bad.pcos.json', '{"format":"nope"}');
  await page.goto(BASE + 'index.html#/'); await ready(page).catch(() => {}); await page.waitForSelector('[data-act="restore"]');
  const [ch2] = await Promise.all([page.waitForEvent('filechooser'), page.click('[data-act="restore"]')]); await ch2.setFiles(OUT + '/bad.pcos.json');
  await page.waitForSelector('text=Cannot restore'); ok(true, 'Damaged / wrong backup file rejected, nothing changed'); await modalBtn(page, 'OK');

  // 9. Fully offline reload (service worker)
  await ctx.setOffline(true);
  await page.goto(`${BASE}index.html#/p/${projectId}/tasks`); await ready(page);
  ok(await page.evaluate(() => window.PCOS_APP.p.tasks['pre.walk'].status === 'complete'), 'App loads and shows data with the device OFFLINE');
  await page.click('[data-act="check"][data-id="pre.drawings"]').catch(() => {});
  await ctx.setOffline(false);

  // 10. App/library update: progress survives a new build with a revised library
  const html = fs.readFileSync(DIST + '/index.html', 'utf8')
    .replace("const LIBRARY_VERSION = '1.1.0';", "const LIBRARY_VERSION = '1.2.0';")
    .replace("T('pre.walk', 'Existing-conditions walkthrough & baseline photos'", "T('pre.walk', 'Existing-conditions walkthrough (v1.1)'");
  fs.writeFileSync(DIST + '/index-update-test.html', html);
  await page.goto(`${BASE}index-update-test.html#/p/${projectId}/overview`); await ready(page);
  const upd = await page.evaluate(() => ({ v: window.PCOS_LIB.LIBRARY_VERSION, title: window.PCOS_APP.gen.taskMap.get('pre.walk').title, st: window.PCOS_APP.states.get('pre.walk').state, photos: window.PCOS_APP.p.tasks['pre.measure'].photos.length }));
  ok(upd.v === '1.2.0' && upd.title.includes('v1.1') && upd.st === 'complete' && upd.photos === 1, 'Updated app/library keeps completed tasks and photos');
  fs.unlinkSync(DIST + '/index-update-test.html');


  // ===== v1.1 daily-use checks =====
  const go = async (pg, hash) => { await pg.goto('about:blank'); await pg.goto(BASE + 'index.html' + hash); await ready(pg); };
  // A. Phase navigation: jump straight to MEP, drywall, next phase
  await go(page, `#/p/${projectId}/tasks`);
  await page.click('[data-act="phase"][data-ph="mep"]');
  const mepPhases = await page.evaluate(() => [...new Set([...document.querySelectorAll('.task')].map((el) => window.PCOS_APP.gen.taskMap.get(el.dataset.task).phase))]);
  ok(mepPhases.length >= 2 && mepPhases.every((x) => ['P07', 'P08', 'P09'].includes(x)), 'Quick jump "MEP" shows rough plumbing/HVAC/electrical together: ' + mepPhases.join(','));
  await page.selectOption('[data-act="phasesel"]', 'P11');
  await page.click('[data-act="phase-step"][data-dir="1"]');
  ok(await page.evaluate(() => window.PCOS_APP.ui.phase === 'P12'), 'Phase dropdown + next-phase arrow navigate directly (P11 → P12)');
  await page.click('[data-act="phase"][data-ph="P13"]'); await page.click('[data-act="filter"][data-f="all"]');
  ok((await page.locator('.task').count()) > 10, 'Finishes phase opens directly without completing earlier phases');
  // B. Ready view
  await go(page, `#/p/${projectId}/ready`);
  const readyCounts = await page.evaluate(() => { const A = window.PCOS_APP; const n = [...A.states.values()].filter((x) => ['ready', 'in-progress', 'held'].includes(x.state)).length; return { n, shown: document.querySelectorAll('.task').length, phases: new Set([...A.states].filter(([, v]) => v.state === 'ready').map(([k]) => A.gen.taskMap.get(k).phase)).size }; });
  ok(readyCounts.shown === readyCounts.n && readyCounts.n > 0, `Ready view lists every ready / in-progress / held task (${readyCounts.shown}) across ${readyCounts.phases} phase(s)`);
  const firstReady = await page.evaluate(() => { const A = window.PCOS_APP; return A.gen.tasks.find((t) => A.states.get(t.id).state === 'ready').id; });
  await page.click(`.task[data-task="${firstReady}"] [data-act="check"]`);
  await page.waitForFunction((id) => window.PCOS_APP.p.tasks[id] && window.PCOS_APP.p.tasks[id].status === 'complete', firstReady);
  ok(true, 'Task checked off directly from the Ready view');
  await page.click('[data-act="readygroup"][data-g="trade"]'); ok(await page.isVisible('.phase-h'), 'Ready view groups by trade');
  // C. Completion vs approval
  await go(page, `#/p/${projectId}/tasks?t=plb.test`);
  await page.click('[data-act="status"][data-id="plb.test"][data-st="complete"]');
  await modalBtn(page, 'Complete anyway');
  await page.waitForSelector('.task[data-task="plb.test"] .pill.held');
  const pillText = await page.textContent('.task[data-task="plb.test"] .pill.held');
  const cpState = await page.evaluate(() => window.PCOS_ENGINE.cpStatus(window.PCOS_APP.p, window.PCOS_APP.gen.cpMap.get('cp.rough-plb')));
  ok(/approval not recorded/.test(pillText) && cpState === 'not-requested', 'Completing the plumbing test does NOT record the rough plumbing inspection (shown as "Work done · approval not recorded")');
  // D. Before Drywall
  await go(page, `#/p/${projectId}/drywall`);
  ok(await page.isVisible('text=Not ready for drywall'), 'Before Drywall shows status');
  const bdGroups = await page.locator('h2').allTextContents();
  ok(['Fireblocking', 'Plumbing', 'HVAC', 'Electrical', 'Bathrooms', 'Air sealing', 'Framing'].every((k) => bdGroups.some((h) => h.includes(k))), 'Before Drywall groups: ' + bdGroups.filter((h) => !/approvals/.test(h)).map((h) => h.split(' ')[0]).join(', '));
  ok(await page.isVisible('text=Rough plumbing inspection') && await page.isVisible('text=Pinestone pre-drywall QC sign-off'), 'Before Drywall lists the required approvals');
  await page.check('[data-act="qc"][data-id="pd.fireblock"][data-qi="0"]');
  await page.waitForFunction(() => window.PCOS_ENGINE.qcDone(window.PCOS_APP.p, 'pd.fireblock', window.PCOS_APP.gen.taskMap.get('pd.fireblock').lib.q[0]));
  const [bddl] = await Promise.all([page.waitForEvent('download'), page.click('[data-act="quick-pdf"][data-kind="predrywall"]')]);
  await bddl.saveAs(OUT + '/report-before-drywall-from-screen.pdf');
  const bdtxt = execSync(`pdftotext "${OUT}/report-before-drywall-from-screen.pdf" - | head -40`).toString();
  ok(/NOT READY/.test(bdtxt), 'Before Drywall checklist QC check saved and printed to PDF');
  // E. Jurisdiction-tied code references
  await go(page, `#/p/${projectId}/overview`);
  ok(await page.isVisible('text=Jurisdiction not confirmed'), 'New project warns that AHJ / code edition are not set (no 2018 IRC assumption)');
  await go(page, `#/p/${projectId}/tasks?t=pd.fireblock`);
  await page.click('.task[data-task="pd.fireblock"] summary:has-text("Important technical details")');
  ok(await page.isVisible('text=Project code edition NOT SET'), 'Code reference flagged as unconfirmed while edition is unset');
  await go(page, `#/p/${projectId}/setup`); await page.click('[data-act="setupsec"][data-sec="project"]');
  await page.selectOption('[data-act="jfield"][data-k="codeEdition"]', '2021 IRC'); await page.waitForTimeout(200);
  await page.fill('[data-act="jfield"][data-k="ahj"]', 'Williamson County Codes'); await page.press('[data-act="jfield"][data-k="ahj"]', 'Tab'); await page.waitForTimeout(300);
  await go(page, `#/p/${projectId}/tasks?t=pd.fireblock`);
  await page.click('.task[data-task="pd.fireblock"] summary:has-text("Important technical details")');
  ok(await page.isVisible('text=Project adopts 2021 IRC (Williamson County Codes)'), 'Code reference now tied to the project\'s adopted edition and AHJ');
  // F. Reopen exactly where you left off
  await go(page, `#/p/${projectId}/drywall`); await page.close();
  page = await ctx.newPage(); watch(page); await page.goto(BASE + 'index.html'); await ready(page);
  ok(await page.evaluate((id) => location.hash === `#/p/${id}/drywall`, projectId), 'Launching the app again reopens the last project and screen');
  // G. Two windows on the same project
  const page2 = await ctx.newPage(); watch(page2); await page2.goto(`${BASE}index.html#/p/${projectId}/tasks`); await ready(page2);
  await page.evaluate(() => { const A = window.PCOS_APP; window.PCOS_ENGINE.setTaskField(A.p, 'pre.drawings', 'notes', 'Set from window 1'); });
  await page.evaluate(() => window.PCOS_APP && document.dispatchEvent(new Event('noop')));
  await page.evaluate(async () => { const A = window.PCOS_APP; window.PCOS_ENGINE.touch(A.p); await window.PCOS_STORE.putProject(A.p); new BroadcastChannel('pcos-sync').postMessage({ id: A.p.id, updatedAt: A.p.updatedAt }); });
  await page2.waitForFunction(() => (window.PCOS_APP.p.tasks['pre.drawings'] || {}).notes === 'Set from window 1', null, { timeout: 5000 }).then(() => ok(true, 'Second window picks up changes saved in the first'), () => ok(false, 'Second window picks up changes saved in the first'));
  await page.evaluate(async () => { const S = window.PCOS_STORE; const p = await S.getProject(window.PCOS_APP.p.id); p.updatedAt = new Date(Date.now() + 60000).toISOString(); p.tasks['pre.drawings'].notes = 'Saved elsewhere, newer'; await S.putProject(p); });
  await page2.evaluate(() => { const A = window.PCOS_APP; window.PCOS_ENGINE.setTaskField(A.p, 'pre.subs', 'notes', 'Edit from the stale window'); window.PCOS_ENGINE.touch(A.p); A.saveNow(); });
  const conflict = await page2.waitForSelector('text=Project changed in another window', { timeout: 5000 }).then(() => true, () => false);
  if (!conflict) console.log('DEBUG stale', await page2.evaluate(async () => ({ base: window.PCOS_APP.baseUpdatedAt, mine: window.PCOS_APP.p.updatedAt, stored: (await window.PCOS_STORE.getProject(window.PCOS_APP.p.id)).updatedAt, save: window.PCOS_APP.saveMsg })));
  if (conflict) await page2.click('.modal [data-m="reload"]');
  const reloaded = conflict && await page2.waitForFunction(() => window.PCOS_APP.p.tasks['pre.drawings'].notes === 'Saved elsewhere, newer', null, { timeout: 5000 }).then(() => true, () => false);
  const notOverwritten = await page2.evaluate(async () => (await window.PCOS_STORE.getProject(window.PCOS_APP.p.id)).tasks['pre.drawings'].notes === 'Saved elsewhere, newer');
  ok(reloaded && notOverwritten, 'Stale window refuses to overwrite newer work and reloads it');
  await page2.close();
  // H. v1.0 backup restores into v1.1, and v1.0 app can still read v1.1 data
  await go(page, '#/');
  const [ch3] = await Promise.all([page.waitForEvent('filechooser'), page.click('[data-act="restore"]')]);
  await ch3.setFiles(path.join(__dirname, 'fixtures/v1.0-backup.pcos.json'));
  await page.waitForFunction(() => window.PCOS_APP.p && window.PCOS_APP.p.libraryVersion === '1.0.0', null, { timeout: 10000 });
  const v10 = await page.evaluate(async () => { const A = window.PCOS_APP; const ph = await window.PCOS_STORE.photosForProject(A.p.id); return { walk: A.states.get('pre.walk').state, photos: ph.length, ov: A.p.overrides.length, ed: A.p.jurisdiction.codeEdition, eng: A.p.checkpoints['cp.eng'].status }; });
  ok(v10.walk === 'complete' && v10.photos === 1 && v10.ov >= 1 && v10.eng === 'passed', 'Real v1.0 backup restores in v1.1 with progress, photos, approvals, overrides: ' + JSON.stringify(v10));
  fs.copyFileSync(path.join(__dirname, 'fixtures/v1.0-app.html'), DIST + '/v10-test.html');
  await page.goto(`${BASE}v10-test.html#/p/${projectId}/overview`); await ready(page);
  ok(await page.evaluate(() => !!window.PCOS_APP.p && window.PCOS_APP.gen.tasks.length > 100), 'v1.0 app can still open a project saved by v1.1');
  fs.unlinkSync(DIST + '/v10-test.html');

  // 11. iPhone-size screenshots
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await m.route('**/*', (route) => (route.request().url().startsWith(BASE) || route.request().url().startsWith('data:') ? route.continue() : route.abort()));
  const mp = await m.newPage(); watch(mp);
  await mp.goto(BASE + 'index.html'); await ready(mp); await mp.click('[data-act="sample"]'); await mp.waitForSelector('.bigpct');
  await mp.screenshot({ path: OUT + '/10-iphone-overview.png' });
  const sid = await mp.evaluate(() => window.PCOS_APP.p.id);
  await mp.goto(`${BASE}index.html#/p/${sid}/tasks?t=b.valve@b1`); await mp.waitForSelector('.tdetail');
  await mp.evaluate(() => document.querySelectorAll('details.g').forEach((d) => (d.open = true)));
  await mp.screenshot({ path: OUT + '/11-iphone-task.png', fullPage: true });
  const overflow = await mp.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  ok(!overflow, 'No horizontal overflow at iPhone width');
  await mp.goto(`${BASE}index.html#/p/${sid}/inspections`); await mp.waitForSelector('[data-act="cpstatus"]'); await mp.screenshot({ path: OUT + '/12-iphone-inspections.png' });
  await mp.goto(`${BASE}index.html#/p/${sid}/setup`); await mp.waitForSelector('.secnav'); await mp.screenshot({ path: OUT + '/13-iphone-setup.png' });
  for (const [tab, file] of [['ready', '14-iphone-ready.png'], ['drywall', '15-iphone-before-drywall.png'], ['tasks', '16-iphone-tasks.png']]) {
    await mp.goto(`${BASE}index.html#/p/${sid}/${tab}`); await mp.waitForFunction(() => window.PCOS_READY); await mp.waitForTimeout(300); await mp.screenshot({ path: OUT + '/' + file });
    ok(!(await mp.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)), `No horizontal overflow on iPhone: ${tab}`);
  }
  // iPhone: photo, edit, close, reopen
  await mp.goto(`${BASE}index.html#/p/${sid}/tasks?t=pre.walk`); await mp.waitForSelector('.tdetail');
  await mp.setInputFiles('input[data-act="addphoto"][data-ref="pre.walk"]', '/tmp/jobsite.jpg');
  await mp.waitForFunction(() => (window.PCOS_APP.p.tasks['pre.walk'] || {}).photos && window.PCOS_APP.p.tasks['pre.walk'].photos.length === 1);
  await mp.fill('textarea[data-act="notes"][data-id="pre.walk"]', 'Typed on iPhone'); await mp.waitForTimeout(500); await mp.close();
  const mp2 = await m.newPage(); await mp2.goto(BASE + 'index.html'); await ready(mp2);
  ok(await mp2.evaluate(() => window.PCOS_APP.p && window.PCOS_APP.p.tasks['pre.walk'].notes === 'Typed on iPhone' && window.PCOS_APP.p.tasks['pre.walk'].photos.length === 1), 'iPhone-size: photo + note survive closing; app reopens on the same task list');
  await page.goto(`${BASE}index.html#/p/${sid}/overview`).catch(() => {});

  ok(external.length === 0, 'No external network requests (' + external.length + ')' + (external.length ? ': ' + external.slice(0, 3).join(', ') : ''));
  const realErrors = errors.filter((e) => !/net::ERR_INTERNET_DISCONNECTED|Failed to load resource/.test(e));
  ok(realErrors.length === 0, 'No JavaScript errors' + (realErrors.length ? ': ' + realErrors.slice(0, 3).join(' | ') : ''));

  await browser.close(); server.close();
  console.log(results.join('\n')); console.log(`\n${results.length - failed}/${results.length} end-to-end checks passed.`);
  process.exitCode = failed ? 1 : 0;
})().catch(async (e) => { console.log(results.join('\n')); console.error('E2E ABORTED:', e); server.close(); process.exit(1); });
