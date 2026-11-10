# Design — Pinestone Construction OS v1.0

The design was done in this order: the task library, the setup questions, the branching rules, the dependencies and the approval checkpoints. The application came after.

## 1. Phases (14)

| # | Phase | Typical content |
|---|---|---|
| 01 | Preconstruction & Permitting | Baseline photos, measure, scope, hazmat survey, engineer, drawings, permits, 811, subs, long-lead orders |
| 02 | Site Setup, Protection & Hazard Control | Permit card, dumpster, utility shutoffs, protection, erosion control, RRP containment, abatement |
| 03 | Demolition & Discovery | Gut to studs, plaster, abandoned MEP, chimney, post-demo photo record, structural/moisture assessment, WDI |
| 04 | Foundation & Substructure | Footings/piers; crawlspace (clean-out, assessment, sill, girder, sistering, subfloor, liner, drainage, encapsulation, conditioning, insulation) **or** slab (scan, trench, underslab rough, backfill, patch, new slab) **or** basement (cracks, drains, waterproofing, egress, wall framing) |
| 05 | Structural Framing & Modifications | Shoring, beam, load path, openings/headers, joist/roof repairs, vaults, stairs, partitions, straightening, bath framing, connectors, QC, engineer observation |
| 06 | Dry-In | Tear-off, decking, underlayment, flashing/kickouts, ventilation, roofing, WRB, windows (flashing sequence), egress/safety glazing, doors, water test |
| 07 | Rough Plumbing & Gas | Layout walk, service, sewer, DWV, supply, nail plates, bore/notch check, tubs, valves (depth), shower drains, fixture rough, kitchen, laundry, water heater, hose bibs, tests; gas piping and tests |
| 08 | Rough HVAC & Ventilation | Manual J/S/D, equipment, ducts, mastic sealing, line set, condensate/float, mini-split heads, bath fans to exterior, range hood/MUA, dryer, ventilation, combustion air, terminations |
| 09 | Rough Electrical & Low-Voltage | Device walk, service/grounding/bonding, branch rough, kitchen and bath circuits, laundry, AFCI/GFCI plan, smoke/CO, nail plates, IC-airtight cans, low-voltage, exterior, EV, generator, heated-floor prep, photo record |
| 10 | Pre-Drywall | Fireblocking, draftstopping, garage separation, backing/blocking, air sealing, insulation, spray foam barriers, concealed-dimension record, photo/video record, Pinestone pre-drywall walkthrough |
| 11 | Drywall, Tile Backer & Waterproofing | Drywall (gated), attic insulation, finish, QC; per bath: backer, pan, membrane, 24-hr flood test, floor prep, heated mat |
| 12 | Exterior Envelope & Site | Siding, trim, penetrations, paint, gutters, grading, porch/deck (footings + inspection), flatwork, condenser pad, address numbers, fence, landscaping |
| 13 | Interior Finishes & Trim-Out | Prime, cabinets, vanities, template, counters, backsplash, bath tile (gated by flood test), grout, flooring prep/install, doors, trim, stairs, paint, refinish, glass, MEP trim, appliances, hardware, touch-up, carpet |
| 14 | Commissioning, Finals & Handoff | Plumbing/HVAC/electrical/gas commissioning, exhaust airflow, blower door/duct test, water-intrusion check, crawl humidity, punch, clean, finals, CO, handoff package, owner acceptance, archive |

Phases organize the work, but they don't hold it back. What controls readiness is the **dependencies**, so work can overlap: crawlspace encapsulation in P04, for example, waits for the P07–P09 rough-ins under the floor.

## 2. Setup questions and branching

There are 10 sections: Property & Permitting, Foundation, Structural & Demolition, Roof/Windows/Doors, Exterior & Site, Plumbing & Gas, Electrical & HVAC, Bathrooms (a repeating group), Kitchen, and Insulation/Drywall/Finishes. Each question can have a `show` condition based on earlier answers. Examples:

- **Foundation = Crawlspace** shows the crawlspace strategy (vented / encapsulated / conditioned), observed conditions, framing work, subfloor, drainage and insulation questions. **Slab** shows slab-work questions. **Basement** shows waterproofing, cracks, finish and egress.
- *Basement egress* only appears when *Finish basement* is Yes. *Heated floor* only appears when the bathroom has a tile floor.
- Gas appliance and piping questions appear only when gas is in scope. Duct location appears only for a full ducted system.

Branching is applied to tasks through each task's `w` condition. A few examples:

| Selection | Generates | Removes |
|---|---|---|
| Crawlspace | clean-out, assessment, access, liner, vents check **or** encapsulation + conditioning, plus sill/girder/sister/shim/subfloor/drain/insulation as selected | slab and basement tasks |
| Slab + underslab plumbing | GPR scan, saw-cut, underslab rough + **underslab inspection**, backfill (gated), patch | crawlspace tasks |
| Remove bearing wall | engineer design + **engineer checkpoint**, footings + **footing inspection**, shoring (gated), beam, load path, connectors, engineer observation | — |
| Each bathroom | framing, tub, valve rough, drain, fixture rough, fan, circuits, blocking, backer, pan, membrane, flood test + **flood checkpoint**, floor prep, heated mat, vanity, tile (gated), grout, glass, accessories | — |
| Pre-1978 | hazmat assessment, RRP containment, hazmat clearance checkpoint | — |
| Excavation (service lines, flatwork, grading, deck, fence…) | 811 locate + **811 checkpoint** gating digging | — |
| 2+ stories or finished basement | draftstopping | — |
| Attached garage | dwelling/garage separation | — |

## 3. Dependencies

- Each task lists its prerequisites by stable ID. Bathroom tasks (`b.*`) resolve within their own bathroom. `b.x@*` means "every bathroom's b.x".
- **Bridging:** when a prerequisite doesn't apply to this project, the engine replaces it with *that* task's own prerequisites, so the chain never breaks. For example, a tub/shower has no separate pan, so the hall bath's membrane depends straight on its backer, drain and framing.
- Readiness states: **Complete**, **N/A**, **Blocked** (set by you, with a reason), **Held** (all prerequisites done but a required approval is missing), **In progress**, **Waiting** (prerequisites open), **Ready**.

## 4. Approval checkpoints

There are 30 checkpoint templates, kept separately from tasks. Each has a kind (AHJ, utility, third party, Pinestone internal), a default requirement (*Required* or *Confirm with AHJ*), a list of tasks to finish before requesting it, and a list of tasks it holds.

Key holds:

- **Permit + hazmat clearance:** demolition
- **Engineer design:** shoring, beam, vault
- **Footing inspection:** pouring footings
- **Underslab inspection:** backfill
- **811:** all digging
- **Rough plumbing/gas/mechanical/electrical + framing:** insulation
- **Those + insulation + Pinestone pre-drywall sign-off:** hanging drywall
- **Flood test (per bath):** tile
- **Service release:** electrical testing
- **Gas release:** gas startup
- **Deck footing inspection:** deck/porch framing

Overrides are task-specific and checkpoint-specific. They record the reason, who authorized them, when, and the checkpoint's status at that moment, and they can be revoked. An override is never recorded as an approval.

## 5. Data model and integrity

- Each project stores its setup answers, jurisdiction, task records `{status, completedAt, trade, notes, photos[], history[]}`, checkpoint records `{req, status, date, inspector, reference, notes, photos[], history[]}`, overrides, and an activity log.
- The generated task list is **never stored as the source of truth**. It is regenerated from the answers and the current library, and records attach to it by stable ID. That is why scope changes and library updates can't delete progress.
- Photos are stored separately (compressed JPEG, 1600 px max) and referenced by ID. They are included in backup files.
- There is a schema version and a migration step for future app versions. A project saved by a newer version is refused rather than corrupted.

## 6. Offline architecture

- The app is plain HTML, CSS and JavaScript with no framework. pdf-lib is bundled for the PDFs, which use the standard PDF fonts, so no font files are needed.
- The single-file build has an automated check that it contains no external references.
- A service worker caches the app when it's served over http(s). The local file runs offline natively.
- Storage is IndexedDB with a persistent-storage request, an optional File System Access backup folder, and portable `.pcos.json` backups.
