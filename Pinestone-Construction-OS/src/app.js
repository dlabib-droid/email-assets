/* Pinestone Construction OS — application UI (vanilla JS, no network). */
(function () {
  'use strict';
  const E = window.PCOS_ENGINE, L = window.PCOS_LIB, Q = window.PCOS_Q, S = window.PCOS_STORE, PDF = window.PCOS_PDF, DEMO = window.PCOS_DEMO;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const today = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
  const fmtDate = (d) => { if (!d) return ''; const x = new Date(String(d).length === 10 ? d + 'T12:00:00' : d); return isNaN(x) ? String(d) : x.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); };
  const fmtDT = (d) => { const x = new Date(d); return isNaN(x) ? '' : x.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }); };
  const fmtBytes = (b) => (b > 1e9 ? (b / 1e9).toFixed(2) + ' GB' : b > 1e6 ? (b / 1e6).toFixed(1) + ' MB' : Math.round(b / 1e3) + ' KB');
  const slug = (s) => String(s || 'project').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 48) || 'project';
  const CHECK_SVG = '<svg viewBox="0 0 16 16" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.2 3L13 4.5"/></svg>';

  const App = window.PCOS_APP = {
    projects: [], p: null, gen: null, states: null, settings: { userName: '', logo: null }, backupInfo: {}, storage: { usage: 0, quota: 0 }, photoCache: new Map(),
    ui: { expanded: new Set(), phase: 'all', filter: 'open', trade: '', q: '', setupSec: 'project', exportKind: 'sequence', exportPhase: 'P01', exportTrade: '', exportOpts: { includeComplete: true, qc: true, notes: true, writeIn: true }, showArchived: false },
    saveState: 'idle', backupDir: null, backupDirNeedsPerm: false,
  };
  const root = () => document.getElementById('app');

  // ---------------- persistence ----------------
  let saveTimer = null, folderTimer = null;
  function setSaveState(s, msg) { App.saveState = s; App.saveMsg = msg || ({ saving: 'Saving…', saved: 'Saved ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), error: 'NOT SAVED' }[s] || ''); paintSaveState(); }
  function paintSaveState() { const el = document.getElementById('savestate'); if (!el) return; el.className = 'savestate' + (App.saveState === 'error' ? ' err' : ''); el.textContent = App.saveState === 'idle' ? (S.mode === 'indexeddb' ? 'Saved on this device' : 'TEMPORARY storage') : App.saveMsg; }
  const chan = (typeof BroadcastChannel === 'function') ? new BroadcastChannel('pcos-sync') : null;
  if (chan) chan.onmessage = async (ev) => {
    const m = ev.data || {}; if (!App.p || m.id !== App.p.id || m.updatedAt === App.p.updatedAt) return;
    if (saveTimer) return; // this window has unsaved typing; the save-time check will handle it
    const fresh = await S.getProject(m.id); if (!fresh) return;
    App.p = E.migrateProject(fresh); App.baseUpdatedAt = App.p.updatedAt; recompute(); render(); toast('Updated with changes made in another window');
  };
  App.saveNow = () => saveNow();
  async function saveNow() {
    clearTimeout(saveTimer); saveTimer = null;
    const p = App.p; if (!p) return;
    setSaveState('saving');
    try {
      const stored = await S.getProject(p.id);
      if (stored && App.baseUpdatedAt && stored.updatedAt > App.baseUpdatedAt && stored.updatedAt !== p.updatedAt) {
        setSaveState('error', 'NOT SAVED — changed in another window');
        const r = await modal(`<h3>Project changed in another window</h3><p class="small">"${esc(p.name)}" was saved from another tab or window after this one opened it. To avoid overwriting that work, this window did not save its last change.</p><div class="btnrow"><button class="btn" data-m="reload">Load the latest version</button></div>`);
        if (r) { App.p = E.migrateProject(await S.getProject(p.id)); App.baseUpdatedAt = App.p.updatedAt; recompute(); setSaveState('saved', 'Loaded latest'); render(); }
        return;
      }
      await S.putProject(p); App.baseUpdatedAt = p.updatedAt; setSaveState('saved'); scheduleFolderBackup();
      if (chan) chan.postMessage({ id: p.id, updatedAt: p.updatedAt });
    }
    catch (e) { console.error(e); setSaveState('error', 'NOT SAVED — ' + (e.name === 'QuotaExceededError' ? 'storage full' : 'storage error')); toast('Could not save to device storage. Export a backup now.', 6000); }
  }
  function saveSoon(ms) { clearTimeout(saveTimer); setSaveState('saving', 'Editing…'); saveTimer = setTimeout(saveNow, ms || 500); }
  window.addEventListener('pagehide', () => { if (saveTimer) saveNow(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && saveTimer) saveNow(); });

  function recompute() { if (!App.p) return; App.gen = E.generate(App.p.answers); App.states = E.computeStates(App.p, App.gen); }
  function commit(rerender) { recompute(); saveNow(); if (rerender !== false) render(); }

  async function loadProjects() { App.projects = (await S.listProjects()).map((p) => { try { return E.migrateProject(p); } catch (e) { return null; } }).filter(Boolean).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')); }
  async function openProject(id) {
    if (App.p && App.p.id === id) return true;
    if (saveTimer) await saveNow();
    const p = await S.getProject(id); if (!p) return false;
    App.p = E.migrateProject(p); App.baseUpdatedAt = App.p.updatedAt; App.ui.expanded = new Set(); App.ui.phase = 'all'; App.ui.trade = ''; App.ui.q = ''; App.ui.filter = 'open'; App.photoCache = new Map();
    try { const v = JSON.parse(localStorage.getItem('pcos-ui-' + id) || 'null'); if (v) Object.assign(App.ui, { phase: v.phase || 'all', filter: v.filter || 'open', trade: v.trade || '', readyGroup: v.readyGroup || 'phase' }); } catch (e) { /* ignore */ }
    recompute(); return true;
  }

  // ---------------- backup folder (desktop Chromium) ----------------
  function scheduleFolderBackup() { if (!App.backupDir || !App.p) return; clearTimeout(folderTimer); const id = App.p.id; folderTimer = setTimeout(() => writeFolderBackup(id).catch((e) => { console.warn(e); App.backupDirNeedsPerm = true; }), 4000); }
  async function writeFolderBackup(projectId, quiet) {
    if (!App.backupDir) return false;
    const p = App.p && App.p.id === projectId ? App.p : await S.getProject(projectId); if (!p) return false;
    const photos = await S.photosForProject(projectId);
    const text = backupBlob([p], photos);
    const base = 'Pinestone-COS_' + slug(p.name) + '_' + p.id.slice(-6);
    await S.writeFile(App.backupDir, base + '_latest.pcos.json', text);
    const info = App.backupInfo[projectId] || {};
    if (info.dailyDate !== today()) { await S.writeFile(App.backupDir, base + '_' + today() + '.pcos.json', text); info.dailyDate = today(); }
    info.at = new Date().toISOString(); info.how = 'folder'; App.backupInfo[projectId] = info; await S.setMeta('backupInfo', App.backupInfo);
    if (!quiet && App.saveState === 'saved') { App.saveMsg = App.saveMsg.replace(/ · backed up$/, '') + ' · backed up'; paintSaveState(); }
    return true;
  }
  async function initBackupFolder() {
    const r = await S.backupFolder(false);
    if (r && r.needsPermission) { App.backupDir = null; App.backupDirNeedsPerm = true; App.backupDirHandle = r.handle; }
    else if (r) { App.backupDir = r; App.backupDirNeedsPerm = false; }
  }

  // ---------------- UI helpers ----------------
  function toast(msg, ms) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), ms || 2600); }
  function modal(html, onMount) {
    return new Promise((resolve) => {
      const bg = document.createElement('div'); bg.className = 'modal-bg'; bg.innerHTML = '<div class="modal" role="dialog" aria-modal="true">' + html + '</div>';
      document.body.appendChild(bg);
      const close = (v) => { bg.remove(); resolve(v); };
      bg.addEventListener('click', (e) => { if (e.target === bg) close(null); const b = e.target.closest('[data-m]'); if (b) { const v = b.dataset.m; if (v === 'cancel') close(null); else close({ action: v, form: Object.fromEntries([...bg.querySelectorAll('[name]')].map((i) => [i.name, i.type === 'checkbox' ? i.checked : i.value])) }); } });
      if (onMount) onMount(bg, close);
      const f = bg.querySelector('textarea,input'); if (f) setTimeout(() => f.focus(), 50);
    });
  }
  const confirmModal = (title, body, okLabel, danger) => modal(`<h3>${esc(title)}</h3><div class="small">${body}</div><div class="btnrow"><button class="btn sec" data-m="cancel">Cancel</button><button class="btn ${danger ? 'danger' : ''}" data-m="ok">${esc(okLabel || 'OK')}</button></div>`).then((r) => !!r);
  async function reasonModal(title, body, label, okLabel, required) {
    for (;;) {
      const r = await modal(`<h3>${esc(title)}</h3><div class="small muted">${body || ''}</div><div class="field"><label>${esc(label)}</label><textarea name="reason"></textarea></div><div class="btnrow"><button class="btn sec" data-m="cancel">Cancel</button><button class="btn" data-m="ok">${esc(okLabel || 'Save')}</button></div>`);
      if (!r) return null; if (!required || r.form.reason.trim()) return r.form.reason.trim(); toast('A reason is required.');
    }
  }
  function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000); }
  async function shareOrDownload(blob, name) {
    try { const file = new File([blob], name, { type: blob.type }); if (navigator.canShare && navigator.canShare({ files: [file] }) && /iPhone|iPad|Android/i.test(navigator.userAgent)) { await navigator.share({ files: [file], title: name }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    download(blob, name);
  }
  const userName = () => App.settings.userName || 'Pinestone';

  function brandHTML() {
    return App.settings.logo ? `<img src="${esc(App.settings.logo)}" alt="Pinestone Development">` : '<span class="wordmark"><b>PINESTONE</b><span>DEVELOPMENT</span></span>';
  }
  const stateDot = (s) => `<span class="dot ${esc(s)}"></span>`;
  const statePill = (s) => `<span class="pill ${esc(s)}">${esc(E.STATE_LABEL[s])}</span>`;
  const phaseName = (id) => (L.PHASES.find((p) => p.id === id) || {}).name || id;

  // ---------------- router ----------------
  function parseHash() { const h = location.hash.replace(/^#\/?/, ''); const [path, qs] = h.split('?'); const parts = path.split('/').filter(Boolean); return { parts, qs: new URLSearchParams(qs || '') }; }
  async function route() {
    const { parts, qs } = parseHash();
    if (parts[0] === 'p' && parts[1]) {
      const ok = await openProject(parts[1]); if (!ok) { location.hash = '#/'; return; }
      App.tab = parts[2] || 'overview';
      if (qs.get('t')) { App.ui.expanded.add(qs.get('t')); App.ui.filter = 'all'; App.ui.phase = 'all'; App.focus = qs.get('t'); }
    } else { if (saveTimer) await saveNow(); App.p = null; App.tab = parts[0] === 'settings' ? 'settings' : 'home'; if (App.tab === 'home') await loadProjects(); }
    try { if (App.p) localStorage.setItem('pcos-last', location.hash); else localStorage.removeItem('pcos-last'); } catch (e) { /* ignore */ }
    render(); if (App.focus) { const el = document.querySelector(`[data-task="${CSS.escape(App.focus)}"]`); if (el) el.scrollIntoView({ block: 'center' }); App.focus = null; } else window.scrollTo(0, 0);
  }

  // ---------------- render ----------------
  function rememberUi() { if (!App.p) return; try { localStorage.setItem('pcos-ui-' + App.p.id, JSON.stringify({ phase: App.ui.phase, filter: App.ui.filter, trade: App.ui.trade, readyGroup: App.ui.readyGroup })); } catch (e) { /* ignore */ } }
  function render() {
    rememberUi();
    const top = `<header class="top"><a class="brand" href="#/">${brandHTML()}<span class="appname">Construction OS</span></a><span class="grow"></span><span id="savestate" class="savestate"></span>
      <a class="iconbtn" href="#/">Projects</a><a class="iconbtn" href="#/settings">Settings</a></header>`;
    let body;
    if (App.p) body = projectShell();
    else if (App.tab === 'settings') body = `<main>${settingsView()}</main>`;
    else body = `<main>${homeView()}</main>`;
    const y = window.scrollY;
    root().innerHTML = top + body;
    paintSaveState();
    window.scrollTo(0, y);
    hydratePhotos();
  }

  function storageBanners() {
    const out = [];
    if (S.mode !== 'indexeddb') out.push('<div class="errbox"><b>Device storage is unavailable in this browser mode.</b> Work will be lost when this tab closes. Export a backup before closing, or open the app in a normal (non-private) browser window.</div>');
    const { usage, quota } = App.storage;
    if (quota && usage / quota > 0.8) out.push(`<div class="errbox"><b>Storage almost full:</b> ${fmtBytes(usage)} of ${fmtBytes(quota)} used. Export backups and remove photos from archived projects.</div>`);
    if (S.mode === 'indexeddb' && !S.persisted) out.push('<div class="warnbox">This browser has not granted <b>persistent storage</b>, so it may clear data under storage pressure. Keep regular backup files' + (/iPhone|iPad/.test(navigator.userAgent) ? ' and add the app to your Home Screen.' : ' (Settings → Backup folder keeps them automatically on desktop Chrome/Edge).') + '</div>');
    if (App.backupDirNeedsPerm) out.push('<div class="warnbox">Automatic folder backups are paused until you allow access again. <button class="btn sm" data-act="reconnect-folder">Reconnect backup folder</button></div>');
    return out.join('');
  }
  function backupAge(p) { const i = App.backupInfo[p.id]; return i && i.at ? i.at : null; }
  function backupBanner(p) {
    const at = backupAge(p);
    const stale = !at || (p.updatedAt > at && (Date.now() - new Date(at).getTime()) > 2 * 864e5);
    if (!stale || !p.generatedAt) return '';
    return `<div class="warnbox">${at ? 'Last backup ' + fmtDT(at) + '.' : '<b>This project has never been backed up to a file.</b>'} Browser storage is not a long-term record. <button class="btn sm" data-act="backup-project">Export backup now</button></div>`;
  }

  // ---------------- home ----------------
  function homeView() {
    const list = App.projects.filter((p) => !!p.archived === App.ui.showArchived);
    const cards = list.map((p) => {
      let s = null; try { const g = E.generate(p.answers); s = E.stats(p, g); } catch (e) { /* ignore */ }
      const o = s && s.overall;
      return `<a class="pcard" href="#/p/${esc(p.id)}/overview"><h3>${esc(p.name)}</h3><div class="muted small">${esc(p.address || 'No address')}</div>
        ${p.generatedAt && o ? `<div style="margin-top:10px" class="bar"><i style="width:${o.pct}%"></i></div><div class="stats"><span><b>${o.pct}%</b> complete</span><span>${o.ready} ready</span><span>${o['in-progress']} in progress</span>${o.blocked ? `<span style="color:var(--red)">${o.blocked} blocked</span>` : ''}${o.held ? `<span style="color:var(--amber)">${o.held} held</span>` : ''}</div>` : '<div class="stats"><span class="pill verify">Setup not finished</span></div>'}
        <div class="tiny muted" style="margin-top:6px">Updated ${fmtDT(p.updatedAt)}${backupAge(p) ? ' · backed up ' + fmtDate(backupAge(p)) : ' · <span style="color:var(--amber)">no backup file yet</span>'}</div></a>`;
    }).join('');
    return `<div class="banners">${storageBanners()}</div>
      <div class="btnrow" style="justify-content:space-between;margin-bottom:12px"><h2 style="margin:0">${App.ui.showArchived ? 'Archived projects' : 'Projects'}</h2>
      <div class="btnrow"><button class="btn" data-act="new-project">+ New project</button><button class="btn sec" data-act="restore">Restore backup</button></div></div>
      ${cards ? `<div class="plist">${cards}</div>` : `<div class="card"><b>No ${App.ui.showArchived ? 'archived ' : ''}projects yet.</b><p class="muted small">Create a project with its name and address, answer the setup questions, and the construction sequence is generated for you.</p><div class="btnrow"><button class="btn" data-act="new-project">+ New project</button><button class="btn sec" data-act="sample">Create sample project (crawlspace full gut)</button></div></div>`}
      <div class="btnrow" style="margin-top:14px"><button class="btn sec sm" data-act="toggle-archived">${App.ui.showArchived ? 'Show active projects' : 'Show archived projects'}</button>${App.projects.length ? '<button class="btn sec sm" data-act="sample">Create sample project</button>' : ''}</div>`;
  }

  // ---------------- project shell ----------------
  function projectShell() {
    const p = App.p; const tabs = [['overview', 'Overview'], ['ready', 'Ready'], ['tasks', 'Tasks'], ['drywall', 'Before Drywall'], ['inspections', 'Inspections'], ['trades', 'Trades'], ['setup', 'Setup'], ['export', 'PDF & Backup']];
    let view = '';
    if (!p.generatedAt && !['setup', 'export', 'log'].includes(App.tab)) App.tab = 'setup';
    switch (App.tab) { case 'ready': view = readyView(); break; case 'drywall': view = drywallView(); break; case 'tasks': view = tasksView(); break; case 'inspections': view = inspectionsView(); break; case 'trades': view = tradesView(); break; case 'setup': view = setupView(); break; case 'export': view = exportView(); break; case 'log': view = logView(); break; default: view = overviewView(); }
    return `<div class="phead"><h1>${esc(p.name)}${p.archived ? ' <span class="pill">Archived</span>' : ''}</h1><div class="addr">${esc(p.address || '')}${p.jurisdiction.ahj ? ' · ' + esc(p.jurisdiction.ahj) : ''} · ${p.jurisdiction.codeEdition ? esc(p.jurisdiction.codeEdition) : '<span style="color:var(--amber)">code edition not set</span>'}</div>
      <nav class="tabs">${tabs.map(([k, l]) => `<a href="#/p/${esc(p.id)}/${k}" class="${App.tab === k ? 'on' : ''}">${l}</a>`).join('')}</nav></div><main>${view}</main>`;
  }

  // ---------------- overview ----------------
  function overviewView() {
    const p = App.p, g = App.gen, st = App.states, s = E.stats(p, g, st), o = s.overall;
    const pick = (state, n) => g.tasks.filter((t) => st.get(t.id).state === state).slice(0, n);
    const kpi = (cls, n, label, filter) => `<a class="kpi ${cls}" href="#/p/${p.id}/tasks" data-act="setfilter" data-f="${filter}"><b>${n}</b><span>${label}</span></a>`;
    const active = s.phases.filter((x) => x.status === 'active');
    const cpOpen = s.cps.filter((c) => c.open);
    const retained = E.retainedRecords(p, g);
    const miniList = (ts, empty) => ts.length ? ts.map((t) => miniTask(t)).join('') : `<div class="empty">${empty}</div>`;
    return `<div class="banners">${storageBanners()}${backupBanner(p)}${!E.jurisdictionComplete(p.jurisdiction) ? `<div class="warnbox"><b>Jurisdiction not confirmed.</b> Set the AHJ and the adopted code edition in <a href="#/p/${p.id}/setup" data-act="setupsec-link">Setup → Project &amp; Jurisdiction</a> so code references are tied to this property.</div>` : ''}${p.draftAnswers ? `<div class="warnbox">Setup has unapplied changes. <a href="#/p/${p.id}/setup">Review and apply</a></div>` : ''}</div>
    <div class="grid g2"><div class="card"><div class="flabel">Overall progress</div><div class="bigpct"><b>${o.pct}%</b><span class="muted small">${o.complete} of ${o.applicable} applicable tasks complete${o.na ? ' · ' + o.na + ' N/A' : ''}</span></div><div class="bar" style="margin-top:8px"><i style="width:${o.pct}%"></i></div>
      <div class="small muted" style="margin-top:10px">Current phase${active.length > 1 ? 's' : ''}: ${active.length ? active.map((x) => `<a href="#/p/${p.id}/tasks" data-act="setphase" data-ph="${x.phase.id}"><b>${esc(x.phase.name)}</b></a>`).join(', ') : (o.complete ? 'none active' : 'not started')}</div></div>
      <div class="grid g3" style="grid-template-columns:repeat(3,1fr)">${kpi('blue', o.ready, 'Ready to start', 'ready')}${kpi('', o['in-progress'], 'In progress', 'in-progress')}${kpi('red', o.blocked, 'Blocked', 'blocked')}${kpi('amber', o.held, 'Held — inspection', 'held')}${kpi('', o.waiting, 'Waiting', 'waiting')}${kpi('green', o.complete, 'Complete', 'complete')}</div></div>
    <h2>Phases</h2><div class="phases">${s.phases.filter((x) => x.total).map((x, i) => `<a class="phrow ${x.status}" href="#/p/${p.id}/tasks" data-act="setphase" data-ph="${x.phase.id}"><span class="num">${x.phase.id.slice(1)}</span><span class="nm">${esc(x.phase.name)}${x.blocked ? ` <span class="pill blocked">${x.blocked} blocked</span>` : ''}${x.ready ? ` <span class="pill ready">${x.ready} ready</span>` : ''}${x.held ? ` <span class="pill held">${x.held} held</span>` : ''}</span><span class="bar"><i style="width:${x.pct}%"></i></span><span class="ct">${x.complete}/${x.applicable}</span></a>`).join('')}</div>
    <div class="grid g2" style="margin-top:6px">
      <div><h2>In progress</h2><div class="card">${miniList(pick('in-progress', 12), 'Nothing in progress.')}</div>
        <h2>Ready to start</h2><div class="card">${miniList(pick('ready', 8), 'Nothing ready — check held and waiting work.')}<div class="small" style="margin-top:6px"><a href="#/p/${p.id}/ready">Open the Ready view (${o.ready}) →</a></div></div></div>
      <div><h2>Blocked</h2><div class="card">${miniList(pick('blocked', 20), 'No blocked work.')}</div>
        <h2>Held for inspection</h2><div class="card">${miniList(pick('held', 12), 'No work is waiting only on an inspection.')}</div>
        <h2>Upcoming inspections & approvals</h2><div class="card">${cpOpen.length ? cpOpen.slice(0, 10).map((c) => `<div class="lrow">${stateDot(c.status)}<span class="grow"><a href="#/p/${p.id}/inspections#${esc(c.cp.id)}">${esc(c.cp.name)}</a><div class="tiny muted">${esc(E.CP_STATUS_LABEL[c.status])} · ${esc(E.CP_REQ_LABEL[c.req])}${c.afterOpen.length ? ' · ' + c.afterOpen.length + ' task(s) before requesting' : ''}</div></span>${c.readyToRequest ? '<span class="pill ready">Ready to request</span>' : ''}</div>`).join('') : '<div class="empty">All checkpoints passed or not required.</div>'}</div></div></div>
    ${retained.length ? `<h2>Records kept from scope changes</h2><div class="card"><div class="small muted" style="margin-bottom:6px">These tasks no longer apply to the current setup (or were retired from the library). Their status, notes, photos and history are preserved and re-attach automatically if the scope changes back.</div>${retained.map((r) => `<div class="lrow"><span class="grow">${esc(r.title)}<div class="tiny muted">${esc(E.STATUS_LABEL[r.rec.status] || r.rec.status)}${r.rec.notes ? ' · has notes' : ''}${(r.rec.photos || []).length ? ' · ' + r.rec.photos.length + ' photo(s)' : ''}${r.retired ? ' · retired from library' : ''}</div></span></div>`).join('')}</div>` : ''}`;
  }
  function miniTask(t) {
    const s = App.states.get(t.id), rec = E.getTaskRec(App.p, t.id);
    const extra = s.state === 'blocked' ? (rec.blockedReason || '') : s.state === 'held' ? 'Hold: ' + s.gatesOpen.map((g) => App.gen.cpMap.get(g).name).join('; ') : '';
    return `<div class="lrow"><button class="chk" style="width:22px;height:22px" data-act="check" data-id="${esc(t.id)}" title="Mark complete">${CHECK_SVG}</button><span class="grow"><a href="#/p/${App.p.id}/tasks?t=${encodeURIComponent(t.id)}">${esc(t.title)}</a><div class="tiny muted">${esc(rec.trade || t.trade)} · ${esc(L.PHASES.find((x) => x.id === t.phase).short)}${extra ? ' · ' + esc(extra) : ''}</div></span></div>`;
  }

  // ---------------- tasks ----------------
  const PHASE_GROUPS = { mep: { label: 'MEP rough-in (07–09)', phases: ['P07', 'P08', 'P09'] } };
  const QUICK_JUMPS = [['P05', 'Framing'], ['mep', 'MEP'], ['P10', 'Insulation'], ['P11', 'Drywall'], ['P13', 'Finishes']];
  const phaseMatch = (sel, ph) => sel === 'all' || (PHASE_GROUPS[sel] ? PHASE_GROUPS[sel].phases.includes(ph) : sel === ph);
  function phaseSteps() { const present = L.PHASES.filter((ph) => App.gen.tasks.some((t) => t.phase === ph.id)).map((ph) => ph.id); return present; }
  function stepPhase(dir) {
    const steps = phaseSteps(); const cur = App.ui.phase; let i;
    if (cur === 'all') i = dir > 0 ? 0 : steps.length - 1;
    else if (PHASE_GROUPS[cur]) { const g = PHASE_GROUPS[cur].phases; const edge = dir > 0 ? steps.indexOf(g[g.length - 1]) : steps.indexOf(g[0]); i = edge + dir; }
    else i = steps.indexOf(cur) + dir;
    App.ui.phase = steps[Math.max(0, Math.min(steps.length - 1, i))];
  }
  const FILTERS = [['open', 'Open'], ['ready', 'Ready'], ['in-progress', 'In progress'], ['held', 'Held'], ['waiting', 'Waiting'], ['blocked', 'Blocked'], ['complete', 'Complete'], ['na', 'N/A'], ['all', 'All']];
  function filteredTasks() {
    const u = App.ui, st = App.states, q = u.q.trim().toLowerCase();
    return App.gen.tasks.filter((t) => {
      const s = st.get(t.id).state, rec = E.getTaskRec(App.p, t.id);
      if (!phaseMatch(u.phase, t.phase)) return false;
      if (u.trade && (rec.trade || t.trade) !== u.trade) return false;
      if (u.filter === 'open' && (s === 'complete' || s === 'na')) return false;
      if (!['open', 'all'].includes(u.filter) && s !== u.filter) return false;
      if (q && !(t.title.toLowerCase().includes(q) || (rec.notes || '').toLowerCase().includes(q) || t.id.includes(q))) return false;
      return true;
    });
  }
  function tasksView() {
    const p = App.p, g = App.gen, u = App.ui, st = App.states;
    const phCounts = (id) => g.tasks.filter((t) => phaseMatch(id, t.phase) && !['complete', 'na'].includes(st.get(t.id).state)).length;
    const list = filteredTasks();
    const opts = [['all', 'All phases']].concat(g.phases.filter((ph) => g.tasks.some((t) => t.phase === ph.id)).map((ph) => [ph.id, ph.id.slice(1) + ' · ' + ph.name])).concat(Object.entries(PHASE_GROUPS).map(([k, v]) => [k, v.label]));
    let html = `<div class="chips"><button class="chip ${u.phase === 'all' ? 'on' : ''}" data-act="phase" data-ph="all">All (${phCounts('all')} open)</button>${QUICK_JUMPS.filter(([k]) => k === 'mep' || g.tasks.some((t) => t.phase === k)).map(([k, l]) => `<button class="chip ${u.phase === k ? 'on' : ''}" data-act="phase" data-ph="${k}">${l} (${phCounts(k)})</button>`).join('')}</div>
      <div class="filters"><button class="btn sec sm" data-act="phase-step" data-dir="-1" aria-label="Previous phase">‹</button><select data-act="phasesel" style="flex:1;min-width:180px">${opts.map(([k, l]) => `<option value="${k}" ${u.phase === k ? 'selected' : ''}>${esc(l)}${k === 'all' ? '' : ' (' + phCounts(k) + ' open)'}</option>`).join('')}</select><button class="btn sec sm" data-act="phase-step" data-dir="1" aria-label="Next phase">›</button></div>
      <div class="chips">${FILTERS.map(([k, l]) => `<button class="chip ${u.filter === k ? 'on' : ''}" data-act="filter" data-f="${k}">${l}</button>`).join('')}</div>
      <div class="filters"><select data-act="tradefilter"><option value="">All trades</option>${L.TRADES.filter((tr) => g.tasks.some((t) => (E.getTaskRec(p, t.id).trade || t.trade) === tr)).map((tr) => `<option ${u.trade === tr ? 'selected' : ''}>${esc(tr)}</option>`).join('')}</select><input type="search" placeholder="Search tasks and notes" value="${esc(u.q)}" data-act="search"><span class="small muted">${list.length} task${list.length === 1 ? '' : 's'}</span></div>`;
    if (u.phase !== 'all') html += `<div class="btnrow" style="margin-bottom:4px"><button class="btn sec sm" data-act="quick-pdf" data-kind="phase" data-ph="${esc(u.phase)}">PDF of ${PHASE_GROUPS[u.phase] ? 'these phases' : 'this phase'}</button><span class="small muted">Later phases can be worked any time their own prerequisites are done — phases overlap.</span></div>`;
    if (!list.length) return html + `<div class="card empty">No tasks match these filters.${u.filter !== 'all' ? ' <button class="btn sec sm" data-act="filter" data-f="all">Show all tasks in this view</button>' : ''}</div>`;
    let cur = null;
    for (const t of list) {
      if (t.phase !== cur) { cur = t.phase; const all = g.tasks.filter((x) => x.phase === cur); const done = all.filter((x) => ['complete', 'na'].includes(st.get(x.id).state)).length; html += `<div class="phase-h"><b>${cur.slice(1)} · ${esc(phaseName(cur))}</b><span>${done}/${all.length} done</span></div>`; }
      html += taskItem(t);
    }
    return html;
  }
  function taskItem(t) {
    const p = App.p, s = App.states.get(t.id), rec = E.getTaskRec(p, t.id), open = App.ui.expanded.has(t.id);
    const meta = [statePill(s.state), `<span>${esc(rec.trade || t.trade)}</span>`];
    if (rec.status === 'complete' && rec.completedAt) meta.push(`<span>✓ ${fmtDate(rec.completedAt)}</span>`);
    if (s.state === 'blocked' && rec.blockedReason) meta.push(`<span style="color:var(--red)">${esc(rec.blockedReason)}</span>`);
    if (s.gatesOpen.length) meta.push(`<span style="color:var(--amber)">Hold: ${esc(s.gatesOpen.map((x) => App.gen.cpMap.get(x).name).join('; '))}</span>`);
    if (s.overridden.length) meta.push('<span class="pill ovr">Override — not approved</span>');
    const fedOpen = t.feeds.filter((c) => E.cpIsOpen(p, App.gen.cpMap.get(c)));
    if (rec.status === 'complete' && fedOpen.length) meta.push(`<span class="pill held" title="Task work is complete; the inspection/approval is recorded separately">Work done · approval not recorded: ${esc(fedOpen.map((c) => App.gen.cpMap.get(c).name).join('; '))}</span>`);
    const qn = (t.lib.q || []).length; if (qn) { const qd = (t.lib.q || []).filter((q) => E.qcDone(p, t.id, q)).length; if (qd) meta.push(`<span>QC ${qd}/${qn}</span>`); }
    if (t.lib.photo && !['complete', 'na'].includes(s.state)) meta.push('<span title="Photograph before concealing">📷 photo required</span>');
    if ((rec.photos || []).length) meta.push(`<span>${rec.photos.length} photo${rec.photos.length > 1 ? 's' : ''}</span>`);
    if ((rec.notes || '').trim()) meta.push('<span>✎ notes</span>');
    if (t.lib.G) meta.push('<span title="Has construction guidance">ⓘ guide</span>');
    return `<div class="task st-${s.state} ${open ? 'open' : ''}" data-task="${esc(t.id)}"><div class="trow"><button class="chk" data-act="check" data-id="${esc(t.id)}" aria-label="${rec.status === 'complete' ? 'Reopen' : 'Mark complete'}">${CHECK_SVG}</button>
      <div class="tmain" data-act="expand" data-id="${esc(t.id)}"><div class="ttitle">${esc(t.title)}</div><div class="tmeta">${meta.join('')}</div></div><span class="caret" data-act="expand" data-id="${esc(t.id)}">▶</span></div>${open ? taskDetail(t, s, rec) : ''}</div>`;
  }
  function guidanceHTML(G, q) {
    if (!G && !(q && q.length)) return '';
    const j = App.p.jurisdiction;
    const tagged = (arr) => `<ul class="gl">${arr.map((line) => { const x = E.parseTagged(line); const basis = x.tag === 'C' ? E.codeBasis(x.ref, j) : ''; return `<li>${x.tag ? `<span class="pill tag-${x.tag}">${E.TAG_LABEL[x.tag]}</span> ` : ''}${x.ref ? `<span class="ref">${esc(x.ref)}</span> — ` : ''}${esc(x.text)}${basis ? `<div class="tiny" style="color:${/NOT SET|not set|verify/.test(basis) ? 'var(--amber)' : 'var(--mid)'};margin-top:2px">↳ ${esc(basis)}</div>` : ''}</li>`; }).join('')}</ul>`;
    const sec = (title, inner, openAttr) => `<details class="g" ${openAttr ? 'open' : ''}><summary>${title}</summary><div>${inner}</div></details>`;
    let h = '';
    if (G && G.w) h += sec('What needs to be done', `<p class="small" style="margin:4px 0">${esc(G.w)}</p>`, true);
    if (G && G.t && G.t.length) h += sec('Important technical details', tagged(G.t));
    if (G && G.m && G.m.length) h += sec('Common mistakes to avoid', tagged(G.m));
    if (q && q.length) h += sec('Quality-control checks', tagged(q));
    if (G && G.i) h += sec('Inspection / approval', `<p class="small" style="margin:4px 0">${esc(G.i)}</p>`);
    const note = `<div class="tiny muted" style="margin-top:6px">This project: <b>${esc(j.ahj || 'AHJ not set')}</b> · <b>${esc(j.codeEdition || 'code edition not set')}</b>${j.electricalCode ? ' · ' + esc(j.electricalCode) : ''}. Labels: <span class="pill tag-C">Code</span> section cited from the 2018 IRC / NEC model codes, with how it relates to this project's adopted edition; <span class="pill tag-L">Verify locally</span>; <span class="pill tag-M">Manufacturer</span>; <span class="pill tag-S">Industry standard</span>; <span class="pill tag-P">Pinestone practice</span> (company standard, not code).</div>`;
    return h + note;
  }
  function taskDetail(t, s, rec) {
    const p = App.p, g = App.gen;
    const seg = E.STATUS.map((k) => `<button class="${rec.status === k ? 'on' : ''}" data-act="status" data-id="${esc(t.id)}" data-st="${k}">${E.STATUS_LABEL[k]}</button>`).join('');
    const deps = t.deps.length ? t.deps.map((d) => { const ds = App.states.get(d); return `<a class="dep" data-act="goto" data-id="${esc(d)}">${stateDot(ds.state)}<span>${esc(g.taskMap.get(d).title)}</span><span class="tiny muted">${esc(E.STATE_LABEL[ds.state])}</span></a>`; }).join('') : '<span class="small muted">None — can start any time.</span>';
    const gates = t.gates.map((cid) => { const cp = g.cpMap.get(cid), status = E.cpStatus(p, cp), req = E.cpReq(p, cp), ov = E.activeOverride(p, t.id, cid), openG = E.cpIsOpen(p, cp);
      return `<div class="lrow">${stateDot(openG ? (ov ? 'blocked' : 'held') : 'passed')}<span class="grow"><a href="#/p/${p.id}/inspections#${esc(cid)}">${esc(cp.name)}</a><div class="tiny muted">${esc(E.CP_STATUS_LABEL[status])} · ${esc(E.CP_REQ_LABEL[req])}${ov ? ` · <b style="color:var(--red)">override by ${esc(ov.by)} ${fmtDate(ov.at)}: ${esc(ov.reason)}</b>` : ''}</div></span>${openG && !ov ? `<button class="btn sec sm" data-act="override" data-id="${esc(t.id)}" data-cp="${esc(cid)}">Record override</button>` : ''}${ov ? `<button class="btn sec sm" data-act="revoke" data-ov="${esc(ov.id)}">Revoke</button>` : ''}</div>`; }).join('');
    const feeds = t.feeds.length ? `<div class="field"><label>Feeds inspection / approval (recorded separately)</label>${t.feeds.map((c) => { const cp = g.cpMap.get(c), stt = E.cpStatus(p, cp); return `<div class="lrow">${stateDot(stt === 'passed' ? 'passed' : 'held')}<span class="grow small"><a href="#/p/${p.id}/inspections#${esc(c)}">${esc(cp.name)}</a> — approval: <b>${esc(E.CP_STATUS_LABEL[stt])}</b>${E.cpReq(p, cp) === 'not-required' ? ' (not required)' : ''}</span></div>`; }).join('')}<div class="tiny muted">Checking this task off does not record the inspection. Record the result on the Inspections tab.</div></div>` : '';
    const trades = L.TRADES.map((tr) => `<option ${(rec.trade || t.trade) === tr ? 'selected' : ''}>${esc(tr)}</option>`).join('');
    const hist = (rec.history || []).slice().reverse().map((h) => `<li>${fmtDT(h.at)} — ${esc(histText(h))}</li>`).join('');
    return `<div class="tdetail">
      <div class="seg">${seg}</div>
      ${rec.status === 'complete' ? `<div class="field"><label>Completion date</label><input class="input" type="date" style="max-width:200px" value="${esc(rec.completedAt || '')}" data-act="cdate" data-id="${esc(t.id)}"></div>` : ''}
      ${rec.status === 'blocked' ? `<div class="field"><label>Blocked because</label><div class="small">${esc(rec.blockedReason || '')}</div></div>` : ''}
      ${rec.status === 'na' ? `<div class="field"><label>Not applicable because</label><div class="small">${esc(rec.naReason || '')}</div></div>` : ''}
      <div class="grid g2"><div class="field"><label>Responsible trade</label><select class="input" data-act="trade" data-id="${esc(t.id)}">${trades}</select></div><div class="field"><label>Phase</label><div class="small">${esc(t.phase.slice(1) + ' · ' + phaseName(t.phase))}</div></div></div>
      <div class="field"><label>Prerequisite tasks</label><div class="deplist">${deps}</div></div>
      ${gates ? `<div class="field"><label>Inspection / approval hold</label>${gates}</div>` : ''}${feeds}
      <div class="field"><label>Notes</label><textarea data-act="notes" data-id="${esc(t.id)}" placeholder="Measurements, decisions, sub contacts, issues…">${esc(rec.notes || '')}</textarea></div>
      <div class="field"><label>Photos${t.lib.photo ? ' — photograph before concealing' : ''}</label>${photosHTML({ type: 'task', id: t.id }, rec.photos || [])}</div>
      ${qcHTML(t)}${guidanceHTML(t.lib.G, null)}
      ${hist ? `<details class="g"><summary>History (${rec.history.length})</summary><div><ul class="hist">${hist}</ul></div></details>` : ''}
      <div class="tiny muted" style="margin-top:8px">Task ID ${esc(t.id)}</div></div>`;
  }
  function histText(h) {
    if (h.action === 'status') return `${E.STATUS_LABEL[h.from] || h.from} → ${E.STATUS_LABEL[h.to]}${h.completedAt ? ' (' + h.completedAt + ')' : ''}${h.reopened ? ' — reopened (was completed ' + (h.previousCompletedAt || '') + ')' : ''}${h.note ? ' — ' + h.note : ''}${h.outOfSequence ? ' — out of sequence (' + h.outOfSequence.length + ' prerequisite(s) open)' : ''}${h.underOverride ? ' — under override, approval NOT recorded' : ''}${h.by ? ' · ' + h.by : ''}`;
    if (h.action === 'override') return `Override recorded for ${h.checkpoint}: ${h.note} · ${h.by}`;
    if (h.action === 'date') return `Completion date ${h.from} → ${h.to}`;
    if (h.action === 'trade') return `Trade → ${h.to}`;
    if (h.action === 'qc') return `QC ${h.to}: ${h.note}${h.by ? ' · ' + h.by : ''}`;
    if (h.action === 'photo-add') return 'Photo added'; if (h.action === 'photo-remove') return 'Photo removed';
    if (h.action === 'checkpoint') return Object.entries(h).filter(([k]) => !['at', 'action', 'by'].includes(k)).map(([k, v]) => `${k}: ${v.from == null ? '—' : v.from} → ${v.to}`).join('; ') + (h.by ? ' · ' + h.by : '');
    return h.action;
  }

  function qcHTML(t, compact) {
    const q = t.lib.q || []; if (!q.length) return '';
    const items = q.map((item, i) => { const rec = (App.p.tasks[t.id] || {}).qc || {}; const d = rec[item]; return `<label class="qcitem"><input type="checkbox" data-act="qc" data-id="${esc(t.id)}" data-qi="${i}" ${d ? 'checked' : ''}><span>${esc(item)}${d && !compact ? ` <span class="tiny muted">✓ ${fmtDate(d.at)}${d.by ? ' · ' + esc(d.by) : ''}</span>` : ''}</span></label>`; }).join('');
    return compact ? `<div class="qclist">${items}</div>` : `<div class="field"><label>Quality-control checks (${q.filter((x) => E.qcDone(App.p, t.id, x)).length}/${q.length})</label><div class="qclist">${items}</div></div>`;
  }

  // ---------------- ready ----------------
  function readyView() {
    const p = App.p, g = App.gen, st = App.states, u = App.ui;
    const by = (state) => g.tasks.filter((t) => st.get(t.id).state === state);
    const ready = by('ready'), prog = by('in-progress'), held = by('held');
    const nextUp = g.tasks.filter((t) => { const s = st.get(t.id); return s.state === 'waiting' && s.depsOpen.length === 1 && !s.gatesOpen.length && ['ready', 'in-progress'].includes(st.get(s.depsOpen[0]).state); });
    const groupBy = u.readyGroup || 'phase';
    const grouped = (ts) => { if (!ts.length) return ''; const key = (t) => (groupBy === 'trade' ? E.getTaskRec(p, t.id).trade || t.trade : t.phase); const keys = [...new Set(ts.map(key))]; return keys.map((k) => `<div class="phase-h"><b>${esc(groupBy === 'trade' ? k : k.slice(1) + ' · ' + phaseName(k))}</b><span>${ts.filter((t) => key(t) === k).length}</span></div>${ts.filter((t) => key(t) === k).map(taskItem).join('')}`).join(''); };
    const phasesWithReady = [...new Set(ready.map((t) => t.phase))];
    return `<div class="btnrow" style="justify-content:space-between"><div><h2 style="margin:0">Ready to start (${ready.length})</h2><div class="small muted">All prerequisites done and no inspection hold. ${phasesWithReady.length > 1 ? `Work is open in <b>${phasesWithReady.length} phases</b> at once.` : ''}</div></div>
      <div class="btnrow"><div class="seg"><button class="${groupBy === 'phase' ? 'on' : ''}" data-act="readygroup" data-g="phase">By phase</button><button class="${groupBy === 'trade' ? 'on' : ''}" data-act="readygroup" data-g="trade">By trade</button></div><button class="btn sec sm" data-act="quick-pdf" data-kind="ready">PDF</button></div></div>
      ${ready.length ? grouped(ready) : '<div class="card empty" style="margin-top:10px">Nothing is ready right now. See "Held" and "Next up" below.</div>'}
      ${prog.length ? `<h2>In progress (${prog.length})</h2>${grouped(prog)}` : ''}
      ${held.length ? `<h2>Ready except for an inspection (${held.length})</h2><div class="small muted">Prerequisites are done; record the approval on the Inspections tab to release these.</div>${grouped(held)}` : ''}
      ${nextUp.length ? `<h2>Next up — one task away (${nextUp.length})</h2><div class="card">${nextUp.map((t) => `<div class="lrow"><span class="grow"><a href="#/p/${p.id}/tasks?t=${encodeURIComponent(t.id)}">${esc(t.title)}</a><div class="tiny muted">${esc(E.getTaskRec(p, t.id).trade || t.trade)} · after: ${esc(g.taskMap.get(st.get(t.id).depsOpen[0]).title)}</div></span></div>`).join('')}</div>` : ''}`;
  }

  // ---------------- before drywall ----------------
  function drywallView() {
    const p = App.p, g = App.gen, st = App.states;
    const bd = E.beforeDrywall(p, g, st);
    const hang = g.taskMap.get('dw.hang');
    const head = bd.ready ? `<div class="okbox"><b>Ready for drywall.</b> Every task below is complete or N/A and every required approval is recorded.</div>`
      : `<div class="warnbox"><b>Not ready for drywall.</b> ${bd.open} of ${bd.total} pre-drywall tasks still open · ${bd.gatesOpen.length} required approval${bd.gatesOpen.length === 1 ? '' : 's'} not recorded.</div>`;
    const cps = bd.gates.map((cp) => { const status = E.cpStatus(p, cp), req = E.cpReq(p, cp), afterOpen = cp.after.filter((id) => !['complete', 'na'].includes(E.getTaskRec(p, id).status)); const appr = !E.cpIsOpen(p, cp);
      return `<div class="lrow cprow"><span class="grow"><a href="#/p/${p.id}/inspections#${esc(cp.id)}"><b>${esc(cp.name)}</b></a><div class="tiny muted">${esc(E.KIND_LABEL[cp.lib.kind])} · ${esc(E.CP_REQ_LABEL[req])}</div></span>
        <span class="pill ${afterOpen.length ? 'waiting' : 'complete'}" title="Task work required before requesting">Work: ${afterOpen.length ? afterOpen.length + ' open' : 'done'}</span>
        <span class="pill ${appr ? 'passed' : 'held'}" title="Recorded inspection result">Approval: ${esc(req === 'not-required' ? 'not required' : E.CP_STATUS_LABEL[status])}</span></div>`; }).join('');
    const groups = bd.groups.map((grp) => { const done = grp.tasks.filter((t) => ['complete', 'na'].includes(st.get(t.id).state)).length;
      return `<h2>${esc(grp.name)} <span class="small muted">${done}/${grp.tasks.length}</span></h2><div class="card">${grp.tasks.map((t) => { const s = st.get(t.id), rec = E.getTaskRec(p, t.id);
        return `<div class="bdrow st-${s.state}"><div class="lrow" style="border-top:0"><button class="chk" style="width:24px;height:24px" data-act="check" data-id="${esc(t.id)}">${CHECK_SVG}</button><span class="grow"><a data-act="goto" data-id="${esc(t.id)}" style="cursor:pointer">${esc(t.title)}</a><div class="tiny muted">${esc(rec.trade || t.trade)}${t.lib.photo ? ' · 📷 ' + ((rec.photos || []).length ? rec.photos.length + ' photo(s)' : '<b style="color:var(--amber)">photo required</b>') : ''}</div></span>${statePill(s.state)}</div>${['complete', 'na'].includes(s.state) && !(t.lib.q || []).length ? '' : qcHTML(t, true)}</div>`; }).join('')}</div>`; }).join('');
    return `${head}<div class="btnrow" style="margin:10px 0"><button class="btn sec sm" data-act="quick-pdf" data-kind="predrywall">Print / PDF this checklist</button><span class="small muted">Tasks ${bd.total - bd.open}/${bd.total} · QC items ${bd.qcDone}/${bd.qcTotal}</span></div>
      <h2>Required approvals before drywall</h2><div class="card">${cps || '<div class="empty">No approvals hold drywall for this project.</div>'}<div class="tiny muted" style="margin-top:6px">"Work" = the tasks needed before requesting; "Approval" = the recorded inspection result. Both must be green.</div></div>${groups}
      ${hang && hang.gates.length ? '' : ''}`;
  }

  // ---------------- photos ----------------
  function photosHTML(ref, ids) {
    return `<div class="photos">${ids.map((id) => { const c = App.photoCache.get(id); return `<div class="ph"><img data-pid="${esc(id)}" ${c ? `src="${c.dataUrl}"` : ''} alt="" data-act="lightbox"><div class="cap">${esc(c ? c.caption || fmtDate(c.takenAt) : '')}</div><button title="Remove photo" data-act="delphoto" data-type="${ref.type}" data-ref="${esc(ref.id)}" data-pid="${esc(id)}">×</button></div>`; }).join('')}
      <label class="addph">＋<span>Add photo</span><input type="file" accept="image/*" multiple class="hidden" data-act="addphoto" data-type="${ref.type}" data-ref="${esc(ref.id)}"></label></div>`;
  }
  async function hydratePhotos() {
    const imgs = [...document.querySelectorAll('img[data-pid]:not([src])')];
    for (const img of imgs) { const id = img.dataset.pid; let c = App.photoCache.get(id); if (!c) { c = await S.getPhoto(id); if (c) App.photoCache.set(id, c); } if (c) { img.src = c.dataUrl; const cap = img.parentElement.querySelector('.cap'); if (cap) cap.textContent = c.caption || fmtDate(c.takenAt); } else { img.alt = 'missing'; } }
  }
  function compressImage(file, maxDim, quality) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file); const img = new Image();
      img.onload = () => { const s = Math.min(1, maxDim / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); resolve({ dataUrl: c.toDataURL('image/jpeg', quality), w: c.width, h: c.height }); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read image')); };
      img.src = url;
    });
  }
  async function addPhotos(ref, files) {
    let n = 0;
    for (const f of files) {
      try {
        const r = await compressImage(f, 1600, 0.8);
        const ph = { id: E.uid('pho'), projectId: App.p.id, ref, caption: '', takenAt: new Date(f.lastModified || Date.now()).toISOString(), addedAt: new Date().toISOString(), dataUrl: r.dataUrl, w: r.w, h: r.h, bytes: Math.round(r.dataUrl.length * 0.75) };
        await S.putPhoto(ph); App.photoCache.set(ph.id, ph); E.attachPhoto(App.p, ref, ph.id); n++;
      } catch (e) { toast('Could not add photo: ' + e.message, 4000); }
    }
    if (n) { commit(); toast(n + ' photo' + (n > 1 ? 's' : '') + ' saved'); refreshStorage(); }
  }

  // ---------------- inspections ----------------
  function inspectionsView() {
    const p = App.p, g = App.gen, s = E.stats(p, g, App.states);
    const byPhase = g.phases.map((ph) => [ph, s.cps.filter((c) => c.cp.phase === ph.id)]).filter(([, a]) => a.length);
    const ovs = p.overrides.slice().reverse();
    return `<div class="infobox small">Inspection and approval records are kept <b>separate from task completion</b>. Work gated by a checkpoint cannot start until the checkpoint is recorded as <b>Passed</b> or set to <b>Not required</b> (with a note). "Confirm with AHJ" holds work until you confirm. Overrides let work proceed but never record an approval.</div>
      ${byPhase.map(([ph, cps]) => `<h2>${esc(ph.id.slice(1) + ' · ' + ph.name)}</h2>${cps.map(cpCard).join('')}`).join('')}
      <h2>Override log</h2><div class="card">${ovs.length ? ovs.map((o) => { const t = g.taskMap.get(o.taskId), cp = g.cpMap.get(o.checkpointId); return `<div class="lrow"><span class="grow"><b>${esc(t ? t.title : o.taskId)}</b> proceeded before <b>${esc(cp ? cp.name : o.checkpointId)}</b><div class="tiny muted">${fmtDT(o.at)} · ${esc(o.by)} · ${esc(o.reason)} · checkpoint then: ${esc(E.CP_STATUS_LABEL[o.checkpointStatusAtOverride] || '')}${o.active ? '' : ' · revoked ' + fmtDT(o.revokedAt)}</div></span>${o.active ? `<span class="pill ovr">Active</span><button class="btn sec sm" data-act="revoke" data-ov="${esc(o.id)}">Revoke</button>` : '<span class="pill">Revoked</span>'}</div>`; }).join('') : '<div class="empty">No overrides recorded.</div>'}</div>`;
  }
  function cpCard(c) {
    const p = App.p, g = App.gen, cp = c.cp, rec = p.checkpoints[cp.id] || {};
    const id = esc(cp.id);
    const after = cp.after.map((tid) => { const st = App.states.get(tid); return `<a class="dep" data-act="goto" data-id="${esc(tid)}">${stateDot(st.state)}<span>${esc(g.taskMap.get(tid).title)}</span></a>`; }).join('') || '<span class="small muted">—</span>';
    const gated = cp.gatesTasks.map((tid) => `<a class="dep" data-act="goto" data-id="${esc(tid)}">${stateDot(App.states.get(tid).state)}<span>${esc(g.taskMap.get(tid).title)}</span></a>`).join('') || '<span class="small muted">Does not hold any task (record only).</span>';
    const hist = (rec.history || []).slice().reverse().map((h) => `<li>${fmtDT(h.at)} — ${esc(histText(h))}</li>`).join('');
    return `<div class="card" id="${id}" style="margin-bottom:10px"><div class="btnrow" style="justify-content:space-between"><div><b>${esc(cp.name)}</b><div class="tiny muted">${esc(E.KIND_LABEL[cp.lib.kind])}</div></div><div class="btnrow"><span class="pill ${c.status === 'passed' ? 'passed' : c.status}">${esc(E.CP_STATUS_LABEL[c.status])}</span>${c.req !== 'required' ? `<span class="pill ${c.req === 'verify' ? 'verify' : 'na'}">${esc(E.CP_REQ_LABEL[c.req])}</span>` : ''}${c.readyToRequest ? '<span class="pill ready">Ready to request</span>' : ''}</div></div>
      ${cp.lib.desc ? `<div class="small muted" style="margin-top:6px">${esc(cp.lib.desc)}</div>` : ''}
      <div class="grid g3" style="margin-top:8px"><div class="field"><label>Requirement</label><select class="input" data-act="cpreq" data-cp="${id}">${['required', 'verify', 'not-required'].map((k) => `<option value="${k}" ${c.req === k ? 'selected' : ''}>${E.CP_REQ_LABEL[k]}</option>`).join('')}</select></div>
      <div class="field"><label>Status</label><select class="input" data-act="cpstatus" data-cp="${id}">${E.CP_STATUS.map((k) => `<option value="${k}" ${c.status === k ? 'selected' : ''}>${E.CP_STATUS_LABEL[k]}</option>`).join('')}</select></div>
      <div class="field"><label>Date</label><input class="input" type="date" value="${esc(rec.date || '')}" data-act="cpfield" data-k="date" data-cp="${id}"></div></div>
      ${rec.reqNote ? `<div class="small" style="margin-top:6px"><b>Requirement note:</b> ${esc(rec.reqNote)}</div>` : ''}
      <div class="grid g2"><div class="field"><label>Inspector / approved by</label><input class="input" value="${esc(rec.inspector || '')}" data-act="cpfield" data-k="inspector" data-cp="${id}"></div><div class="field"><label>Reference # (permit, ticket, report)</label><input class="input" value="${esc(rec.reference || '')}" data-act="cpfield" data-k="reference" data-cp="${id}"></div></div>
      <div class="field"><label>Notes / corrections required</label><textarea data-act="cpfield" data-k="notes" data-cp="${id}">${esc(rec.notes || '')}</textarea></div>
      <div class="grid g2"><div class="field"><label>Complete before requesting</label><div class="deplist">${after}</div></div><div class="field"><label>Holds these tasks until approved</label><div class="deplist">${gated}</div></div></div>
      <div class="field"><label>Photos (tags, reports, green cards)</label>${photosHTML({ type: 'cp', id: cp.id }, rec.photos || [])}</div>
      ${hist ? `<details class="g"><summary>History (${rec.history.length})</summary><div><ul class="hist">${hist}</ul></div></details>` : ''}</div>`;
  }

  // ---------------- trades ----------------
  function tradesView() {
    const p = App.p, g = App.gen, st = App.states;
    const rows = L.TRADES.map((tr) => { const ts = g.tasks.filter((t) => (E.getTaskRec(p, t.id).trade || t.trade) === tr); if (!ts.length) return ''; const c = (k) => ts.filter((t) => st.get(t.id).state === k).length; const done = c('complete') + c('na');
      return `<tr><td><b>${esc(tr)}</b></td><td>${c('ready')}</td><td>${c('in-progress')}</td><td>${c('held') + c('blocked')}</td><td>${done}/${ts.length}</td><td style="white-space:nowrap"><button class="btn sec sm" data-act="trade-tasks" data-tr="${esc(tr)}">Tasks</button> <button class="btn sec sm" data-act="quick-pdf" data-kind="trade" data-tr="${esc(tr)}">PDF</button></td></tr>`; }).join('');
    return `<div class="card" style="overflow-x:auto"><table class="t"><tr><th>Trade</th><th>Ready</th><th>In progress</th><th>Held / blocked</th><th>Done</th><th></th></tr>${rows}</table></div><p class="small muted">Change a task's responsible trade in its detail panel; trade lists and PDFs follow your assignment.</p>`;
  }

  // ---------------- setup ----------------
  function draft() { const p = App.p; return p.draftAnswers || p.answers; }
  function fieldHTML(f, A, B, bathId) {
    const v = B ? B[f.id] : A[f.id];
    const dk = `data-k="${esc(f.id)}" ${bathId ? `data-bath="${esc(bathId)}"` : ''}`;
    let ctl = '';
    if (f.type === 'buttons') ctl = `<div class="opts">${f.options.map(([k, l]) => `<button class="opt ${v === k ? 'on' : ''}" data-act="ans" ${dk} data-v="${esc(k)}">${esc(l)}</button>`).join('')}</div>`;
    else if (f.type === 'select') ctl = `<select class="input" data-act="ans-sel" ${dk}>${f.options.map(([k, l]) => `<option value="${esc(k)}" ${v === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
    else if (f.type === 'toggle') ctl = `<div class="toggle"><button class="${v ? 'on' : ''}" data-act="ans" ${dk} data-v="true">Yes</button><button class="${!v ? 'on' : ''}" data-act="ans" ${dk} data-v="false">No</button></div>`;
    else if (f.type === 'checks') ctl = `<div class="checks">${f.options.map(([k, l]) => `<label><input type="checkbox" data-act="ans-chk" ${dk} data-v="${esc(k)}" ${(v || []).includes(k) ? 'checked' : ''}>${esc(l)}</label>`).join('')}</div>`;
    else if (f.type === 'text') ctl = `<input class="input" data-act="ans-text" ${dk} value="${esc(v || '')}" placeholder="${esc(f.placeholder || '')}">`;
    return `<div class="q"><div class="ql">${esc(f.label)}</div>${ctl}${f.help ? `<div class="help">${esc(f.help)}</div>` : ''}</div>`;
  }
  function setupView() {
    const p = App.p, A = E.normalizeAnswers(draft()), u = App.ui;
    const secs = [{ id: 'project', title: 'Project & Jurisdiction' }].concat(Q.SECTIONS);
    let body = '';
    if (u.setupSec === 'project') {
      const j = p.jurisdiction;
      const jf = (k, label, ph) => `<div class="field"><label>${label}</label><input class="input" data-act="jfield" data-k="${k}" value="${esc(j[k] || '')}" placeholder="${esc(ph || '')}"></div>`;
      body = `<div class="card"><div class="grid g2"><div class="field"><label>Project name</label><input class="input" data-act="pfield" data-k="name" value="${esc(p.name)}"></div><div class="field"><label>Property address</label><input class="input" data-act="pfield" data-k="address" value="${esc(p.address)}"></div></div>
        <h3>Jurisdiction & code</h3><div class="grid g2">${jf('state', 'State', 'TN')}${jf('ahj', 'Authority having jurisdiction (AHJ)', 'e.g. Metro Nashville Codes / county / SFMO')}
        <div class="field"><label>Residential code edition</label><select class="input" data-act="jfield" data-k="codeEdition"><option value="" ${!j.codeEdition ? 'selected' : ''}>— Not set (confirm with AHJ) —</option>${Q.CODE_EDITIONS.map((e) => `<option ${j.codeEdition === e ? 'selected' : ''}>${esc(e)}</option>`).join('')}</select></div>
        ${jf('energyCode', 'Energy code', '2018 IECC / IRC Ch. 11')}${jf('electricalCode', 'Electrical code (NEC edition)', 'NEC 20xx')}${jf('climateZone', 'Climate zone', '4A')}${jf('permitNo', 'Building permit #', '')}</div>
        <div class="field"><label>Jurisdiction notes (local amendments, inspection scheduling, contacts)</label><textarea data-act="jfield" data-k="notes">${esc(j.notes || '')}</textarea></div>
        ${!E.jurisdictionComplete(j) ? '<div class="warnbox" style="margin:8px 0">Enter the AHJ and the residential code edition it has adopted. Until then, code references are shown as unconfirmed for this property.</div>' : ''}
        <div class="small muted">Tennessee's state program adopted the 2018 IRC; many cities and counties enforce their own adopted edition and amendments. Guidance in this app cites 2018 IRC section numbers and is labeled as code, manufacturer, industry standard, local-verify, or Pinestone practice. Confirm local requirements with the AHJ.</div></div>`;
    } else {
      const sec = Q.SECTIONS.find((x) => x.id === u.setupSec);
      if (sec.group === 'baths') {
        body = `<div class="card"><div class="small muted" style="margin-bottom:8px">Each bathroom generates its own framing, valve, waterproofing, flood test, tile and trim tasks plus its own flood-test checkpoint.</div>${A.baths.map((b) => `<div class="bathcard"><div class="btnrow" style="justify-content:space-between;padding-top:6px"><b>${esc(b.name)}</b><button class="btn danger sm" data-act="bath-del" data-bath="${esc(b.id)}">Remove</button></div>${Q.BATH_FIELDS.filter((f) => E.isFieldVisible(f, A, b)).map((f) => fieldHTML(f, A, b, b.id)).join('')}</div>`).join('') || '<div class="empty">No bathrooms in scope.</div>'}<button class="btn sec" data-act="bath-add">+ Add bathroom</button></div>`;
      } else body = `<div class="card">${sec.fields.filter((f) => E.isFieldVisible(f, A, null)).map((f) => fieldHTML(f, A, null)).join('')}</div>`;
    }
    const diff = E.diffAnswers(p, A);
    const pending = !p.generatedAt || !!p.draftAnswers;
    const bar = `<div class="stickybar"><span class="small"><b>${diff.newGen.tasks.length}</b> tasks · <b>${diff.newGen.checkpoints.length}</b> checkpoints${p.generatedAt && p.draftAnswers ? ` · unapplied: <b>+${diff.added.length}</b> / <b>−${diff.removed.length}</b>` : ''}</span><span style="flex:1"></span>
      ${p.draftAnswers && p.generatedAt ? '<button class="btn sec" data-act="draft-discard">Discard changes</button>' : ''}${pending ? `<button class="btn" data-act="apply">${p.generatedAt ? 'Apply changes' : 'Generate construction sequence'}</button>` : '<span class="small muted">Setup matches the current sequence.</span>'}</div>`;
    const idx = secs.findIndex((x) => x.id === u.setupSec);
    return `${!p.generatedAt ? '<div class="infobox" style="margin-bottom:12px"><b>Step 1 of 2:</b> answer the setup questions. Then generate the construction sequence. You can change answers later — existing progress, notes and photos are never deleted.</div>' : ''}
      <div class="setup"><nav class="secnav">${secs.map((x) => `<button class="${u.setupSec === x.id ? 'on' : ''}" data-act="setupsec" data-sec="${x.id}">${esc(x.title)}</button>`).join('')}</nav>
      <div><h2>${esc(secs[idx].title)}</h2>${body}<div class="btnrow" style="margin-top:10px">${idx > 0 ? `<button class="btn sec" data-act="setupsec" data-sec="${secs[idx - 1].id}">← ${esc(secs[idx - 1].title)}</button>` : ''}${idx < secs.length - 1 ? `<button class="btn sec" data-act="setupsec" data-sec="${secs[idx + 1].id}">${esc(secs[idx + 1].title)} →</button>` : ''}</div>${bar}</div></div>`;
  }
  function setDraft(fn) {
    const p = App.p; const A = E.normalizeAnswers(E.clone(draft())); fn(A);
    p.draftAnswers = JSON.stringify(A) === JSON.stringify(E.normalizeAnswers(p.answers)) && p.generatedAt ? null : A;
    E.touch(p); saveNow(); render();
  }
  async function applySetup() {
    const p = App.p; const A = E.normalizeAnswers(draft());
    const diff = E.diffAnswers(p, A);
    if (p.generatedAt) {
      const list = (arr) => arr.slice(0, 40).map((t) => `<li>${esc(t.title)}</li>`).join('') + (arr.length > 40 ? `<li>…and ${arr.length - 40} more</li>` : '');
      const ok = await confirmModal('Apply setup changes?', `<p><b>${diff.added.length}</b> task(s) will be added and <b>${diff.removed.length}</b> will no longer apply.</p>${diff.removedWithData.length ? `<p><b>${diff.removedWithData.length}</b> removed task(s) have progress, notes or photos. <b>Those records are kept</b> (shown under "Records kept from scope changes") and re-attach if the scope changes back.</p><ul class="small">${list(diff.removedWithData)}</ul>` : ''}${diff.restored.length ? `<p>${diff.restored.length} task(s) come back with their previous records.</p>` : ''}${diff.added.length ? `<details><summary class="small">Added tasks</summary><ul class="small">${list(diff.added)}</ul></details>` : ''}${diff.removed.length ? `<details><summary class="small">No longer applicable</summary><ul class="small">${list(diff.removed)}</ul></details>` : ''}`, 'Apply changes');
      if (!ok) return;
    }
    const first = !p.generatedAt;
    E.applyAnswers(p, A); p.draftAnswers = null; commit(false);
    toast(first ? `Construction sequence generated: ${App.gen.tasks.length} tasks` : 'Setup changes applied — all existing records kept');
    location.hash = `#/p/${p.id}/${first ? 'overview' : 'setup'}`; render();
  }

  // ---------------- export / backup ----------------
  function exportView() {
    const p = App.p, g = App.gen, u = App.ui, o = u.exportOpts;
    const trades = L.TRADES.filter((tr) => g.tasks.some((t) => (E.getTaskRec(p, t.id).trade || t.trade) === tr));
    if (!u.exportTrade || !trades.includes(u.exportTrade)) u.exportTrade = trades[0] || '';
    const at = backupAge(p);
    return `<div class="banners">${backupBanner(p)}</div><h2>PDF reports</h2><div class="card">
      <div class="checks">${Object.entries(PDF.KINDS).map(([k, l]) => `<label><input type="radio" name="kind" data-act="exp-kind" value="${k}" ${u.exportKind === k ? 'checked' : ''}>${esc(l)}</label>`).join('')}</div>
      ${u.exportKind === 'phase' ? `<div class="field"><label>Phase</label><select class="input" data-act="exp-phase">${g.phases.filter((ph) => g.tasks.some((t) => t.phase === ph.id)).map((ph) => `<option value="${ph.id}" ${u.exportPhase === ph.id ? 'selected' : ''}>${esc(ph.id.slice(1) + ' · ' + ph.name)}</option>`).join('')}</select></div>` : ''}
      ${u.exportKind === 'trade' ? `<div class="field"><label>Trade</label><select class="input" data-act="exp-trade">${trades.map((tr) => `<option ${u.exportTrade === tr ? 'selected' : ''}>${esc(tr)}</option>`).join('')}</select></div>` : ''}
      <div class="field"><label>Options</label><div class="checks">${[['includeComplete', 'Include completed tasks'], ['qc', 'Include QC checkboxes'], ['notes', 'Include task notes'], ['writeIn', 'Include write-in lines (date / by / notes)']].map(([k, l]) => `<label><input type="checkbox" data-act="exp-opt" data-k="${k}" ${o[k] ? 'checked' : ''}>${l}</label>`).join('')}</div></div>
      <div class="btnrow" style="margin-top:12px"><button class="btn" data-act="make-pdf">Generate PDF</button><span class="small muted">Created on this device — no internet needed.</span></div></div>
      <h2>Backup & restore</h2><div class="card"><div class="small">${at ? 'Last backup: <b>' + fmtDT(at) + '</b> (' + esc((App.backupInfo[p.id] || {}).how || '') + ')' : '<b>No backup file yet.</b>'} Backup files (<code>.pcos.json</code>) contain the complete project — setup, task progress, notes, completion history, photos, inspections and overrides — and can be restored on any device running this app.</div>
      <div class="btnrow" style="margin-top:10px"><button class="btn" data-act="backup-project">Export project backup</button><button class="btn sec" data-act="restore">Restore from backup…</button>${App.backupDir ? '<span class="small muted">Auto-backup folder active</span>' : ''}</div></div>
      <h2>Project</h2><div class="card"><div class="btnrow"><button class="btn sec" data-act="archive">${p.archived ? 'Unarchive project' : 'Archive project'}</button><button class="btn danger" data-act="delete-project">Delete project…</button></div><div class="small muted" style="margin-top:6px">Archiving hides the project from the main list without deleting anything. <a href="#/p/${p.id}/log">Activity log</a></div></div>`;
  }
  function logoBytes() {
    const d = App.settings.logo; if (!d) return null; const m = /^data:image\/(png|jpeg);base64,(.*)$/.exec(d); if (!m) return null;
    const bin = atob(m[2]); const b = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i); return { bytes: b, type: m[1] === 'png' ? 'png' : 'jpg' };
  }
  async function makePdf(kind, extra) {
    const u = App.ui; const opts = Object.assign({}, u.exportOpts, { phaseId: u.exportPhase, trade: u.exportTrade }, extra || {});
    toast('Building PDF…', 1500);
    try {
      const bytes = await PDF.build(kind, { project: App.p, gen: App.gen, states: App.states, logo: logoBytes(), opts });
      const label = kind === 'phase' ? 'Phase-' + opts.phaseId.slice(1) : kind === 'trade' ? 'Trade-' + slug(opts.trade) : kind;
      const name = `Pinestone_${slug(App.p.name)}_${label}_${today()}.pdf`;
      App.lastPdf = { name, size: bytes.length };
      await shareOrDownload(new Blob([bytes], { type: 'application/pdf' }), name);
    } catch (e) { console.error(e); toast('PDF failed: ' + e.message, 5000); }
  }
  function backupBlob(projects, photos) {
    const head = E.makeBackup(projects, [], { settings: { logo: App.settings.logo || null } }); delete head.photos;
    const json = JSON.stringify(head); const parts = [json.slice(0, -1), ',"photos":['];
    photos.forEach((ph, i) => { if (i) parts.push(','); parts.push(JSON.stringify(ph)); });
    parts.push(']}'); return new Blob(parts, { type: 'application/json' });
  }
  async function exportProjectBackup(p) {
    if (saveTimer) await saveNow();
    p = p || App.p; const photos = await S.photosForProject(p.id);
    const blob = backupBlob([p], photos);
    const name = `Pinestone-COS_${slug(p.name)}_${today()}.pcos.json`;
    await shareOrDownload(blob, name);
    App.backupInfo[p.id] = Object.assign(App.backupInfo[p.id] || {}, { at: new Date().toISOString(), how: 'file export' }); await S.setMeta('backupInfo', App.backupInfo);
    App.lastBackup = { name, size: blob.size }; render(); toast('Backup file exported (' + fmtBytes(blob.size) + ')');
  }
  async function exportAll() {
    if (saveTimer) await saveNow();
    const projects = await S.listProjects(); let photos = []; for (const p of projects) photos = photos.concat(await S.photosForProject(p.id));
    if (!projects.length) { toast('No projects to back up.'); return; }
    const blob = backupBlob(projects, photos);
    await shareOrDownload(blob, `Pinestone-COS_ALL-PROJECTS_${today()}.pcos.json`);
    const at = new Date().toISOString(); for (const p of projects) App.backupInfo[p.id] = Object.assign(App.backupInfo[p.id] || {}, { at, how: 'full export' }); await S.setMeta('backupInfo', App.backupInfo); render();
  }
  function pickFile(accept) { return new Promise((res) => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.onchange = () => res(i.files[0] || null); i.click(); }); }
  async function restoreFromFile(file) {
    file = file || await pickFile(/iPhone|iPad|iPod/.test(navigator.userAgent) ? '' : '.json,.pcos.json,application/json'); if (!file) return;
    let obj; try { obj = JSON.parse(await file.text()); } catch (e) { await modal(`<h3>Cannot restore</h3><p class="small">The file is not valid JSON — it may be damaged or not a backup file.</p><div class="btnrow"><button class="btn" data-m="ok">OK</button></div>`); return; }
    const errs = E.validateBackup(obj);
    if (errs.length) { await modal(`<h3>Cannot restore</h3><ul class="small">${errs.map((e) => `<li>${esc(e)}</li>`).join('')}</ul><p class="small muted">Nothing was changed.</p><div class="btnrow"><button class="btn" data-m="ok">OK</button></div>`); return; }
    const photos = obj.photos || []; const outP = [], outPh = []; let restored = 0;
    for (const raw of obj.projects) {
      let p; try { p = E.migrateProject(E.clone(raw)); } catch (e) { toast('Skipped "' + raw.name + '": ' + e.message, 5000); continue; }
      const existing = await S.getProject(p.id);
      const pPhotos = photos.filter((x) => x.projectId === p.id);
      const missing = []; for (const k in p.tasks) for (const id of p.tasks[k].photos || []) if (!pPhotos.some((x) => x.id === id)) missing.push(id);
      if (existing) {
        const r = await modal(`<h3>"${esc(p.name)}" already exists</h3><p class="small">Device copy updated ${fmtDT(existing.updatedAt)}. Backup copy updated ${fmtDT(p.updatedAt)}.</p><p class="small">Replacing overwrites the device copy with the backup. Importing as a copy keeps both.</p><div class="btnrow"><button class="btn sec" data-m="cancel">Skip</button><button class="btn sec" data-m="copy">Import as copy</button><button class="btn danger" data-m="replace">Replace device copy</button></div>`);
        if (!r) continue;
        if (r.action === 'copy') { const rk = E.rekeyProject(p, pPhotos); outP.push(rk.project); outPh.push(...rk.photos); restored++; continue; }
        await S.setMeta('preRestore:' + p.id, { at: new Date().toISOString(), project: existing });
      }
      p.log.push({ at: new Date().toISOString(), msg: 'Restored from backup file ' + file.name + (missing.length ? ` (${missing.length} photo reference(s) missing from file)` : '') });
      outP.push(p); outPh.push(...pPhotos); restored++;
    }
    if (!restored) return;
    try { await S.importAtomic(outP, outPh); } catch (e) { await modal(`<h3>Restore failed</h3><p class="small">${esc(e.message)}. Nothing was changed.</p><div class="btnrow"><button class="btn" data-m="ok">OK</button></div>`); return; }
    if (obj.settings && obj.settings.logo && !App.settings.logo) { App.settings.logo = obj.settings.logo; await S.setMeta('settings', App.settings); }
    App.p = null; await loadProjects(); refreshStorage();
    toast(`Restored ${restored} project${restored > 1 ? 's' : ''} with ${outPh.length} photo${outPh.length === 1 ? '' : 's'}`, 4000);
    if (restored === 1) location.hash = '#/p/' + outP[0].id + '/overview'; else { location.hash = '#/'; route(); }
  }

  // ---------------- log ----------------
  function logView() {
    const p = App.p; const items = p.log.slice().reverse().slice(0, 400);
    return `<h2>Activity log</h2><div class="card">${items.map((l) => `<div class="lrow"><span class="tiny muted" style="width:140px;flex:none">${fmtDT(l.at)}</span><span class="grow small">${esc(l.msg)}</span></div>`).join('') || '<div class="empty">No activity.</div>'}</div>
      <div class="kv small" style="margin-top:12px"><b>Project ID</b><span>${esc(p.id)}</span><b>Created</b><span>${fmtDT(p.createdAt)}</span><b>Sequence generated</b><span>${fmtDT(p.generatedAt) || '—'}</span><b>Library version</b><span>${esc(p.libraryVersion)} (app library ${esc(L.LIBRARY_VERSION)})</span><b>Data schema</b><span>${esc(p.schema)}</span></div>`;
  }

  // ---------------- settings ----------------
  function settingsView() {
    const st = App.storage;
    const fs = S.fsSupported();
    return `<div class="banners">${storageBanners()}</div><h2>Settings</h2>
    <div class="card"><div class="field" style="margin-top:0"><label>Your name (recorded on overrides, approvals and history)</label><input class="input" data-act="setting" data-k="userName" value="${esc(App.settings.userName || '')}" placeholder="e.g. David Labib"></div>
      <div class="field"><label>Pinestone logo (used in the app header and on every PDF)</label><div class="btnrow">${App.settings.logo ? `<img src="${esc(App.settings.logo)}" style="height:40px;border:1px solid var(--rule);border-radius:6px;padding:4px;background:#fff">` : '<span class="small muted">No logo loaded — the PINESTONE DEVELOPMENT wordmark is used.</span>'}<label class="btn sec sm">Load logo image…<input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" class="hidden" data-act="logo"></label>${App.settings.logo ? '<button class="btn sec sm" data-act="logo-clear">Remove</button>' : ''}</div></div></div>
    <h2>Backups</h2><div class="card"><p class="small" style="margin-top:0">Device storage is convenient but is not a permanent record. Keep backup files outside the browser.</p>
      <div class="btnrow"><button class="btn" data-act="export-all">Export ALL projects (one file)</button><button class="btn sec" data-act="restore">Restore from backup…</button></div>
      <h3>Automatic backup folder</h3>${fs ? `<p class="small muted">Desktop Chrome / Edge: choose a folder (e.g. your Pinestone Dropbox/OneDrive project folder). Every saved change writes <code>…_latest.pcos.json</code> plus one dated copy per day.</p><div class="btnrow">${App.backupDir ? `<span class="pill passed">Active: ${esc(App.backupDir.name)}</span><button class="btn sec sm" data-act="folder-now">Back up all projects now</button><button class="btn sec sm" data-act="folder-clear">Stop using folder</button>` : App.backupDirNeedsPerm ? '<button class="btn sm" data-act="reconnect-folder">Reconnect backup folder</button>' : '<button class="btn sec" data-act="folder-choose">Choose backup folder…</button>'}</div>` : '<p class="small muted">This browser cannot write to a folder automatically (Safari / iPhone / Firefox). Use "Export" regularly — on iPhone choose "Save to Files" and pick iCloud Drive or your cloud folder.</p>'}</div>
    <h2>Storage & offline</h2><div class="card"><div class="kv small"><b>Storage</b><span>${S.mode === 'indexeddb' ? 'IndexedDB on this device' : 'TEMPORARY (memory only)'}</span><b>Persistent</b><span>${S.persisted ? 'Yes — protected from automatic clearing' : 'Not granted by browser'}</span><b>Used</b><span>${st.quota ? fmtBytes(st.usage) + ' of ' + fmtBytes(st.quota) + ' available' : 'Unknown'}</span><b>Offline</b><span>${location.protocol === 'file:' ? 'Running from a local file (fully offline).' : ('serviceWorker' in navigator ? (App.swReady ? 'Installed for offline use' : 'Offline cache installing…') : 'Not supported')}</span><b>App version</b><span>${esc(E.APP_VERSION)} · task library ${esc(L.LIBRARY_VERSION)} (${L.TASKS.length} task templates, ${L.CHECKPOINTS.length} checkpoints)</span></div>
      ${location.protocol === 'file:' ? '<p class="small muted">Data is stored by this browser for this file location. Keep the app file in one place; if you move it or switch browsers, carry projects over with a backup file.</p>' : ''}</div>`;
  }
  async function loadLogo(file) {
    const url = URL.createObjectURL(file); const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    const scale = Math.min(1, 800 / img.width, 300 / img.height); const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(img.width * scale)); c.height = Math.max(1, Math.round(img.height * scale));
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
    App.settings.logo = c.toDataURL('image/png'); await S.setMeta('settings', App.settings); render(); toast('Logo saved');
  }
  async function refreshStorage() { App.storage = await S.estimate(); }

  // ---------------- task actions ----------------
  async function changeStatus(id, status) {
    const p = App.p, g = App.gen; const opts = { by: userName() };
    if (status === 'blocked') { const r = await reasonModal('Mark task blocked', esc(g.taskMap.get(id).title), 'What is blocking this work?', 'Mark blocked', true); if (r == null) return; opts.reason = r; }
    if (status === 'na') { const r = await reasonModal('Mark not applicable', esc(g.taskMap.get(id).title) + '<br>The task stays visible (greyed out) and is excluded from progress. You can reopen it at any time.', 'Why does this not apply?', 'Mark N/A', true); if (r == null) return; opts.reason = r; }
    if (status === 'complete') opts.date = today();
    let res = E.setTaskStatus(p, g, id, status, opts);
    if (!res.ok && res.code === 'GATED') { const ok = await overrideFlow(id, res.gates); if (!ok) return; recompute(); res = E.setTaskStatus(p, App.gen, id, status, opts); }
    if (!res.ok && res.code === 'DEPS') {
      const ok = await confirmModal('Prerequisites not complete', `<p>These prerequisite tasks are still open:</p><ul>${res.deps.map((d) => `<li>${esc(g.taskMap.get(d).title)}</li>`).join('')}</ul><p>Continue anyway? This is recorded in the task history as <b>out of sequence</b>.</p>`, status === 'complete' ? 'Complete anyway' : 'Start anyway');
      if (!ok) return; opts.force = true; res = E.setTaskStatus(p, App.gen, id, status, opts);
    }
    if (!res.ok) { toast('Not changed: ' + res.code); return; }
    commit();
  }
  async function overrideFlow(taskId, gates, onlyCp) {
    const g = App.gen, p = App.p; const t = g.taskMap.get(taskId);
    const list = gates.map((cid) => { const cp = g.cpMap.get(cid); return `<li><b>${esc(cp.name)}</b> — ${esc(E.CP_STATUS_LABEL[E.cpStatus(p, cp)])} (${esc(E.CP_REQ_LABEL[E.cpReq(p, cp)])})</li>`; }).join('');
    const r = await modal(`<h3>Held for inspection / approval</h3><p class="small"><b>${esc(t.title)}</b> cannot start until:</p><ul class="small">${list}</ul>
      <p class="small">If the inspection or approval has actually happened, record it on the Inspections tab. Otherwise you may record a <b>controlled override</b>: the work proceeds, the checkpoint stays <b>not approved</b>, and the override appears in the log and on PDFs.</p>
      <div class="field"><label>Reason for proceeding without approval</label><textarea name="reason" placeholder="e.g. Inspector approved verbally on site; card to be signed Friday"></textarea></div>
      <div class="field"><label>Authorized by</label><input class="input" name="by" value="${esc(userName())}"></div>
      <div class="btnrow"><button class="btn sec" data-m="cancel">Cancel</button><button class="btn sec" data-m="inspections">Go to Inspections</button><button class="btn danger" data-m="override">Record override</button></div>`);
    if (!r) return false;
    if (r.action === 'inspections') { location.hash = `#/p/${p.id}/inspections`; return false; }
    if (!r.form.reason.trim() || !r.form.by.trim()) { toast('Reason and name are required for an override.', 3500); return false; }
    for (const cid of gates) E.addOverride(p, g, taskId, cid, r.form.reason, r.form.by);
    if (onlyCp) commit();
    return true;
  }
  async function checkClick(id) {
    const rec = E.getTaskRec(App.p, id);
    if (rec.status === 'complete' || rec.status === 'na') {
      const ok = await confirmModal('Reopen task?', `<b>${esc(App.gen.taskMap.get(id).title)}</b> will return to Not Started. Its completion record stays in the task history.`, 'Reopen');
      if (ok) await changeStatus(id, 'not-started');
    } else await changeStatus(id, 'complete');
  }

  // ---------------- event wiring ----------------
  let noteTimers = {};
  document.addEventListener('click', async (e) => {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const a = el.dataset.act, p = App.p;
    if (['phasesel', 'qc', 'addphoto', 'logo', 'cdate', 'trade', 'tradefilter', 'ans-sel', 'ans-chk', 'cpreq', 'cpstatus', 'exp-kind', 'exp-opt', 'exp-phase', 'exp-trade', 'notes', 'cpfield', 'search', 'jfield', 'pfield', 'setting', 'ans-text'].includes(a)) return;
    if (el.tagName === 'A' && !['setfilter', 'setphase', 'goto', 'setupsec-link'].includes(a)) return;
    switch (a) {
      case 'new-project': {
        const r = await modal(`<h3>New project</h3><div class="field"><label>Project name</label><input class="input" name="name" placeholder="e.g. 224 Capitol Ave Full Gut"></div><div class="field"><label>Property address</label><input class="input" name="address" placeholder="Street, City, TN ZIP"></div><div class="btnrow"><button class="btn sec" data-m="cancel">Cancel</button><button class="btn" data-m="ok">Create project</button></div>`);
        if (!r) return; if (!r.form.name.trim()) { toast('Enter a project name.'); return; }
        const np = E.newProject(r.form.name, r.form.address); np.draftAnswers = E.normalizeAnswers({}); await S.putProject(np); App.ui.setupSec = 'project'; location.hash = '#/p/' + np.id + '/setup'; break;
      }
      case 'sample': {
        const np = E.newProject(DEMO.name, DEMO.address); Object.assign(np.jurisdiction, DEMO.jurisdiction); E.applyAnswers(np, DEMO.answers); await S.putProject(np); location.hash = '#/p/' + np.id + '/overview'; break;
      }
      case 'toggle-archived': App.ui.showArchived = !App.ui.showArchived; render(); break;
      case 'restore': restoreFromFile(); break;
      case 'backup-project': exportProjectBackup(); break;
      case 'export-all': exportAll(); break;
      case 'check': e.preventDefault(); await checkClick(el.dataset.id); break;
      case 'expand': { const id = el.dataset.id; if (App.ui.expanded.has(id)) App.ui.expanded.delete(id); else App.ui.expanded.add(id); render(); break; }
      case 'status': await changeStatus(el.dataset.id, el.dataset.st); break;
      case 'goto': { e.preventDefault(); const id = el.dataset.id; App.ui.expanded.add(id); App.ui.filter = 'all'; App.ui.phase = 'all'; App.ui.trade = ''; App.ui.q = ''; if (App.tab !== 'tasks') { App.focus = id; location.hash = `#/p/${p.id}/tasks`; } else { render(); const t = document.querySelector(`[data-task="${CSS.escape(id)}"]`); if (t) t.scrollIntoView({ block: 'center' }); } break; }
      case 'phase': App.ui.phase = el.dataset.ph; render(); break;
      case 'phase-step': stepPhase(Number(el.dataset.dir)); render(); break;
      case 'readygroup': App.ui.readyGroup = el.dataset.g; render(); break;
      case 'setupsec-link': App.ui.setupSec = 'project'; break;
      case 'filter': App.ui.filter = el.dataset.f; render(); break;
      case 'setfilter': App.ui.filter = el.dataset.f; App.ui.phase = 'all'; break;
      case 'setphase': App.ui.phase = el.dataset.ph; App.ui.filter = 'all'; break;
      case 'override': await overrideFlow(el.dataset.id, [el.dataset.cp], true); break;
      case 'revoke': { if (await confirmModal('Revoke override?', 'The task will be held again until the checkpoint is approved. The override stays in the log as revoked.', 'Revoke')) { E.revokeOverride(p, el.dataset.ov, userName()); commit(); } break; }
      case 'delphoto': { if (!(await confirmModal('Remove photo?', 'The photo will be removed from this record and deleted from the device.', 'Remove', true))) return; const ref = { type: el.dataset.type, id: el.dataset.ref }; E.detachPhoto(p, ref, el.dataset.pid); await S.deletePhoto(el.dataset.pid); App.photoCache.delete(el.dataset.pid); commit(); break; }
      case 'lightbox': { const c = App.photoCache.get(el.dataset.pid); if (!c) return; const lb = document.createElement('div'); lb.className = 'lightbox'; lb.innerHTML = `<img src="${c.dataUrl}"><div class="btnrow" style="margin-top:12px"><input class="input" style="max-width:320px;background:#222;color:#fff;border-color:#444" placeholder="Caption" value="${esc(c.caption || '')}"><button class="btn sec">Close</button></div><div class="tiny" style="margin-top:6px;opacity:.7">${fmtDT(c.takenAt)}</div>`; document.body.appendChild(lb); const inp = lb.querySelector('input'); const close = async () => { if (inp.value !== (c.caption || '')) { c.caption = inp.value; await S.putPhoto(c); render(); } lb.remove(); }; lb.querySelector('button').onclick = close; lb.addEventListener('click', (ev) => { if (ev.target === lb || ev.target.tagName === 'IMG') close(); }); break; }
      case 'ans': { const k = el.dataset.k, b = el.dataset.bath; let v = el.dataset.v; if (v === 'true') v = true; else if (v === 'false') v = false; setDraft((A) => { if (b) A.baths.find((x) => x.id === b)[k] = v; else A[k] = v; }); break; }
      case 'bath-add': setDraft((A) => { A.baths.push(E.newBath(A, E.usedBathIds(p))); }); break;
      case 'bath-del': { const b = el.dataset.bath; const A = draft(); const nm = (A.baths.find((x) => x.id === b) || {}).name; if (await confirmModal('Remove bathroom?', `<b>${esc(nm)}</b> will be removed from scope when you apply. Any progress, notes and photos for its tasks are kept.`, 'Remove')) setDraft((A2) => { A2.baths = A2.baths.filter((x) => x.id !== b); }); break; }
      case 'setupsec': App.ui.setupSec = el.dataset.sec; render(); window.scrollTo(0, 0); break;
      case 'apply': await applySetup(); break;
      case 'draft-discard': if (await confirmModal('Discard setup changes?', 'Your unapplied answers will be reset to the current sequence.', 'Discard')) { p.draftAnswers = null; E.touch(p); commit(); } break;
      case 'make-pdf': await makePdf(App.ui.exportKind); break;
      case 'quick-pdf': await makePdf(el.dataset.kind, el.dataset.kind === 'phase' ? { phaseId: el.dataset.ph } : el.dataset.kind === 'trade' ? { trade: el.dataset.tr } : {}); break;
      case 'trade-tasks': App.ui.trade = el.dataset.tr; App.ui.phase = 'all'; App.ui.filter = 'open'; location.hash = `#/p/${p.id}/tasks`; break;
      case 'archive': p.archived = !p.archived; E.touch(p, p.archived ? 'Project archived' : 'Project unarchived'); commit(); toast(p.archived ? 'Project archived' : 'Project restored to active list'); break;
      case 'delete-project': {
        const r = await modal(`<h3>Delete project permanently?</h3><p class="small">This deletes <b>${esc(p.name)}</b>, all task progress, notes, inspections and photos from this device. Export a backup first if you may need it.</p><div class="field"><label>Type DELETE to confirm</label><input class="input" name="confirm"></div><div class="btnrow"><button class="btn sec" data-m="cancel">Cancel</button><button class="btn sec" data-m="backup">Export backup first</button><button class="btn danger" data-m="delete">Delete</button></div>`);
        if (!r) return; if (r.action === 'backup') { await exportProjectBackup(); return; }
        if (r.form.confirm !== 'DELETE') { toast('Not deleted — type DELETE to confirm.'); return; }
        await S.deleteProject(p.id); App.p = null; toast('Project deleted'); location.hash = '#/'; break;
      }
      case 'logo-clear': App.settings.logo = null; await S.setMeta('settings', App.settings); render(); break;
      case 'folder-choose': try { App.backupDir = await S.chooseBackupFolder(); App.backupDirNeedsPerm = false; await backupAllToFolder(); render(); } catch (err) { if (err.name !== 'AbortError') toast('Folder not set: ' + err.message, 4000); } break;
      case 'reconnect-folder': { const h = await S.backupFolder(true); if (h && !h.needsPermission) { App.backupDir = h; App.backupDirNeedsPerm = false; await backupAllToFolder(); toast('Backup folder reconnected'); } else toast('Permission not granted'); render(); break; }
      case 'folder-now': await backupAllToFolder(); render(); break;
      case 'folder-clear': await S.clearBackupFolder(); App.backupDir = null; App.backupDirNeedsPerm = false; render(); break;
    }
  });
  async function backupAllToFolder() { const ps = await S.listProjects(); let n = 0; for (const x of ps) if (await writeFolderBackup(x.id, true)) n++; toast(`Backed up ${n} project${n === 1 ? '' : 's'} to folder`); }

  document.addEventListener('change', async (e) => {
    const el = e.target.closest('[data-act]'); if (!el) return; const a = el.dataset.act, p = App.p;
    switch (a) {
      case 'addphoto': { const files = [...el.files]; el.value = ''; await addPhotos({ type: el.dataset.type, id: el.dataset.ref }, files); break; }
      case 'logo': if (el.files[0]) loadLogo(el.files[0]).catch(() => toast('Could not read that image.')); break;
      case 'cdate': if (el.value) { E.setCompletionDate(p, el.dataset.id, el.value); commit(); } break;
      case 'trade': E.setTaskField(p, el.dataset.id, 'trade', el.value); commit(); break;
      case 'tradefilter': App.ui.trade = el.value; render(); break;
      case 'phasesel': App.ui.phase = el.value; render(); break;
      case 'qc': { const t = App.gen.taskMap.get(el.dataset.id); const item = t && (t.lib.q || [])[Number(el.dataset.qi)]; if (!item) break; E.setQc(p, t.id, item, el.checked, userName()); commit(); break; }
      case 'notes': if (saveTimer) saveNow(); break;
      case 'ans-sel': { const k = el.dataset.k, b = el.dataset.bath; setDraft((A) => { if (b) A.baths.find((x) => x.id === b)[k] = el.value; else A[k] = el.value; }); break; }
      case 'ans-chk': { const k = el.dataset.k, v = el.dataset.v; setDraft((A) => { const arr = new Set(A[k] || []); if (el.checked) arr.add(v); else arr.delete(v); A[k] = [...arr]; }); break; }
      case 'ans-text': { const k = el.dataset.k, b = el.dataset.bath; setDraft((A) => { if (b) A.baths.find((x) => x.id === b)[k] = el.value; else A[k] = el.value; }); break; }
      case 'pfield': if (el.dataset.k === 'name' && !el.value.trim()) { toast('Name cannot be empty'); render(); break; } p[el.dataset.k] = el.value.trim(); E.touch(p); commit(); break;
      case 'jfield': p.jurisdiction[el.dataset.k] = el.value; E.touch(p); commit(); break;
      case 'cpreq': {
        const cid = el.dataset.cp; const patch = { req: el.value };
        if (el.value === 'not-required') { const r = await reasonModal('Mark checkpoint not required', 'Record how this was confirmed (who at the AHJ / utility, when). This note is kept with the checkpoint.', 'Confirmation note', 'Save', true); if (r == null) { render(); return; } patch.reqNote = r; }
        const res = E.setCheckpoint(p, App.gen, cid, patch, userName()); if (!res.ok) toast('Not changed: ' + res.code); commit(); break;
      }
      case 'cpstatus': {
        const cid = el.dataset.cp; const rec = p.checkpoints[cid] || {}; const patch = { status: el.value };
        if (['passed', 'partial', 'failed'].includes(el.value) && !rec.date) { patch.date = today(); toast('Date set to today — change it if the inspection was on another day.', 3500); }
        const res = E.setCheckpoint(p, App.gen, cid, patch, userName()); if (!res.ok) toast('Not changed: ' + res.code); commit(); break;
      }
      case 'cpfield': { const res = E.setCheckpoint(p, App.gen, el.dataset.cp, { [el.dataset.k]: el.value }, userName()); if (res.ok) commit(el.dataset.k !== 'notes'); break; }
      case 'exp-kind': App.ui.exportKind = el.value; render(); break;
      case 'exp-phase': App.ui.exportPhase = el.value; break;
      case 'exp-trade': App.ui.exportTrade = el.value; break;
      case 'exp-opt': App.ui.exportOpts[el.dataset.k] = el.checked; break;
      case 'setting': App.settings[el.dataset.k] = el.value.trim(); await S.setMeta('settings', App.settings); toast('Saved'); break;
    }
  });
  document.addEventListener('input', (e) => {
    const el = e.target.closest('[data-act]'); if (!el) return; const a = el.dataset.act, p = App.p;
    if (a === 'notes') { const id = el.dataset.id; E.getTaskRec(p, id); if (!p.tasks[id]) p.tasks[id] = { status: 'not-started', notes: '', photos: [], history: [] }; p.tasks[id].notes = el.value; E.touch(p); saveSoon(300); clearTimeout(noteTimers[id]); noteTimers[id] = setTimeout(recompute, 600); }
    if (a === 'search') { App.ui.q = el.value; clearTimeout(noteTimers._s); noteTimers._s = setTimeout(() => { const pos = el.selectionStart; render(); const s = document.querySelector('[data-act="search"]'); if (s) { s.focus(); s.setSelectionRange(pos, pos); } }, 250); }
  });
  window.addEventListener('hashchange', route);
  // drag & drop restore on home
  document.addEventListener('dragover', (e) => { if (!App.p) e.preventDefault(); });
  document.addEventListener('drop', (e) => { if (App.p) return; e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) restoreFromFile(f); });

  // ---------------- boot ----------------
  async function boot() {
    await S.open();
    App.settings = Object.assign({ userName: '', logo: null }, (await S.getMeta('settings')) || {});
    App.backupInfo = (await S.getMeta('backupInfo')) || {};
    await initBackupFolder();
    await refreshStorage();
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready).then(() => { App.swReady = true; }).catch((e) => console.warn('SW', e));
    // Reopen where you left off (e.g. launching from the iPhone Home Screen)
    if (!location.hash || location.hash === '#') { try { const last = localStorage.getItem('pcos-last'); const m = last && /^#\/p\/([^/?]+)/.exec(last); if (m && await S.getProject(m[1])) history.replaceState(null, '', last); } catch (e) { /* ignore */ } }
    await route();
    window.PCOS_READY = true;
  }
  boot().catch((e) => { console.error(e); root().innerHTML = '<main><div class="errbox"><b>Startup error:</b> ' + esc(e.message) + '</div></main>'; });
})();
