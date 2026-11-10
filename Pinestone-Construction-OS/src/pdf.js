/* Pinestone Construction OS — Branded PDF reports (pdf-lib, bundled locally; works offline). */
(function (root) {
  'use strict';
  const PDFLib = root.PDFLib || (typeof require !== 'undefined' ? require('pdf-lib') : null);
  const E = root.PCOS_ENGINE || (typeof require !== 'undefined' ? require('./engine.js') : null);
  const LIB = root.PCOS_LIB || (typeof require !== 'undefined' ? require('./library.js') : null);
  const { PDFDocument, StandardFonts, rgb } = PDFLib;

  const C = { ink: rgb(0.13, 0.14, 0.15), char: rgb(0.17, 0.18, 0.19), mid: rgb(0.42, 0.44, 0.47), light: rgb(0.62, 0.64, 0.67), rule: rgb(0.82, 0.83, 0.85), band: rgb(0.95, 0.955, 0.96), white: rgb(1, 1, 1), red: rgb(0.62, 0.17, 0.15), amber: rgb(0.62, 0.42, 0.05), green: rgb(0.16, 0.42, 0.25) };
  const W = 612, H = 792, M = 40;

  // WinAnsi-safe text for standard PDF fonts
  const SAFE_EXTRA = '–—‘’“”•°½¼¾×±§©®·';
  function safe(s) {
    return String(s == null ? '' : s).replace(/→/g, '->').replace(/←/g, '<-').replace(/≤/g, '<=').replace(/≥/g, '>=').replace(/✓|✔/g, 'v').replace(/[   ]/g, ' ').replace(/−/g, '-').replace(/…/g, '...')
      .replace(/[^\x20-\x7E\n]/g, (ch) => (SAFE_EXTRA.includes(ch) ? ch : '?'));
  }

  class Doc {
    constructor(pdf, fonts, meta) { this.pdf = pdf; this.f = fonts; this.meta = meta; this.page = null; this.y = 0; this.pages = []; }
    wrap(text, font, size, width) {
      const out = []; for (const para of safe(text).split('\n')) {
        const words = para.split(/\s+/).filter(Boolean); let line = '';
        for (const w of words) { const t = line ? line + ' ' + w : w; if (font.widthOfTextAtSize(t, size) <= width) line = t; else { if (line) out.push(line); let ww = w; while (font.widthOfTextAtSize(ww, size) > width) { let k = ww.length; while (k > 1 && font.widthOfTextAtSize(ww.slice(0, k), size) > width) k--; out.push(ww.slice(0, k)); ww = ww.slice(k); } line = ww; } }
        out.push(line);
      } return out;
    }
    text(str, x, y, size, font, color) { this.page.drawText(safe(str), { x, y, size, font: font || this.f.reg, color: color || C.ink }); }
    rtext(str, xr, y, size, font, color) { const s = safe(str); const f = font || this.f.reg; this.page.drawText(s, { x: xr - f.widthOfTextAtSize(s, size), y, size, font: f, color: color || C.ink }); }
    newPage() {
      this.page = this.pdf.addPage([W, H]); this.pages.push(this.page);
      const m = this.meta; let top = H - M;
      // brand block
      if (m.logo) { const s = Math.min(150 / m.logo.width, 34 / m.logo.height); this.page.drawImage(m.logo, { x: M, y: top - m.logo.height * s, width: m.logo.width * s, height: m.logo.height * s }); }
      else { let x = M; for (const ch of 'PINESTONE') { this.text(ch, x, top - 16, 15, this.f.bold, C.char); x += this.f.bold.widthOfTextAtSize(ch, 15) + 1.6; } x = M; for (const ch of 'DEVELOPMENT') { this.text(ch, x + 0.5, top - 27, 6.5, this.f.reg, C.mid); x += this.f.reg.widthOfTextAtSize(ch, 6.5) + 3.1; } }
      this.rtext(m.title, W - M, top - 12, 12, this.f.bold, C.char);
      this.rtext(m.subtitle || '', W - M, top - 25, 8.5, this.f.reg, C.mid);
      top -= 38; this.page.drawLine({ start: { x: M, y: top }, end: { x: W - M, y: top }, thickness: 1.2, color: C.char });
      top -= 12;
      this.text(m.project.name, M, top, 9.5, this.f.bold, C.ink);
      this.rtext(m.project.address || '', W - M, top, 8.5, this.f.reg, C.mid);
      top -= 11;
      const j = m.project.jurisdiction || {};
      this.text(`AHJ: ${j.ahj || 'not set'}  ·  Code: ${j.codeEdition || '-'}${j.permitNo ? '  ·  Permit #' + j.permitNo : ''}`, M, top, 7.5, this.f.reg, C.mid);
      this.rtext('Generated ' + m.generated, W - M, top, 7.5, this.f.reg, C.mid);
      top -= 6; this.page.drawLine({ start: { x: M, y: top }, end: { x: W - M, y: top }, thickness: 0.5, color: C.rule });
      this.y = top - 14;
    }
    ensure(h) { if (!this.page || this.y - h < M + 22) this.newPage(); }
    finish() {
      const n = this.pages.length;
      this.pages.forEach((pg, i) => {
        this.page = pg;
        pg.drawLine({ start: { x: M, y: M + 6 }, end: { x: W - M, y: M + 6 }, thickness: 0.5, color: C.rule });
        this.text('Pinestone Development  ·  Construction OS', M, M - 4, 7, this.f.reg, C.mid);
        this.rtext(`Page ${i + 1} of ${n}`, W - M, M - 4, 7, this.f.reg, C.mid);
        const j = this.meta.project.jurisdiction || {};
        const note = `Code references cite 2018 IRC / NEC model-code sections. This project: ${j.codeEdition || 'code edition NOT SET'}${j.ahj ? ' (' + j.ahj + ')' : ''} — confirm edition and local amendments with the AHJ.`;
        this.text(note, W / 2 - this.f.ital.widthOfTextAtSize(note, 6) / 2, M - 14, 6, this.f.ital, C.light);
      });
    }
    band(label, right) {
      this.ensure(30); this.y -= 4;
      this.page.drawRectangle({ x: M, y: this.y - 6, width: W - 2 * M, height: 19, color: C.band });
      this.page.drawRectangle({ x: M, y: this.y - 6, width: 3, height: 19, color: C.char });
      this.text(label, M + 9, this.y, 10.5, this.f.bold, C.char);
      if (right) this.rtext(right, W - M - 8, this.y, 8, this.f.reg, C.mid);
      this.y -= 22;
    }
    sub(label) { this.ensure(20); this.text(label, M, this.y, 8.5, this.f.bold, C.mid); this.y -= 13; }
    para(str, size, font, color, indent) { const x = M + (indent || 0); for (const l of this.wrap(str, font || this.f.reg, size || 8.5, W - M - x)) { this.ensure(size + 4); this.text(l, x, this.y, size || 8.5, font || this.f.reg, color || C.ink); this.y -= (size || 8.5) + 3; } }
    box(x, y, size, mark) {
      this.page.drawRectangle({ x, y, width: size, height: size, borderColor: C.char, borderWidth: 0.9, color: C.white });
      if (mark === 'check') { this.page.drawLine({ start: { x: x + 2, y: y + size * 0.5 }, end: { x: x + size * 0.42, y: y + 2 }, thickness: 1.4, color: C.char }); this.page.drawLine({ start: { x: x + size * 0.42, y: y + 2 }, end: { x: x + size - 1.5, y: y + size - 1.5 }, thickness: 1.4, color: C.char }); }
      if (mark === 'na') this.page.drawLine({ start: { x: x + 2, y: y + size / 2 }, end: { x: x + size - 2, y: y + size / 2 }, thickness: 1.2, color: C.mid });
    }
  }

  const fmtDate = (d) => (d ? String(d).slice(0, 10) : '');
  const stateColor = (s) => ({ blocked: C.red, held: C.amber, complete: C.green }[s] || C.mid);

  async function makeDoc(ctx, title, subtitle) {
    const pdf = await PDFDocument.create();
    pdf.setTitle(`${title} — ${ctx.project.name}`); pdf.setAuthor('Pinestone Development'); pdf.setCreator('Pinestone Construction OS'); pdf.setProducer('Pinestone Construction OS (pdf-lib)');
    const fonts = { reg: await pdf.embedFont(StandardFonts.Helvetica), bold: await pdf.embedFont(StandardFonts.HelveticaBold), ital: await pdf.embedFont(StandardFonts.HelveticaOblique) };
    let logo = null;
    if (ctx.logo && ctx.logo.bytes) { try { logo = ctx.logo.type === 'png' ? await pdf.embedPng(ctx.logo.bytes) : await pdf.embedJpg(ctx.logo.bytes); } catch (e) { logo = null; } }
    const d = new Doc(pdf, fonts, { title, subtitle, project: ctx.project, logo, generated: new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) });
    d.newPage(); return d;
  }

  function taskRow(d, ctx, t, o) {
    const st = ctx.states.get(t.id); const rec = E.getTaskRec(ctx.project, t.id);
    const trade = rec.trade || t.trade;
    const x0 = M, tx = M + 18, colR = W - M, tradeW = 118;
    const titleLines = d.wrap(t.title, d.f.bold, 9.5, colR - tradeW - tx - 6);
    const meta = [];
    if (o.showId) meta.push(t.id);
    meta.push(E.STATE_LABEL[st.state]);
    if (st.state === 'blocked' && rec.blockedReason) meta.push('Reason: ' + rec.blockedReason);
    if (st.gatesOpen.length) meta.push('HOLD until: ' + st.gatesOpen.map((g) => ctx.gen.cpMap.get(g).name).join('; '));
    if (st.overridden.length) meta.push('PROCEEDING UNDER OVERRIDE (not approved): ' + st.overridden.map((g) => ctx.gen.cpMap.get(g).name).join('; '));
    if (o.showDeps && st.depsOpen.length && st.state !== 'complete') meta.push('After: ' + st.depsOpen.slice(0, 4).map((x) => ctx.gen.taskMap.get(x).title).join('; ') + (st.depsOpen.length > 4 ? ` (+${st.depsOpen.length - 4} more)` : ''));
    if (rec.status === 'complete') meta.push('Completed ' + fmtDate(rec.completedAt));
    if (t.lib.photo && rec.status !== 'complete' && rec.status !== 'na') meta.push('PHOTOGRAPH BEFORE CONCEALING');
    const metaLines = d.wrap(meta.join('  ·  '), d.f.reg, 7.5, colR - tx);
    const qc = o.qc && rec.status !== 'complete' && rec.status !== 'na' ? (t.lib.q || []) : [];
    const notes = o.notes && (rec.notes || '').trim() ? d.wrap('Notes: ' + rec.notes.trim(), d.f.ital, 7.5, colR - tx) : [];
    const qcLines = []; for (const q of qc) for (const [i, l] of d.wrap(q, d.f.reg, 7.8, colR - tx - 14).entries()) qcLines.push({ l, first: i === 0, done: E.qcDone(ctx.project, t.id, q) });
    const h = titleLines.length * 12 + metaLines.length * 9.5 + qcLines.length * 10 + notes.length * 9.5 + (o.writeIn && rec.status !== 'complete' && rec.status !== 'na' ? 14 : 0) + 7;
    d.ensure(Math.min(h, 300));
    const top = d.y;
    d.box(x0 + 1, d.y - 2, 11, rec.status === 'complete' ? 'check' : rec.status === 'na' ? 'na' : null);
    titleLines.forEach((l, i) => { d.ensure(12); d.text(l, tx, d.y, 9.5, d.f.bold, rec.status === 'na' ? C.light : C.ink); if (i === 0) d.rtext(trade, colR, d.y, 7.8, d.f.reg, C.mid); d.y -= 12; });
    metaLines.forEach((l) => { d.ensure(10); d.text(l, tx, d.y + 1, 7.5, d.f.reg, stateColor(st.state)); d.y -= 9.5; });
    qcLines.forEach((q) => { d.ensure(10); if (q.first) d.box(tx, d.y - 0.5, 7, q.done ? 'check' : null); d.text(q.l, tx + 12, d.y, 7.8, d.f.reg, C.ink); d.y -= 10; });
    notes.forEach((l) => { d.ensure(10); d.text(l, tx, d.y, 7.5, d.f.ital, C.mid); d.y -= 9.5; });
    if (o.writeIn && rec.status !== 'complete' && rec.status !== 'na') { d.ensure(14); d.text('Date ________   By ________   Notes ____________________________________________', tx, d.y - 1, 7.5, d.f.reg, C.light); d.y -= 14; }
    d.page.drawLine({ start: { x: tx, y: d.y + 5 }, end: { x: colR, y: d.y + 5 }, thickness: 0.35, color: C.rule }); d.y -= 9;
    return top;
  }

  function summary(d, ctx, tasks) {
    const c = { total: 0, complete: 0, na: 0 }; for (const t of tasks) { c.total++; const s = ctx.states.get(t.id).state; if (s === 'complete') c.complete++; if (s === 'na') c.na++; }
    const pct = c.total - c.na ? Math.round((c.complete / (c.total - c.na)) * 100) : 0;
    d.ensure(26);
    d.text(`${c.complete} of ${c.total - c.na} applicable tasks complete (${pct}%)` + (c.na ? ` · ${c.na} marked N/A` : ''), M, d.y, 9, d.f.reg, C.ink);
    const bw = 160; d.page.drawRectangle({ x: W - M - bw, y: d.y - 1, width: bw, height: 7, color: C.band, borderColor: C.rule, borderWidth: 0.5 });
    d.page.drawRectangle({ x: W - M - bw, y: d.y - 1, width: bw * pct / 100, height: 7, color: C.char });
    d.y -= 14;
    d.text('Legend:', M, d.y, 7.5, d.f.bold, C.mid); d.box(M + 32, d.y - 1.5, 8, null); d.text('open', M + 43, d.y, 7.5, d.f.reg, C.mid); d.box(M + 66, d.y - 1.5, 8, 'check'); d.text('complete', M + 77, d.y, 7.5, d.f.reg, C.mid); d.box(M + 116, d.y - 1.5, 8, 'na'); d.text('not applicable', M + 127, d.y, 7.5, d.f.reg, C.mid);
    d.text('HOLD = required inspection/approval not yet recorded as passed.', M + 190, d.y, 7.5, d.f.reg, C.amber);
    d.y -= 16;
  }

  function tasksByPhase(d, ctx, tasks, o) {
    for (const ph of ctx.gen.phases) {
      const ts = tasks.filter((t) => t.phase === ph.id); if (!ts.length) continue;
      const done = ts.filter((t) => ['complete', 'na'].includes(ctx.states.get(t.id).state)).length;
      d.band(`${ph.id.replace('P', '')}  ${ph.name}`, `${done}/${ts.length} done`);
      for (const t of ts) taskRow(d, ctx, t, o);
    }
  }

  const PDF = {};
  PDF.KINDS = { sequence: 'Complete construction sequence', phase: 'Phase task list', trade: 'Trade task list', ready: 'Ready to start (field list)', inspections: 'Inspection & approval checklist', predrywall: 'Before Drywall checklist', open: 'Incomplete & blocked tasks' };
  const GROUPS = { mep: ['P07', 'P08', 'P09'] };

  PDF.build = async function (kind, ctx) {
    const o = Object.assign({ qc: true, notes: true, includeComplete: true, writeIn: true, showDeps: true, showId: false }, ctx.opts || {});
    let d; const gen = ctx.gen;
    const filterDone = (ts) => (o.includeComplete ? ts : ts.filter((t) => !['complete', 'na'].includes(ctx.states.get(t.id).state)));
    if (kind === 'sequence') {
      d = await makeDoc(ctx, 'Construction Sequence', 'Full gut renovation — all phases');
      summary(d, ctx, gen.tasks); tasksByPhase(d, ctx, filterDone(gen.tasks), o);
    } else if (kind === 'phase') {
      const ids = GROUPS[o.phaseId] || [o.phaseId]; const ph = gen.phases.find((p) => p.id === ids[0]) || gen.phases[0];
      d = await makeDoc(ctx, GROUPS[o.phaseId] ? 'MEP Rough-In Task List' : 'Phase ' + ph.id.replace('P', '') + ' Task List', GROUPS[o.phaseId] ? 'Phases 07–09: plumbing & gas, HVAC, electrical' : ph.name);
      const ts = gen.tasks.filter((t) => ids.includes(t.phase)); summary(d, ctx, ts); tasksByPhase(d, ctx, filterDone(ts), o);
      const cps = gen.checkpoints.filter((c) => ids.includes(c.phase));
      if (cps.length) { d.band('Checkpoints in this phase'); for (const cp of cps) cpRow(d, ctx, cp); }
    } else if (kind === 'trade') {
      const tr = o.trade; d = await makeDoc(ctx, 'Trade Task List', tr);
      const ts = gen.tasks.filter((t) => (E.getTaskRec(ctx.project, t.id).trade || t.trade) === tr);
      summary(d, ctx, ts);
      d.para('Work for this trade in construction order. Items marked HOLD may not start until the listed inspection or approval is recorded as passed by Pinestone.', 8, d.f.ital, C.mid); d.y -= 4;
      tasksByPhase(d, ctx, filterDone(ts), o);
    } else if (kind === 'inspections') {
      d = await makeDoc(ctx, 'Inspections & Approvals', 'Required checkpoints are recorded separately from task completion');
      d.para('Requirement "Confirm with AHJ" means the inspection may or may not be required for this jurisdiction; the app treats it as a hold until it is confirmed and recorded. Overrides allow work to proceed but never record an approval.', 8, d.f.ital, C.mid); d.y -= 6;
      for (const ph of gen.phases) { const cps = gen.checkpoints.filter((c) => c.phase === ph.id); if (!cps.length) continue; d.band(ph.name); for (const cp of cps) cpRow(d, ctx, cp, true); }
      overrides(d, ctx);
    } else if (kind === 'predrywall') {
      const bd = E.beforeDrywall(ctx.project, gen, ctx.states);
      d = await makeDoc(ctx, 'Before Drywall Checklist', 'Nothing gets covered until every line is checked');
      d.para(bd.ready ? 'STATUS: READY FOR DRYWALL — all listed work complete and required approvals recorded.' : `STATUS: NOT READY — ${bd.open} of ${bd.total} tasks open; ${bd.gatesOpen.length} required approval(s) not recorded. QC items checked: ${bd.qcDone}/${bd.qcTotal}.`, 9, d.f.bold, bd.ready ? C.green : C.amber); d.y -= 4;
      d.band('Required approvals before drywall (recorded inspection results)');
      for (const cp of bd.gates) cpRow(d, ctx, cp);
      for (const grp of bd.groups) { const done = grp.tasks.filter((t) => ['complete', 'na'].includes(ctx.states.get(t.id).state)).length; d.band(grp.name, `${done}/${grp.tasks.length} done`); for (const t of grp.tasks) taskRow(d, ctx, t, Object.assign({}, o, { qc: true, writeIn: false, showDeps: false })); }
      overrides(d, ctx);
    } else if (kind === 'ready') {
      d = await makeDoc(ctx, 'Ready to Start', 'Work that can begin now — prerequisites done, no inspection hold');
      for (const [s, label] of [['ready', 'Ready to start'], ['in-progress', 'In progress'], ['held', 'Ready except for an inspection']]) {
        const ts = gen.tasks.filter((t) => ctx.states.get(t.id).state === s); if (!ts.length) continue;
        d.band(label, ts.length + ' task' + (ts.length === 1 ? '' : 's'));
        for (const t of ts) taskRow(d, ctx, t, Object.assign({}, o, { showDeps: false, writeIn: true }));
      }
    } else if (kind === 'open') {
      d = await makeDoc(ctx, 'Incomplete & Blocked Work', 'What is stopped, what is held, what is ready');
      summary(d, ctx, gen.tasks);
      const groups = [['blocked', 'Blocked (manual hold)'], ['held', 'Held for inspection / approval'], ['in-progress', 'In progress'], ['ready', 'Ready to start'], ['waiting', 'Waiting on prerequisites']];
      for (const [s, label] of groups) {
        const ts = gen.tasks.filter((t) => ctx.states.get(t.id).state === s); if (!ts.length) continue;
        d.band(label, ts.length + ' task' + (ts.length === 1 ? '' : 's'));
        for (const t of ts) taskRow(d, ctx, t, Object.assign({}, o, { qc: s !== 'waiting' && o.qc, showDeps: true }));
      }
      const upcoming = E.stats(ctx.project, gen, ctx.states).cps.filter((c) => c.open);
      if (upcoming.length) { d.band('Open inspections & approvals'); for (const c of upcoming) cpRow(d, ctx, c.cp); }
    } else throw new Error('Unknown report ' + kind);
    d.finish();
    return d.pdf.save();
  };

  function cpRow(d, ctx, cp, full) {
    const p = ctx.project, rec = p.checkpoints[cp.id] || {};
    const req = E.cpReq(p, cp), status = E.cpStatus(p, cp);
    const afterOpen = cp.after.filter((id) => !['complete', 'na'].includes(E.getTaskRec(p, id).status));
    const passed = status === 'passed';
    const lines = d.wrap(cp.name, d.f.bold, 9.5, W - 2 * M - 150);
    d.ensure(46 + lines.length * 12);
    d.box(M + 1, d.y - 2, 11, passed ? 'check' : req === 'not-required' ? 'na' : null);
    lines.forEach((l, i) => { d.text(l, M + 18, d.y, 9.5, d.f.bold); if (i === 0) d.rtext(E.CP_STATUS_LABEL[status], W - M, d.y, 8, d.f.bold, passed ? C.green : status === 'failed' ? C.red : C.amber); d.y -= 12; });
    const meta = [E.KIND_LABEL[cp.lib.kind], 'Requirement: ' + E.CP_REQ_LABEL[req]];
    if (rec.reqNote) meta.push('(' + rec.reqNote + ')');
    if (rec.date) meta.push('Date: ' + fmtDate(rec.date)); if (rec.inspector) meta.push('By: ' + rec.inspector); if (rec.reference) meta.push('Ref: ' + rec.reference);
    for (const l of d.wrap(meta.join('  ·  '), d.f.reg, 7.5, W - 2 * M - 18)) { d.ensure(10); d.text(l, M + 18, d.y + 1, 7.5, d.f.reg, C.mid); d.y -= 9.5; }
    if (full && cp.lib.desc) for (const l of d.wrap(cp.lib.desc, d.f.ital, 7.5, W - 2 * M - 18)) { d.ensure(10); d.text(l, M + 18, d.y + 1, 7.5, d.f.ital, C.mid); d.y -= 9.5; }
    if (afterOpen.length && !passed) for (const l of d.wrap('Complete before requesting: ' + afterOpen.map((x) => ctx.gen.taskMap.get(x).title).join('; '), d.f.reg, 7.5, W - 2 * M - 18)) { d.ensure(10); d.text(l, M + 18, d.y + 1, 7.5, d.f.reg, C.ink); d.y -= 9.5; }
    if (rec.notes) for (const l of d.wrap('Notes: ' + rec.notes, d.f.ital, 7.5, W - 2 * M - 18)) { d.ensure(10); d.text(l, M + 18, d.y + 1, 7.5, d.f.ital, C.mid); d.y -= 9.5; }
    const ovs = p.overrides.filter((o) => o.active && o.checkpointId === cp.id);
    if (ovs.length && !passed) { d.ensure(10); d.text(`${ovs.length} active override(s) — work proceeding without this approval (see Overrides).`, M + 18, d.y + 1, 7.5, d.f.bold, C.red); d.y -= 9.5; }
    if (!passed && req !== 'not-required') { d.ensure(14); d.text('Result:  [  ] Pass   [  ] Partial   [  ] Fail      Date ________     Inspector _______________     Ref # ________', M + 18, d.y - 1, 7.5, d.f.reg, C.light); d.y -= 13; }
    d.page.drawLine({ start: { x: M + 18, y: d.y + 5 }, end: { x: W - M, y: d.y + 5 }, thickness: 0.35, color: C.rule }); d.y -= 10;
  }
  function overrides(d, ctx) {
    const list = ctx.project.overrides || []; if (!list.length) return;
    d.band('Override log (work allowed to proceed WITHOUT approval)', list.length + ' record(s)');
    for (const o of list) {
      const t = ctx.gen.taskMap.get(o.taskId), cp = ctx.gen.cpMap.get(o.checkpointId);
      d.para(`${fmtDate(o.at)}  ${o.active ? 'ACTIVE' : 'REVOKED'}  —  "${t ? t.title : o.taskId}" proceeded before "${cp ? cp.name : o.checkpointId}" (status then: ${E.CP_STATUS_LABEL[o.checkpointStatusAtOverride] || '-'}). Reason: ${o.reason}. By: ${o.by}.`, 8, d.f.reg, o.active ? C.red : C.mid);
      d.y -= 3;
    }
  }

  root.PCOS_PDF = PDF;
  if (typeof module !== 'undefined' && module.exports) module.exports = PDF;
})(typeof window !== 'undefined' ? window : globalThis);
