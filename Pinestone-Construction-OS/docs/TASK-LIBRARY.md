# Pinestone Construction OS — Master Task Library v1.1.0

217 task templates · 30 inspection/approval checkpoint templates · 14 phases. Generated from `src/library.js` (the single source of truth).

Guidance labels: **Code** = model-code section (2018 IRC numbering unless noted — verify the edition and local amendments with the AHJ) · **Verify locally** = varies by AHJ/utility · **Manufacturer** · **Industry standard** (TCNA/ANSI/ACCA/NWFA/GA — not code unless adopted) · **Pinestone practice** (company standard, not code).

`Applies when` conditions use the setup answers (`A`) and, for bathroom tasks, the bathroom (`B`). Tasks whose IDs start with `b.` are created once per bathroom.

## Inspection & approval checkpoints

| ID | Checkpoint | Kind | Default | Applies when | Complete before requesting |
|---|---|---|---|---|---|
| `cp.permit` | Building permit issued | AHJ inspection / approval | Required | always | pre.permit |
| `cp.tradepermits` | Trade permits issued (electrical / plumbing / mechanical / gas) | AHJ inspection / approval | Confirm with AHJ | always | pre.permit |
| `cp.historic` | Historic / overlay / HOA approval | AHJ inspection / approval | Required | `A.historic` | pre.historic |
| `cp.haz` | Hazardous materials clearance (asbestos / lead / mold) | Third party | Required | `A.yearBuilt!=='1978plus' \|\| A.hazTesting!=='done-clear'` | pre.haz |
| `cp.eng` | Engineered design / stamped letter received | Third party | Required | `A.engineer==='yes' \|\| has(A.structural,'remove-bearing-wall') \|\| has(A.structural,'ceiling-raise') \|\| has(A.structural,'foundation-repair')` | pre.eng |
| `cp.811` | Tennessee 811 locate tickets clear | Utility | Required | `A.waterService \|\| A.sewerLateral==='replace' \|\| (A.foundation==='basement' && ['exterior-membrane','both'].includes(A.bsmtWater)) \|\| A.flatwork \|\| A.fence \|\| A.grading \|\| A.porch==='new-deck' \|\| A.porch==='new-porch' \|\| A.gas==='new-service' \|\| A.landscaping` | pre.811 |
| `cp.footing` | Footing / pier inspection (pre-pour) | AHJ inspection / approval | Required | `has(A.structural,'remove-bearing-wall') \|\| has(A.structural,'foundation-repair') \|\| (A.foundation==='crawlspace' && has(A.crawlFraming,'new-piers'))` | fdn.footdig |
| `cp.deckfooting` | Deck / porch footing inspection | AHJ inspection / approval | Required | `A.porch==='new-deck' \|\| A.porch==='new-porch'` | ext.porchfoot |
| `cp.underslab` | Underslab plumbing inspection / test | AHJ inspection / approval | Required | `A.foundation!=='crawlspace' && has(A.slabWork,'underslab-plumbing')` | slab.plbrough |
| `cp.preslab` | Pre-pour slab inspection (base, vapor retarder, reinforcement) | AHJ inspection / approval | Confirm with AHJ | `has(A.slabWork,'new-slab')` | slab.newprep |
| `cp.engobs` | Engineer structural observation | Third party | Confirm with AHJ | `A.engineer==='yes' \|\| has(A.structural,'remove-bearing-wall') \|\| has(A.structural,'ceiling-raise') \|\| has(A.structural,'foundation-repair')` | frm.beam, frm.loadpath, frm.connectors |
| `cp.roof` | Roof inspection (if required by AHJ) | AHJ inspection / approval | Confirm with AHJ | `A.roof.startsWith('reroof')` | roof.ice |
| `cp.rough-plb` | Rough plumbing inspection | AHJ inspection / approval | Required | `A.plumbing!=='none'` | plb.dwv, plb.supply, plb.test, plb.nailplates, b.tub@*, plb.wh, plb.hosebib, plb.boring |
| `cp.rough-gas` | Gas piping rough / pressure test inspection | AHJ inspection / approval | Required | `A.gas!=='none'` | gas.pipe, gas.test |
| `cp.rough-mech` | Rough mechanical inspection | AHJ inspection / approval | Required | `A.hvac!=='none'` | hvac.ducts, hvac.seal, b.fan@*, hvac.hood, hvac.dryer, hvac.equip, hvac.lineset, hvac.condensate, hvac.combustion, hvac.freshair, hvac.terminations |
| `cp.rough-elec` | Rough electrical inspection | AHJ inspection / approval | Required | `A.electrical!=='none'` | ele.rough, ele.nailplates, ele.smoke, ele.kitchen, b.elec@*, ele.laundry, ele.afci, ele.recessed, ele.lv, ele.ext, b.heatmat@*, ele.bond |
| `cp.framing` | Framing / rough building inspection | AHJ inspection / approval | Required | always | frm.qc, pd.fireblock, pd.draftstop |
| `cp.insul` | Insulation / energy inspection | AHJ inspection / approval | Confirm with AHJ | `A.insulWalls!=='none' \|\| A.insulAttic==='spray-roofline'` | pd.insulwalls, pd.sprayfoam, pd.airseal |
| `cp.predry` | Pinestone pre-drywall QC sign-off | Pinestone internal | Required | always | pd.qc, pd.photo |
| `cp.flood` | Shower waterproofing flood test (per bathroom) | Pinestone internal | Required | `['tile-tub','tile-shower-curb','tile-curbless'].includes(B.shower)` | b.flood |
| `cp.service` | Electrical service release / utility reconnection | Utility | Required | `A.electrical!=='none' && A.service!=='none'` | ele.service |
| `cp.gasrelease` | Gas meter set / service release | Utility | Required | `A.gas!=='none'` | gas.test |
| `cp.blower` | Blower door / duct leakage test | Third party | Confirm with AHJ | `A.hvac==='full' && A.hvacType!=='ductless' \|\| A.insulWalls!=='none'` | com.blower |
| `cp.final-plb` | Final plumbing inspection | AHJ inspection / approval | Required | `A.plumbing!=='none'` | fin.plbtrim, com.plb |
| `cp.final-gas` | Final gas inspection | AHJ inspection / approval | Confirm with AHJ | `A.gas!=='none'` | com.gas |
| `cp.final-mech` | Final mechanical inspection | AHJ inspection / approval | Required | `A.hvac!=='none'` | com.hvac |
| `cp.final-elec` | Final electrical inspection | AHJ inspection / approval | Required | `A.electrical!=='none'` | fin.eletrim, com.ele |
| `cp.final-bldg` | Final building inspection | AHJ inspection / approval | Required | always | com.punchfix |
| `cp.co` | Certificate of occupancy / completion issued | AHJ inspection / approval | Confirm with AHJ | always | com.finals |
| `cp.client` | Owner final walkthrough & acceptance | Pinestone internal | Required | always | com.clean, com.punchfix |

## 01 · Preconstruction & Permitting

### Existing-conditions walkthrough & baseline photos  `pre.walk`

- **Trade:** Pinestone (GC) · **photograph before concealing**
- **Applies when:** always
- **QC checks:** Every room photographed (4 walls + ceiling + floor); Exterior elevations, roof, foundation, crawl/attic photographed; Meter, panel, water heater, HVAC data plates photographed; Existing damage documented before work starts
- **What:** Document the house as purchased/contracted before any work so pre-existing damage, layout, and utilities are on record.
  - *Pinestone practice*: Photograph data plates (panel, water heater, furnace/air handler, condenser) — model and age drive scope.
  - *Pinestone practice*: Note sagging floors, cracks, water stains, and roof leaks with location tags.
  - *Pinestone practice*: Check for active leaks and turn off water if the house is vacant and at risk of freezing.
- **Common mistakes:** Skipping crawlspace and attic photos — the most common source of later disputes and change orders. · Not recording existing neighbor-side conditions (fences, driveways) before equipment arrives.

### Field measure & as-built floor plan  `pre.measure`

- **Trade:** Pinestone (GC)
- **Applies when:** always
- **Prerequisites:** `pre.walk`
- **QC checks:** Ceiling heights recorded; Window/door sizes recorded; Joist direction and bearing walls marked

### Finalize scope of work & selections schedule  `pre.scope`

- **Trade:** Pinestone (GC)
- **Applies when:** always
- **Prerequisites:** `pre.measure`
- **QC checks:** Scope by trade written; Allowances and selection deadlines set; Long-lead items identified

### Hazardous materials assessment (asbestos / lead / mold)  `pre.haz`

- **Trade:** Hazmat / Abatement
- **Applies when:** `A.yearBuilt!=='1978plus' || A.hazTesting!=='done-clear'`
- **Required before requesting:** `cp.haz`
- **QC checks:** Asbestos survey of materials to be disturbed; Lead determination for pre-1978 home; Mold assessment if visible growth; Reports filed in project
- **What:** Determine whether materials that will be disturbed contain asbestos or lead and whether abatement or lead-safe practices are required before demolition.
  - *Code* — EPA 40 CFR Part 745 (RRP Rule): Renovation of pre-1978 target housing that disturbs painted surfaces above de minimis thresholds must be performed by an EPA (or authorized-state) certified firm using lead-safe work practices, unless a certified inspector/risk assessor determines no lead-based paint is present.
  - *Verify locally*: Asbestos survey and notification requirements for residential demolition/renovation depend on building type and program (TDEC / local air program). Confirm before demolition.
  - *Pinestone practice*: Pinestone standard: test suspect materials (vermiculite, 9×9 floor tile, mastic, popcorn ceiling, duct wrap, plaster/joint compound) before full gut on any pre-1980s house.
- **Common mistakes:** Starting demolition on a pre-1978 house without RRP certification or documentation. · Assuming popcorn ceiling or floor mastic is asbestos-free.
- **Inspection:** Clearance documentation is recorded on the Hazardous materials clearance checkpoint, separate from this task.

### Engage engineer: structural design / stamped letter  `pre.eng`

- **Trade:** Engineer
- **Applies when:** `A.engineer==='yes' || has(A.structural,'remove-bearing-wall') || has(A.structural,'ceiling-raise') || has(A.structural,'foundation-repair')`
- **Prerequisites:** `pre.measure`
- **Required before requesting:** `cp.eng`
- **QC checks:** Beam size, species/grade, bearing and post design specified; Footing / point-load path to foundation specified; Connector schedule specified; Design submitted with permit
- **What:** Obtain engineered design for bearing-wall removal, beams, ceiling vaulting, foundation repairs, or other structural changes.
  - *Code* — IRC R301.1.3: Elements not conforming to the prescriptive provisions of the IRC must be designed per accepted engineering practice. Bearing-wall removal with a new beam typically falls here.
  - *Pinestone practice*: Ask the engineer to specify: beam, posts, bearing length, squash blocks, foundation/footing at point loads, hangers/straps, and temporary shoring.
  - *Verify locally*: Some AHJs require a stamped letter or sealed drawings at permit; others accept a site letter afterwards. Confirm.
- **Common mistakes:** Sizing a beam off a span chart but ignoring the point load path down to the footing. · Ordering an LVL before the engineer confirms ply count and bearing.

### Permit drawings / scope plans  `pre.drawings`

- **Trade:** Pinestone (GC)
- **Applies when:** always
- **Prerequisites:** `pre.scope`
- **QC checks:** Floor plan existing + proposed; Structural sheet / engineer letter attached; Window/door schedule incl. egress & safety glazing

### Historic overlay / HOA design approval  `pre.historic`

- **Trade:** Pinestone (GC)
- **Applies when:** `A.historic`
- **Prerequisites:** `pre.drawings`
- **Required before requesting:** `cp.historic`
- **What:** Obtain design approval before exterior changes (windows, siding, roofing, porches).
  - *Verify locally*: Overlay and HOA rules are local. Approved materials and window types may be restricted. Get approval in writing.

### Apply for building permit & coordinate trade permits  `pre.permit`

- **Trade:** Pinestone (GC)
- **Applies when:** always
- **Prerequisites:** `pre.drawings`, `pre.eng`, `pre.historic`
- **Required before requesting:** `cp.permit`, `cp.tradepermits`
- **QC checks:** Correct jurisdiction / AHJ confirmed; Code edition confirmed and recorded in project; Trade contractors pulling their own permits confirmed
- **What:** Apply for the building permit and make sure every licensed trade pulls the permits they are responsible for.
  - *Verify locally* — TN State Fire Marshal / local codes: Tennessee has a state residential program (2018 IRC adopted statewide) but many cities and counties enforce their own adopted edition. Confirm who the AHJ is for this address and record the code edition on the project.
  - *Verify locally*: Electrical permits/inspections may be issued by the local codes department or by the State Fire Marshal program depending on location.
- **Common mistakes:** Assuming the city adopted the same edition as the state. · Letting a sub start work before their trade permit is issued.

### Tennessee 811 locate request  `pre.811`

- **Trade:** Pinestone (GC)
- **Applies when:** `A.waterService || A.sewerLateral==='replace' || (A.foundation==='basement' && ['exterior-membrane','both'].includes(A.bsmtWater)) || A.flatwork || A.fence || A.grading || A.porch==='new-deck' || A.porch==='new-porch' || A.gas==='new-service' || A.landscaping`
- **Prerequisites:** `pre.scope`
- **Required before requesting:** `cp.811`
- **What:** Request utility locates before any digging: sewer/water lines, footings, drainage, fence posts, grading, or flatwork.
  - *Code* — TN Underground Utility Damage Prevention Act (T.C.A. Title 65, Ch. 31): Excavators must notify the one-call center before excavating and wait the required notice period (working days). Confirm the current notice period and ticket life with Tennessee 811.
  - *Pinestone practice*: Private lines (owner sewer laterals, private electric to outbuildings, irrigation) are not marked by 811 — locate them separately.
- **Common mistakes:** Letting the ticket expire before digging. · Assuming 811 marks the private sewer lateral.

### Utility coordination: temp power, disconnects, accounts  `pre.utilities`

- **Trade:** Pinestone (GC)
- **Applies when:** always
- **Prerequisites:** `pre.scope`
- **QC checks:** Electric account / temp power; Water account active; Gas disconnect or meter plan; Service upgrade requested with utility (if any)

### Schedule trades; verify licenses & insurance  `pre.subs`

- **Trade:** Pinestone (GC)
- **Applies when:** always
- **Prerequisites:** `pre.scope`
- **QC checks:** License verified (TN Board for Licensing Contractors / local); COI with general liability on file; Workers comp or exemption on file; Scope of work signed

### Order long-lead items (windows, doors, cabinets, tile, equipment)  `pre.order`

- **Trade:** Pinestone (GC)
- **Applies when:** always
- **Prerequisites:** `pre.scope`
- **QC checks:** Lead times recorded; Window/door sizes verified against rough openings or measured openings; Delivery dates scheduled to need

### Owner selections approved & signed  `pre.selections`

- **Trade:** Owner
- **Applies when:** always
- **Prerequisites:** `pre.scope`
- **QC checks:** Fixtures/finishes selected; Tile layouts approved; Cabinet drawings approved; Paint colors chosen


## 02 · Site Setup, Protection & Hazard Control

### Post permit card, jobsite sign, lockbox  `site.signs`

- **Trade:** Pinestone (GC)
- **Applies when:** always
- **Prerequisites:** `pre.permit`
- **Hard hold until approved:** `cp.permit`

### Dumpster & portable toilet  `site.dumpster`

- **Trade:** Pinestone (GC)
- **Applies when:** always
- **Prerequisites:** `pre.scope`
- **QC checks:** Placement does not block sidewalk / ROW without permit; Plywood under dumpster on driveway

### Shut off / make safe utilities in demo areas  `site.shutoffs`

- **Trade:** Electrical
- **Applies when:** always
- **Prerequisites:** `pre.utilities`
- **QC checks:** Circuits in demo areas de-energized and verified dead; Water capped at fixtures or shut at main; Gas shut off and capped at appliances being removed
- **What:** Make demolition areas safe: verified-dead circuits, capped water and gas.
  - *Pinestone practice*: Verify dead with a tester — breaker labels on old panels are unreliable.
  - *Pinestone practice*: Leave one labeled temporary circuit or temp pole for tools/lights.
  - *Verify locally*: Gas shutoffs at the meter may require the utility; capping appliance stubs is licensed gas work.
- **Common mistakes:** Cutting into a wall with a live circuit fed from an unlabeled breaker. · Leaving gas lines uncapped after appliance removal.

### Protect retained items (floors, windows, trees, equipment)  `site.protect`

- **Trade:** Pinestone (GC)
- **Applies when:** always
- **Prerequisites:** `pre.walk`
- **QC checks:** Retained hardwood covered; Retained windows protected; Tree root zones protected; Neighbor property protected

### Erosion & sediment control where soil is disturbed  `site.erosion`

- **Trade:** Excavation / Site
- **Applies when:** `A.waterService || A.sewerLateral==='replace' || (A.foundation==='basement' && ['exterior-membrane','both'].includes(A.bsmtWater)) || A.flatwork || A.fence || A.grading || A.porch==='new-deck' || A.porch==='new-porch' || A.gas==='new-service' || A.landscaping`
- **Prerequisites:** `pre.811`
- **What:** Install silt fence / inlet protection where grading or excavation could move soil off site.
  - *Verify locally*: Local stormwater rules vary; small residential lots may still need silt fence or inlet protection.

### Lead-safe containment setup (RRP)  `site.rrp`

- **Trade:** Hazmat / Abatement
- **Applies when:** `A.yearBuilt!=='1978plus'`
- **Prerequisites:** `pre.haz`
- **QC checks:** Certified renovator on site / assigned; Containment, signage and HEPA cleanup in place; Cleaning verification planned
- **What:** Set up lead-safe work-area containment for pre-1978 work unless lead-free determination is documented.
  - *Code* — EPA 40 CFR 745 Subpart E: Post warning signs, contain the work area, prohibit dry sanding/open-flame removal, and perform cleaning verification.
  - *Pinestone practice*: Keep RRP records (certificates, Renovate Right acknowledgment, cleaning verification) with the project.

### Asbestos / lead abatement by licensed contractor  `site.abate`

- **Trade:** Hazmat / Abatement
- **Applies when:** `A.hazTesting==='done-abatement'`
- **Prerequisites:** `pre.haz`
- **Required before requesting:** `cp.haz`
- **What:** Licensed abatement of identified materials with clearance documentation before general demolition.
  - *Verify locally*: Licensing, notification, and clearance requirements depend on material and program (TDEC / local). Follow the survey and abatement contractor.

### Jobsite safety setup  `site.safety`

- **Trade:** Pinestone (GC)
- **Applies when:** always
- **Prerequisites:** `pre.scope`
- **QC checks:** Fire extinguisher; First aid kit; Floor openings covered / guarded; Temporary handrails at stairs


## 03 · Demolition & Discovery

### Interior demolition to studs  `demo.interior`

- **Trade:** Demolition
- **Applies when:** always
- **Prerequisites:** `site.shutoffs`, `site.protect`, `site.dumpster`, `site.rrp`, `site.abate`
- **Hard hold until approved:** `cp.permit`, `cp.haz`
- **QC checks:** Bearing walls identified and NOT removed; Retained items protected; No debris in crawlspace / ducts
- **What:** Remove interior finishes to studs and joists within scope without damaging structure or retained elements.
  - *Pinestone practice*: Mark all bearing walls with paint before demo crews start. Nothing structural comes out during demo — beam work is done by framers under the engineered design.
  - *Pinestone practice*: Remove nails/screws from studs and joists as you go (makes framing QC and drywall faster).
- **Common mistakes:** Removing a bearing wall or cutting joists during demo. · Dropping debris into the crawlspace or open ducts.

### Plaster & lath removal  `demo.plaster`

- **Trade:** Demolition
- **Applies when:** `A.plaster`
- **Prerequisites:** `demo.interior`
- **QC checks:** Dust control in place; Lath nails pulled; Floor loading watched (debris weight)

### Remove abandoned wiring, piping & ductwork  `demo.mep`

- **Trade:** Demolition
- **Applies when:** always
- **Prerequisites:** `demo.interior`
- **QC checks:** No abandoned live circuits; Abandoned gas lines capped at source by licensed trade; Old ducts removed from crawl/attic

### Chimney / fireplace removal or capping  `demo.chimney`

- **Trade:** Demolition
- **Applies when:** `A.fireplace==='remove'`
- **Prerequisites:** `demo.interior`
- **What:** Remove chimney and fireplace safely and frame/flash the roof and floor openings.
  - *Pinestone practice*: Plan the roof patch and decking with the roofer; temporary dry-in the same day.
  - *Pinestone practice*: Verify whether the chimney carries other flues (furnace/water heater) before removal.

### Debris removal & broom clean  `demo.clean`

- **Trade:** Demolition
- **Applies when:** always
- **Prerequisites:** `demo.interior`, `demo.mep`

### Post-demo photo documentation of all framing  `demo.photo`

- **Trade:** Pinestone (GC) · **photograph before concealing**
- **Applies when:** always
- **Prerequisites:** `demo.clean`
- **QC checks:** Every wall and ceiling bay photographed; Damage (rot, termites, fire, cut joists) photographed with location

### Post-demo structural & moisture assessment  `demo.assess`

- **Trade:** Pinestone (GC)
- **Applies when:** always
- **Prerequisites:** `demo.clean`
- **QC checks:** Rot / termite / fire damage located; Over-notched or cut framing found; Undersized headers / prior bad modifications found; Moisture readings of framing at wet areas
- **What:** Walk the open framing to find hidden damage and prior poor work before new work covers it.
  - *Code* — IRC R502.8 / R602.6: Existing notches and bored holes must be within the allowable limits for joists and studs; repair or reinforce those that are not.
  - *Pinestone practice*: Take moisture meter readings at sill plates, bath floors, and around old window openings. Wood at or above about 19% MC needs investigation before closing in.
- **Common mistakes:** Covering damaged framing because it was not in the original scope.

### Termite / WDI inspection & treatment  `demo.termite`

- **Trade:** Foundation / Crawlspace
- **Applies when:** `has(A.crawlMoisture,'termite') || A.foundation==='crawlspace' || A.foundation==='slab'`
- **Prerequisites:** `demo.assess`
- **What:** Treat active infestations and protect new wood.
  - *Code* — IRC R318: Termite protection is required in areas subject to termite damage — Tennessee is in a high-hazard region. Confirm treatment method with the AHJ and licensed pest control.

### Update scope & change orders from discoveries  `demo.changes`

- **Trade:** Pinestone (GC)
- **Applies when:** always
- **Prerequisites:** `demo.assess`


## 04 · Foundation & Substructure

### Excavate footings / pier pads for new point loads  `fdn.footdig`

- **Trade:** Foundation / Crawlspace
- **Applies when:** `has(A.structural,'remove-bearing-wall') || has(A.structural,'foundation-repair') || (A.foundation==='crawlspace' && has(A.crawlFraming,'new-piers'))`
- **Prerequisites:** `pre.eng`, `demo.assess`
- **Hard hold until approved:** `cp.permit`
- **Required before requesting:** `cp.footing`
- **QC checks:** Size and depth per engineer / IRC R403; Bottom on undisturbed soil, no water; Reinforcement as specified
- **What:** Dig footings for new posts/piers and point loads before the footing inspection.
  - *Code* — IRC R403.1: Footings sized for loads and soil bearing; bottom below frost depth per local design criteria (Table R301.2(1)).
  - *Verify locally*: Frost depth is set by the AHJ (Middle Tennessee is commonly 12 in. — confirm).
  - *Pinestone practice*: Photograph each hole with a tape measure showing width and depth.

### Pour footings / set piers  `fdn.footpour`

- **Trade:** Concrete
- **Applies when:** `has(A.structural,'remove-bearing-wall') || has(A.structural,'foundation-repair') || (A.foundation==='crawlspace' && has(A.crawlFraming,'new-piers'))`
- **Prerequisites:** `fdn.footdig`
- **Hard hold until approved:** `cp.footing`

### Crawlspace clean-out (debris, wood, organics)  `crawl.clean`

- **Trade:** Foundation / Crawlspace
- **Applies when:** `A.foundation==='crawlspace'`
- **Prerequisites:** `demo.clean`
- **QC checks:** All wood debris removed (termite food); Old insulation and vapor barrier removed; Grade smoothed for liner

### Crawlspace moisture & framing assessment  `crawl.assess`

- **Trade:** Pinestone (GC) · **photograph before concealing**
- **Applies when:** `A.foundation==='crawlspace'`
- **Prerequisites:** `crawl.clean`
- **QC checks:** Moisture content of sill, joists, girders recorded; Joist clearance to grade checked (18 in. / 12 in. girders); Signs of water entry mapped; Dryer, bath fan, plumbing vents not terminating in crawl
- **What:** Measure moisture, find rot and water entry, and confirm clearances before crawlspace work is designed.
  - *Code* — IRC R317.1: Wood joists closer than 18 in. or girders closer than 12 in. to exposed ground in crawlspaces must be naturally durable or preservative-treated.
  - *Code* — IRC R408.4: Crawlspace access opening minimum 18 in. × 24 in. (verify for your foundation type).
  - *Pinestone practice*: Record a relative-humidity reading and photo of the hygrometer — use it as a baseline for post-work comparison.

### Crawlspace access opening & door  `crawl.access`

- **Trade:** Framing
- **Applies when:** `A.foundation==='crawlspace'`
- **Prerequisites:** `crawl.assess`

### Replace rotted sill plate / rim joist  `crawl.sill`

- **Trade:** Framing
- **Applies when:** `A.foundation==='crawlspace' && has(A.crawlFraming,'replace-sill')`
- **Prerequisites:** `crawl.assess`, `demo.termite`
- **QC checks:** Treated sill on foundation; Anchor bolts / approved anchors at required spacing; Sill gasket / capillary break
- **What:** Replace damaged sill and rim while temporarily supporting the structure.
  - *Code* — IRC R317.1: Sills on concrete or masonry in contact with the ground must be preservative-treated or naturally durable.
  - *Code* — IRC R403.1.6: Sill plates anchored to the foundation (bolt size, spacing within 12 in. of plate ends, etc.). Retrofit anchors must be approved / listed.
  - *Manufacturer*: Use corrosion-resistant fasteners rated for the treated lumber used.

### Girder repair / supplement  `crawl.girder`

- **Trade:** Framing
- **Applies when:** `A.foundation==='crawlspace' && has(A.crawlFraming,'girder-repair')`
- **Prerequisites:** `crawl.assess`, `fdn.footpour`

### Sister / replace damaged floor joists  `crawl.sister`

- **Trade:** Framing
- **Applies when:** `A.foundation==='crawlspace' && (has(A.crawlFraming,'sister-joists') || has(A.structural,'floor-joist-repair'))`
- **Prerequisites:** `crawl.assess`
- **QC checks:** Sister bears on the same supports as the original (full length) unless engineered; Fastening schedule met; Joist crowns aligned
- **What:** Reinforce or replace damaged and over-notched joists.
  - *Pinestone practice*: Full-length sisters bearing on the girder and sill are the Pinestone default. Partial sisters need an engineered detail.
  - *Code* — IRC R502.8: Cuts, notches and holes in joists limited by size and location — fix prior violations rather than adding new ones.

### Shim / adjust supports and level floors  `crawl.shim`

- **Trade:** Framing
- **Applies when:** `A.foundation==='crawlspace' && has(A.crawlFraming,'shim-supports')`
- **Prerequisites:** `crawl.girder`, `crawl.sister`, `fdn.footpour`
- **QC checks:** Steel shims / hardwood shims (no softwood, no stacked scraps); Floors checked with laser before and after

### Subfloor replacement  `crawl.subfloor`

- **Trade:** Framing
- **Applies when:** `(A.foundation==='crawlspace' || A.foundation==='basement') && A.subfloor!=='keep'`
- **Prerequisites:** `crawl.sister`, `crawl.shim`, `demo.assess`
- **QC checks:** Panel span rating matches joist spacing; Glued and screwed / ring-shank nailed; Panel gaps per manufacturer (typ. 1/8 in.); Edges supported / T&G engaged
- **What:** Install new subfloor flat and squeak-free for tile and hard-surface flooring.
  - *Code* — IRC R503: Floor sheathing span rating and fastening per IRC tables for the joist spacing.
  - *Manufacturer*: Panel edge spacing and adhesive per panel manufacturer (APA guidelines).
  - *Industry standard* — TCNA / ANSI: Tile areas need adequate deflection performance (ceramic L/360, natural stone L/720 typical). Plan underlayment accordingly.
- **Common mistakes:** Nailing with smooth-shank nails into old dried joists (squeaks). · Leaving subfloor uncovered in rain for days.

### Ground vapor retarder / crawlspace liner  `crawl.vapor`

- **Trade:** Foundation / Crawlspace · **photograph before concealing**
- **Applies when:** `A.foundation==='crawlspace'`
- **Prerequisites:** `crawl.clean`, `crawl.drain`, `crawl.sill`, `crawl.sister`, `crawl.shim`, `fdn.footpour`
- **QC checks:** Seams overlapped and taped; Liner run up piers/walls as designed; No tears; liner protected at access path
- **What:** Cover exposed ground in the crawlspace with a continuous vapor retarder.
  - *Code* — IRC R408.2: In vented crawlspaces, required ventilation area can be reduced when the ground surface is covered with a Class I vapor retarder.
  - *Code* — IRC R408.3: Unvented crawlspaces require a continuous Class I vapor retarder with joints overlapped 6 in. and sealed or taped, edges extended at least 6 in. up the stem wall and attached and sealed.
  - *Pinestone practice*: Pinestone standard liner: reinforced 10–20 mil for encapsulation; minimum 6 mil poly for vented crawls.
- **Common mistakes:** Installing liner before plumbing and framing repairs are done (gets torn). · Leaving liner unsealed at piers and walls in an unvented crawl.

### Crawlspace interior drain & sump  `crawl.drain`

- **Trade:** Foundation / Crawlspace
- **Applies when:** `A.foundation==='crawlspace' && ['interior-sump','both'].includes(A.crawlDrain)`
- **Prerequisites:** `crawl.clean`
- **QC checks:** Drain pitched to sump; Sump lid sealed (unvented crawl); Discharge carried well away from foundation; Check valve installed; Pump on dedicated / GFCI receptacle as required

### Seal crawlspace vents, rim, and penetrations  `crawl.encap`

- **Trade:** Foundation / Crawlspace
- **Applies when:** `A.foundation==='crawlspace' && A.crawlStrategy!=='vented'`
- **Prerequisites:** `crawl.vapor`, `plb.dwv`, `plb.supply`, `hvac.ducts`, `ele.rough`
- **What:** Air-seal the crawlspace from the outdoors once penetrations are done.
  - *Code* — IRC R408.3: Unvented crawlspaces: no ventilation openings to the outside; perimeter walls insulated; and one of the listed conditioning methods required.
  - *Pinestone practice*: Do this after plumbing, electrical and HVAC have finished in the crawl — otherwise seals get broken.

### Crawlspace conditioning / dehumidification  `crawl.condition`

- **Trade:** HVAC
- **Applies when:** `A.foundation==='crawlspace' && A.crawlStrategy!=='vented'`
- **Prerequisites:** `crawl.encap`
- **What:** Provide the conditioning method required for an unvented crawlspace.
  - *Code* — IRC R408.3: Options include continuously operated mechanical exhaust, conditioned supply air (with return path), or a dehumidifier (added in later editions) at the rates stated in the code. Check which options your adopted edition allows.
  - *Manufacturer*: Dehumidifier condensate routed to sump or drain; dedicated circuit per manufacturer.

### Verify foundation vent area & clear vents  `crawl.vents`

- **Trade:** Foundation / Crawlspace
- **Applies when:** `A.foundation==='crawlspace' && A.crawlStrategy==='vented'`
- **Prerequisites:** `crawl.vapor`
- **What:** Confirm adequate, unobstructed cross ventilation in a vented crawlspace.
  - *Code* — IRC R408.1 / R408.2: Ventilation openings sized at 1 sq ft per 150 sq ft of crawlspace area (reduced to 1 per 1,500 with a Class I ground vapor retarder), one within 3 ft of each corner, with corrosion-resistant screening.

### Crawlspace insulation  `crawl.insul`

- **Trade:** Insulation · **photograph before concealing**
- **Applies when:** `A.foundation==='crawlspace' && A.crawlInsul!=='none'`
- **Prerequisites:** `crawl.encap`, `crawl.vapor`, `plb.test`, `ele.rough`
- **What:** Insulate the floor (vented crawl) or the foundation walls/rim (unvented crawl).
  - *Code* — IRC N1102.2.7 / N1102.2.11: Floor insulation installed in permanent contact with the underside of the subfloor; crawlspace wall insulation permitted in lieu of floor insulation when the crawl is unvented and meets R408.3.
  - *Code* — IRC R316: Foam plastic in crawlspaces needs the required thermal/ignition barrier unless listed for exposed use.
  - *Verify locally* — IRC R318.4: Foam on foundation walls in termite-prone areas may require an inspection gap or other termite provisions. Confirm with AHJ.
- **Common mistakes:** Floor batts sagging away from the subfloor — no support wires/straps. · Unrated foam left exposed in the crawl.

### Crawlspace final QC & photo record  `crawl.final`

- **Trade:** Pinestone (GC) · **photograph before concealing**
- **Applies when:** `A.foundation==='crawlspace'`
- **Prerequisites:** `crawl.vapor`, `crawl.encap`, `crawl.condition`, `crawl.insul`, `crawl.vents`, `crawl.drain`

### Scan slab before cutting (post-tension / embedded lines)  `slab.scan`

- **Trade:** Concrete
- **Applies when:** `(A.foundation==='slab' || A.foundation==='basement') && (has(A.slabWork,'underslab-plumbing') || has(A.slabWork,'slab-patch'))`
- **Prerequisites:** `demo.clean`
- **What:** Locate tendons, radiant tubing, conduits and pipes before saw-cutting.
  - *Pinestone practice*: Check for post-tension stamps or tendon ends at the slab edge. Never cut a post-tensioned slab without engineer direction.

### Saw-cut & trench for underslab plumbing  `slab.cut`

- **Trade:** Concrete
- **Applies when:** `has(A.slabWork,'underslab-plumbing')`
- **Prerequisites:** `slab.scan`, `plb.layout`
- **Hard hold until approved:** `cp.permit`

### Underslab DWV / supply rough-in & test  `slab.plbrough`

- **Trade:** Plumbing · **photograph before concealing**
- **Applies when:** `has(A.slabWork,'underslab-plumbing')`
- **Prerequisites:** `slab.cut`
- **Required before requesting:** `cp.underslab`
- **QC checks:** Slope verified; Test on (water column or air); Sleeved where passing through concrete; Photographed with tape before backfill

### Backfill, compact & vapor retarder in trenches  `slab.backfill`

- **Trade:** Concrete
- **Applies when:** `has(A.slabWork,'underslab-plumbing')`
- **Prerequisites:** `slab.plbrough`
- **Hard hold until approved:** `cp.underslab`

### Pour slab patches / infill  `slab.patch`

- **Trade:** Concrete
- **Applies when:** `has(A.slabWork,'underslab-plumbing') || has(A.slabWork,'slab-patch')`
- **Prerequisites:** `slab.backfill`
- **QC checks:** Dowels / reinforcement per detail; Vapor retarder lapped to existing; Finished flush with existing

### New slab: base, vapor retarder, reinforcement  `slab.newprep`

- **Trade:** Concrete
- **Applies when:** `has(A.slabWork,'new-slab')`
- **Prerequisites:** `fdn.footpour`, `demo.clean`
- **Required before requesting:** `cp.preslab`
- **What:** Prepare a new slab section ready for pre-pour inspection.
  - *Code* — IRC R506.2.2 / R506.2.3: Base course and a 6-mil vapor retarder with lapped joints required under slabs on grade over habitable space (with listed exceptions).
  - *Pinestone practice*: Photograph vapor retarder laps and reinforcement before the pour.

### Pour new slab section  `slab.newpour`

- **Trade:** Concrete
- **Applies when:** `has(A.slabWork,'new-slab')`
- **Prerequisites:** `slab.newprep`
- **Hard hold until approved:** `cp.preslab`

### Radon mitigation system rough-in  `slab.radon`

- **Trade:** Foundation / Crawlspace
- **Applies when:** `A.radon`
- **Prerequisites:** `demo.clean`
- **What:** Install the radon vent pipe route and suction point (passive or active).
  - *Verify locally* — IRC Appendix F: Radon-resistant construction is in an IRC appendix that applies only where adopted locally. Many Middle Tennessee counties are EPA Radon Zone 1 — Pinestone recommends testing.
  - *Pinestone practice*: Label the vent pipe and leave a junction box in the attic for a future fan if passive.

### Foundation wall crack repair  `bsmt.cracks`

- **Trade:** Foundation / Crawlspace
- **Applies when:** `A.foundation==='basement' && A.bsmtCracks`
- **Prerequisites:** `demo.clean`

### Interior perimeter drain & sump  `bsmt.intdrain`

- **Trade:** Foundation / Crawlspace
- **Applies when:** `A.foundation==='basement' && ['interior-drain','both'].includes(A.bsmtWater)`
- **Prerequisites:** `bsmt.cracks`, `slab.scan`

### Exterior excavation, waterproofing & footing drain  `bsmt.extwp`

- **Trade:** Foundation / Crawlspace
- **Applies when:** `A.foundation==='basement' && ['exterior-membrane','both'].includes(A.bsmtWater)`
- **Prerequisites:** `pre.811`
- **Hard hold until approved:** `cp.811`
- **What:** Excavate, waterproof and drain the foundation from the exterior.
  - *Code* — IRC R406.2 / R405: Waterproofing required for foundation walls enclosing habitable space where high water table conditions exist; foundation drains required around foundations retaining earth and enclosing habitable space (with exceptions).
  - *Manufacturer*: Membrane, protection board and drain mat per manufacturer.

### Sump pump, check valve & discharge  `bsmt.sump`

- **Trade:** Plumbing
- **Applies when:** `A.foundation==='basement' && A.bsmtWater!=='none'`
- **Prerequisites:** `bsmt.intdrain`, `bsmt.extwp`

### Basement egress window & window well  `bsmt.egress`

- **Trade:** Foundation / Crawlspace
- **Applies when:** `A.foundation==='basement' && A.bsmtFinish && A.bsmtEgress`
- **Prerequisites:** `pre.eng`
- **Hard hold until approved:** `cp.permit`
- **What:** Cut and install a code-compliant emergency escape opening for the finished basement.
  - *Code* — IRC R310.1 / R310.2: Emergency escape and rescue opening: minimum net clear opening (5.7 sq ft; 5.0 sq ft at grade floor), minimum 24 in. height and 20 in. width, and maximum 44 in. sill height above the floor.
  - *Code* — IRC R310.2.3: Window wells: minimum 9 sq ft with 36 in. projection/width; ladder or steps when well is deeper than 44 in.
  - *Pinestone practice*: Have the engineer confirm the header for the cut foundation opening.

### Basement wall insulation & framing  `bsmt.walls`

- **Trade:** Framing
- **Applies when:** `A.foundation==='basement' && A.bsmtFinish`
- **Prerequisites:** `bsmt.intdrain`, `bsmt.cracks`
- **What:** Frame and insulate basement walls without trapping moisture.
  - *Pinestone practice*: Use foam against concrete (or a capillary break) and treated bottom plates. Avoid interior poly vapor barriers over concrete walls.
  - *Code* — IRC R316: Foam plastics need a thermal barrier (typically 1/2 in. gypsum) on the interior.


## 05 · Structural Framing & Modifications

### Temporary shoring for bearing-wall removal  `frm.shore`

- **Trade:** Framing
- **Applies when:** `has(A.structural,'remove-bearing-wall')`
- **Prerequisites:** `pre.eng`, `demo.interior`
- **Hard hold until approved:** `cp.eng`, `cp.permit`
- **What:** Support floor/roof loads on both sides of the bearing wall before it is removed.
  - *Pinestone practice*: Shore walls on both sides, bearing on solid floor framing or posts down to grade where loads are large. Check what is under the shores.
  - *Pinestone practice*: Do not release shoring until beam, posts, connectors and point-load blocking are complete.

### Install beam, posts & bearing per engineered design  `frm.beam`

- **Trade:** Framing · **photograph before concealing**
- **Applies when:** `has(A.structural,'remove-bearing-wall')`
- **Prerequisites:** `frm.shore`, `fdn.footpour`
- **Hard hold until approved:** `cp.eng`
- **QC checks:** Beam size / plies / grade match the stamped design; Plies fastened per design; Bearing length at each end; Posts plumb and continuous to foundation
- **What:** Install the engineered beam and support posts with complete bearing and connections.
  - *Code* — IRC R301.1.3: Engineered elements must be installed as designed. Deviations require engineer approval.
  - *Manufacturer*: LVL / PSL fastening of multiple plies per manufacturer or engineer schedule.
  - *Pinestone practice*: Photograph beam stamp/label, ply nailing, bearing, and posts before covering.
- **Common mistakes:** Posts landing on subfloor with no blocking or footing below. · Missing ply fastening on multi-ply LVL.

### Verify continuous load path & squash blocks  `frm.loadpath`

- **Trade:** Framing · **photograph before concealing**
- **Applies when:** `has(A.structural,'remove-bearing-wall')`
- **Prerequisites:** `frm.beam`
- **What:** Confirm every new point load is carried through floor framing to a footing.
  - *Pinestone practice*: Install solid blocking / squash blocks under every post through each floor level down to the girder or footing.

### Frame new / enlarged exterior openings (headers, jacks, kings)  `frm.openings`

- **Trade:** Framing
- **Applies when:** `has(A.structural,'new-exterior-opening') || (A.windows!=='none' && A.windowNewOpenings) || A.extDoors==='new-openings'`
- **Prerequisites:** `pre.eng`, `demo.interior`, `pre.order`
- **Hard hold until approved:** `cp.permit`
- **QC checks:** Header size per R602.7 tables or engineer; Jack/king stud count per table; Rough openings match window/door order; Wall bracing compensated where panels removed
- **What:** Cut and frame new or resized exterior openings.
  - *Code* — IRC R602.7: Header sizes and jack/king stud counts per the header span tables based on loads above.
  - *Code* — IRC R602.10: Removing sheathing/wall length can reduce required wall bracing. Confirm bracing still meets the prescriptive requirements or have it engineered.
  - *Manufacturer*: Rough opening size per the window/door manufacturer (typically unit size + 1/2 in.).

### Floor framing repair / reinforcement  `frm.joists`

- **Trade:** Framing
- **Applies when:** `has(A.structural,'floor-joist-repair')`
- **Prerequisites:** `demo.assess`

### Roof framing repair / reinforcement  `frm.roof`

- **Trade:** Framing
- **Applies when:** `has(A.structural,'roof-framing-repair')`
- **Prerequisites:** `demo.assess`
- **What:** Repair or reinforce rafters, ridge and rafter ties.
  - *Code* — IRC R802: Rafter ties / ceiling joists resist rafter thrust. Do not remove ceiling joists or collar/rafter ties without an engineered alternative (ridge beam).

### Vaulted / raised ceiling framing per design  `frm.vault`

- **Trade:** Framing
- **Applies when:** `has(A.structural,'ceiling-raise')`
- **Prerequisites:** `pre.eng`, `demo.interior`
- **Hard hold until approved:** `cp.eng`

### Stair framing  `frm.stairs`

- **Trade:** Framing
- **Applies when:** `has(A.structural,'stair-modify')`
- **Prerequisites:** `demo.interior`
- **QC checks:** Riser max 7-3/4 in., tread min 10 in.; Largest-smallest riser/tread within 3/8 in.; Headroom 6 ft 8 in.; Width 36 in. min
- **What:** Frame new or altered stairs to code geometry.
  - *Code* — IRC R311.7: Stair width, headroom (6 ft 8 in.), riser height (7-3/4 in. max), tread depth (10 in. min), and uniformity (3/8 in. tolerance).
  - *Pinestone practice*: Lay out with finished floor thickness top and bottom — the most common cause of non-uniform first/last risers.

### New interior partition walls / layout changes  `frm.walls`

- **Trade:** Framing
- **Applies when:** `A.layout`
- **Prerequisites:** `demo.interior`

### Attic access opening  `frm.attic`

- **Trade:** Framing
- **Applies when:** `A.attic`
- **Prerequisites:** `demo.interior`
- **What:** Provide a compliant attic access.
  - *Code* — IRC R807.1: Attic access minimum 22 in. × 30 in. rough opening with 30 in. headroom above, located in a hallway or readily accessible location.
  - *Code* — IRC N1102.2.4: Access hatches/doors to be weatherstripped and insulated to the level of the surrounding surface (energy code).

### Straighten / plane walls & ceilings for flat drywall  `frm.straighten`

- **Trade:** Framing
- **Applies when:** always
- **Prerequisites:** `demo.interior`, `frm.walls`, `frm.beam`
- **QC checks:** Kitchen cabinet walls within 1/8 in. in 8 ft; Tile walls flat for large-format tile; Ceiling joists planed / furred where crowned
- **What:** Fix crowned, bowed and twisted framing before rough-ins so drywall, tile and cabinets come out flat.
  - *Pinestone practice*: Use a long straightedge / string line on every kitchen and tile wall. Sister or plane — do not rely on drywall mud.
  - *Industry standard* — TCNA: Large-format tile substrates require tighter flatness (commonly 1/8 in. in 10 ft).

### Bath framing: tub/shower walls, curbs, niches, recesses  `b.frame`

- **Trade:** Framing · **per bathroom**
- **Applies when:** always
- **Prerequisites:** `demo.interior`, `frm.straighten`
- **QC checks:** Shower walls plumb & flat; Niche framed to tile module, not on exterior wall; Curb / curbless recess per waterproofing system; Bench support framed
- **What:** Frame the bathroom for the selected tub/shower and waterproofing system.
  - *Manufacturer*: Curbless showers: recess and slope per the system manufacturer. Recessing joists requires an engineered solution (do not just cut joists down).
  - *Pinestone practice*: Frame niches to the tile layout — set the niche top/bottom on a full or half tile line. Avoid niches on exterior walls (insulation and condensation).
- **Common mistakes:** Cutting floor joists to recess a curbless shower without engineering. · Niche sized without looking at the tile module.

### Framing connectors & hardware (hangers, straps, hold-downs)  `frm.connectors`

- **Trade:** Framing · **photograph before concealing**
- **Applies when:** `A.structural.length>0 || A.layout`
- **Prerequisites:** `frm.beam`, `frm.openings`, `frm.joists`, `frm.roof`, `frm.vault`, `frm.walls`
- **QC checks:** Every hanger nail hole filled with specified nails; No drywall screws in connectors; Correct connector for lumber size; Corrosion-rated with treated lumber
- **What:** Install all specified hangers, straps and hold-downs with the correct fasteners.
  - *Manufacturer*: Install per the connector manufacturer (e.g. Simpson Strong-Tie) catalog: specified nail size/quantity — never drywall or deck screws.
  - *Code* — IRC R317.3: Fasteners and connectors in contact with preservative-treated wood must be of the required corrosion-resistance.
  - *Pinestone practice*: Photograph connectors at the beam and posts with the nail pattern visible.
- **Common mistakes:** Half-nailed hangers. · Using a top-flange hanger where face-mount was specified.

### Framing QC walk  `frm.qc`

- **Trade:** Pinestone (GC)
- **Applies when:** always
- **Prerequisites:** `frm.straighten`, `frm.connectors`, `frm.stairs`, `frm.attic`, `b.frame@*`
- **Required before requesting:** `cp.framing`
- **QC checks:** Plumb, level, square; Crowns aligned; Notches/bores within limits; Top plates tied where cut; Window/door ROs verified

### Engineer structural observation visit  `frm.engobs`

- **Trade:** Engineer
- **Applies when:** `A.engineer==='yes' || has(A.structural,'remove-bearing-wall') || has(A.structural,'ceiling-raise') || has(A.structural,'foundation-repair')`
- **Prerequisites:** `frm.beam`, `frm.loadpath`, `frm.connectors`
- **Required before requesting:** `cp.engobs`


## 06 · Dry-In: Roof, Windows, Doors & WRB

### Roof tear-off & deck inspection  `roof.tearoff`

- **Trade:** Roofing
- **Applies when:** `A.roof.startsWith('reroof')`
- **Prerequisites:** `pre.order`, `frm.roof`
- **Hard hold until approved:** `cp.permit`
- **QC checks:** Weather window confirmed; Dry-in same day; Rotten / delaminated decking marked

### Replace damaged decking & re-nail  `roof.deck`

- **Trade:** Roofing
- **Applies when:** `A.roof.startsWith('reroof') && A.roofDeck!=='none'`
- **Prerequisites:** `roof.tearoff`
- **QC checks:** Panel edges on rafters, H-clips if required by span; Gaps per manufacturer; Nailing per IRC Table R602.3(1)

### Underlayment, ice barrier & drip edge  `roof.ice`

- **Trade:** Roofing
- **Applies when:** `A.roof.startsWith('reroof')`
- **Prerequisites:** `roof.deck`, `roof.tearoff`
- **Required before requesting:** `cp.roof`
- **What:** Install underlayment, eave/valley protection and drip edge per code and the shingle/metal manufacturer.
  - *Code* — IRC R905.2.7 / R905.2.8.5: Underlayment and drip edge required for asphalt shingles (drip edge at eaves and gables).
  - *Verify locally* — IRC R905.1.2: Ice barrier at eaves is required only where there has been a history of ice forming along the eaves — determined by the AHJ.
  - *Manufacturer*: Underlayment type, laps and fastening per roofing manufacturer to keep the warranty.

### Roof flashing: step, counter, kickout, valleys, pipe boots  `roof.flash`

- **Trade:** Roofing · **photograph before concealing**
- **Applies when:** `A.roof.startsWith('reroof')`
- **Prerequisites:** `roof.ice`
- **QC checks:** Kickout flashing at every roof-to-wall termination; Step flashing (not continuous) at sidewalls; New pipe boots / flashings; Chimney counterflashing let into masonry
- **What:** Flash all roof transitions so water is directed onto the roof surface, not into walls.
  - *Code* — IRC R903.2: Flashing required at wall and roof intersections, changes of slope/direction, and around roof openings; kickout flashing where the eave of a roof intersects a wall.
  - *Manufacturer*: Shingle manufacturer step-flashing and valley details.
- **Common mistakes:** Missing kickout flashing — causes hidden wall rot below roof/wall intersections. · Reusing old cracked pipe boots.

### Attic ventilation: ridge & soffit balance  `roof.vent`

- **Trade:** Roofing
- **Applies when:** `A.roofVent==='ridge-soffit'`
- **Prerequisites:** `roof.ice`
- **What:** Provide balanced intake and exhaust attic ventilation.
  - *Code* — IRC R806.1 / R806.2: Net free ventilating area 1/150 of the vented space, or 1/300 when conditions in R806.2 are met (e.g. upper/lower vent distribution).
  - *Code* — IRC R806.3: Maintain at least 1 in. of airspace between insulation and roof sheathing at the vent — install baffles.
  - *Pinestone practice*: Do not mix ridge vents with gable or powered vents (short-circuits the ridge).

### Install roof covering  `roof.cover`

- **Trade:** Roofing
- **Applies when:** `A.roof.startsWith('reroof')`
- **Prerequisites:** `roof.flash`, `roof.vent`

### Roof repairs  `roof.repair`

- **Trade:** Roofing
- **Applies when:** `A.roof==='repair'`
- **Prerequisites:** `pre.order`

### Water-resistive barrier (housewrap) & tapes  `wrb.install`

- **Trade:** Siding / Exterior · **photograph before concealing**
- **Applies when:** `A.siding.startsWith('full') || (A.windows!=='none' && A.windowType==='new-construction')`
- **Prerequisites:** `frm.openings`, `demo.interior`
- **QC checks:** Shingle-lapped (upper over lower); Seams taped per manufacturer; Integrated with window/door flashing; Tears repaired
- **What:** Install a continuous weather-resistive barrier integrated with all flashings.
  - *Code* — IRC R703.2: A water-resistive barrier is required over sheathing behind exterior veneer, lapped and continuous to the top of walls and terminated at penetrations and building appendages.
  - *Manufacturer*: Housewrap laps, fasteners, and tape per manufacturer.

### Install windows with flashing sequence  `win.install`

- **Trade:** Windows & Doors · **photograph before concealing**
- **Applies when:** `A.windows!=='none'`
- **Prerequisites:** `pre.order`, `frm.openings`, `wrb.install`
- **QC checks:** Sill pan / sloped sill flashing installed; Jamb flashing then head flashing (shingle order); Shimmed at manufacturer locations, operable & square; Low-expansion foam, not standard foam; Egress & safety glazing verified
- **What:** Install windows plumb, level and square with a flashing sequence that drains water to the exterior.
  - *Code* — IRC R703.4: Flashing required at window and door openings, installed to prevent water entry into the wall cavity and per the fenestration manufacturer instructions (or pan flashing / flashing details where no instructions are provided).
  - *Manufacturer*: Installation instructions of the specific window: sill pan, shim points, fastening, sealant. Deviations can void the warranty.
  - *Code* — IRC R308.4: Safety glazing in hazardous locations (e.g. within 24 in. of doors, large panes near floors, at tubs/showers, at stairs).
- **Common mistakes:** Taping the sill flange (traps water). Leave the bottom of the sill flashing unsealed to drain or follow the manufacturer. · Over-driving fasteners and racking the frame.

### Verify egress, safety glazing & fall protection  `win.verify`

- **Trade:** Pinestone (GC)
- **Applies when:** `A.windows!=='none'`
- **Prerequisites:** `win.install`
- **What:** Check every sleeping room window and hazardous location after installation.
  - *Code* — IRC R310: Sleeping rooms require an emergency escape opening meeting net clear opening and sill height limits. Replacement windows have an exception (R310.2.5) for existing openings — confirm with the AHJ.
  - *Code* — IRC R312.2: Window fall protection where the opening is less than 24 in. above the floor and more than 72 in. above grade.
  - *Code* — IRC R308.4 / R308.1: Safety glazing labeled in all hazardous locations.

### Install exterior doors (sill pan, flashing, threshold)  `door.ext`

- **Trade:** Windows & Doors · **photograph before concealing**
- **Applies when:** `A.extDoors!=='none'`
- **Prerequisites:** `pre.order`, `frm.openings`, `wrb.install`
- **QC checks:** Sill pan with back dam; Threshold supported fully; Reveal even, latches without force; Deadbolt / strike screws into framing

### Dry-in verification (hose test windows / doors)  `dryin.check`

- **Trade:** Pinestone (GC)
- **Applies when:** `A.windows!=='none' || A.extDoors!=='none' || A.roof.startsWith('reroof')`
- **Prerequisites:** `win.install`, `door.ext`, `roof.cover`, `roof.repair`, `wrb.install`
- **What:** Prove the openings and roof are watertight before insulation and drywall.
  - *Pinestone practice*: Spray test a sample of windows and every door from the bottom up while someone watches the interior side. Check after the first heavy rain.


## 07 · Rough Plumbing & Gas

### Plumbing layout walk with trade  `plb.layout`

- **Trade:** Pinestone (GC)
- **Applies when:** `A.plumbing!=='none'`
- **Prerequisites:** `pre.selections`, `demo.assess`
- **QC checks:** Fixture spec sheets on site; Fixture centerlines marked; Valve heights/locations marked; Water heater & manifold location set
- **What:** Walk every fixture location with the plumber before rough-in using the actual fixture specifications.
  - *Pinestone practice*: Bring spec sheets for every fixture: rough-in heights for vanity drains and supplies, valve depth range, toilet rough distance, freestanding tub drain location.
  - *Code* — IRC R307.1: Fixture clearances: water closet centerline 15 in. min to a side wall/obstruction, 21 in. clear in front; 24 in. clear in front of shower openings.

### New water service line (meter to house)  `plb.service`

- **Trade:** Plumbing
- **Applies when:** `A.plumbing!=='none' && A.waterService`
- **Prerequisites:** `pre.811`
- **Hard hold until approved:** `cp.811`, `cp.permit`
- **What:** Replace the service line with proper depth, sleeving and a main shutoff.
  - *Verify locally*: Pipe depth, tracer wire, and meter-side work responsibility are set by the water utility and AHJ.
  - *Code* — IRC P2903.3 / P2903.9: Pressure must not exceed 80 psi static at fixtures (install a PRV if higher); main shutoff valve required.

### Sewer lateral camera & replacement  `plb.sewer`

- **Trade:** Plumbing
- **Applies when:** `A.plumbing!=='none' && A.sewerLateral!=='none'`
- **Prerequisites:** `demo.clean`
- **Hard hold until approved:** `cp.811`
- **What:** Camera the lateral to the main; replace or repair as needed.
  - *Pinestone practice*: Save the camera video file and footage locations. Scope again after replacement.
  - *Verify locally*: Connections in the right-of-way often require a separate utility permit / inspection.

### DWV rough-in (drains, vents, cleanouts)  `plb.dwv`

- **Trade:** Plumbing · **photograph before concealing**
- **Applies when:** `A.plumbing!=='none' && A.dwv!=='none'`
- **Prerequisites:** `plb.layout`, `frm.straighten`, `b.frame@*`, `slab.patch`, `crawl.sister`
- **QC checks:** Slope 1/4 in./ft (≤2-1/2 in.) or 1/8 in./ft (≥3 in.); Cleanouts accessible; Vents rise before horizontal; Long-sweep fittings where required; Support spacing per material
- **What:** Install drain, waste and vent piping with correct slope, venting and accessible cleanouts.
  - *Code* — IRC P3005.3: Horizontal drainage slope: 1/4 in. per foot for pipe 2-1/2 in. and smaller; 1/8 in. per foot for 3 in. and larger.
  - *Code* — IRC P3005.2: Cleanouts required (e.g. at base of stacks, changes of direction over 45°, every 100 ft) and must be accessible.
  - *Verify locally* — IRC P3114: Air admittance valves are allowed by the IRC but local acceptance varies; confirm before relying on them (islands).
- **Common mistakes:** Flat drain runs to make a joist cut easier. · Burying cleanouts behind drywall or tile with no access panel.

### Water supply rough-in (manifold, home runs, shutoffs)  `plb.supply`

- **Trade:** Plumbing · **photograph before concealing**
- **Applies when:** `A.plumbing!=='none'`
- **Prerequisites:** `plb.layout`, `b.frame@*`
- **QC checks:** PEX supported per manufacturer, no kinks; Stub-outs secured (drop-ear / brackets); Hot on left; Manifold accessible and labeled

### Nail plates at all pipes within 1-1/4 in. of framing face  `plb.nailplates`

- **Trade:** Plumbing · **photograph before concealing**
- **Applies when:** `A.plumbing!=='none'`
- **Prerequisites:** `plb.dwv`, `plb.supply`
- **What:** Protect piping from drywall and trim fasteners.
  - *Code* — IRC P2603.2.1: Pipes passing through framing within 1-1/4 in. of the edge (or notched) must be protected by steel shield plates at least 1/16 in. thick (0.0575 in.) extending 2 in. beyond the pipe (verify dimensions in your edition).
  - *Pinestone practice*: Plate both faces at every bore near the edge, including top/bottom plates at stacks.
- **Common mistakes:** Missing plates at vanity walls and toilet supplies — classic drywall-screw leak.

### Verify bored / notched framing within limits  `plb.boring`

- **Trade:** Framing · **photograph before concealing**
- **Applies when:** always
- **Prerequisites:** `plb.dwv`, `plb.supply`, `hvac.ducts`, `ele.rough`
- **QC checks:** Stud holes/notches within limits; Top plates cut >50% tied with metal strap; Joist holes not in top/bottom 2 in. or near bearing; Over-cut members reinforced
- **What:** Walk all framing after trades bore and notch; repair violations before inspection.
  - *Code* — IRC R602.6: Bearing-wall studs: notches ≤25% of width, bored holes ≤40% (≤60% when doubled), holes ≥5/8 in. from the edge.
  - *Code* — IRC R602.6.1: Top plates cut more than 50% need a 16-ga. steel tie (1-1/2 in. wide) with fasteners each side.
  - *Code* — IRC R502.8: Joist notches/holes limited in size and location (no notches in middle third; holes ≤1/3 depth, ≥2 in. from edges).

### Set tub & verify support / leveling  `b.tub`

- **Trade:** Plumbing · **per bathroom**
- **Applies when:** `['tile-tub','tub-surround'].includes(B.shower)`
- **Prerequisites:** `b.frame`, `plb.dwv`
- **QC checks:** Tub level, bed/support per manufacturer; Overflow & drain tested; Ledger / flange supported; Air barrier behind tub on exterior walls
- **What:** Set the tub before walls so it can be supported, leveled and integrated with waterproofing.
  - *Manufacturer*: Mortar bed / support per tub manufacturer (common for acrylic/steel tubs).
  - *Code* — IRC N1102.4.1.1 (Table): Exterior walls behind tubs/showers need insulation and an air barrier separating them from the tub.

### Shower / tub valve rough: depth, height, pressure-balance  `b.valve`

- **Trade:** Plumbing · **per bathroom** · **photograph before concealing**
- **Applies when:** `B.shower!=='none'`
- **Prerequisites:** `b.frame`, `plb.supply`
- **QC checks:** Valve depth within manufacturer range for total wall thickness (backer + membrane + tile); Plaster guard / test cap on; Valve centered & level; Shower head & handheld heights per layout; Blocking for valve & heads
- **What:** Set valve bodies at the right depth for the final tile wall and confirm anti-scald protection.
  - *Manufacturer*: Rough-in depth range is a manufacturer specification printed on the valve body / plaster guard. Calculate finished wall = backer + waterproofing + mortar + tile.
  - *Code* — IRC P2708.4: Shower and tub-shower control valves must be pressure-balance, thermostatic-mixing or combination type with a high-limit stop set at max 120°F.
  - *Pinestone practice*: Photograph each valve with a tape from floor and from a corner. Record depth from stud face in the task notes.
- **Common mistakes:** Valve set too deep for thin foam-board systems — trim kit will not reach. · Forgetting blocking for handheld slide bars and body sprays.

### Shower drain set for waterproofing system  `b.drain`

- **Trade:** Plumbing · **per bathroom**
- **Applies when:** `['tile-tub','tile-shower-curb','tile-curbless'].includes(B.shower) && B.shower!=='tile-tub'`
- **Prerequisites:** `b.frame`, `plb.dwv`
- **What:** Install the drain body compatible with the chosen waterproofing system.
  - *Manufacturer*: Bonding-flange drains for sheet/foam systems; clamping drain with weep holes for traditional mortar-bed liners. Match the system manufacturer — mixed systems void warranties.
  - *Code* — IRC P2709: Shower receptors / liners, drain connection and slope requirements.

### Bath fixture rough: toilet, vanity, tub filler  `b.rough`

- **Trade:** Plumbing · **per bathroom**
- **Applies when:** always
- **Prerequisites:** `plb.dwv`, `plb.supply`, `b.frame`
- **QC checks:** Toilet flange at rough distance from FINISHED wall; Flange height accounts for finished floor; Vanity drain/supplies at spec heights; Freestanding tub drain location verified

### Kitchen plumbing rough (sink, DW, ice maker, pot filler)  `plb.kitchen`

- **Trade:** Plumbing
- **Applies when:** `A.plumbing!=='none' && A.kitchen!=='none'`
- **Prerequisites:** `plb.dwv`, `plb.supply`, `pre.selections`
- **QC checks:** Sink drain height fits sink depth / disposal; Ice maker box located; Island venting method approved; Pot filler blocking & stub height

### Laundry rough (washer box, standpipe, pan)  `plb.laundry`

- **Trade:** Plumbing
- **Applies when:** `A.plumbing!=='none' && A.laundry!=='none'`
- **Prerequisites:** `plb.dwv`, `plb.supply`
- **What:** Rough the washer box and drain.
  - *Code* — IRC P2706.2: Standpipe height 18–42 in. above the trap weir (verify in your edition).
  - *Pinestone practice*: Pinestone standard: washer pan with drain or leak sensor shutoff when the laundry is over finished space.

### Water heater rough: location, T&P discharge, pan, expansion  `plb.wh`

- **Trade:** Plumbing
- **Applies when:** `A.plumbing!=='none' && A.waterHeater!=='none'`
- **Prerequisites:** `plb.supply`
- **What:** Install the water heater with code-required safety discharge and protection.
  - *Code* — IRC P2804.6.1: T&P relief discharge piping full size, by gravity, terminating within 6 in. of the floor or to an approved location, no valves or threaded ends.
  - *Code* — IRC P2801.6: Pan required where leakage would damage the building; drained to an approved location.
  - *Code* — IRC P2903.4: Thermal expansion control where a backflow preventer / check valve / PRV creates a closed system.
  - *Manufacturer*: Clearances, venting (gas) and condensate (heat pump, tankless) per manufacturer.

### Frost-free hose bibs with backflow protection  `plb.hosebib`

- **Trade:** Plumbing
- **Applies when:** `A.plumbing!=='none' && A.hoseBibs`
- **Prerequisites:** `plb.supply`
- **What:** Install hose connections with vacuum breakers and slope for freeze protection.
  - *Code* — IRC P2902.4.3: Hose connections require a hose-connection vacuum breaker (or integral backflow protection).
  - *Manufacturer*: Frost-free sillcocks installed with downward slope to drain.

### DWV & water supply pressure tests  `plb.test`

- **Trade:** Plumbing · **photograph before concealing**
- **Applies when:** `A.plumbing!=='none'`
- **Prerequisites:** `plb.dwv`, `plb.supply`, `b.rough@*`, `b.valve@*`, `b.drain@*`, `plb.kitchen`, `plb.laundry`
- **Required before requesting:** `cp.rough-plb`
- **QC checks:** DWV test on (water head or air) and holding; Supply under pressure and holding; Gauge photographed with time stamp
- **What:** Test the rough piping before inspection and before it is concealed.
  - *Code* — IRC P2503.5.1: Rough DWV test: water test (10 ft head) or air test (5 psi) held for 15 minutes.
  - *Code* — IRC P2503.7: Water supply system test: working pressure water test or air test per the code / material listing (PEX manufacturers limit air testing).
  - *Manufacturer*: PEX manufacturer test procedure and pressures.

### Gas service / meter coordination with utility  `gas.service`

- **Trade:** Utility
- **Applies when:** `A.gas==='new-service'`
- **Prerequisites:** `pre.811`
- **Hard hold until approved:** `cp.811`

### Gas piping rough: sizing, bonding, drips, shutoffs  `gas.pipe`

- **Trade:** Gas · **photograph before concealing**
- **Applies when:** `A.gas!=='none'`
- **Prerequisites:** `plb.layout`, `frm.straighten`
- **QC checks:** Pipe sized for total connected load & length; Appliance shutoff in same room within 6 ft; Sediment traps at appliances; CSST bonded per manufacturer/code; Striker plates on CSST
- **What:** Install gas piping sized for the connected load with required valves, sediment traps and bonding.
  - *Code* — IRC G2413: Piping sized for the maximum demand and length using the code sizing tables.
  - *Code* — IRC G2420.5: Accessible shutoff valve for each appliance, in the same room and within 6 ft (with listed exceptions).
  - *Code* — IRC G2419.4: Sediment trap at appliance inlets (except listed exceptions such as ranges/dryers in some editions).
  - *Code* — IRC G2411.1.1: CSST systems bonded to the electrical grounding electrode system (not less than 6 AWG copper) unless listed arc-resistant jacketed CSST is used per manufacturer.
  - *Manufacturer*: CSST striker plates and bonding per the CSST manufacturer.

### Gas pressure test & tag  `gas.test`

- **Trade:** Gas · **photograph before concealing**
- **Applies when:** `A.gas!=='none'`
- **Prerequisites:** `gas.pipe`
- **Required before requesting:** `cp.rough-gas`, `cp.gasrelease`
- **What:** Pressure test the gas system for inspection.
  - *Code* — IRC G2417: Test pressure not less than 1.5 times working pressure but not less than 3 psig, held at least 10 minutes with no drop (verify in your edition).
  - *Verify locally*: Some AHJs and utilities require specific gauges/durations. Confirm before scheduling.


## 08 · Rough HVAC & Ventilation

### Load calculation & duct design (Manual J / S / D)  `hvac.design`

- **Trade:** HVAC
- **Applies when:** `A.hvac==='full'`
- **Prerequisites:** `pre.scope`
- **What:** Size equipment and ducts from a room-by-room load calculation.
  - *Code* — IRC M1401.3: Heating and cooling equipment sized per ACCA Manual S based on loads calculated with ACCA Manual J.
  - *Code* — IRC M1601.1: Duct systems designed per ACCA Manual D (or equivalent).
  - *Pinestone practice*: Ask for the report. Undersized returns are the most common comfort/noise complaint.

### Equipment locations: air handler, condenser, line set, condensate  `hvac.equip`

- **Trade:** HVAC
- **Applies when:** `A.hvac!=='none'`
- **Prerequisites:** `hvac.design`, `demo.assess`
- **QC checks:** Service clearances per manufacturer; Attic air handler: platform, light, receptacle, walkway; Condenser location clear of windows/dryer vent
- **What:** Set locations that meet access and clearance requirements.
  - *Code* — IRC M1305.1.3: Appliances in attics: passageway and service space, lighting and receptacle near the appliance (verify sizes in your edition).
  - *Manufacturer*: Clearances and orientation per equipment manufacturer.

### Duct rough-in (trunks, branches, returns)  `hvac.ducts`

- **Trade:** HVAC · **photograph before concealing**
- **Applies when:** `A.hvac==='full' && A.hvacType!=='ductless'`
- **Prerequisites:** `hvac.design`, `hvac.equip`, `frm.straighten`, `crawl.sister`
- **QC checks:** Flex pulled tight, supported, no kinks or compressions; Return path from every bedroom (return or transfer); Boot locations clear of joists/cabinets; No ducts in exterior walls

### Seal duct joints, seams & plenums (mastic)  `hvac.seal`

- **Trade:** HVAC · **photograph before concealing**
- **Applies when:** `A.hvac==='full' && A.hvacType!=='ductless'`
- **Prerequisites:** `hvac.ducts`
- **What:** Seal every joint and seam so the system can pass a leakage test.
  - *Code* — IRC M1601.4.1: Joints, seams and connections sealed with listed tapes, mastics or gaskets — not standard cloth duct tape.
  - *Code* — IRC N1103.3.1: Supply and return ducts in attics insulated to R-8 (≥3 in. diameter) and R-6 elsewhere outside the building envelope (2018 IECC values; confirm edition).
  - *Pinestone practice*: Mastic every takeoff, boot collar, and plenum seam; photograph before insulation wrap.
- **Common mistakes:** Sealing only the trunk and skipping boot-to-drywall and takeoffs.

### Line set, condensate & penetrations  `hvac.lineset`

- **Trade:** HVAC
- **Applies when:** `A.hvac!=='none'`
- **Prerequisites:** `hvac.equip`
- **QC checks:** Suction line insulated; Penetrations sealed and flashed; Condensate trapped (where required) and sloped

### Condensate drain & secondary protection  `hvac.condensate`

- **Trade:** HVAC
- **Applies when:** `A.hvac!=='none'`
- **Prerequisites:** `hvac.equip`
- **What:** Install primary condensate drain and secondary protection where overflow could damage the building.
  - *Code* — IRC M1411.3 / M1411.3.1: Condensate disposed to an approved location; auxiliary drain pan or overflow shutoff device where damage could occur (e.g. attic air handlers).
  - *Pinestone practice*: Pinestone standard: float switch on every attic or above-ceiling unit even with a secondary pan.

### Ductless heads: locations, line routes, blocking  `hvac.minisplit`

- **Trade:** HVAC
- **Applies when:** `A.hvac!=='none' && A.hvacType==='ductless'`
- **Prerequisites:** `hvac.equip`

### Bath exhaust fan: ducted to exterior termination  `b.fan`

- **Trade:** HVAC · **per bathroom** · **photograph before concealing**
- **Applies when:** always
- **Prerequisites:** `b.frame`
- **QC checks:** Duct terminates OUTDOORS (roof/wall cap with damper), not into attic or soffit; Smooth / rigid duct, short and sloped to exterior; Duct insulated in unconditioned space; Fan rated airflow meets required rate
- **What:** Install the bath fan so moisture actually leaves the house.
  - *Code* — IRC M1501.1: Exhaust air discharged to the outdoors — not into attics, crawlspaces, or soffit vents where it can re-enter.
  - *Code* — IRC R303.3 / Ch. 15 local exhaust table: Bathrooms with a tub/shower need local exhaust (commonly 50 cfm intermittent or 20 cfm continuous) where a window is not used. Confirm in your edition.
  - *Pinestone practice*: Pinestone standard: fan in every bath with a shower regardless of windows; humidity-sensing or timer control.
- **Common mistakes:** Pointing the duct at a soffit vent (moisture comes back in). · Long flex runs with sags that collect condensate.

### Range hood duct & make-up air  `hvac.hood`

- **Trade:** HVAC
- **Applies when:** `A.kitchen!=='none' && A.rangeHood==='ducted'`
- **Prerequisites:** `pre.selections`, `frm.straighten`
- **What:** Duct the range hood to the exterior at the manufacturer duct size.
  - *Code* — IRC M1503: Range hood ducts: smooth metal, air-tight, with a backdraft damper, terminating outdoors.
  - *Code* — IRC M1503.6 (2018): Hoods exceeding 400 cfm require make-up air (section number varies by edition).
  - *Manufacturer*: Duct size, maximum length and transition rules per hood manufacturer.

### Dryer exhaust duct  `hvac.dryer`

- **Trade:** HVAC
- **Applies when:** `A.dryerVent`
- **Prerequisites:** `frm.straighten`
- **What:** Install a compliant dryer exhaust.
  - *Code* — IRC M1502: Dryer exhaust: independent, terminates outdoors with a backdraft damper and no screen; 4 in. smooth metal duct; length limit (35 ft less fitting allowances) unless manufacturer allows longer; joints not fastened with screws protruding into the duct.
  - *Pinestone practice*: Install a dryer vent box in the wall to avoid crushed transition ducts.

### Whole-house mechanical ventilation  `hvac.freshair`

- **Trade:** HVAC
- **Applies when:** `A.hvac!=='none' && A.freshAir`
- **Prerequisites:** `hvac.ducts`, `hvac.equip`
- **What:** Provide balanced or supply/exhaust ventilation.
  - *Code* — IRC M1505 (2018) / R303.4: Whole-house mechanical ventilation is required when the dwelling unit is tested below a specified air leakage rate (e.g. less than 5 ACH50). Confirm applicability for alterations.

### Combustion air & venting for gas appliances  `hvac.combustion`

- **Trade:** HVAC
- **Applies when:** `A.gas!=='none' && (has(A.gasAppliances,'furnace') || has(A.gasAppliances,'water-heater') || has(A.gasAppliances,'fireplace'))`
- **Prerequisites:** `gas.pipe`, `hvac.equip`
- **What:** Verify combustion air and venting for each gas appliance.
  - *Code* — IRC G2407: Combustion, ventilation and dilution air per appliance input and room volume.
  - *Code* — IRC G2425–G2427: Vent connector sizing, clearances, termination; orphaned water heaters on oversized chimneys need re-evaluation.
  - *Manufacturer*: Direct-vent and high-efficiency venting per manufacturer.

### Exterior terminations flashed & clear of openings  `hvac.terminations`

- **Trade:** Pinestone (GC)
- **Applies when:** always
- **Prerequisites:** `b.fan@*`, `hvac.hood`, `hvac.dryer`, `hvac.lineset`, `hvac.combustion`
- **QC checks:** Each termination flashed (mounting block / roof jack); Dampers move freely; Clearances from windows/doors per code/manufacturer


## 09 · Rough Electrical & Low-Voltage

### Electrical walk: devices, fixtures, switching, cabinet layout  `ele.walk`

- **Trade:** Pinestone (GC)
- **Applies when:** `A.electrical!=='none'`
- **Prerequisites:** `pre.selections`, `frm.straighten`
- **QC checks:** Every receptacle/switch marked on studs; Fixture boxes centered on rooms/cabinets; Under-cabinet & vanity light locations; Dimmer/smart switch box depth
- **What:** Mark every box with the electrician using cabinet drawings and fixture specs.
  - *Pinestone practice*: Mark vanity lights to the mirror size, pendants to the island centerline, and switch locations on the latch side of doors.
  - *Code* — NEC 210.52: Receptacle spacing rules for dwelling walls and countertops (e.g. no point along a wall more than 6 ft from a receptacle; countertop spacing).

### Service / panel upgrade: meter base, mast, grounding & bonding  `ele.service`

- **Trade:** Electrical · **photograph before concealing**
- **Applies when:** `A.electrical!=='none' && A.service!=='none'`
- **Prerequisites:** `pre.utilities`
- **Required before requesting:** `cp.service`
- **QC checks:** Working space in front of panel; Grounding electrode system complete; Water and gas piping bonded; Utility clearances for mast/drop
- **What:** Upgrade or replace the service with a complete grounding and bonding system.
  - *Code* — NEC 110.26: Working space in front of the panel (generally 36 in. deep, 30 in. wide, 6.5 ft high).
  - *Code* — NEC 250.50 / 250.53: Grounding electrode system; a single rod must meet resistance limits or be supplemented (commonly two rods 6 ft apart).
  - *Code* — NEC 250.104: Bonding of metal water piping and other metal piping (gas) likely to become energized.
  - *Verify locally*: Meter base, mast height and disconnect location requirements come from the serving utility (e.g. NES, MTEMC). Coordinate the cut-over date.

### Branch circuit rough-in (boxes, wiring, home runs)  `ele.rough`

- **Trade:** Electrical · **photograph before concealing**
- **Applies when:** `A.electrical!=='none'`
- **Prerequisites:** `ele.walk`, `plb.dwv`, `hvac.ducts`
- **QC checks:** Box depth set for finish (tile, wainscot); Cable stapled within 12 in. of boxes; Cables not in contact with ducts/flue; Box fill within limits
- **What:** Install boxes and wiring after plumbing and ducts so electrical routes around larger trades.
  - *Code* — NEC 314.20: Boxes set back no more than 1/4 in. in noncombustible surfaces; flush with combustible surfaces — plan for tile and backsplash thickness.
  - *Code* — NEC 314.16: Box fill calculations.
  - *Code* — NEC 334.30: NM cable supported within 12 in. of boxes and at intervals not exceeding 4-1/2 ft.

### Kitchen circuits & countertop receptacles  `ele.kitchen`

- **Trade:** Electrical
- **Applies when:** `A.electrical!=='none' && A.kitchen!=='none'`
- **Prerequisites:** `ele.walk`, `pre.selections`
- **QC checks:** Two+ 20A small-appliance circuits; Dedicated DW, disposal, microwave, refrigerator (as specified); Range circuit matches appliance; Island receptacle per adopted NEC edition
- **What:** Provide required kitchen circuits and countertop receptacles.
  - *Code* — NEC 210.11(C)(1): At least two 20A small-appliance branch circuits for kitchen countertop receptacles.
  - *Code* — NEC 210.52(C): Countertop receptacle spacing (no point more than 24 in. from a receptacle along the wall line); island/peninsula rules changed in the 2023 NEC — follow the edition adopted by the AHJ.
  - *Code* — NEC 210.8(A): GFCI protection for kitchen receptacles (scope expands with newer editions).
  - *Manufacturer*: Appliance circuit sizes from the appliance installation guides.

### Bath circuits: 20A receptacle, GFCI, fan, lights  `b.elec`

- **Trade:** Electrical · **per bathroom**
- **Applies when:** `A.electrical!=='none'`
- **Prerequisites:** `ele.walk`, `b.frame`
- **QC checks:** 20A bath receptacle circuit; GFCI protection; Receptacle within 36 in. of each basin; Fan circuit & switching / humidity control; Light fixtures rated for damp/wet location in shower zone
- **What:** Wire each bathroom to code with GFCI protection and fixtures rated for the location.
  - *Code* — NEC 210.11(C)(3): At least one 20A circuit for bathroom receptacle outlets.
  - *Code* — NEC 210.52(D): Receptacle within 3 ft of the outside edge of each basin.
  - *Code* — NEC 410.10(D): Luminaires in tub/shower zones must be listed for damp (or wet, if subject to shower spray) locations.

### Laundry circuit(s)  `ele.laundry`

- **Trade:** Electrical
- **Applies when:** `A.electrical!=='none' && A.laundry!=='none'`
- **Prerequisites:** `ele.walk`
- **What:** Laundry receptacle circuit and dryer circuit.
  - *Code* — NEC 210.11(C)(2): At least one 20A circuit for laundry receptacle outlets.
  - *Manufacturer*: Dryer circuit per dryer nameplate (electric) or 120V receptacle (gas dryer).

### AFCI / GFCI protection plan per adopted NEC  `ele.afci`

- **Trade:** Electrical
- **Applies when:** `A.electrical!=='none'`
- **Prerequisites:** `ele.walk`
- **What:** Confirm which circuits require AFCI and GFCI protection under the locally adopted NEC.
  - *Code* — NEC 210.12: AFCI protection for most dwelling 120V 15/20A branch circuits; extensions/modifications of existing circuits also trigger AFCI requirements.
  - *Code* — NEC 210.8(A): GFCI locations (bathrooms, kitchens, laundry, garages, outdoors, crawlspaces, basements, etc.) — the list expands by edition.
  - *Verify locally*: Tennessee adoption of the NEC (and any amendments) varies by AHJ / state electrical program. Confirm the edition.

### Smoke & CO alarm locations (hardwired, interconnected)  `ele.smoke`

- **Trade:** Electrical
- **Applies when:** always
- **Prerequisites:** `ele.walk`
- **QC checks:** In each sleeping room; Outside each sleeping area; Each story incl. basement; CO alarm outside sleeping areas when fuel-burning appliance or attached garage; Interconnected
- **What:** Install smoke and CO alarms where required for alterations requiring a permit.
  - *Code* — IRC R314.3 / R314.4 / R314.2.2: Smoke alarms in each sleeping room, outside each sleeping area, and on each story; interconnected and hardwired with battery backup in new work. Alterations requiring a permit generally trigger compliance (with stated exceptions).
  - *Code* — IRC R315: CO alarms required where fuel-fired appliances or an attached garage exist, outside each sleeping area and in bedrooms with fuel-burning appliances.
  - *Manufacturer*: Clearances from ceiling fans, HVAC supplies and bathrooms per alarm manufacturer and NFPA 72 guidance.

### Cable protection: nail plates & bored-hole setbacks  `ele.nailplates`

- **Trade:** Electrical · **photograph before concealing**
- **Applies when:** `A.electrical!=='none'`
- **Prerequisites:** `ele.rough`
- **What:** Protect cable from drywall and trim fasteners.
  - *Code* — NEC 300.4(A): Bored holes in framing at least 1-1/4 in. from the nearest edge, or protected by a steel plate at least 1/16 in. thick.

### Recessed lights: IC-rated, airtight, layout  `ele.recessed`

- **Trade:** Electrical
- **Applies when:** `A.electrical!=='none' && A.recessed`
- **Prerequisites:** `ele.walk`
- **What:** Install recessed lights that maintain the ceiling air barrier and insulation.
  - *Code* — IRC N1102.4.5: Recessed luminaires in the building thermal envelope must be IC-rated, labeled for ≤2.0 cfm leakage, and sealed to the drywall with a gasket or caulk.
  - *Pinestone practice*: Lay out on a grid from cabinets / walls, not just room center. Check joist conflicts before cutting.

### Low-voltage: data, security, doorbell, AV, Wi-Fi  `ele.lv`

- **Trade:** Low-Voltage
- **Applies when:** `A.electrical!=='none' && A.lowVoltage`
- **Prerequisites:** `ele.walk`
- **QC checks:** Structured media panel location; Cat6 home runs labeled; Low-voltage separated from power per code

### Exterior receptacles & lighting  `ele.ext`

- **Trade:** Electrical
- **Applies when:** `A.electrical!=='none'`
- **Prerequisites:** `ele.walk`, `wrb.install`
- **What:** Install outdoor receptacles and lighting with proper protection and flashing.
  - *Code* — NEC 210.52(E): Outdoor receptacle at front and back of a one-family dwelling, accessible from grade.
  - *Code* — NEC 406.9(B): Wet location receptacles with extra-duty in-use covers.
  - *Pinestone practice*: Use flashed mounting blocks on all siding penetrations.

### EV charger circuit  `ele.ev`

- **Trade:** Electrical
- **Applies when:** `A.electrical!=='none' && A.evCharger`
- **Prerequisites:** `ele.service`

### Generator interlock / transfer equipment  `ele.gen`

- **Trade:** Electrical
- **Applies when:** `A.electrical!=='none' && A.generator`
- **Prerequisites:** `ele.service`

### Heated floor: circuit, thermostat, sensor conduit  `b.heatmat`

- **Trade:** Electrical · **per bathroom**
- **Applies when:** `B.heatedFloor && A.electrical!=='none'`
- **Prerequisites:** `b.elec`
- **What:** Prepare the heated-floor circuit and sensor path.
  - *Manufacturer*: Circuit size, GFCI/thermostat requirements and sensor installation per mat manufacturer.
  - *Pinestone practice*: Run a spare sensor in conduit — replacing a failed sensor under tile is otherwise impossible.

### Bond metal water / gas piping  `ele.bond`

- **Trade:** Electrical
- **Applies when:** `A.electrical!=='none' && (A.gas!=='none' || A.supplyMat==='copper')`
- **Prerequisites:** `gas.pipe`, `plb.supply`

### Photograph all wiring with tape references  `ele.photo`

- **Trade:** Pinestone (GC) · **photograph before concealing**
- **Applies when:** `A.electrical!=='none'`
- **Prerequisites:** `ele.rough`, `ele.nailplates`


## 10 · Pre-Drywall: Fireblocking, Backing, Air Sealing & Insulation

### Fireblocking at plates, soffits, chases, stairs & penetrations  `pd.fireblock`

- **Trade:** Framing · **photograph before concealing**
- **Applies when:** always
- **Prerequisites:** `plb.test`, `ele.rough`, `hvac.ducts`, `gas.pipe`, `b.fan@*`
- **Required before requesting:** `cp.framing`
- **QC checks:** Plate penetrations (pipes, wires, flues) sealed with approved material; Soffits / drop ceilings blocked at walls; Stair stringers blocked top & bottom; Vertical chases blocked at each floor & ceiling; Concealed spaces >10 ft horizontally blocked
- **What:** Cut off concealed draft openings so fire cannot travel through walls, floors and chases.
  - *Code* — IRC R302.11: Fireblocking required in concealed spaces: vertically at ceiling and floor levels, horizontally at 10 ft intervals, at interconnections between vertical and horizontal spaces (soffits, drop ceilings, coves), at stair stringers top and bottom, and at openings around vents, pipes, ducts, cables and wires at ceiling and floor level.
  - *Code* — IRC R302.11.1: Acceptable materials include 2 in. nominal lumber, two thicknesses of 1 in. lumber, 23/32 in. wood structural panel, 1/2 in. gypsum board, batts of mineral wool or glass fiber securely retained; penetrations at plates sealed with an approved material (e.g. fire-rated sealant/foam listed for fireblocking).
  - *Pinestone practice*: Use red/orange fireblock foam or rated sealant at every top-plate penetration and photograph each wall.
- **Common mistakes:** Standard low-expansion foam at top plates (usually not an approved fireblock). · Missing blocking where a soffit meets a wall. · Tub and shower drain penetrations left open to the crawlspace.

### Draftstopping in floor / ceiling assemblies  `pd.draftstop`

- **Trade:** Framing
- **Applies when:** `A.stories!=='1' || (A.foundation==='basement' && A.bsmtFinish)`
- **Prerequisites:** `pd.fireblock`
- **Required before requesting:** `cp.framing`
- **What:** Subdivide large concealed floor/ceiling spaces where draftstopping applies.
  - *Code* — IRC R302.12: When there is usable space both above and below the concealed space of a floor/ceiling assembly, draftstops are required so that the concealed area does not exceed 1,000 sq ft, divided into approximately equal areas. Typically relevant for open-web floor trusses or suspended/furred ceilings; confirm applicability.
  - *Code* — IRC R302.12.1: Draftstopping materials: not less than 1/2 in. gypsum board, 3/8 in. wood structural panels, or equivalent, adequately supported.

### Garage / dwelling separation & door  `pd.garage`

- **Trade:** Drywall
- **Applies when:** `A.garage==='attached'`
- **Prerequisites:** `pd.fireblock`
- **What:** Provide the required separation between the attached garage and the house.
  - *Code* — IRC R302.6 (Table): Minimum 1/2 in. gypsum board on the garage side; 5/8 in. Type X on garage ceilings under habitable rooms; supporting structure protected.
  - *Code* — IRC R302.5.1: Door between garage and residence: solid wood or solid/honeycomb-core steel not less than 1-3/8 in., or 20-minute fire-rated. Self-closing requirements may be amended locally.
  - *Code* — IRC R302.5.2: Ducts penetrating the separation: minimum 26-gauge steel (or other approved) with no openings into the garage.

### Backing & blocking (cabinets, TV, rails, fans, hardware)  `pd.backing`

- **Trade:** Framing · **photograph before concealing**
- **Applies when:** always
- **Prerequisites:** `ele.rough`, `plb.supply`, `frm.straighten`
- **QC checks:** Grab-bar / future grab-bar blocking at toilets and showers; Towel bars, TP holders, robe hooks; Shower door & curtain rod; Wall-hung vanity / floating shelves; TV mounts; Handrail brackets; Ceiling fans (fan-rated boxes); Door stops / heavy mirrors
- **What:** Install solid wood backing for everything that will hang on a wall before drywall.
  - *Pinestone practice*: Pinestone standard: 2x blocking at 33–36 in. and 60–66 in. in every shower and beside every toilet for current or future grab bars.
  - *Code* — NEC 314.27(C): Ceiling fan outlet boxes must be listed for fan support.
  - *Pinestone practice*: Photograph each blocking location with tape measurements from floor and corner — it is invisible after drywall.
- **Common mistakes:** Relying on toggle bolts for towel bars and shower doors. · No backing for wall-hung vanity or upper cabinets on metal/old framing.

### Bath blocking verification (glass, grab bars, niche, accessories)  `b.blocking`

- **Trade:** Framing · **per bathroom** · **photograph before concealing**
- **Applies when:** always
- **Prerequisites:** `pd.backing`, `b.frame`

### Kitchen backing (upper cabinets, hood, island anchoring)  `pd.kitblock`

- **Trade:** Framing · **photograph before concealing**
- **Applies when:** `A.kitchen!=='none'`
- **Prerequisites:** `pd.backing`

### Air sealing: plates, penetrations, rims, windows, tubs  `pd.airseal`

- **Trade:** Insulation · **photograph before concealing**
- **Applies when:** always
- **Prerequisites:** `pd.fireblock`, `ele.rough`, `plb.test`, `dryin.check`, `wrb.install`
- **Required before requesting:** `cp.insul`
- **QC checks:** Top/bottom plates sealed to drywall plane; Wire & pipe penetrations sealed; Rim joists sealed; Window/door shims gaps foamed (low expansion); Air barrier behind tubs/showers on exterior walls; Attic hatch gasketed
- **What:** Create a continuous air barrier before insulation and drywall.
  - *Code* — IRC N1102.4.1.1 (Table): Air barrier and insulation installation criteria: top plates, penetrations, rim joists, windows/doors, shower/tub on exterior walls, recessed lights, etc.
  - *Verify locally*: Whether full energy-code air sealing/testing applies to an alteration depends on scope and AHJ. Pinestone seals regardless.

### Wall insulation  `pd.insulwalls`

- **Trade:** Insulation · **photograph before concealing**
- **Applies when:** `A.insulWalls!=='none'`
- **Prerequisites:** `pd.airseal`
- **Hard hold until approved:** `cp.rough-plb`, `cp.rough-gas`, `cp.rough-mech`, `cp.rough-elec`, `cp.framing`
- **Required before requesting:** `cp.insul`
- **QC checks:** Full-depth, no gaps / voids / compression (Grade I); Split around wiring and pipes, not compressed behind; Behind tubs, boxes and in corners/headers; R-value labels / certificate posted
- **What:** Install wall insulation to full depth and in contact with the air barrier.
  - *Code* — IRC N1102.1.2 (Table): Climate Zone 4 (most of Middle TN) wood-frame wall R-value: R-20 or R-13+5 continuous (2018). Climate zone and edition must be confirmed.
  - *Code* — IRC N1102.4.1.1: Insulation fills cavities completely, in contact with the air barrier.
  - *Pinestone practice*: Pinestone QC: inspect every bay before drywall; reject compressed batts behind boxes.

### Spray foam (walls / roofline) & ignition/thermal barrier  `pd.sprayfoam`

- **Trade:** Insulation · **photograph before concealing**
- **Applies when:** `['open-cell','closed-cell'].includes(A.insulWalls) || A.insulAttic==='spray-roofline'`
- **Prerequisites:** `pd.airseal`
- **Hard hold until approved:** `cp.rough-plb`, `cp.rough-gas`, `cp.rough-mech`, `cp.rough-elec`, `cp.framing`
- **Required before requesting:** `cp.insul`
- **What:** Install spray foam at specified thickness with required protection.
  - *Code* — IRC R316.4: Foam plastic separated from the interior by an approved thermal barrier (e.g. 1/2 in. gypsum board) unless listed otherwise.
  - *Code* — IRC R316.5.3: Attics / crawlspaces entered only for service: ignition barrier or listed foam for exposed use.
  - *Code* — IRC R806.5: Unvented attic assemblies: insulation requirements, air-impermeable insulation at the deck (or alternatives).
  - *Manufacturer*: Thickness per pass, temperature, curing, and re-occupancy times per foam manufacturer.

### Record dimensions of concealed items (valves, blocking, boxes)  `pd.measure`

- **Trade:** Pinestone (GC)
- **Applies when:** always
- **Prerequisites:** `pd.backing`, `b.valve@*`

### Pre-drywall photo & video record of every wall & ceiling  `pd.photo`

- **Trade:** Pinestone (GC) · **photograph before concealing**
- **Applies when:** always
- **Prerequisites:** `pd.fireblock`, `pd.airseal`, `pd.backing`, `pd.insulwalls`, `pd.sprayfoam`
- **Required before requesting:** `cp.predry`
- **QC checks:** Each wall photographed with room label & tape measure; Ceilings photographed; Video walkthrough saved; Photos attached to tasks / backup file
- **What:** Create the permanent record of everything inside the walls.
  - *Pinestone practice*: Photograph each wall straight-on with a tape across it at 48 in. and a room/wall label (e.g. "Kitchen — North"). Add the key shots to the related tasks in this app.

### Pinestone pre-drywall walkthrough  `pd.qc`

- **Trade:** Pinestone (GC)
- **Applies when:** always
- **Prerequisites:** `frm.qc`, `plb.test`, `plb.nailplates`, `ele.nailplates`, `hvac.seal`, `pd.fireblock`, `pd.draftstop`, `pd.backing`, `b.blocking@*`, `pd.kitblock`, `pd.airseal`, `plb.boring`, `b.valve@*`, `hvac.terminations`, `dryin.check`, `win.verify`, `frm.loadpath`, `frm.engobs`, `b.tub@*`, `plb.wh`, `plb.hosebib`, `gas.test`, `hvac.condensate`, `hvac.lineset`, `hvac.freshair`, `ele.kitchen`, `b.elec@*`, `ele.laundry`, `ele.afci`, `ele.smoke`, `ele.recessed`, `ele.lv`, `ele.ext`, `b.heatmat@*`, `ele.bond`, `ele.photo`, `pd.measure`, `pd.garage`
- **Required before requesting:** `cp.predry`
- **QC checks:** All rough inspections passed (see Inspections); Nail plates everywhere within 1-1/4 in.; Fireblocking & penetrations sealed; Blocking for every accessory; Valve depths verified against tile wall thickness; Box depths match finish; Ducts sealed, boots secured; Bath fans terminate outdoors; Smoke/CO locations roughed; Insulation complete, no gaps; Photo record complete
- **What:** Final internal check before anything is concealed.
  - *Pinestone practice*: Walk with the pre-drywall PDF checklist. Every "no" becomes a blocked task with a note. Sign off the Pinestone pre-drywall checkpoint only when every item is complete.


## 11 · Drywall, Tile Backer & Waterproofing

### Drywall delivery: types & quantities verified  `dw.deliver`

- **Trade:** Drywall
- **Applies when:** always
- **Prerequisites:** `pre.order`
- **QC checks:** Moisture/mold-resistant board for baths & laundry; Type X where required (garage); Board stocked so it does not overload framing

### Hang drywall (ceilings first)  `dw.hang`

- **Trade:** Drywall
- **Applies when:** always
- **Prerequisites:** `dw.deliver`, `pd.qc`, `pd.photo`, `pd.insulwalls`, `pd.sprayfoam`, `pd.garage`
- **Hard hold until approved:** `cp.rough-plb`, `cp.rough-gas`, `cp.rough-mech`, `cp.rough-elec`, `cp.framing`, `cp.insul`, `cp.predry`
- **QC checks:** Fastener spacing per schedule; No butt joints at window/door corners; Board 1/2 in. off floor; Boxes not buried / cut oversize
- **What:** Hang drywall only after all rough inspections and the Pinestone pre-drywall sign-off.
  - *Code* — IRC R702.3.5 (Table): Gypsum board fastener type and spacing based on framing spacing and orientation.
  - *Code* — IRC R702.4.2: Paper-faced gypsum board is not permitted as a tile backer in tub/shower areas — use cement, fiber-cement, glass-mat gypsum, or a listed system board.
  - *Pinestone practice*: Hang ceilings first, walls tight to the ceiling; use mold-resistant board in baths outside the wet zone.

### Attic insulation (blown / batts) with baffles & markers  `dw.attic`

- **Trade:** Insulation
- **Applies when:** `['blown','batts'].includes(A.insulAttic)`
- **Prerequisites:** `dw.hang`, `roof.vent`
- **QC checks:** Baffles at every vented rafter bay; Depth markers installed; Hatch insulated and weatherstripped; Certificate posted
- **What:** Insulate the attic floor after ceilings are hung.
  - *Code* — IRC N1102.1.2 (Table): Climate Zone 4 ceiling insulation R-49 (2018). Confirm climate zone and edition.
  - *Code* — IRC R806.3: Baffles to maintain 1 in. airspace at vents.
  - *Code* — IRC N1101.10.1: Blown insulation depth markers (at least one per 300 sq ft) facing the attic access, and insulation certificate.

### Tape, mud & sand to specified finish level  `dw.finish`

- **Trade:** Drywall
- **Applies when:** always
- **Prerequisites:** `dw.hang`
- **What:** Finish joints to the specified level.
  - *Industry standard* — GA-214: Level 4 for most flat-painted walls; Level 5 (skim coat) where critical lighting or gloss paint is used.
  - *Pinestone practice*: Inspect under raking light before primer.

### Drywall QC with raking light  `dw.qc`

- **Trade:** Pinestone (GC)
- **Applies when:** always
- **Prerequisites:** `dw.finish`
- **QC checks:** No ridging / crowned joints; Corners straight; Cabinet & tile walls flat; Outlet cut-outs tight

### Tile backer / board system install  `b.backer`

- **Trade:** Tile · **per bathroom**
- **Applies when:** `['tile-tub','tile-shower-curb','tile-curbless'].includes(B.shower)`
- **Prerequisites:** `dw.hang`, `b.valve`, `b.tub`, `b.drain`, `b.blocking`
- **QC checks:** Approved backer in wet area (no paper-faced gypsum); Fastener type & spacing per board manufacturer; Flat & plumb; Backer overlaps tub flange per manufacturer
- **What:** Install wet-area substrate per the waterproofing system.
  - *Code* — IRC R702.4.2: Backer for wall tile in tub/shower areas: fiber-cement, fiber-mat reinforced cementitious backer, glass-mat gypsum, or fiber-reinforced gypsum backer (per the referenced standards).
  - *Manufacturer*: Fastener and seam treatment per the board / system manufacturer.

### Shower pan: pre-slope & liner / membrane  `b.pan`

- **Trade:** Tile · **per bathroom** · **photograph before concealing**
- **Applies when:** `['tile-tub','tile-shower-curb','tile-curbless'].includes(B.shower) && B.shower!=='tile-tub'`
- **Prerequisites:** `b.backer`, `b.drain`
- **QC checks:** Pre-slope 1/4 in. per foot to drain; Liner / membrane up walls & over curb per system; No fasteners through liner below curb height; Curbless transition per system
- **What:** Build the shower floor so water drains positively to the drain and the membrane is continuous.
  - *Code* — IRC P2709: Shower receptor / liner requirements: slope toward the drain (commonly 1/4 in. per foot), liner turned up on all sides above the threshold, and no penetrations of the liner below the threshold except the drain (check exact heights in your edition).
  - *Manufacturer*: Bonded systems (sheet/foam/liquid) use the manufacturer pan details; traditional liners need a pre-slope under the liner and weep holes kept open.

### Waterproof walls, niche, bench, penetrations  `b.membrane`

- **Trade:** Tile · **per bathroom** · **photograph before concealing**
- **Applies when:** `['tile-tub','tile-shower-curb','tile-curbless'].includes(B.shower)`
- **Prerequisites:** `b.backer`, `b.pan`
- **QC checks:** Seams & corners banded; Valve & shower-head penetrations sealed with gaskets/collars; Niche & bench fully wrapped; Liquid membrane thickness checked (wet-film gauge); Membrane extends above shower head / to ceiling per Pinestone standard
- **What:** Waterproof the full wet area to the system manufacturer requirements.
  - *Manufacturer*: Sheet: overlap and thinset type per manufacturer. Liquid: number of coats, mil thickness, cure time per manufacturer (use a wet-film gauge).
  - *Industry standard* — ANSI A118.10: Load-bearing, bonded waterproof membranes for thin-set tile.
  - *Pinestone practice*: Pinestone standard: waterproof walls to at least 6 in. above the shower head; full height in steam or curbless showers.
- **Common mistakes:** Mixing components from different waterproofing manufacturers. · Skipping the valve/shower-arm seals.

### Flood test 24 hrs & photo record  `b.flood`

- **Trade:** Tile · **per bathroom** · **photograph before concealing**
- **Applies when:** `['tile-tub','tile-shower-curb','tile-curbless'].includes(B.shower)`
- **Prerequisites:** `b.membrane`
- **Required before requesting:** `cp.flood`
- **QC checks:** Drain plugged, water to just below curb / threshold; Water line marked and photographed at start & end; No drop / no leaks below (check from crawl / ceiling below)
- **What:** Prove the shower floor waterproofing before tile.
  - *Industry standard* — ANSI A118.10 / TCNA: Flood test of membranes typically 24 hours minimum after cure.
  - *Manufacturer*: Follow the membrane manufacturer flood-test instructions and cure times.
  - *Verify locally*: Some AHJs inspect shower pans (traditional liners). Confirm.

### Bath floor tile substrate & uncoupling membrane  `b.floorprep`

- **Trade:** Tile · **per bathroom**
- **Applies when:** `B.floorTile`
- **Prerequisites:** `dw.hang`
- **What:** Prepare a flat, stiff floor for tile.
  - *Industry standard* — TCNA Handbook: Deflection L/360 for ceramic/porcelain and L/720 for natural stone; flatness for large-format tile.
  - *Manufacturer*: Uncoupling membrane and heated mat sequence per manufacturer.

### Install heated floor mat & ohm tests  `b.heatfloor`

- **Trade:** Tile · **per bathroom** · **photograph before concealing**
- **Applies when:** `B.heatedFloor`
- **Prerequisites:** `b.floorprep`, `b.heatmat`
- **QC checks:** Ohm & insulation-resistance test before, during and after tile (recorded); Sensor between wires per manufacturer; Wire not under toilet/vanity footprint
- **What:** Install the heating mat and record tests that protect the warranty.
  - *Manufacturer*: Record resistance values from the mat label and test results at each stage on the warranty card — required by most manufacturers.


## 12 · Exterior Envelope & Site

### Install siding per manufacturer  `ext.siding`

- **Trade:** Siding / Exterior
- **Applies when:** `A.siding.startsWith('full')`
- **Prerequisites:** `wrb.install`, `win.install`, `door.ext`, `roof.flash`
- **QC checks:** Clearance to grade, roof, decks per manufacturer; Butt joints flashed (fiber cement); Penetrations on mounting blocks; Fastening per manufacturer (blind/face, nail type)
- **What:** Install cladding with manufacturer clearances and joint/penetration details.
  - *Manufacturer*: Fiber cement: clearances (commonly 6 in. to grade, 1–2 in. to roofs/decks), joint flashing, fastener type and paint timing per manufacturer.
  - *Manufacturer*: Vinyl: nail in center of slots, not tight; allow expansion gaps.
  - *Code* — IRC R703.3 / R703.10–R703.11: Siding attachment and installation per IRC tables and manufacturer.

### Siding / masonry repairs  `ext.sidingrepair`

- **Trade:** Siding / Exterior
- **Applies when:** `A.siding==='repair' || A.siding==='masonry-repair'`
- **Prerequisites:** `demo.assess`

### Exterior trim, soffit & fascia  `ext.trim`

- **Trade:** Siding / Exterior
- **Applies when:** `A.siding!=='none' || A.roof.startsWith('reroof')`
- **Prerequisites:** `ext.siding`, `roof.cover`

### Flash & seal all exterior penetrations  `ext.penetrations`

- **Trade:** Siding / Exterior
- **Applies when:** always
- **Prerequisites:** `ext.siding`, `ele.ext`, `hvac.terminations`, `plb.hosebib`
- **QC checks:** Every penetration on a flashed block or boot; Sealant compatible with cladding

### Exterior paint & caulk  `ext.paint`

- **Trade:** Painting
- **Applies when:** `A.extPaint`
- **Prerequisites:** `ext.siding`, `ext.trim`, `ext.sidingrepair`, `site.rrp`

### Gutters & downspouts (discharge away from foundation)  `ext.gutters`

- **Trade:** Roofing
- **Applies when:** `A.gutters`
- **Prerequisites:** `roof.cover`, `ext.trim`, `roof.repair`
- **What:** Collect roof water and discharge it away from the foundation.
  - *Pinestone practice*: Pinestone standard: downspouts discharge at least 4–6 ft from the foundation (extensions or underground to daylight).
  - *Verify locally* — IRC R801.3: Roof drainage to a storm sewer or at least 5 ft from foundations is required only in expansive or collapsible soil areas — determined locally.

### Grade soil away from foundation  `ext.grade`

- **Trade:** Excavation / Site
- **Applies when:** `A.grading || (A.foundation==='crawlspace' && ['exterior-grading','both'].includes(A.crawlDrain))`
- **Prerequisites:** `ext.siding`, `ext.gutters`
- **Hard hold until approved:** `cp.811`
- **What:** Slope the finished grade away from the house.
  - *Code* — IRC R401.3: Finish grade falls a minimum of 6 in. within the first 10 ft (or swales/drains where lot lines prohibit).
  - *Pinestone practice*: Keep soil and mulch below siding clearance and weep screeds.

### Deck / porch footings (dig, inspect, pour)  `ext.porchfoot`

- **Trade:** Concrete · **photograph before concealing**
- **Applies when:** `A.porch==='new-deck' || A.porch==='new-porch'`
- **Prerequisites:** `pre.811`
- **Hard hold until approved:** `cp.811`, `cp.permit`
- **Required before requesting:** `cp.deckfooting`
- **What:** Excavate and pour deck/porch footings after inspection.
  - *Code* — IRC R507.3: Deck footings sized per table, bottom below frost depth set by the AHJ.
  - *Pinestone practice*: Do not pour until the footing inspection is recorded as passed (pour is a separate step after the checkpoint).

### Porch / deck work (ledger flashing, connections, guards)  `ext.porch`

- **Trade:** Framing
- **Applies when:** `A.porch!=='none'`
- **Prerequisites:** `ext.porchfoot`, `wrb.install`
- **Hard hold until approved:** `cp.deckfooting`
- **QC checks:** Ledger flashed and attached per R507.9; Lateral connections as required; Guards 36 in. min; 4 in. sphere rule; Stairs: rise/run, handrail, lighting
- **What:** Build or repair the porch/deck with a proper ledger, connections and guards.
  - *Code* — IRC R507: Deck footings, posts, beams, joists, ledger attachment (R507.9) and flashing.
  - *Code* — IRC R312.1: Guards required where walking surface is more than 30 in. above grade; 36 in. minimum height; openings reject a 4 in. sphere.

### Driveway / walkways / flatwork  `ext.flatwork`

- **Trade:** Concrete
- **Applies when:** `A.flatwork`
- **Prerequisites:** `ext.grade`, `pre.811`
- **Hard hold until approved:** `cp.811`

### Condenser pad / stand, disconnect & whip  `ext.hvacpad`

- **Trade:** HVAC
- **Applies when:** `A.hvac!=='none'`
- **Prerequisites:** `hvac.lineset`, `ele.rough`

### House numbers visible from street  `ext.address`

- **Trade:** Pinestone (GC)
- **Applies when:** always
- **Prerequisites:** `ext.paint`, `ext.siding`
- **What:** Install address numbers.
  - *Code* — IRC R319.1: Address numbers visible from the street, contrasting with background, minimum 4 in. high.

### Fencing  `ext.fence`

- **Trade:** Landscaping
- **Applies when:** `A.fence`
- **Prerequisites:** `pre.811`
- **Hard hold until approved:** `cp.811`

### Landscaping & final grading  `ext.landscape`

- **Trade:** Landscaping
- **Applies when:** `A.landscaping`
- **Prerequisites:** `ext.grade`, `ext.flatwork`
- **Hard hold until approved:** `cp.811`


## 13 · Interior Finishes & Trim-Out

### Prime drywall  `fin.prime`

- **Trade:** Painting
- **Applies when:** always
- **Prerequisites:** `dw.qc`

### Install kitchen cabinets  `fin.cabinets`

- **Trade:** Cabinets
- **Applies when:** `A.kitchen!=='none'`
- **Prerequisites:** `fin.prime`, `pd.kitblock`, `dw.qc`
- **QC checks:** Uppers fastened into backing / studs with cabinet screws; Base level to highest floor point; Fillers & scribes; Appliance openings per spec sheets; Dishwasher anchor strip / side mount provision
- **What:** Install cabinets level, plumb and secured to structure.
  - *Manufacturer*: Fasten per cabinet manufacturer: cabinet screws (not drywall screws) through hanging rails into framing.
  - *Pinestone practice*: Set a level line from the high point of the floor. Check appliance openings against the actual appliance spec sheets before counters are templated.

### Install vanity  `b.vanity`

- **Trade:** Cabinets · **per bathroom**
- **Applies when:** always
- **Prerequisites:** `fin.prime`, `b.blocking`

### Countertop template  `fin.template`

- **Trade:** Countertops
- **Applies when:** `A.kitchen!=='none'`
- **Prerequisites:** `fin.cabinets`, `b.vanity@*`
- **QC checks:** Sinks, faucets & cooktop on site for template; Overhang supports planned

### Countertop install  `fin.counters`

- **Trade:** Countertops
- **Applies when:** `A.kitchen!=='none'`
- **Prerequisites:** `fin.template`
- **What:** Install countertops with proper support.
  - *Manufacturer*: Overhang support limits (brackets / corbels / steel) per fabricator and material manufacturer.
  - *Pinestone practice*: Verify sink reveal, faucet holes and seam location before fabricator leaves.

### Backsplash tile  `fin.backsplash`

- **Trade:** Tile
- **Applies when:** `A.kitchen!=='none' && A.backsplash`
- **Prerequisites:** `fin.counters`, `ele.rough`
- **QC checks:** Receptacles extended to finished face; Movement gap at countertop, sealant not grout

### Bath wall & floor tile  `b.tile`

- **Trade:** Tile · **per bathroom** · **photograph before concealing**
- **Applies when:** `['tile-tub','tile-shower-curb','tile-curbless'].includes(B.shower) || B.floorTile`
- **Prerequisites:** `b.membrane`, `b.floorprep`, `b.heatfloor`, `b.backer`
- **Hard hold until approved:** `cp.flood`
- **QC checks:** Layout approved (centerlines, cut sizes, niche lines); Mortar coverage 95% in wet areas (pull a tile); Movement joints at changes of plane & perimeter; Lippage within tolerance; Mortar type matches membrane & tile
- **What:** Set tile with full coverage and movement accommodation.
  - *Industry standard* — ANSI A108.5: Average mortar coverage: 80% minimum in dry interior areas; 95% in wet areas and exterior.
  - *Industry standard* — TCNA EJ171: Movement joints at changes of plane, perimeters and at intervals; filled with sealant, not grout.
  - *Manufacturer*: Thinset type (modified/unmodified) per membrane manufacturer (e.g. some sheet membranes require specific mortar).
- **Common mistakes:** Grout in inside corners instead of sealant. · Not back-buttering large-format tile.

### Grout, sealant at changes of plane, sealer  `b.grout`

- **Trade:** Tile · **per bathroom**
- **Applies when:** `['tile-tub','tile-shower-curb','tile-curbless'].includes(B.shower) || B.floorTile`
- **Prerequisites:** `b.tile`

### Flooring prep: acclimation, moisture & flatness tests  `fin.floorprep`

- **Trade:** Flooring · **photograph before concealing**
- **Applies when:** `A.flooring.length>0`
- **Prerequisites:** `dw.qc`, `crawl.final`
- **QC checks:** Moisture of subfloor/slab recorded; Material acclimated per manufacturer; Flatness within manufacturer tolerance; Crawlspace / HVAC operating (interior conditions)
- **What:** Verify the substrate before flooring — most flooring failures are moisture or flatness.
  - *Manufacturer*: Moisture limits (wood MC difference; concrete RH or MVER) and flatness tolerance come from the flooring manufacturer and are warranty conditions.
  - *Industry standard* — NWFA: Wood flooring jobsite conditions and acclimation guidelines.
  - *Pinestone practice*: Record readings in this task note with photos of the meter.

### Install new hardwood  `fin.hardwood`

- **Trade:** Flooring
- **Applies when:** `has(A.flooring,'hardwood-new')`
- **Prerequisites:** `fin.floorprep`, `fin.prime`

### Install LVP  `fin.lvp`

- **Trade:** Flooring
- **Applies when:** `has(A.flooring,'lvp')`
- **Prerequisites:** `fin.floorprep`, `fin.cabinets`
- **What:** Install luxury vinyl per manufacturer.
  - *Manufacturer*: Expansion gaps, maximum run lengths, transitions and whether cabinets may sit on floating floors per manufacturer.

### Install floor tile (non-bath)  `fin.floortile`

- **Trade:** Tile
- **Applies when:** `has(A.flooring,'tile')`
- **Prerequisites:** `fin.floorprep`

### Hang interior doors  `fin.intdoors`

- **Trade:** Finish Carpentry
- **Applies when:** `A.interiorDoors!=='none'`
- **Prerequisites:** `fin.prime`, `fin.hardwood`, `fin.lvp`, `fin.floortile`
- **QC checks:** Reveals even; Undercut for return air / flooring; Latch without force

### Trim: base, casing, crown  `fin.trim`

- **Trade:** Finish Carpentry
- **Applies when:** `A.trim`
- **Prerequisites:** `fin.intdoors`, `fin.cabinets`, `fin.lvp`, `fin.hardwood`

### Stair finish: treads, handrails, guards  `fin.stairs`

- **Trade:** Finish Carpentry
- **Applies when:** `has(A.structural,'stair-modify') || A.stories!=='1'`
- **Prerequisites:** `fin.prime`
- **What:** Finish stairs with compliant handrails and guards.
  - *Code* — IRC R311.7.8: Handrail on at least one side of stairs with 4+ risers, 34–38 in. above nosings, continuous, with graspable profile (R311.7.8.5).
  - *Code* — IRC R312.1: Guards at open sides more than 30 in. above floor/grade; 36 in. min height; 4 in. sphere (4-3/8 in. at stair sides).

### Closet shelving / systems  `fin.closets`

- **Trade:** Finish Carpentry
- **Applies when:** `A.closets`
- **Prerequisites:** `fin.paint`

### Interior paint (caulk, fill, finish coats)  `fin.paint`

- **Trade:** Painting
- **Applies when:** `A.paintInt`
- **Prerequisites:** `fin.trim`, `fin.prime`

### Refinish hardwood floors  `fin.refinish`

- **Trade:** Flooring
- **Applies when:** `has(A.flooring,'hardwood-refinish') || has(A.flooring,'hardwood-new')`
- **Prerequisites:** `fin.paint`, `fin.trim`
- **What:** Sand and finish hardwood late in the job to avoid damage.
  - *Manufacturer*: Finish product cure time before traffic, rugs and furniture per manufacturer.

### Shower glass enclosure  `b.glass`

- **Trade:** Glass · **per bathroom**
- **Applies when:** `B.glass && B.shower!=='none'`
- **Prerequisites:** `b.grout`
- **What:** Install the enclosure into solid backing with tempered/labeled glass.
  - *Code* — IRC R308.4.5: Glazing in enclosures/walls facing tubs and showers is a hazardous location (safety glazing) where the bottom edge is less than 60 in. above the standing surface.

### Bath mirrors & accessories  `b.accessories`

- **Trade:** Finish Carpentry · **per bathroom**
- **Applies when:** always
- **Prerequisites:** `fin.paint`, `b.grout`

### Plumbing trim-out (fixtures, valves, toilets)  `fin.plbtrim`

- **Trade:** Plumbing
- **Applies when:** `A.plumbing!=='none'`
- **Prerequisites:** `fin.counters`, `b.grout@*`, `b.vanity@*`, `fin.paint`
- **QC checks:** Toilets set on finished floor, flange height right; Anti-scald limit stops set; Escutcheons tight to tile; No leaks after 24 hrs

### Electrical trim-out (devices, fixtures, panel directory)  `fin.eletrim`

- **Trade:** Electrical
- **Applies when:** `A.electrical!=='none'`
- **Prerequisites:** `fin.paint`, `fin.backsplash`, `fin.counters`
- **QC checks:** Tamper-resistant receptacles; Covers straight & tight; Panel directory complete and specific; Fixtures per selections
- **What:** Install devices, fixtures and a complete panel directory.
  - *Code* — NEC 406.12: Tamper-resistant receptacles in dwelling units.
  - *Code* — NEC 408.4: Every circuit legibly identified as to its specific purpose on the panel directory.

### HVAC trim (grilles, registers, thermostat)  `fin.hvactrim`

- **Trade:** HVAC
- **Applies when:** `A.hvac!=='none'`
- **Prerequisites:** `fin.paint`

### Appliance installation  `fin.appliances`

- **Trade:** Pinestone (GC)
- **Applies when:** `A.kitchen!=='none'`
- **Prerequisites:** `fin.counters`, `fin.plbtrim`, `fin.eletrim`
- **QC checks:** Range anti-tip bracket installed; Dishwasher high loop / air gap per local rule; Gas connector & shutoff accessible; Refrigerator water line tested
- **What:** Install appliances per the manufacturer instructions.
  - *Manufacturer*: Anti-tip devices for ranges are a manufacturer installation requirement.
  - *Verify locally*: Dishwasher air gap vs. high loop acceptance varies by AHJ.

### Fireplace finish / gas insert  `fin.fireplace`

- **Trade:** Pinestone (GC)
- **Applies when:** `['rebuild-wood','gas-insert','cosmetic'].includes(A.fireplace)`
- **Prerequisites:** `fin.prime`, `gas.pipe`
- **What:** Finish or install fireplace components to listings.
  - *Manufacturer*: Clearances to combustibles (mantels, trim) per the listed appliance / insert manufacturer.
  - *Code* — IRC R1001 / R1003: Masonry fireplace and chimney requirements when rebuilding.

### Cabinet & door hardware, accessories  `fin.hardware`

- **Trade:** Finish Carpentry
- **Applies when:** always
- **Prerequisites:** `fin.paint`, `fin.cabinets`, `fin.intdoors`

### Final caulk & paint touch-up  `fin.touchup`

- **Trade:** Painting
- **Applies when:** always
- **Prerequisites:** `fin.hardware`, `fin.eletrim`, `fin.plbtrim`, `fin.refinish`

### Install carpet  `fin.carpet`

- **Trade:** Flooring
- **Applies when:** `has(A.flooring,'carpet')`
- **Prerequisites:** `fin.touchup`


## 14 · Commissioning, Final Inspections & Handoff

### Plumbing commissioning (leaks, flush, temps)  `com.plb`

- **Trade:** Plumbing
- **Applies when:** `A.plumbing!=='none'`
- **Prerequisites:** `fin.plbtrim`
- **Required before requesting:** `cp.final-plb`
- **QC checks:** Every fixture run; checked for leaks below (incl. crawl); Aerators cleaned after flush; Shower / tub max temp tested ≤120°F; Water heater set & T&P discharge verified; Main & fixture shutoffs operate
- **What:** Run and verify every fixture before final inspection.
  - *Code* — IRC P2708.4: Shower valve high-limit stop set to limit outlet temperature to 120°F maximum.
  - *Pinestone practice*: Use a thermometer at each shower and record readings in the note.

### HVAC startup & commissioning  `com.hvac`

- **Trade:** HVAC
- **Applies when:** `A.hvac!=='none'`
- **Prerequisites:** `fin.hvactrim`, `ext.hvacpad`
- **Required before requesting:** `cp.final-mech`
- **QC checks:** Refrigerant charge verified per manufacturer; Static pressure within equipment rating; Airflow at each register checked; Condensate & float switch tested with water; Filter installed; thermostat programmed
- **What:** Start up and verify the system — not just "it blows cold."
  - *Manufacturer*: Charge, airflow and static pressure per equipment manufacturer.
  - *Industry standard* — ACCA QI (Standard 5): Quality installation verification practices.
  - *Pinestone practice*: Request the startup sheet from the HVAC contractor and attach it to this task.

### Electrical testing (GFCI/AFCI, polarity, alarms)  `com.ele`

- **Trade:** Electrical
- **Applies when:** `A.electrical!=='none'`
- **Prerequisites:** `fin.eletrim`
- **Hard hold until approved:** `cp.service`
- **Required before requesting:** `cp.final-elec`
- **QC checks:** Every receptacle tested with plug-in tester; Every GFCI / AFCI tested & reset; Smoke / CO alarms tested & interconnected; Every fixture & fan operates; Panel directory matches

### Gas appliance startup & leak check  `com.gas`

- **Trade:** Gas
- **Applies when:** `A.gas!=='none'`
- **Prerequisites:** `fin.appliances`, `com.hvac`
- **Hard hold until approved:** `cp.gasrelease`
- **Required before requesting:** `cp.final-gas`
- **QC checks:** Leak check at all appliance connections; Burners adjusted; CO check at appliances; Vent draft verified

### Verify bath fan, hood & dryer exhaust airflow  `com.fans`

- **Trade:** Pinestone (GC)
- **Applies when:** always
- **Prerequisites:** `fin.eletrim`, `hvac.terminations`
- **QC checks:** Each bath fan pulls (tissue / flow test) and damper opens; Range hood exhausts outdoors; Dryer damper opens freely

### Blower door / duct leakage testing  `com.blower`

- **Trade:** Insulation
- **Applies when:** `A.hvac==='full' && A.hvacType!=='ductless' || A.insulWalls!=='none'`
- **Prerequisites:** `fin.eletrim`, `fin.hvactrim`
- **Required before requesting:** `cp.blower`
- **What:** Test air tightness and duct leakage where required or as Pinestone verification.
  - *Code* — IRC N1102.4.1.2 / N1103.3.3: Building air leakage and duct leakage testing requirements for new construction; applicability to alterations is limited — confirm with AHJ.
  - *Pinestone practice*: Pinestone recommended: duct leakage test on every full HVAC replacement.

### Water-intrusion check after rain  `com.water`

- **Trade:** Pinestone (GC)
- **Applies when:** always
- **Prerequisites:** `ext.gutters`, `ext.grade`, `roof.cover`, `dryin.check`
- **QC checks:** Crawl/basement dry; No interior stains at windows/doors; Gutters & downspouts discharging correctly

### Crawlspace post-work humidity & sump check  `com.crawl`

- **Trade:** Pinestone (GC)
- **Applies when:** `A.foundation==='crawlspace'`
- **Prerequisites:** `crawl.final`, `com.hvac`
- **QC checks:** RH reading recorded and compared to baseline; Sump / dehumidifier tested; No leaks at new plumbing

### Pinestone internal punch walk  `com.punch`

- **Trade:** Pinestone (GC)
- **Applies when:** always
- **Prerequisites:** `fin.touchup`, `com.plb`, `com.ele`, `com.hvac`
- **What:** Walk the house room-by-room and create the punch list.
  - *Pinestone practice*: Use the separate Pinestone Punch List tool for room-by-room items and sub PDFs; record the punch-list status here.

### Complete punch items  `com.punchfix`

- **Trade:** Pinestone (GC)
- **Applies when:** always
- **Prerequisites:** `com.punch`

### Final construction clean & filter change  `com.clean`

- **Trade:** Cleaning
- **Applies when:** always
- **Prerequisites:** `com.punchfix`, `fin.carpet`
- **QC checks:** Inside cabinets & drawers; Windows & tracks; HVAC filter replaced after construction dust; Registers cleaned

### Request & pass final inspections  `com.finals`

- **Trade:** Pinestone (GC)
- **Applies when:** always
- **Prerequisites:** `com.plb`, `com.hvac`, `com.ele`, `com.gas`, `com.punchfix`
- **Required before requesting:** `cp.final-bldg`, `cp.co`

### Handoff package: warranties, manuals, as-built photos, shutoffs  `com.docs`

- **Trade:** Pinestone (GC)
- **Applies when:** always
- **Prerequisites:** `com.finals`
- **QC checks:** Warranties & manuals; Paint & finish schedule; Shutoff / panel / cleanout locations; Pre-drywall photo record; Permit closeout / CO copy; Subcontractor list
- **What:** Hand over everything the owner (or next buyer) needs to maintain the house.
  - *Pinestone practice*: Export this project PDF set (full sequence + inspections) and include the pre-drywall photo record.

### Owner walkthrough & acceptance  `com.walk`

- **Trade:** Owner
- **Applies when:** always
- **Prerequisites:** `com.clean`, `com.docs`
- **Required before requesting:** `cp.client`

### Archive project: export backup file & PDFs  `com.archive`

- **Trade:** Pinestone (GC)
- **Applies when:** always
- **Prerequisites:** `com.walk`
- **What:** Create the permanent project record.
  - *Pinestone practice*: Export the project backup file (includes photos) and the full PDF set; store them in the Pinestone project folder and a second location.
