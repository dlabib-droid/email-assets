/* Pinestone Construction OS — Construction logic engine (pure, no DOM).
 * Generates the project task set from answers, resolves prerequisites and
 * inspection gates, computes readiness, and applies changes while preserving
 * every record (nothing is ever deleted by regeneration).
 */
(function (root) {
  'use strict';
  const LIB = root.PCOS_LIB || (typeof require !== 'undefined' ? require('./library.js') : null);
  const Q = root.PCOS_Q || (typeof require !== 'undefined' ? require('./questions.js') : null);

  const SCHEMA_VERSION = 1;
  const APP_VERSION = '1.1.0';
  const E = { SCHEMA_VERSION, APP_VERSION };

  const STATUS = ['not-started', 'in-progress', 'blocked', 'complete', 'na'];
  const STATUS_LABEL = { 'not-started': 'Not Started', 'in-progress': 'In Progress', blocked: 'Blocked', complete: 'Complete', na: 'Not Applicable' };
  const STATE_LABEL = { complete: 'Complete', na: 'N/A', blocked: 'Blocked', held: 'Held — inspection', waiting: 'Waiting on prerequisites', 'in-progress': 'In progress', ready: 'Ready to start' };
  const CP_STATUS = ['not-requested', 'requested', 'passed', 'partial', 'failed'];
  const CP_STATUS_LABEL = { 'not-requested': 'Not requested', requested: 'Requested / scheduled', passed: 'Passed / approved', partial: 'Partial approval', failed: 'Failed — corrections' };
  const CP_REQ_LABEL = { required: 'Required', verify: 'Confirm with AHJ', 'not-required': 'Not required' };
  const KIND_LABEL = { ahj: 'AHJ inspection / approval', utility: 'Utility', 'third-party': 'Third party', internal: 'Pinestone internal' };
  const TAG_LABEL = { C: 'Code', L: 'Verify locally', M: 'Manufacturer', S: 'Industry standard', P: 'Pinestone practice' };
  Object.assign(E, { STATUS, STATUS_LABEL, STATE_LABEL, CP_STATUS, CP_STATUS_LABEL, CP_REQ_LABEL, KIND_LABEL, TAG_LABEL });

  // ---------- helpers ----------
  const has = (arr, v) => Array.isArray(arr) && arr.includes(v);
  const exprCache = new Map();
  function compile(expr) {
    if (!expr) return () => true;
    if (exprCache.has(expr)) return exprCache.get(expr);
    let fn;
    try { fn = new Function('A', 'B', 'has', '"use strict"; return !!(' + expr + ');'); } catch (e) { throw new Error('Invalid condition: ' + expr + ' — ' + e.message); }
    const safe = (A, B) => { try { return fn(A, B || {}, has); } catch (e) { return false; } };
    exprCache.set(expr, safe);
    return safe;
  }
  E.compile = compile;
  const nowISO = () => new Date().toISOString();
  E.nowISO = nowISO;
  const uid = (p) => (p || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  E.uid = uid;
  const clone = (o) => JSON.parse(JSON.stringify(o));
  E.clone = clone;

  // ---------- answers ----------
  E.normalizeAnswers = function (answers) {
    const A = Object.assign({}, clone(Q.DEFAULTS), clone(answers || {}));
    for (const sec of Q.SECTIONS) for (const f of sec.fields) {
      if (sec.group) continue;
      if (f.type === 'checks' && !Array.isArray(A[f.id])) A[f.id] = [];
      if (f.type === 'toggle') A[f.id] = !!A[f.id];
    }
    if (!Array.isArray(A.baths)) A.baths = [];
    A.baths = A.baths.map((b, i) => {
      const nb = Object.assign({}, Q.BATH_DEFAULTS, b);
      if (!nb.id) nb.id = 'b' + (i + 1);
      if (!nb.name) nb.name = 'Bathroom ' + (i + 1);
      return nb;
    });
    return A;
  };
  // Bathroom ids are never reused: a removed bathroom's records stay attached to its own id.
  E.newBath = function (A, usedIds) {
    const taken = new Set([...(A.baths || []).map((b) => b.id), ...(usedIds || [])]);
    let id; do { id = 'b' + Math.random().toString(36).slice(2, 7); } while (taken.has(id));
    return Object.assign({}, Q.BATH_DEFAULTS, { id, name: 'Bathroom ' + ((A.baths || []).length + 1) });
  };
  E.usedBathIds = function (p) { const s = new Set(); for (const k of Object.keys(p.tasks || {}).concat(Object.keys(p.checkpoints || {}))) if (k.includes('@')) s.add(k.split('@')[1]); return s; };
  E.isFieldVisible = function (field, A, B) { return field.show ? compile(field.show)(A, B) : true; };

  // ---------- generation ----------
  E.generate = function (answers, lib) {
    lib = lib || LIB;
    const A = E.normalizeAnswers(answers);
    const libTask = new Map(lib.TASKS.map((t) => [t.id, t]));
    const libCp = new Map(lib.CHECKPOINTS.map((c) => [c.id, c]));
    const phaseIdx = new Map(lib.PHASES.map((p, i) => [p.id, i]));
    const bathById = new Map(A.baths.map((b) => [b.id, b]));
    const tasks = []; const taskMap = new Map();
    const isBathTask = (id) => { const t = libTask.get(id); return !!(t && t.each === 'bath'); };

    lib.TASKS.forEach((t, order) => {
      if (t.retired) return;
      const when = compile(t.w);
      if (t.each === 'bath') {
        A.baths.forEach((b, bi) => {
          if (!when(A, b)) return;
          const inst = { id: t.id + '@' + b.id, baseId: t.id, bathId: b.id, title: (b.name || 'Bathroom') + ': ' + t.t, lib: t, phase: t.ph, trade: t.tr, order: order * 100 + bi };
          tasks.push(inst); taskMap.set(inst.id, inst);
        });
      } else if (when(A, null)) {
        const inst = { id: t.id, baseId: t.id, bathId: null, title: t.t, lib: t, phase: t.ph, trade: t.tr, order: order * 100 };
        tasks.push(inst); taskMap.set(inst.id, inst);
      }
    });

    const cps = []; const cpMap = new Map();
    lib.CHECKPOINTS.forEach((c, order) => {
      if (c.retired) return;
      const when = compile(c.w);
      if (c.each === 'bath') {
        A.baths.forEach((b) => { if (when(A, b)) { const inst = { id: c.id + '@' + b.id, baseId: c.id, bathId: b.id, name: (b.name || 'Bathroom') + ': ' + c.name, lib: c, phase: c.ph, order }; cps.push(inst); cpMap.set(inst.id, inst); } });
      } else if (when(A, null)) { const inst = { id: c.id, baseId: c.id, bathId: null, name: c.name, lib: c, phase: c.ph, order }; cps.push(inst); cpMap.set(inst.id, inst); }
    });

    // Resolve a task reference into applicable instance ids. Inapplicable tasks are
    // replaced by their own prerequisites so dependency chains never break.
    const memo = new Map();
    function expandTask(baseId, bathId, stack) {
      const key = baseId + '|' + (bathId || '');
      if (memo.has(key)) return memo.get(key);
      const t = libTask.get(baseId);
      if (!t) { memo.set(key, []); return []; }
      if (t.each === 'bath' && !bathId) { // all bathrooms
        const out = new Set(); for (const b of A.baths) expandTask(baseId, b.id, stack).forEach((x) => out.add(x));
        const r = [...out]; memo.set(key, r); return r;
      }
      const instId = t.each === 'bath' ? baseId + '@' + bathId : baseId;
      if (taskMap.has(instId)) { memo.set(key, [instId]); return [instId]; }
      if (stack.has(key)) return [];
      stack.add(key);
      const out = new Set();
      for (const d of t.d || []) resolveRef(d, t.each === 'bath' ? bathId : null, stack).forEach((x) => out.add(x));
      stack.delete(key);
      const r = [...out]; memo.set(key, r); return r;
    }
    function resolveRef(ref, ctxBath, stack) {
      stack = stack || new Set();
      if (ref.endsWith('@*')) return expandTask(ref.slice(0, -2), null, stack);
      if (isBathTask(ref)) return expandTask(ref, ctxBath, stack);
      return expandTask(ref, null, stack);
    }
    function resolveCp(ref, ctxBath) {
      const base = ref.replace(/@\*$/, '');
      const c = libCp.get(base);
      if (!c) return [];
      if (c.each === 'bath') {
        if (ctxBath && !ref.endsWith('@*')) { const id = base + '@' + ctxBath; return cpMap.has(id) ? [id] : []; }
        return cps.filter((x) => x.baseId === base).map((x) => x.id);
      }
      return cpMap.has(base) ? [base] : [];
    }
    for (const inst of tasks) {
      const t = inst.lib;
      const deps = new Set();
      for (const d of t.d || []) resolveRef(d, inst.bathId).forEach((x) => { if (x !== inst.id) deps.add(x); });
      inst.deps = [...deps].sort((a, b) => taskMap.get(a).order - taskMap.get(b).order);
      inst.gates = [...new Set((t.g || []).flatMap((g) => resolveCp(g, inst.bathId)))];
      inst.feeds = [...new Set((t.f || []).flatMap((g) => resolveCp(g, inst.bathId)))];
    }
    for (const cp of cps) {
      const after = new Set();
      for (const a of cp.lib.after || []) resolveRef(a, cp.bathId).forEach((x) => after.add(x));
      for (const tk of tasks) if (tk.feeds.includes(cp.id)) after.add(tk.id);
      cp.after = [...after].sort((a, b) => taskMap.get(a).order - taskMap.get(b).order);
      cp.gatesTasks = tasks.filter((tk) => tk.gates.includes(cp.id)).map((tk) => tk.id);
    }
    tasks.sort((a, b) => (phaseIdx.get(a.phase) - phaseIdx.get(b.phase)) || (a.order - b.order));
    cps.sort((a, b) => (phaseIdx.get(a.phase) - phaseIdx.get(b.phase)) || (a.order - b.order) || a.id.localeCompare(b.id));
    return { A, tasks, taskMap, checkpoints: cps, cpMap, phases: lib.PHASES, libraryVersion: lib.LIBRARY_VERSION };
  };

  // ---------- project model ----------
  E.newProject = function (name, address) {
    const t = nowISO();
    return {
      schema: SCHEMA_VERSION, appVersion: APP_VERSION, libraryVersion: LIB.LIBRARY_VERSION,
      id: uid('prj'), name: (name || '').trim() || 'Untitled project', address: (address || '').trim(),
      createdAt: t, updatedAt: t, generatedAt: null, appliedTaskIds: [],
      jurisdiction: clone(Q.JURISDICTION_DEFAULTS), answers: E.normalizeAnswers({}),
      tasks: {}, checkpoints: {}, overrides: [], log: [{ at: t, msg: 'Project created' }], lastBackupAt: null, archived: false,
    };
  };
  E.migrateProject = function (p) {
    if (!p || typeof p !== 'object') throw new Error('Not a project');
    if (!p.schema) p.schema = 1;
    if (p.schema > SCHEMA_VERSION) throw new Error('This project was saved by a newer version of the app (schema ' + p.schema + ').');
    p.tasks = p.tasks || {}; p.checkpoints = p.checkpoints || {}; p.overrides = p.overrides || []; p.log = p.log || [];
    p.jurisdiction = Object.assign(clone(Q.JURISDICTION_DEFAULTS), p.jurisdiction || {});
    p.answers = E.normalizeAnswers(p.answers);
    p.appliedTaskIds = p.appliedTaskIds || [];
    for (const id in p.tasks) { const r = p.tasks[id]; r.history = r.history || []; r.photos = r.photos || []; if (r.qc && typeof r.qc !== 'object') r.qc = {}; if (!STATUS.includes(r.status)) r.status = 'not-started'; }
    for (const id in p.checkpoints) { const r = p.checkpoints[id]; r.history = r.history || []; r.photos = r.photos || []; }
    return p;
  };
  const taskRec = (p, id) => (p.tasks[id] || (p.tasks[id] = { status: 'not-started', notes: '', photos: [], history: [] }));
  const cpRec = (p, id) => (p.checkpoints[id] || (p.checkpoints[id] = { history: [], photos: [] }));
  E.getTaskRec = (p, id) => p.tasks[id] || { status: 'not-started', notes: '', photos: [], history: [] };
  E.cpReq = (p, cp) => (p.checkpoints[cp.id] && p.checkpoints[cp.id].req) || cp.lib.req;
  E.cpStatus = (p, cp) => (p.checkpoints[cp.id] && p.checkpoints[cp.id].status) || 'not-requested';
  const touch = (p, msg) => { p.updatedAt = nowISO(); if (msg) { p.log.push({ at: p.updatedAt, msg }); if (p.log.length > 2000) p.log.splice(0, p.log.length - 2000); } };
  E.touch = touch;

  // A checkpoint "holds" work when it applies, is required (or still to be confirmed), and is not passed.
  E.cpIsOpen = function (p, cp) {
    const req = E.cpReq(p, cp);
    if (req === 'not-required') return false;
    return E.cpStatus(p, cp) !== 'passed';
  };
  E.activeOverride = (p, taskId, cpId) => p.overrides.find((o) => o.active && o.taskId === taskId && o.checkpointId === cpId);

  // ---------- readiness ----------
  E.computeStates = function (p, gen) {
    const out = new Map();
    for (const t of gen.tasks) {
      const r = E.getTaskRec(p, t.id);
      const depsOpen = t.deps.filter((d) => { const s = E.getTaskRec(p, d).status; return s !== 'complete' && s !== 'na'; });
      const gatesOpen = t.gates.filter((g) => { const cp = gen.cpMap.get(g); return cp && E.cpIsOpen(p, cp) && !E.activeOverride(p, t.id, g); });
      const overridden = t.gates.filter((g) => { const cp = gen.cpMap.get(g); return cp && E.cpIsOpen(p, cp) && E.activeOverride(p, t.id, g); });
      let state;
      if (r.status === 'complete') state = 'complete';
      else if (r.status === 'na') state = 'na';
      else if (r.status === 'blocked') state = 'blocked';
      else if (gatesOpen.length && (!depsOpen.length || r.status === 'in-progress')) state = 'held'; // ready except for the inspection
      else if (r.status === 'in-progress') state = 'in-progress';
      else if (depsOpen.length) state = 'waiting'; // gatesOpen may also be non-empty
      else state = 'ready';
      out.set(t.id, { state, status: r.status, depsOpen, gatesOpen, overridden });
    }
    return out;
  };

  E.stats = function (p, gen, states) {
    states = states || E.computeStates(p, gen);
    const count = (arr) => { const c = { total: 0, complete: 0, na: 0, blocked: 0, held: 0, waiting: 0, 'in-progress': 0, ready: 0 }; for (const t of arr) { c.total++; c[states.get(t.id).state]++; } c.applicable = c.total - c.na; c.pct = c.applicable ? Math.round((c.complete / c.applicable) * 1000) / 10 : 0; return c; };
    const overall = count(gen.tasks);
    const phases = gen.phases.map((ph) => { const ts = gen.tasks.filter((t) => t.phase === ph.id); const c = count(ts); c.phase = ph; c.status = !ts.length ? 'empty' : c.complete + c.na === c.total ? 'done' : (c.complete + c['in-progress'] + c.blocked > 0 ? 'active' : 'pending'); return c; });
    const cps = gen.checkpoints.map((cp) => {
      const req = E.cpReq(p, cp), status = E.cpStatus(p, cp);
      const afterOpen = cp.after.filter((id) => { const s = E.getTaskRec(p, id).status; return s !== 'complete' && s !== 'na'; });
      return { cp, req, status, afterOpen, readyToRequest: afterOpen.length === 0 && status !== 'passed' && req !== 'not-required', open: E.cpIsOpen(p, cp) };
    });
    return { overall, phases, cps };
  };

  // ---------- actions ----------
  // Returns {ok:true} or {ok:false, code, ...}. Callers decide whether to retry with force/override.
  E.setTaskStatus = function (p, gen, taskId, status, opts) {
    opts = opts || {};
    const t = gen.taskMap.get(taskId);
    if (!t) return { ok: false, code: 'UNKNOWN_TASK' };
    if (!STATUS.includes(status)) return { ok: false, code: 'BAD_STATUS' };
    const r = taskRec(p, taskId);
    const from = r.status;
    if (from === status && !opts.date) return { ok: true, unchanged: true };
    const st = E.computeStates(p, gen).get(taskId);
    if ((status === 'in-progress' || status === 'complete') && st.gatesOpen.length) return { ok: false, code: 'GATED', gates: st.gatesOpen };
    if ((status === 'in-progress' || status === 'complete') && st.depsOpen.length && !opts.force) return { ok: false, code: 'DEPS', deps: st.depsOpen };
    if (status === 'blocked' && !(opts.reason || '').trim()) return { ok: false, code: 'REASON_REQUIRED' };
    if (status === 'na' && !(opts.reason || '').trim() && !opts.allowNoReason) return { ok: false, code: 'REASON_REQUIRED' };
    const at = nowISO();
    const h = { at, action: 'status', from, to: status };
    if (opts.reason) h.note = opts.reason;
    if (opts.by) h.by = opts.by;
    if ((status === 'in-progress' || status === 'complete') && st.depsOpen.length) h.outOfSequence = st.depsOpen.slice();
    if (st.overridden.length && (status === 'in-progress' || status === 'complete')) h.underOverride = st.overridden.slice();
    r.status = status;
    if (status === 'complete') { r.completedAt = opts.date || at.slice(0, 10); h.completedAt = r.completedAt; }
    else if (from === 'complete') { h.reopened = true; h.previousCompletedAt = r.completedAt; r.completedAt = null; }
    if (status === 'in-progress' && !r.startedAt) r.startedAt = at.slice(0, 10);
    if (status === 'blocked') r.blockedReason = opts.reason; else if (from === 'blocked') r.blockedReason = '';
    if (status === 'na') r.naReason = opts.reason || '';
    r.history.push(h);
    touch(p, `${t.title}: ${STATUS_LABEL[from]} → ${STATUS_LABEL[status]}${h.outOfSequence ? ' (out of sequence)' : ''}`);
    return { ok: true };
  };
  E.setCompletionDate = function (p, taskId, date) {
    const r = taskRec(p, taskId); if (r.status !== 'complete') return { ok: false, code: 'NOT_COMPLETE' };
    r.history.push({ at: nowISO(), action: 'date', from: r.completedAt, to: date }); r.completedAt = date; touch(p); return { ok: true };
  };
  E.setTaskField = function (p, taskId, field, value) {
    if (!['notes', 'trade', 'assignee'].includes(field)) return { ok: false };
    const r = taskRec(p, taskId);
    if (r[field] === value) return { ok: true, unchanged: true };
    if (field === 'trade') r.history.push({ at: nowISO(), action: 'trade', from: r.trade || null, to: value });
    r[field] = value; touch(p); return { ok: true };
  };
  // Individual QC check items (keyed by the item text so library re-ordering never shifts them).
  E.setQc = function (p, taskId, item, checked, by) {
    const r = taskRec(p, taskId); r.qc = r.qc || {};
    if (!!r.qc[item] === !!checked) return { ok: true, unchanged: true };
    if (checked) r.qc[item] = { at: nowISO(), by: by || '' }; else delete r.qc[item];
    r.history.push({ at: nowISO(), action: 'qc', to: checked ? 'checked' : 'unchecked', note: item, by: by || undefined });
    touch(p); return { ok: true };
  };
  E.qcDone = (p, taskId, item) => !!(p.tasks[taskId] && p.tasks[taskId].qc && p.tasks[taskId].qc[item]);

  // ---------- Before Drywall ----------
  // Gathers, from the project's actual generated sequence, every approval and every task that must be
  // finished (and every concealed-work task) before drywall is hung. Used by the screen AND the PDF.
  const BD_GROUPS = [
    ['Dry-in (roof, windows, doors, WRB)', (t) => t.phase === 'P06'],
    ['Framing & structure', (t) => t.phase === 'P05' || t.id === 'plb.boring' || (t.phase === 'P04' && /^(crawl\.(sill|girder|sister|shim|subfloor)|fdn\.|bsmt\.walls|bsmt\.egress)/.test(t.id))],
    ['Fireblocking, draftstopping & fire separation', (t) => ['pd.fireblock', 'pd.draftstop', 'pd.garage'].includes(t.baseId)],
    ['Plumbing & gas rough', (t) => t.phase === 'P07' && !['plb.boring', 'plb.service', 'plb.sewer'].includes(t.baseId) && !t.bathId],
    ['HVAC & ventilation rough', (t) => t.phase === 'P08' && !t.bathId],
    ['Electrical & low-voltage rough', (t) => t.phase === 'P09' && t.baseId !== 'ele.service' && !t.bathId],
    ['Bathrooms', (t) => !!t.bathId && ['P05', 'P07', 'P08', 'P09', 'P10'].includes(t.phase)],
    ['Backing & blocking', (t) => ['pd.backing', 'pd.kitblock'].includes(t.baseId)],
    ['Air sealing & insulation', (t) => ['pd.airseal', 'pd.insulwalls', 'pd.sprayfoam'].includes(t.baseId)],
    ['Records & Pinestone walkthrough', (t) => ['pd.measure', 'pd.photo', 'pd.qc'].includes(t.baseId)],
  ];
  E.beforeDrywall = function (p, gen, states) {
    states = states || E.computeStates(p, gen);
    const hang = gen.taskMap.get('dw.hang');
    const anc = new Set();
    if (hang) (function up(id) { for (const d of gen.taskMap.get(id).deps) if (!anc.has(d)) { anc.add(d); up(d); } })('dw.hang');
    const used = new Set(); const groups = [];
    for (const [name, test] of BD_GROUPS) {
      const tasks = gen.tasks.filter((t) => !used.has(t.id) && test(t) && (anc.has(t.id) || ['P07', 'P08', 'P09', 'P10'].includes(t.phase)));
      tasks.forEach((t) => used.add(t.id));
      if (tasks.length) groups.push({ name, tasks });
    }
    const gates = (hang ? hang.gates : []).map((id) => gen.cpMap.get(id)).filter(Boolean);
    let open = 0, total = 0, qcTotal = 0, qcDone = 0;
    for (const g of groups) for (const t of g.tasks) { total++; if (!['complete', 'na'].includes(states.get(t.id).state)) open++; for (const q of t.lib.q || []) { qcTotal++; if (E.qcDone(p, t.id, q)) qcDone++; } }
    const gatesOpen = gates.filter((c) => E.cpIsOpen(p, c));
    return { groups, gates, gatesOpen, open, total, qcTotal, qcDone, ready: open === 0 && gatesOpen.length === 0, hangState: hang ? states.get('dw.hang') : null };
  };

  // ---------- code basis ----------
  // The library cites 2018 IRC numbering. Tell the reader how that relates to THIS project's adopted codes.
  E.LIBRARY_CODE_BASIS = '2018 IRC';
  E.codeBasis = function (ref, j) {
    j = j || {};
    if (/^NEC/i.test(ref)) return j.electricalCode ? `Project electrical code: ${j.electricalCode} — confirm article in that edition` : 'Electrical code edition not set for this project — confirm with AHJ';
    if (/EPA|CFR|T\.C\.A|Tennessee|TN /i.test(ref)) return 'Federal / state law — applies regardless of local code edition; confirm current text';
    if (/IRC|^[RMPGNE]\d|IECC|IFGC/.test(ref)) {
      if (!j.codeEdition) return 'Project code edition NOT SET — cited from 2018 IRC; confirm with AHJ before relying on it';
      if (j.codeEdition === '2018 IRC') return `Project: 2018 IRC${j.ahj ? ' (' + j.ahj + ')' : ''} — check local amendments`;
      return `Cited from 2018 IRC. Project adopts ${j.codeEdition}${j.ahj ? ' (' + j.ahj + ')' : ''} — verify section number and requirement in that edition`;
    }
    return '';
  };
  E.jurisdictionComplete = (j) => !!(j && j.codeEdition && j.ahj && j.codeEdition !== 'Other / local amendments' || (j && j.codeEdition === 'Other / local amendments' && (j.notes || '').trim()));

  E.attachPhoto = function (p, ref, photoId) { const r = ref.type === 'cp' ? cpRec(p, ref.id) : taskRec(p, ref.id); if (!r.photos.includes(photoId)) r.photos.push(photoId); r.history.push({ at: nowISO(), action: 'photo-add', to: photoId }); touch(p); };
  E.detachPhoto = function (p, ref, photoId) { const r = ref.type === 'cp' ? cpRec(p, ref.id) : taskRec(p, ref.id); r.photos = r.photos.filter((x) => x !== photoId); r.history.push({ at: nowISO(), action: 'photo-remove', from: photoId }); touch(p); };

  E.addOverride = function (p, gen, taskId, cpId, reason, by) {
    if (!(reason || '').trim() || !(by || '').trim()) return { ok: false, code: 'REASON_REQUIRED' };
    const cp = gen.cpMap.get(cpId); const t = gen.taskMap.get(taskId);
    if (!cp || !t) return { ok: false, code: 'UNKNOWN' };
    const o = { id: uid('ovr'), taskId, checkpointId: cpId, reason: reason.trim(), by: by.trim(), at: nowISO(), active: true, checkpointStatusAtOverride: E.cpStatus(p, cp) };
    p.overrides.push(o);
    taskRec(p, taskId).history.push({ at: o.at, action: 'override', checkpoint: cpId, note: o.reason, by: o.by });
    touch(p, `OVERRIDE: "${t.title}" allowed to proceed before "${cp.name}" was approved — ${o.reason} (${o.by}). Checkpoint NOT approved.`);
    return { ok: true, override: o };
  };
  E.revokeOverride = function (p, overrideId, by) {
    const o = p.overrides.find((x) => x.id === overrideId); if (!o || !o.active) return { ok: false };
    o.active = false; o.revokedAt = nowISO(); o.revokedBy = by || ''; touch(p, 'Override revoked for ' + o.taskId); return { ok: true };
  };

  E.setCheckpoint = function (p, gen, cpId, patch, by) {
    const cp = gen.cpMap.get(cpId); if (!cp) return { ok: false, code: 'UNKNOWN' };
    const r = cpRec(p, cpId);
    if (patch.status && !CP_STATUS.includes(patch.status)) return { ok: false, code: 'BAD_STATUS' };
    if (patch.status === 'passed' && !(patch.date || r.date)) return { ok: false, code: 'DATE_REQUIRED' };
    if (patch.req === 'not-required' && !((patch.reqNote || r.reqNote || '').trim())) return { ok: false, code: 'REASON_REQUIRED' };
    const h = { at: nowISO(), action: 'checkpoint' };
    for (const k of ['status', 'req', 'date', 'inspector', 'result', 'reqNote', 'notes', 'reference']) if (k in patch && patch[k] !== r[k]) { h[k] = { from: r[k] === undefined ? null : r[k], to: patch[k] }; r[k] = patch[k]; }
    if (Object.keys(h).length <= 2) return { ok: true, unchanged: true };
    if (by) h.by = by;
    r.history.push(h);
    touch(p, h.status ? `${cp.name}: ${CP_STATUS_LABEL[h.status.from || 'not-requested']} → ${CP_STATUS_LABEL[h.status.to]}` : h.req ? `${cp.name}: requirement → ${CP_REQ_LABEL[h.req.to]}` : null);
    return { ok: true };
  };

  // ---------- scope changes ----------
  E.hasData = function (rec) { return !!rec && (rec.status !== 'not-started' || (rec.notes || '').trim() || (rec.photos || []).length || (rec.history || []).length); };
  E.diffAnswers = function (p, newAnswers, lib) {
    const oldGen = E.generate(p.answers, lib); const newGen = E.generate(newAnswers, lib);
    const oldIds = new Set(p.generatedAt ? oldGen.tasks.map((t) => t.id) : []);
    const newIds = new Set(newGen.tasks.map((t) => t.id));
    const added = newGen.tasks.filter((t) => !oldIds.has(t.id));
    const removed = oldGen.tasks.filter((t) => p.generatedAt && !newIds.has(t.id));
    const removedWithData = removed.filter((t) => E.hasData(p.tasks[t.id]));
    const restored = added.filter((t) => E.hasData(p.tasks[t.id]));
    const oldCp = new Set(p.generatedAt ? oldGen.checkpoints.map((c) => c.id) : []);
    const newCp = new Set(newGen.checkpoints.map((c) => c.id));
    return { added, removed, removedWithData, restored, cpAdded: newGen.checkpoints.filter((c) => !oldCp.has(c.id)), cpRemoved: oldGen.checkpoints.filter((c) => p.generatedAt && !newCp.has(c.id)), newGen };
  };
  // Applying answers NEVER deletes task or checkpoint records. Records for tasks that no
  // longer apply are retained and re-attach automatically if the task becomes applicable again.
  E.applyAnswers = function (p, newAnswers, lib) {
    const diff = E.diffAnswers(p, newAnswers, lib);
    const first = !p.generatedAt;
    p.answers = E.normalizeAnswers(newAnswers);
    p.generatedAt = nowISO();
    p.libraryVersion = (lib || LIB).LIBRARY_VERSION;
    p.appliedTaskIds = diff.newGen.tasks.map((t) => t.id);
    touch(p, first ? `Construction sequence generated: ${diff.newGen.tasks.length} tasks, ${diff.newGen.checkpoints.length} checkpoints` :
      `Project setup updated: +${diff.added.length} tasks, −${diff.removed.length} tasks (${diff.removedWithData.length} with records retained)`);
    return diff;
  };
  // Records whose task is not in the current generated set (scope changed or library retired the task).
  E.retainedRecords = function (p, gen) {
    const out = [];
    for (const id in p.tasks) if (!gen.taskMap.has(id) && E.hasData(p.tasks[id])) {
      const base = id.split('@')[0]; const lt = LIB.TASKS.find((t) => t.id === base);
      out.push({ id, title: lt ? lt.t + (id.includes('@') ? ' (' + id.split('@')[1] + ')' : '') : id, rec: p.tasks[id], retired: !!(lt && lt.retired), unknown: !lt });
    }
    return out;
  };

  // ---------- validation ----------
  E.validateLibrary = function (lib) {
    lib = lib || LIB;
    const errors = [], warnings = [];
    const ids = new Set(), cpIds = new Set(lib.CHECKPOINTS.map((c) => c.id));
    const phases = new Set(lib.PHASES.map((p) => p.id));
    for (const t of lib.TASKS) {
      if (ids.has(t.id)) errors.push('Duplicate task id ' + t.id); ids.add(t.id);
      if (!phases.has(t.ph)) errors.push(t.id + ': unknown phase ' + t.ph);
      if (!lib.TRADES.includes(t.tr)) errors.push(t.id + ': unknown trade ' + t.tr);
      if (t.id.startsWith('b.') !== (t.each === 'bath')) errors.push(t.id + ': bath task naming mismatch');
      try { compile(t.w); new Function('A', 'B', 'has', 'return (' + (t.w || 'true') + ')'); } catch (e) { errors.push(t.id + ': ' + e.message); }
      if (t.G) for (const k of ['t']) for (const line of t.G[k] || []) if (!/^[CLMSP]\|[^|]*\|.+/.test(line)) errors.push(t.id + ': bad guidance tag "' + line.slice(0, 40) + '"');
    }
    for (const t of lib.TASKS) {
      for (const d of t.d || []) { const b = d.replace(/@\*$/, ''); if (!ids.has(b)) errors.push(t.id + ': unknown prerequisite ' + d); }
      for (const g of [...(t.g || []), ...(t.f || [])]) if (!cpIds.has(g)) errors.push(t.id + ': unknown checkpoint ' + g);
    }
    for (const c of lib.CHECKPOINTS) {
      for (const a of c.after || []) if (!ids.has(a.replace(/@\*$/, ''))) errors.push(c.id + ': unknown after-task ' + a);
      if (!phases.has(c.ph)) errors.push(c.id + ': unknown phase');
      try { new Function('A', 'B', 'has', 'return (' + (c.w || 'true') + ')'); } catch (e) { errors.push(c.id + ': ' + e.message); }
    }
    return { errors, warnings };
  };
  // Detect dependency cycles in a generated set (Kahn).
  E.findCycle = function (gen) {
    const indeg = new Map(gen.tasks.map((t) => [t.id, 0])); const out = new Map(gen.tasks.map((t) => [t.id, []]));
    for (const t of gen.tasks) for (const d of t.deps) { indeg.set(t.id, indeg.get(t.id) + 1); out.get(d).push(t.id); }
    const q = [...indeg].filter(([, v]) => v === 0).map(([k]) => k); let seen = 0;
    while (q.length) { const n = q.shift(); seen++; for (const m of out.get(n)) { indeg.set(m, indeg.get(m) - 1); if (indeg.get(m) === 0) q.push(m); } }
    return seen === gen.tasks.length ? null : [...indeg].filter(([, v]) => v > 0).map(([k]) => k);
  };
  // Gate deadlock: a task that feeds a checkpoint must not itself (transitively) need that checkpoint.
  E.findGateDeadlocks = function (gen) {
    const problems = [];
    const ancestors = (id, acc) => { for (const d of gen.taskMap.get(id).deps) if (!acc.has(d)) { acc.add(d); ancestors(d, acc); } return acc; };
    for (const cp of gen.checkpoints) for (const gt of cp.gatesTasks) {
      for (const a of cp.after) { if (a === gt || ancestors(a, new Set()).has(gt)) problems.push(`${cp.id}: required-before task ${a} depends on gated task ${gt}`); }
    }
    return problems;
  };

  // ---------- guidance parsing ----------
  E.parseTagged = function (line) {
    const m = /^([CLMSP])\|([^|]*)\|(.+)$/.exec(line);
    return m ? { tag: m[1], ref: m[2], text: m[3] } : { tag: null, ref: '', text: line };
  };

  // ---------- backup format ----------
  E.BACKUP_FORMAT = 'pinestone-construction-os-backup';
  E.makeBackup = function (projects, photos, extra) {
    return Object.assign({ format: E.BACKUP_FORMAT, formatVersion: 1, appVersion: APP_VERSION, libraryVersion: LIB.LIBRARY_VERSION, exportedAt: nowISO(), projects: clone(projects), photos: photos || [] }, extra || {});
  };
  E.validateBackup = function (obj) {
    const errs = [];
    if (!obj || typeof obj !== 'object') return ['File is not a backup.'];
    if (obj.format !== E.BACKUP_FORMAT) errs.push('Not a Pinestone Construction OS backup file.');
    if (!Array.isArray(obj.projects) || !obj.projects.length) errs.push('Backup contains no projects.');
    if (obj.photos && !Array.isArray(obj.photos)) errs.push('Photo section is damaged.');
    for (const p of obj.projects || []) {
      if (!p.id || !p.name || typeof p.tasks !== 'object' || !p.answers) errs.push('Project record is incomplete: ' + (p.name || p.id || '?'));
      if (p.schema > SCHEMA_VERSION) errs.push(`"${p.name}" was saved by a newer app version.`);
    }
    for (const ph of obj.photos || []) if (!ph.id || !ph.projectId || typeof ph.dataUrl !== 'string' || !ph.dataUrl.startsWith('data:image/')) { errs.push('A photo record is damaged.'); break; }
    return errs;
  };
  // Re-key a project (and its photos) so it can be imported alongside the original.
  E.rekeyProject = function (p, photos) {
    const np = clone(p); const oldId = np.id; np.id = uid('prj'); np.name = np.name + ' (restored copy)';
    const map = new Map();
    const nphotos = (photos || []).filter((x) => x.projectId === oldId).map((x) => { const n = Object.assign({}, x, { id: uid('pho'), projectId: np.id }); map.set(x.id, n.id); return n; });
    const fix = (arr) => (arr || []).map((id) => map.get(id) || id);
    for (const k in np.tasks) np.tasks[k].photos = fix(np.tasks[k].photos);
    for (const k in np.checkpoints) np.checkpoints[k].photos = fix(np.checkpoints[k].photos);
    np.log.push({ at: nowISO(), msg: 'Restored as a copy of project ' + oldId });
    return { project: np, photos: nphotos };
  };

  root.PCOS_ENGINE = E;
  if (typeof module !== 'undefined' && module.exports) module.exports = E;
})(typeof window !== 'undefined' ? window : globalThis);
