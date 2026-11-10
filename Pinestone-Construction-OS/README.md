# Pinestone Construction OS — Full Gut Renovation

Offline construction workflow system for Pinestone Development. You create a project, answer the setup questions, and the app builds the full construction sequence. Then you work through it every day on a laptop or iPhone. It needs no internet, accounts, subscriptions or servers. This tool is separate from every other Pinestone tool.

## Start here

**Laptop (Mac or Windows):** open `app/Pinestone-Construction-OS.html` in Chrome or Edge (Safari also works). That one file contains everything: the app, the task library, the PDF engine and the fonts. It runs fully offline.

**iPhone:** iOS can't run an app straight from the Files app, so the `app/` folder has to be served once from any static web host. Your existing GitHub Pages setup works for this; put it in its **own new folder or repo** so nothing else is touched. Open it in Safari, then choose **Share → Add to Home Screen**. After that first load, the service worker caches the app and it runs with no connection. Installing to the Home Screen also keeps iOS from clearing the app's storage.

Each device keeps its own data. To move a project between devices, export a backup file on one and restore it on the other.

## Daily use

1. **Projects → + New project**, then enter the name and address.
2. **Setup → Project & Jurisdiction:** enter the **AHJ** and the **adopted code edition**. New projects don't assume an edition. Until you set it, code references are marked *unconfirmed for this property*.
3. **Setup:** answer the structured questions. They appear based on earlier answers. Then press **Generate construction sequence**.
4. **Ready** shows everything you can start now, grouped by phase or by trade. It also shows work that's ready except for an inspection, and work that's one task away. There's a PDF field list too.
5. **Tasks:** quick-jump buttons (Framing, MEP, Insulation, Drywall, Finishes), a phase dropdown with ‹ › arrows, plus status, trade and search filters. You can open any phase at any time. A task becomes *Ready* as soon as its own prerequisites are done, so several phases are usually active at once.
6. **Before Drywall** collects every approval and task that must be finished before board goes up: dry-in, framing, fireblocking and draftstopping, plumbing and gas, HVAC, electrical, bathrooms, backing, air sealing and insulation, plus the photo record. Every QC item has its own checkbox. It prints the same checklist to PDF.
7. **Inspections:** record each approval (status, date, inspector, reference number, photos). **Checking a task off never records an inspection.** A finished task that feeds an inspection shows *Work done · approval not recorded* until you record the result.
8. **PDF & Backup** produces the Pinestone PDFs, backup files, and the activity log.

Everything saves automatically. When you launch the app again (for example from the iPhone Home Screen), it reopens the last project and screen you were on. If the same project is open in two windows, the second window picks up the first one's saves. A window that's out of date won't overwrite newer work; it offers to reload instead.

## Rules the app enforces

- **Prerequisites:** a task whose prerequisites are open shows as *Waiting*. You can still start or complete it, but you have to confirm, and the history records it as *out of sequence*.
- **Inspection holds:** a task gated by a required checkpoint can't start until that checkpoint is recorded as **Passed** or set to **Not required**, which needs a note saying how it was confirmed. If a checkpoint is marked *Confirm with AHJ*, it holds work until you resolve it. A **controlled override** lets work go ahead, but it needs a reason and a name. The checkpoint stays *not approved*, and the override appears in the log and on the PDFs.
- **Blocked and N/A** both need a reason. Any task can be reopened, and the old completion stays in its history.
- **Changing setup answers never deletes anything.** Tasks that no longer apply keep their status, notes, photos and history under *Records kept from scope changes*. If the scope changes back, they reattach on their own. A removed bathroom's records stay with that bathroom's ID, and IDs are never reused.

## Backups (please read)

Browser storage on its own isn't a long-term record. The app gives you three layers:

1. **On-device storage.** The app asks the browser for *persistent* storage and warns you if the browser refuses or space runs low.
2. **Automatic backup folder** (desktop Chrome/Edge). Go to *Settings → Choose backup folder* and pick something like a Dropbox or OneDrive folder. Every change writes `…_latest.pcos.json` there, plus one dated copy per day.
3. **Backup files.** Use *Export project backup* or *Export ALL projects*. A `.pcos.json` file holds the complete project: setup, progress, notes, completion history, photos, inspections and overrides. You can restore it on any device. Damaged or wrong files are rejected without changing anything. If you restore a project that already exists, you choose between replacing it and importing it as a copy.

The app warns you when a project hasn't been backed up in more than 2 days.

## Your logo

The app doesn't include your logo file. Load it in **Settings → Pinestone logo** (PNG or JPG). It then appears in the app header and on every PDF. Until you do, the app uses a plain PINESTONE / DEVELOPMENT wordmark in charcoal.

## Code references

Tennessee's state program adopted the **2018 IRC**, but many cities and counties enforce their own edition and amendments. Set the AHJ and code edition on each project. Guidance cites 2018 IRC / NEC section numbers. Under each code reference, the app states how it relates to *this* project: edition not set, 2018 IRC with local amendments, or a different adopted edition where you should verify the section and requirement. NEC references use the project's electrical code field. Every guidance line is labeled **Code**, **Verify locally**, **Manufacturer**, **Industry standard** or **Pinestone practice**. Local requirements are never presented as universal rules.

## Folder contents

| Path | What |
|---|---|
| `app/Pinestone-Construction-OS.html` | The complete app in one file, for laptop use |
| `app/index.html`, `sw.js`, `manifest.webmanifest`, `icons/` | The same app plus offline files, for hosting / iPhone Home Screen |
| `src/` | Source code: `library.js` (task library), `questions.js`, `engine.js` (logic), `storage.js`, `pdf.js`, `app.js`, `styles.css` |
| `vendor/pdf-lib.min.js` | PDF engine bundled locally (MIT license) |
| `library/task-library.json` | Task library as data |
| `docs/` | Design, full task library reference, sample sequence, test report |
| `tests/` | Logic/data-integrity tests (Node) and offline end-to-end tests (headless Chrome) |
| `tools/` | Build, doc generator, icon generator |

## Rebuilding after you edit the library

```
node tools/build.js        # rebuilds the single file + offline files into app/
node tests/engine.test.js  # construction logic + data integrity
node tests/e2e.test.js     # full offline browser test (needs Playwright + Chrome)
node tools/gen-docs.js     # regenerate docs/TASK-LIBRARY.md
```

Never rename or reuse a task ID that has shipped, because saved progress is keyed by ID. To remove a task, mark it `retired: true` and its records are kept.
