# Test report — Pinestone Construction OS v1.1.0

Run on 2026-11-10 with Node v22.23.4 and headless Google Chrome. Every network request outside the app was blocked; part of the run was fully offline.

## 1. Construction logic & data integrity (`node tests/engine.test.js`)

```
PASS  Library: no structural errors (ids, deps, checkpoints, trades, guidance tags, conditions)
PASS  Library: 14 phases, every phase has tasks
PASS  Demo project: generates tasks across all phases, both bathrooms
PASS  Branching: crawlspace vs slab vs basement generate the right foundation work
PASS  Branching: structural, gas, attached garage, stories add the right checkpoints/tasks
PASS  Dependencies: inapplicable prerequisites are bridged (chain never breaks)
PASS  Construction logic: 400 random setups — no cycles, no gate deadlocks, valid refs
PASS  Construction logic: full demo job can be built start to finish in sequence
PASS  Construction logic: 60 random setups can each be built to 100%
PASS  Readiness: initial states — walkthrough ready, demolition held by permit + hazmat
PASS  Gates: cannot start gated work; override records reason and does NOT approve the checkpoint
PASS  Gates: "Not required" needs a note; "Confirm with AHJ" still holds work
PASS  Statuses: blocked needs reason; reopen keeps history; N/A excluded from progress
PASS  Prerequisites: out-of-sequence completion requires force and is recorded
PASS  Scope change: switching crawlspace → slab keeps crawl records; switching back re-attaches them
PASS  Scope change: removing a bathroom retains its records; a new bathroom never reuses the id
PASS  Persistence: JSON round-trip + migration reproduces identical states
PASS  Library update: renamed/re-sequenced/retired/new tasks never lose existing progress
PASS  Backup: validate, reject damaged files, re-key copies with photos
PASS  v1.1 Before Drywall: gathers every inspection, fireblocking, draftstopping, nail plate, framing, MEP, insulation and QC item
PASS  v1.1 Overlap: several phases have ready work at the same time
PASS  v1.1 QC items: checked per item, keyed by text, survive scope change and JSON round-trip
PASS  v1.1 Code references follow the project jurisdiction, never assume 2018 IRC
PASS  v1.1 Compatibility: a real v1.0 backup file validates, migrates and keeps all progress

24/24 tests passed. Library v1.1.0: 217 task templates, 30 checkpoint templates. Demo project: 190 tasks, 27 checkpoints.
```

## 2. Offline end-to-end — desktop and iPhone-size (`node tests/e2e.test.js`)

```
PASS  Conditional questions: crawlspace shows crawl drainage, hides slab work
PASS  Two bathrooms added in setup
PASS  Sequence generated from selections (157 tasks)
PASS  Crawlspace, structural and gas branches generated
PASS  Checkbox completes a task
PASS  Note typed and photo attached to task
PASS  Blocked status with reason
PASS  Starting gated demolition opens the inspection-hold dialog
PASS  Override recorded; permit checkpoint NOT marked approved
PASS  Inspection passed with date recorded on its own record
PASS  Everything survived closing and reopening: {"walk":"complete","note":"Ceilings 8'-2\" typical; kitchen 7'-11\"","photos":1,"blocked":"Waiting on attic access","ov":2,"eng":"passed","insp":"Smith Engineering"}
PASS  Scope-change dialog warns that records are kept
PASS  Slab branch applied; crawl record retained
PASS  Switching back re-attaches completion; photos untouched
PASS  PDF "sequence" generated (Pages:           21, 79 KB)
PASS  PDF "phase" generated (Pages:           2, 8 KB)
PASS  PDF "trade" generated (Pages:           6, 22 KB)
PASS  PDF "ready" generated (Pages:           1, 4 KB)
PASS  PDF "inspections" generated (Pages:           4, 14 KB)
PASS  PDF "predrywall" generated (Pages:           8, 31 KB)
PASS  PDF "open" generated (Pages:           16, 59 KB)
PASS  Backup file contains project, photo and overrides
PASS  Project deleted from device
PASS  Restore brought back progress, notes, photos, approvals, overrides: {"walk":"complete","note":"Ceilings 8'-2\" typical; kitchen 7'-11\"","photos":1,"ov":2,"eng":"passed","crawl":"complete"}
PASS  Damaged / wrong backup file rejected, nothing changed
PASS  App loads and shows data with the device OFFLINE
PASS  Updated app/library keeps completed tasks and photos
PASS  Quick jump "MEP" shows rough plumbing/HVAC/electrical together: P07,P08,P09
PASS  Phase dropdown + next-phase arrow navigate directly (P11 → P12)
PASS  Finishes phase opens directly without completing earlier phases
PASS  Ready view lists every ready / in-progress / held task (4) across 3 phase(s)
PASS  Task checked off directly from the Ready view
PASS  Ready view groups by trade
PASS  Completing the plumbing test does NOT record the rough plumbing inspection (shown as "Work done · approval not recorded")
PASS  Before Drywall shows status
PASS  Before Drywall groups: Framing, Fireblocking,, Plumbing, HVAC, Electrical, Bathrooms, Backing, Air, Records
PASS  Before Drywall lists the required approvals
PASS  Before Drywall checklist QC check saved and printed to PDF
PASS  New project warns that AHJ / code edition are not set (no 2018 IRC assumption)
PASS  Code reference flagged as unconfirmed while edition is unset
PASS  Code reference now tied to the project's adopted edition and AHJ
PASS  Launching the app again reopens the last project and screen
PASS  Second window picks up changes saved in the first
PASS  Stale window refuses to overwrite newer work and reloads it
PASS  Real v1.0 backup restores in v1.1 with progress, photos, approvals, overrides: {"walk":"complete","photos":1,"ov":2,"ed":"2018 IRC","eng":"passed"}
PASS  v1.0 app can still open a project saved by v1.1
PASS  No horizontal overflow at iPhone width
PASS  No horizontal overflow on iPhone: ready
PASS  No horizontal overflow on iPhone: drywall
PASS  No horizontal overflow on iPhone: tasks
PASS  iPhone-size: photo + note survive closing; app reopens on the same task list
PASS  No external network requests (0)
PASS  No JavaScript errors

53/53 end-to-end checks passed.
```

## v1.0 compatibility
- The fixture `tests/fixtures/v1.0-backup.pcos.json` is a real backup exported by the v1.0 app. It restores in v1.1 with its progress, photos, approvals and overrides.
- The v1.0 app (`tests/fixtures/v1.0-app.html`) can still open a project saved by v1.1.
- No data-format change: schema 1. New fields (per-item QC checks) are optional.

## Not tested here
- A physical iPhone: the iPhone checks used Chrome mobile emulation at 390×844. Safari's Home Screen install, the share sheet and the Files picker need a check on the real device.
- The desktop automatic backup folder: it needs a real folder picker.
