/* Pinestone Construction OS — on-device storage.
 * Primary: IndexedDB (projects, photos, settings) with persistent-storage request.
 * Secondary (desktop Chrome/Edge): an auto-backup folder on disk via the File System Access API.
 * Always available: portable backup files (.pcos.json) for export / restore.
 */
(function (root) {
  'use strict';
  const DB_NAME = 'pinestone-construction-os';
  const DB_VERSION = 1;
  const S = { mode: 'none', persisted: false };
  let db = null;
  const mem = { projects: new Map(), photos: new Map(), meta: new Map() }; // fallback only

  function req(r) { return new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
  function txDone(tx) { return new Promise((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error || new Error('Transaction failed')); tx.onabort = () => rej(tx.error || new Error('Transaction aborted')); }); }

  S.open = async function () {
    if (!('indexedDB' in root)) { S.mode = 'memory'; return S.mode; }
    try {
      db = await new Promise((res, rej) => {
        const r = indexedDB.open(DB_NAME, DB_VERSION);
        r.onupgradeneeded = () => {
          const d = r.result;
          if (!d.objectStoreNames.contains('projects')) d.createObjectStore('projects', { keyPath: 'id' });
          if (!d.objectStoreNames.contains('photos')) { const ps = d.createObjectStore('photos', { keyPath: 'id' }); ps.createIndex('projectId', 'projectId'); }
          if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta');
        };
        r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); r.onblocked = () => rej(new Error('Database blocked by another open tab'));
      });
      db.onversionchange = () => { db.close(); if (root.alert) root.alert('Pinestone Construction OS was updated in another tab. Reload this tab.'); };
      S.mode = 'indexeddb';
    } catch (e) { console.warn('IndexedDB unavailable', e); S.mode = 'memory'; }
    try { if (navigator.storage && navigator.storage.persist) { S.persisted = await navigator.storage.persisted(); if (!S.persisted) S.persisted = await navigator.storage.persist(); } } catch (e) { /* ignore */ }
    return S.mode;
  };

  S.estimate = async function () {
    try { if (navigator.storage && navigator.storage.estimate) { const e = await navigator.storage.estimate(); return { usage: e.usage || 0, quota: e.quota || 0 }; } } catch (e) { /* ignore */ }
    return { usage: 0, quota: 0 };
  };

  async function all(store) {
    if (S.mode !== 'indexeddb') return [...mem[store].values()].map((x) => JSON.parse(JSON.stringify(x)));
    return req(db.transaction(store).objectStore(store).getAll());
  }
  S.listProjects = () => all('projects');
  S.getProject = async (id) => (S.mode !== 'indexeddb' ? (mem.projects.has(id) ? JSON.parse(JSON.stringify(mem.projects.get(id))) : null) : req(db.transaction('projects').objectStore('projects').get(id)));
  S.putProject = async function (p) {
    const copy = JSON.parse(JSON.stringify(p));
    if (S.mode !== 'indexeddb') { mem.projects.set(p.id, copy); return; }
    const tx = db.transaction('projects', 'readwrite'); tx.objectStore('projects').put(copy); await txDone(tx);
  };
  S.deleteProject = async function (id) {
    if (S.mode !== 'indexeddb') { mem.projects.delete(id); for (const [k, v] of mem.photos) if (v.projectId === id) mem.photos.delete(k); return; }
    const photos = await S.photosForProject(id);
    const tx = db.transaction(['projects', 'photos'], 'readwrite');
    tx.objectStore('projects').delete(id); for (const ph of photos) tx.objectStore('photos').delete(ph.id);
    await txDone(tx);
  };
  S.putPhoto = async function (ph) {
    if (S.mode !== 'indexeddb') { mem.photos.set(ph.id, ph); return; }
    const tx = db.transaction('photos', 'readwrite'); tx.objectStore('photos').put(ph); await txDone(tx);
  };
  S.getPhoto = async (id) => (S.mode !== 'indexeddb' ? mem.photos.get(id) || null : req(db.transaction('photos').objectStore('photos').get(id)));
  S.deletePhoto = async function (id) { if (S.mode !== 'indexeddb') { mem.photos.delete(id); return; } const tx = db.transaction('photos', 'readwrite'); tx.objectStore('photos').delete(id); await txDone(tx); };
  S.photosForProject = async function (projectId) {
    if (S.mode !== 'indexeddb') return [...mem.photos.values()].filter((p) => p.projectId === projectId);
    return req(db.transaction('photos').objectStore('photos').index('projectId').getAll(projectId));
  };
  S.getMeta = async (k) => (S.mode !== 'indexeddb' ? mem.meta.get(k) : req(db.transaction('meta').objectStore('meta').get(k)));
  S.setMeta = async function (k, v) { if (S.mode !== 'indexeddb') { mem.meta.set(k, v); return; } const tx = db.transaction('meta', 'readwrite'); tx.objectStore('meta').put(v, k); await txDone(tx); };

  // Restore: write projects + photos in ONE transaction (all-or-nothing).
  S.importAtomic = async function (projects, photos) {
    if (S.mode !== 'indexeddb') { for (const p of projects) mem.projects.set(p.id, p); for (const ph of photos) mem.photos.set(ph.id, ph); return; }
    const tx = db.transaction(['projects', 'photos'], 'readwrite');
    const ps = tx.objectStore('projects'), phs = tx.objectStore('photos');
    for (const p of projects) {
      // replacing a project: remove its old photos first
      const old = await req(phs.index('projectId').getAllKeys(p.id));
      for (const k of old) phs.delete(k);
      ps.put(p);
    }
    for (const ph of photos) phs.put(ph);
    await txDone(tx);
  };

  // ---------- Backup folder (File System Access API, desktop Chromium) ----------
  S.fsSupported = () => typeof root.showDirectoryPicker === 'function';
  S.chooseBackupFolder = async function () {
    const h = await root.showDirectoryPicker({ id: 'pcos-backups', mode: 'readwrite' });
    await S.setMeta('backupDir', h); return h;
  };
  S.backupFolder = async function (requestIfNeeded) {
    if (!S.fsSupported()) return null;
    const h = await S.getMeta('backupDir'); if (!h) return null;
    try {
      let perm = await h.queryPermission({ mode: 'readwrite' });
      if (perm !== 'granted' && requestIfNeeded) perm = await h.requestPermission({ mode: 'readwrite' });
      return perm === 'granted' ? h : { handle: h, needsPermission: true };
    } catch (e) { return null; }
  };
  S.writeFile = async function (dirHandle, name, text) {
    const fh = await dirHandle.getFileHandle(name, { create: true });
    const w = await fh.createWritable(); await w.write(text); await w.close();
  };
  S.clearBackupFolder = () => S.setMeta('backupDir', null);

  root.PCOS_STORE = S;
})(typeof window !== 'undefined' ? window : globalThis);
