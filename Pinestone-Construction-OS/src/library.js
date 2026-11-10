/* Pinestone Construction OS — Master Construction Task Library
 * ----------------------------------------------------------------
 * Data only. Read by engine.js. Stable IDs: never reuse or rename an ID that
 * has shipped — project progress is keyed by these IDs. To retire a task, set
 * `retired: true` (records are preserved and shown as retired).
 *
 * Fields
 *   id      stable id. Bathroom tasks start with "b." and are generated once per bathroom.
 *   t       title            tr  responsible trade
 *   d       prerequisite task ids (same-bath for "b." ids; "b.x@*" = every bathroom's b.x)
 *   g       checkpoint ids that must be approved before this task may START (hard gate)
 *   f       checkpoint ids this task feeds (work needed before requesting that inspection)
 *   w       applicability condition (JS expression on A = answers, B = bathroom)
 *   photo   true = photograph before concealment
 *   q       field QC checks (printed on checklists)
 *   G       guidance: w what, t technical [tagged], m mistakes, i inspection/approval
 *
 * Guidance tags ("TAG|reference|text"):
 *   C  Code requirement — model-code section cited (2018 IRC numbering unless noted). Verify against
 *      the edition and local amendments adopted by the project's AHJ.
 *   L  Jurisdiction-dependent — varies by AHJ / utility / state program. Confirm locally; never assume.
 *   M  Manufacturer requirement — follow the installation instructions of the product actually used.
 *   S  Industry standard (TCNA, ANSI, ACCA, NWFA, GA) — not code unless adopted or specified.
 *   P  Pinestone recommended practice — company quality standard, not a code requirement.
 */
(function (root) {
  'use strict';

  const LIBRARY_VERSION = '1.1.0';

  // ---------- Condition shorthands ----------
  const CRAWL = "A.foundation==='crawlspace'";
  const SLAB = "A.foundation==='slab'";
  const BSMT = "A.foundation==='basement'";
  const ENCAP = "A.foundation==='crawlspace' && A.crawlStrategy!=='vented'";
  const PLB = "A.plumbing!=='none'";
  const DWV = "A.plumbing!=='none' && A.dwv!=='none'";
  const ELEC = "A.electrical!=='none'";
  const HVAC = "A.hvac!=='none'";
  const DUCTS = "A.hvac==='full' && A.hvacType!=='ductless'";
  const GAS = "A.gas!=='none'";
  const KIT = "A.kitchen!=='none'";
  const BATHS = 'A.baths.length>0';
  const REROOF = "A.roof.startsWith('reroof')";
  const WIN = "A.windows!=='none'";
  const SIDING_FULL = "A.siding.startsWith('full')";
  const s = (x) => `has(A.structural,'${x}')`;
  const STRUCT_ANY = 'A.structural.length>0';
  const BEARING = s('remove-bearing-wall');
  const NEEDS_ENG = `A.engineer==='yes' || ${BEARING} || ${s('ceiling-raise')} || ${s('foundation-repair')}`;
  const FOOTINGS = `${BEARING} || ${s('foundation-repair')} || (${CRAWL} && has(A.crawlFraming,'new-piers'))`;
  const EXCAVATION = `A.waterService || A.sewerLateral==='replace' || (${BSMT} && ['exterior-membrane','both'].includes(A.bsmtWater)) || A.flatwork || A.fence || A.grading || A.porch==='new-deck' || A.porch==='new-porch' || A.gas==='new-service' || A.landscaping`;
  const TILE_SHOWER = "['tile-tub','tile-shower-curb','tile-curbless'].includes(B.shower)";
  const ANY_TILE_SHOWER = "A.baths.some(b=>['tile-tub','tile-shower-curb','tile-curbless'].includes(b.shower))";
  const OPENINGS = `${s('new-exterior-opening')} || (${WIN} && A.windowNewOpenings) || A.extDoors==='new-openings'`;
  const PRE78 = "A.yearBuilt!=='1978plus'";
  const FLOORING = 'A.flooring.length>0';

  // ---------- Phases ----------
  const PHASES = [
    { id: 'P01', name: 'Preconstruction & Permitting', short: 'Precon' },
    { id: 'P02', name: 'Site Setup, Protection & Hazard Control', short: 'Site setup' },
    { id: 'P03', name: 'Demolition & Discovery', short: 'Demo' },
    { id: 'P04', name: 'Foundation & Substructure', short: 'Foundation' },
    { id: 'P05', name: 'Structural Framing & Modifications', short: 'Framing' },
    { id: 'P06', name: 'Dry-In: Roof, Windows, Doors & WRB', short: 'Dry-in' },
    { id: 'P07', name: 'Rough Plumbing & Gas', short: 'Rough plumbing' },
    { id: 'P08', name: 'Rough HVAC & Ventilation', short: 'Rough HVAC' },
    { id: 'P09', name: 'Rough Electrical & Low-Voltage', short: 'Rough electrical' },
    { id: 'P10', name: 'Pre-Drywall: Fireblocking, Backing, Air Sealing & Insulation', short: 'Pre-drywall' },
    { id: 'P11', name: 'Drywall, Tile Backer & Waterproofing', short: 'Drywall & WP' },
    { id: 'P12', name: 'Exterior Envelope & Site', short: 'Exterior' },
    { id: 'P13', name: 'Interior Finishes & Trim-Out', short: 'Finishes' },
    { id: 'P14', name: 'Commissioning, Final Inspections & Handoff', short: 'Closeout' },
  ];

  const TRADES = ['Pinestone (GC)', 'Engineer', 'Hazmat / Abatement', 'Demolition', 'Excavation / Site', 'Concrete', 'Foundation / Crawlspace',
    'Framing', 'Roofing', 'Windows & Doors', 'Siding / Exterior', 'Plumbing', 'Gas', 'HVAC', 'Electrical', 'Low-Voltage', 'Insulation',
    'Drywall', 'Tile', 'Cabinets', 'Countertops', 'Flooring', 'Finish Carpentry', 'Painting', 'Glass', 'Cleaning', 'Landscaping', 'Utility', 'Owner'];

  // ---------- Inspection / approval checkpoints ----------
  // kind: ahj (permit authority), utility, third-party, internal (Pinestone)
  // req: default requirement for new projects: 'required' or 'verify' (confirm with AHJ; gates until resolved)
  const CHECKPOINTS = [
    { id: 'cp.permit', name: 'Building permit issued', kind: 'ahj', req: 'required', ph: 'P01', after: ['pre.permit'],
      desc: 'Permit issued and permit card posted. Record permit number in project jurisdiction details.' },
    { id: 'cp.tradepermits', name: 'Trade permits issued (electrical / plumbing / mechanical / gas)', kind: 'ahj', req: 'verify', ph: 'P01', after: ['pre.permit'],
      desc: 'Who issues trade permits varies in Tennessee (local codes department vs. State Fire Marshal electrical program). Usually pulled by the licensed trade.' },
    { id: 'cp.historic', name: 'Historic / overlay / HOA approval', kind: 'ahj', req: 'required', ph: 'P01', w: 'A.historic', after: ['pre.historic'] },
    { id: 'cp.haz', name: 'Hazardous materials clearance (asbestos / lead / mold)', kind: 'third-party', req: 'required', ph: 'P02', w: `${PRE78} || A.hazTesting!=='done-clear'`, after: ['pre.haz'],
      desc: 'Survey results reviewed; any required abatement completed with clearance documentation before disturbance.' },
    { id: 'cp.eng', name: 'Engineered design / stamped letter received', kind: 'third-party', req: 'required', ph: 'P01', w: NEEDS_ENG, after: ['pre.eng'] },
    { id: 'cp.811', name: 'Tennessee 811 locate tickets clear', kind: 'utility', req: 'required', ph: 'P01', w: EXCAVATION, after: ['pre.811'],
      desc: 'All member utilities have responded / marked before excavation. Keep ticket numbers in notes.' },
    { id: 'cp.footing', name: 'Footing / pier inspection (pre-pour)', kind: 'ahj', req: 'required', ph: 'P04', w: FOOTINGS, after: ['fdn.footdig'] },
    { id: 'cp.deckfooting', name: 'Deck / porch footing inspection', kind: 'ahj', req: 'required', ph: 'P12', w: "A.porch==='new-deck' || A.porch==='new-porch'", after: ['ext.porchfoot'] },
    { id: 'cp.underslab', name: 'Underslab plumbing inspection / test', kind: 'ahj', req: 'required', ph: 'P04', w: `${CRAWL.replace('===', '!==')} && has(A.slabWork,'underslab-plumbing')`, after: ['slab.plbrough'] },
    { id: 'cp.preslab', name: 'Pre-pour slab inspection (base, vapor retarder, reinforcement)', kind: 'ahj', req: 'verify', ph: 'P04', w: "has(A.slabWork,'new-slab')", after: ['slab.newprep'] },
    { id: 'cp.engobs', name: 'Engineer structural observation', kind: 'third-party', req: 'verify', ph: 'P05', w: NEEDS_ENG, after: ['frm.beam', 'frm.loadpath', 'frm.connectors'] },
    { id: 'cp.roof', name: 'Roof inspection (if required by AHJ)', kind: 'ahj', req: 'verify', ph: 'P06', w: REROOF, after: ['roof.ice'] },
    { id: 'cp.rough-plb', name: 'Rough plumbing inspection', kind: 'ahj', req: 'required', ph: 'P07', w: PLB, after: ['plb.dwv', 'plb.supply', 'plb.test', 'plb.nailplates', 'b.tub@*', 'plb.wh', 'plb.hosebib', 'plb.boring'] },
    { id: 'cp.rough-gas', name: 'Gas piping rough / pressure test inspection', kind: 'ahj', req: 'required', ph: 'P07', w: GAS, after: ['gas.pipe', 'gas.test'] },
    { id: 'cp.rough-mech', name: 'Rough mechanical inspection', kind: 'ahj', req: 'required', ph: 'P08', w: HVAC, after: ['hvac.ducts', 'hvac.seal', 'b.fan@*', 'hvac.hood', 'hvac.dryer', 'hvac.equip', 'hvac.lineset', 'hvac.condensate', 'hvac.combustion', 'hvac.freshair', 'hvac.terminations'] },
    { id: 'cp.rough-elec', name: 'Rough electrical inspection', kind: 'ahj', req: 'required', ph: 'P09', w: ELEC, after: ['ele.rough', 'ele.nailplates', 'ele.smoke', 'ele.kitchen', 'b.elec@*', 'ele.laundry', 'ele.afci', 'ele.recessed', 'ele.lv', 'ele.ext', 'b.heatmat@*', 'ele.bond'] },
    { id: 'cp.framing', name: 'Framing / rough building inspection', kind: 'ahj', req: 'required', ph: 'P10', after: ['frm.qc', 'pd.fireblock', 'pd.draftstop'] },
    { id: 'cp.insul', name: 'Insulation / energy inspection', kind: 'ahj', req: 'verify', ph: 'P10', w: "A.insulWalls!=='none' || A.insulAttic==='spray-roofline'", after: ['pd.insulwalls', 'pd.sprayfoam', 'pd.airseal'] },
    { id: 'cp.predry', name: 'Pinestone pre-drywall QC sign-off', kind: 'internal', req: 'required', ph: 'P10', after: ['pd.qc', 'pd.photo'],
      desc: 'Internal hold point. Drywall may not be hung until the pre-drywall walkthrough and photo record are complete.' },
    { id: 'cp.flood', name: 'Shower waterproofing flood test', kind: 'internal', req: 'required', ph: 'P11', each: 'bath', w: TILE_SHOWER, after: ['b.flood'],
      desc: 'Internal hold point per bathroom (some AHJs also inspect pans — confirm). Tile may not start until passed.' },
    { id: 'cp.service', name: 'Electrical service release / utility reconnection', kind: 'utility', req: 'required', ph: 'P09', w: `${ELEC} && A.service!=='none'`, after: ['ele.service'] },
    { id: 'cp.gasrelease', name: 'Gas meter set / service release', kind: 'utility', req: 'required', ph: 'P13', w: GAS, after: ['gas.test'] },
    { id: 'cp.blower', name: 'Blower door / duct leakage test', kind: 'third-party', req: 'verify', ph: 'P14', w: `${DUCTS} || A.insulWalls!=='none'`, after: ['com.blower'] },
    { id: 'cp.final-plb', name: 'Final plumbing inspection', kind: 'ahj', req: 'required', ph: 'P14', w: PLB, after: ['fin.plbtrim', 'com.plb'] },
    { id: 'cp.final-gas', name: 'Final gas inspection', kind: 'ahj', req: 'verify', ph: 'P14', w: GAS, after: ['com.gas'] },
    { id: 'cp.final-mech', name: 'Final mechanical inspection', kind: 'ahj', req: 'required', ph: 'P14', w: HVAC, after: ['com.hvac'] },
    { id: 'cp.final-elec', name: 'Final electrical inspection', kind: 'ahj', req: 'required', ph: 'P14', w: ELEC, after: ['fin.eletrim', 'com.ele'] },
    { id: 'cp.final-bldg', name: 'Final building inspection', kind: 'ahj', req: 'required', ph: 'P14', after: ['com.punchfix'] },
    { id: 'cp.co', name: 'Certificate of occupancy / completion issued', kind: 'ahj', req: 'verify', ph: 'P14', after: ['com.finals'] },
    { id: 'cp.client', name: 'Owner final walkthrough & acceptance', kind: 'internal', req: 'required', ph: 'P14', after: ['com.clean', 'com.punchfix'] },
  ];

  // ---------- Tasks ----------
  const TASKS = [];
  let PH = 'P01';
  const phase = (p) => { PH = p; };
  const T = (id, t, tr, o) => { TASKS.push(Object.assign({ id, t, tr, ph: PH, d: [], g: [], f: [] }, o || {})); };
  const ROUGH_GATES = ['cp.rough-plb', 'cp.rough-gas', 'cp.rough-mech', 'cp.rough-elec', 'cp.framing'];

  // ===== P01 Preconstruction & Permitting =====
  phase('P01');
  T('pre.walk', 'Existing-conditions walkthrough & baseline photos', 'Pinestone (GC)', { photo: true,
    q: ['Every room photographed (4 walls + ceiling + floor)', 'Exterior elevations, roof, foundation, crawl/attic photographed', 'Meter, panel, water heater, HVAC data plates photographed', 'Existing damage documented before work starts'],
    G: { w: 'Document the house as purchased/contracted before any work so pre-existing damage, layout, and utilities are on record.',
      t: ['P||Photograph data plates (panel, water heater, furnace/air handler, condenser) — model and age drive scope.', 'P||Note sagging floors, cracks, water stains, and roof leaks with location tags.', 'P||Check for active leaks and turn off water if the house is vacant and at risk of freezing.'],
      m: ['Skipping crawlspace and attic photos — the most common source of later disputes and change orders.', 'Not recording existing neighbor-side conditions (fences, driveways) before equipment arrives.'] } });
  T('pre.measure', 'Field measure & as-built floor plan', 'Pinestone (GC)', { d: ['pre.walk'], q: ['Ceiling heights recorded', 'Window/door sizes recorded', 'Joist direction and bearing walls marked'] });
  T('pre.scope', 'Finalize scope of work & selections schedule', 'Pinestone (GC)', { d: ['pre.measure'],
    q: ['Scope by trade written', 'Allowances and selection deadlines set', 'Long-lead items identified'] });
  T('pre.haz', 'Hazardous materials assessment (asbestos / lead / mold)', 'Hazmat / Abatement', { w: `${PRE78} || A.hazTesting!=='done-clear'`, f: ['cp.haz'],
    q: ['Asbestos survey of materials to be disturbed', 'Lead determination for pre-1978 home', 'Mold assessment if visible growth', 'Reports filed in project'],
    G: { w: 'Determine whether materials that will be disturbed contain asbestos or lead and whether abatement or lead-safe practices are required before demolition.',
      t: ['C|EPA 40 CFR Part 745 (RRP Rule)|Renovation of pre-1978 target housing that disturbs painted surfaces above de minimis thresholds must be performed by an EPA (or authorized-state) certified firm using lead-safe work practices, unless a certified inspector/risk assessor determines no lead-based paint is present.',
        'L||Asbestos survey and notification requirements for residential demolition/renovation depend on building type and program (TDEC / local air program). Confirm before demolition.',
        'P||Pinestone standard: test suspect materials (vermiculite, 9×9 floor tile, mastic, popcorn ceiling, duct wrap, plaster/joint compound) before full gut on any pre-1980s house.'],
      m: ['Starting demolition on a pre-1978 house without RRP certification or documentation.', 'Assuming popcorn ceiling or floor mastic is asbestos-free.'],
      i: 'Clearance documentation is recorded on the Hazardous materials clearance checkpoint, separate from this task.' } });
  T('pre.eng', 'Engage engineer: structural design / stamped letter', 'Engineer', { w: NEEDS_ENG, d: ['pre.measure'], f: ['cp.eng'],
    q: ['Beam size, species/grade, bearing and post design specified', 'Footing / point-load path to foundation specified', 'Connector schedule specified', 'Design submitted with permit'],
    G: { w: 'Obtain engineered design for bearing-wall removal, beams, ceiling vaulting, foundation repairs, or other structural changes.',
      t: ['C|IRC R301.1.3|Elements not conforming to the prescriptive provisions of the IRC must be designed per accepted engineering practice. Bearing-wall removal with a new beam typically falls here.',
        'P||Ask the engineer to specify: beam, posts, bearing length, squash blocks, foundation/footing at point loads, hangers/straps, and temporary shoring.',
        'L||Some AHJs require a stamped letter or sealed drawings at permit; others accept a site letter afterwards. Confirm.'],
      m: ['Sizing a beam off a span chart but ignoring the point load path down to the footing.', 'Ordering an LVL before the engineer confirms ply count and bearing.'] } });
  T('pre.drawings', 'Permit drawings / scope plans', 'Pinestone (GC)', { d: ['pre.scope'], q: ['Floor plan existing + proposed', 'Structural sheet / engineer letter attached', 'Window/door schedule incl. egress & safety glazing'] });
  T('pre.historic', 'Historic overlay / HOA design approval', 'Pinestone (GC)', { w: 'A.historic', d: ['pre.drawings'], f: ['cp.historic'],
    G: { w: 'Obtain design approval before exterior changes (windows, siding, roofing, porches).', t: ['L||Overlay and HOA rules are local. Approved materials and window types may be restricted. Get approval in writing.'] } });
  T('pre.permit', 'Apply for building permit & coordinate trade permits', 'Pinestone (GC)', { d: ['pre.drawings', 'pre.eng', 'pre.historic'], f: ['cp.permit', 'cp.tradepermits'],
    q: ['Correct jurisdiction / AHJ confirmed', 'Code edition confirmed and recorded in project', 'Trade contractors pulling their own permits confirmed'],
    G: { w: 'Apply for the building permit and make sure every licensed trade pulls the permits they are responsible for.',
      t: ['L|TN State Fire Marshal / local codes|Tennessee has a state residential program (2018 IRC adopted statewide) but many cities and counties enforce their own adopted edition. Confirm who the AHJ is for this address and record the code edition on the project.',
        'L||Electrical permits/inspections may be issued by the local codes department or by the State Fire Marshal program depending on location.'],
      m: ['Assuming the city adopted the same edition as the state.', 'Letting a sub start work before their trade permit is issued.'] } });
  T('pre.811', 'Tennessee 811 locate request', 'Pinestone (GC)', { w: EXCAVATION, d: ['pre.scope'], f: ['cp.811'],
    G: { w: 'Request utility locates before any digging: sewer/water lines, footings, drainage, fence posts, grading, or flatwork.',
      t: ['C|TN Underground Utility Damage Prevention Act (T.C.A. Title 65, Ch. 31)|Excavators must notify the one-call center before excavating and wait the required notice period (working days). Confirm the current notice period and ticket life with Tennessee 811.',
        'P||Private lines (owner sewer laterals, private electric to outbuildings, irrigation) are not marked by 811 — locate them separately.'],
      m: ['Letting the ticket expire before digging.', 'Assuming 811 marks the private sewer lateral.'] } });
  T('pre.utilities', 'Utility coordination: temp power, disconnects, accounts', 'Pinestone (GC)', { d: ['pre.scope'], q: ['Electric account / temp power', 'Water account active', 'Gas disconnect or meter plan', 'Service upgrade requested with utility (if any)'] });
  T('pre.subs', 'Schedule trades; verify licenses & insurance', 'Pinestone (GC)', { d: ['pre.scope'], q: ['License verified (TN Board for Licensing Contractors / local)', 'COI with general liability on file', 'Workers comp or exemption on file', 'Scope of work signed'] });
  T('pre.order', 'Order long-lead items (windows, doors, cabinets, tile, equipment)', 'Pinestone (GC)', { d: ['pre.scope'], q: ['Lead times recorded', 'Window/door sizes verified against rough openings or measured openings', 'Delivery dates scheduled to need'] });
  T('pre.selections', 'Owner selections approved & signed', 'Owner', { d: ['pre.scope'], q: ['Fixtures/finishes selected', 'Tile layouts approved', 'Cabinet drawings approved', 'Paint colors chosen'] });

  // ===== P02 Site Setup =====
  phase('P02');
  T('site.signs', 'Post permit card, jobsite sign, lockbox', 'Pinestone (GC)', { g: ['cp.permit'], d: ['pre.permit'] });
  T('site.dumpster', 'Dumpster & portable toilet', 'Pinestone (GC)', { d: ['pre.scope'], q: ['Placement does not block sidewalk / ROW without permit', 'Plywood under dumpster on driveway'] });
  T('site.shutoffs', 'Shut off / make safe utilities in demo areas', 'Electrical', { d: ['pre.utilities'],
    q: ['Circuits in demo areas de-energized and verified dead', 'Water capped at fixtures or shut at main', 'Gas shut off and capped at appliances being removed'],
    G: { w: 'Make demolition areas safe: verified-dead circuits, capped water and gas.',
      t: ['P||Verify dead with a tester — breaker labels on old panels are unreliable.', 'P||Leave one labeled temporary circuit or temp pole for tools/lights.', 'L||Gas shutoffs at the meter may require the utility; capping appliance stubs is licensed gas work.'],
      m: ['Cutting into a wall with a live circuit fed from an unlabeled breaker.', 'Leaving gas lines uncapped after appliance removal.'] } });
  T('site.protect', 'Protect retained items (floors, windows, trees, equipment)', 'Pinestone (GC)', { d: ['pre.walk'], q: ['Retained hardwood covered', 'Retained windows protected', 'Tree root zones protected', 'Neighbor property protected'] });
  T('site.erosion', 'Erosion & sediment control where soil is disturbed', 'Excavation / Site', { w: EXCAVATION, d: ['pre.811'],
    G: { w: 'Install silt fence / inlet protection where grading or excavation could move soil off site.', t: ['L||Local stormwater rules vary; small residential lots may still need silt fence or inlet protection.'] } });
  T('site.rrp', 'Lead-safe containment setup (RRP)', 'Hazmat / Abatement', { w: PRE78, d: ['pre.haz'],
    q: ['Certified renovator on site / assigned', 'Containment, signage and HEPA cleanup in place', 'Cleaning verification planned'],
    G: { w: 'Set up lead-safe work-area containment for pre-1978 work unless lead-free determination is documented.',
      t: ['C|EPA 40 CFR 745 Subpart E|Post warning signs, contain the work area, prohibit dry sanding/open-flame removal, and perform cleaning verification.', 'P||Keep RRP records (certificates, Renovate Right acknowledgment, cleaning verification) with the project.'] } });
  T('site.abate', 'Asbestos / lead abatement by licensed contractor', 'Hazmat / Abatement', { w: "A.hazTesting==='done-abatement'", d: ['pre.haz'], f: ['cp.haz'],
    G: { w: 'Licensed abatement of identified materials with clearance documentation before general demolition.', t: ['L||Licensing, notification, and clearance requirements depend on material and program (TDEC / local). Follow the survey and abatement contractor.'] } });
  T('site.safety', 'Jobsite safety setup', 'Pinestone (GC)', { d: ['pre.scope'], q: ['Fire extinguisher', 'First aid kit', 'Floor openings covered / guarded', 'Temporary handrails at stairs'] });

  // ===== P03 Demolition & Discovery =====
  phase('P03');
  T('demo.interior', 'Interior demolition to studs', 'Demolition', { g: ['cp.permit', 'cp.haz'], d: ['site.shutoffs', 'site.protect', 'site.dumpster', 'site.rrp', 'site.abate'],
    q: ['Bearing walls identified and NOT removed', 'Retained items protected', 'No debris in crawlspace / ducts'],
    G: { w: 'Remove interior finishes to studs and joists within scope without damaging structure or retained elements.',
      t: ['P||Mark all bearing walls with paint before demo crews start. Nothing structural comes out during demo — beam work is done by framers under the engineered design.', 'P||Remove nails/screws from studs and joists as you go (makes framing QC and drywall faster).'],
      m: ['Removing a bearing wall or cutting joists during demo.', 'Dropping debris into the crawlspace or open ducts.'] } });
  T('demo.plaster', 'Plaster & lath removal', 'Demolition', { w: 'A.plaster', d: ['demo.interior'], q: ['Dust control in place', 'Lath nails pulled', 'Floor loading watched (debris weight)'] });
  T('demo.mep', 'Remove abandoned wiring, piping & ductwork', 'Demolition', { d: ['demo.interior'], q: ['No abandoned live circuits', 'Abandoned gas lines capped at source by licensed trade', 'Old ducts removed from crawl/attic'] });
  T('demo.chimney', 'Chimney / fireplace removal or capping', 'Demolition', { w: "A.fireplace==='remove'", d: ['demo.interior'],
    G: { w: 'Remove chimney and fireplace safely and frame/flash the roof and floor openings.', t: ['P||Plan the roof patch and decking with the roofer; temporary dry-in the same day.', 'P||Verify whether the chimney carries other flues (furnace/water heater) before removal.'] } });
  T('demo.clean', 'Debris removal & broom clean', 'Demolition', { d: ['demo.interior', 'demo.mep'] });
  T('demo.photo', 'Post-demo photo documentation of all framing', 'Pinestone (GC)', { d: ['demo.clean'], photo: true, q: ['Every wall and ceiling bay photographed', 'Damage (rot, termites, fire, cut joists) photographed with location'] });
  T('demo.assess', 'Post-demo structural & moisture assessment', 'Pinestone (GC)', { d: ['demo.clean'],
    q: ['Rot / termite / fire damage located', 'Over-notched or cut framing found', 'Undersized headers / prior bad modifications found', 'Moisture readings of framing at wet areas'],
    G: { w: 'Walk the open framing to find hidden damage and prior poor work before new work covers it.',
      t: ['C|IRC R502.8 / R602.6|Existing notches and bored holes must be within the allowable limits for joists and studs; repair or reinforce those that are not.', 'P||Take moisture meter readings at sill plates, bath floors, and around old window openings. Wood at or above about 19% MC needs investigation before closing in.'],
      m: ['Covering damaged framing because it was not in the original scope.'] } });
  T('demo.termite', 'Termite / WDI inspection & treatment', 'Foundation / Crawlspace', { d: ['demo.assess'], w: `has(A.crawlMoisture,'termite') || ${CRAWL} || ${SLAB}`,
    G: { w: 'Treat active infestations and protect new wood.', t: ['C|IRC R318|Termite protection is required in areas subject to termite damage — Tennessee is in a high-hazard region. Confirm treatment method with the AHJ and licensed pest control.'] } });
  T('demo.changes', 'Update scope & change orders from discoveries', 'Pinestone (GC)', { d: ['demo.assess'] });

  // ===== P04 Foundation & Substructure =====
  phase('P04');
  T('fdn.footdig', 'Excavate footings / pier pads for new point loads', 'Foundation / Crawlspace', { w: FOOTINGS, d: ['pre.eng', 'demo.assess'], g: ['cp.permit'], f: ['cp.footing'],
    q: ['Size and depth per engineer / IRC R403', 'Bottom on undisturbed soil, no water', 'Reinforcement as specified'],
    G: { w: 'Dig footings for new posts/piers and point loads before the footing inspection.',
      t: ['C|IRC R403.1|Footings sized for loads and soil bearing; bottom below frost depth per local design criteria (Table R301.2(1)).', 'L||Frost depth is set by the AHJ (Middle Tennessee is commonly 12 in. — confirm).', 'P||Photograph each hole with a tape measure showing width and depth.'] } });
  T('fdn.footpour', 'Pour footings / set piers', 'Concrete', { w: FOOTINGS, d: ['fdn.footdig'], g: ['cp.footing'] });
  // Crawlspace
  T('crawl.clean', 'Crawlspace clean-out (debris, wood, organics)', 'Foundation / Crawlspace', { w: CRAWL, d: ['demo.clean'], q: ['All wood debris removed (termite food)', 'Old insulation and vapor barrier removed', 'Grade smoothed for liner'] });
  T('crawl.assess', 'Crawlspace moisture & framing assessment', 'Pinestone (GC)', { w: CRAWL, d: ['crawl.clean'], photo: true,
    q: ['Moisture content of sill, joists, girders recorded', 'Joist clearance to grade checked (18 in. / 12 in. girders)', 'Signs of water entry mapped', 'Dryer, bath fan, plumbing vents not terminating in crawl'],
    G: { w: 'Measure moisture, find rot and water entry, and confirm clearances before crawlspace work is designed.',
      t: ['C|IRC R317.1|Wood joists closer than 18 in. or girders closer than 12 in. to exposed ground in crawlspaces must be naturally durable or preservative-treated.', 'C|IRC R408.4|Crawlspace access opening minimum 18 in. × 24 in. (verify for your foundation type).', 'P||Record a relative-humidity reading and photo of the hygrometer — use it as a baseline for post-work comparison.'] } });
  T('crawl.access', 'Crawlspace access opening & door', 'Framing', { w: CRAWL, d: ['crawl.assess'] });
  T('crawl.sill', 'Replace rotted sill plate / rim joist', 'Framing', { w: `${CRAWL} && has(A.crawlFraming,'replace-sill')`, d: ['crawl.assess', 'demo.termite'],
    q: ['Treated sill on foundation', 'Anchor bolts / approved anchors at required spacing', 'Sill gasket / capillary break'],
    G: { w: 'Replace damaged sill and rim while temporarily supporting the structure.',
      t: ['C|IRC R317.1|Sills on concrete or masonry in contact with the ground must be preservative-treated or naturally durable.', 'C|IRC R403.1.6|Sill plates anchored to the foundation (bolt size, spacing within 12 in. of plate ends, etc.). Retrofit anchors must be approved / listed.', 'M||Use corrosion-resistant fasteners rated for the treated lumber used.'] } });
  T('crawl.girder', 'Girder repair / supplement', 'Framing', { w: `${CRAWL} && has(A.crawlFraming,'girder-repair')`, d: ['crawl.assess', 'fdn.footpour'] });
  T('crawl.sister', 'Sister / replace damaged floor joists', 'Framing', { w: `${CRAWL} && (has(A.crawlFraming,'sister-joists') || ${s('floor-joist-repair')})`, d: ['crawl.assess'],
    q: ['Sister bears on the same supports as the original (full length) unless engineered', 'Fastening schedule met', 'Joist crowns aligned'],
    G: { w: 'Reinforce or replace damaged and over-notched joists.', t: ['P||Full-length sisters bearing on the girder and sill are the Pinestone default. Partial sisters need an engineered detail.', 'C|IRC R502.8|Cuts, notches and holes in joists limited by size and location — fix prior violations rather than adding new ones.'] } });
  T('crawl.shim', 'Shim / adjust supports and level floors', 'Framing', { w: `${CRAWL} && has(A.crawlFraming,'shim-supports')`, d: ['crawl.girder', 'crawl.sister', 'fdn.footpour'],
    q: ['Steel shims / hardwood shims (no softwood, no stacked scraps)', 'Floors checked with laser before and after'] });
  T('crawl.subfloor', 'Subfloor replacement', 'Framing', { w: `(${CRAWL} || ${BSMT}) && A.subfloor!=='keep'`, d: ['crawl.sister', 'crawl.shim', 'demo.assess'],
    q: ['Panel span rating matches joist spacing', 'Glued and screwed / ring-shank nailed', 'Panel gaps per manufacturer (typ. 1/8 in.)', 'Edges supported / T&G engaged'],
    G: { w: 'Install new subfloor flat and squeak-free for tile and hard-surface flooring.',
      t: ['C|IRC R503|Floor sheathing span rating and fastening per IRC tables for the joist spacing.', 'M||Panel edge spacing and adhesive per panel manufacturer (APA guidelines).', 'S|TCNA / ANSI|Tile areas need adequate deflection performance (ceramic L/360, natural stone L/720 typical). Plan underlayment accordingly.'],
      m: ['Nailing with smooth-shank nails into old dried joists (squeaks).', 'Leaving subfloor uncovered in rain for days.'] } });
  T('crawl.vapor', 'Ground vapor retarder / crawlspace liner', 'Foundation / Crawlspace', { w: CRAWL, d: ['crawl.clean', 'crawl.drain', 'crawl.sill', 'crawl.sister', 'crawl.shim', 'fdn.footpour'], photo: true,
    q: ['Seams overlapped and taped', 'Liner run up piers/walls as designed', 'No tears; liner protected at access path'],
    G: { w: 'Cover exposed ground in the crawlspace with a continuous vapor retarder.',
      t: ['C|IRC R408.2|In vented crawlspaces, required ventilation area can be reduced when the ground surface is covered with a Class I vapor retarder.', 'C|IRC R408.3|Unvented crawlspaces require a continuous Class I vapor retarder with joints overlapped 6 in. and sealed or taped, edges extended at least 6 in. up the stem wall and attached and sealed.', 'P||Pinestone standard liner: reinforced 10–20 mil for encapsulation; minimum 6 mil poly for vented crawls.'],
      m: ['Installing liner before plumbing and framing repairs are done (gets torn).', 'Leaving liner unsealed at piers and walls in an unvented crawl.'] } });
  T('crawl.drain', 'Crawlspace interior drain & sump', 'Foundation / Crawlspace', { w: `${CRAWL} && ['interior-sump','both'].includes(A.crawlDrain)`, d: ['crawl.clean'],
    q: ['Drain pitched to sump', 'Sump lid sealed (unvented crawl)', 'Discharge carried well away from foundation', 'Check valve installed', 'Pump on dedicated / GFCI receptacle as required'] });
  T('crawl.encap', 'Seal crawlspace vents, rim, and penetrations', 'Foundation / Crawlspace', { w: ENCAP, d: ['crawl.vapor', 'plb.dwv', 'plb.supply', 'hvac.ducts', 'ele.rough'],
    G: { w: 'Air-seal the crawlspace from the outdoors once penetrations are done.', t: ['C|IRC R408.3|Unvented crawlspaces: no ventilation openings to the outside; perimeter walls insulated; and one of the listed conditioning methods required.', 'P||Do this after plumbing, electrical and HVAC have finished in the crawl — otherwise seals get broken.'] } });
  T('crawl.condition', 'Crawlspace conditioning / dehumidification', 'HVAC', { w: ENCAP, d: ['crawl.encap'],
    G: { w: 'Provide the conditioning method required for an unvented crawlspace.', t: ['C|IRC R408.3|Options include continuously operated mechanical exhaust, conditioned supply air (with return path), or a dehumidifier (added in later editions) at the rates stated in the code. Check which options your adopted edition allows.', 'M||Dehumidifier condensate routed to sump or drain; dedicated circuit per manufacturer.'] } });
  T('crawl.vents', 'Verify foundation vent area & clear vents', 'Foundation / Crawlspace', { w: `${CRAWL} && A.crawlStrategy==='vented'`, d: ['crawl.vapor'],
    G: { w: 'Confirm adequate, unobstructed cross ventilation in a vented crawlspace.', t: ['C|IRC R408.1 / R408.2|Ventilation openings sized at 1 sq ft per 150 sq ft of crawlspace area (reduced to 1 per 1,500 with a Class I ground vapor retarder), one within 3 ft of each corner, with corrosion-resistant screening.'] } });
  T('crawl.insul', 'Crawlspace insulation', 'Insulation', { w: `${CRAWL} && A.crawlInsul!=='none'`, d: ['crawl.encap', 'crawl.vapor', 'plb.test', 'ele.rough'], photo: true,
    G: { w: 'Insulate the floor (vented crawl) or the foundation walls/rim (unvented crawl).',
      t: ['C|IRC N1102.2.7 / N1102.2.11|Floor insulation installed in permanent contact with the underside of the subfloor; crawlspace wall insulation permitted in lieu of floor insulation when the crawl is unvented and meets R408.3.', 'C|IRC R316|Foam plastic in crawlspaces needs the required thermal/ignition barrier unless listed for exposed use.', 'L|IRC R318.4|Foam on foundation walls in termite-prone areas may require an inspection gap or other termite provisions. Confirm with AHJ.'],
      m: ['Floor batts sagging away from the subfloor — no support wires/straps.', 'Unrated foam left exposed in the crawl.'] } });
  T('crawl.final', 'Crawlspace final QC & photo record', 'Pinestone (GC)', { w: CRAWL, d: ['crawl.vapor', 'crawl.encap', 'crawl.condition', 'crawl.insul', 'crawl.vents', 'crawl.drain'], photo: true });
  // Slab
  T('slab.scan', 'Scan slab before cutting (post-tension / embedded lines)', 'Concrete', { w: `(${SLAB} || ${BSMT}) && (has(A.slabWork,'underslab-plumbing') || has(A.slabWork,'slab-patch'))`, d: ['demo.clean'],
    G: { w: 'Locate tendons, radiant tubing, conduits and pipes before saw-cutting.', t: ['P||Check for post-tension stamps or tendon ends at the slab edge. Never cut a post-tensioned slab without engineer direction.'] } });
  T('slab.cut', 'Saw-cut & trench for underslab plumbing', 'Concrete', { w: "has(A.slabWork,'underslab-plumbing')", d: ['slab.scan', 'plb.layout'], g: ['cp.permit'] });
  T('slab.plbrough', 'Underslab DWV / supply rough-in & test', 'Plumbing', { w: "has(A.slabWork,'underslab-plumbing')", d: ['slab.cut'], f: ['cp.underslab'], photo: true,
    q: ['Slope verified', 'Test on (water column or air)', 'Sleeved where passing through concrete', 'Photographed with tape before backfill'] });
  T('slab.backfill', 'Backfill, compact & vapor retarder in trenches', 'Concrete', { w: "has(A.slabWork,'underslab-plumbing')", d: ['slab.plbrough'], g: ['cp.underslab'] });
  T('slab.patch', 'Pour slab patches / infill', 'Concrete', { w: "has(A.slabWork,'underslab-plumbing') || has(A.slabWork,'slab-patch')", d: ['slab.backfill'],
    q: ['Dowels / reinforcement per detail', 'Vapor retarder lapped to existing', 'Finished flush with existing'] });
  T('slab.newprep', 'New slab: base, vapor retarder, reinforcement', 'Concrete', { w: "has(A.slabWork,'new-slab')", d: ['fdn.footpour', 'demo.clean'], f: ['cp.preslab'],
    G: { w: 'Prepare a new slab section ready for pre-pour inspection.', t: ['C|IRC R506.2.2 / R506.2.3|Base course and a 6-mil vapor retarder with lapped joints required under slabs on grade over habitable space (with listed exceptions).', 'P||Photograph vapor retarder laps and reinforcement before the pour.'] } });
  T('slab.newpour', 'Pour new slab section', 'Concrete', { w: "has(A.slabWork,'new-slab')", d: ['slab.newprep'], g: ['cp.preslab'] });
  T('slab.radon', 'Radon mitigation system rough-in', 'Foundation / Crawlspace', { w: 'A.radon', d: ['demo.clean'],
    G: { w: 'Install the radon vent pipe route and suction point (passive or active).', t: ['L|IRC Appendix F|Radon-resistant construction is in an IRC appendix that applies only where adopted locally. Many Middle Tennessee counties are EPA Radon Zone 1 — Pinestone recommends testing.', 'P||Label the vent pipe and leave a junction box in the attic for a future fan if passive.'] } });
  // Basement
  T('bsmt.cracks', 'Foundation wall crack repair', 'Foundation / Crawlspace', { w: `${BSMT} && A.bsmtCracks`, d: ['demo.clean'] });
  T('bsmt.intdrain', 'Interior perimeter drain & sump', 'Foundation / Crawlspace', { w: `${BSMT} && ['interior-drain','both'].includes(A.bsmtWater)`, d: ['bsmt.cracks', 'slab.scan'] });
  T('bsmt.extwp', 'Exterior excavation, waterproofing & footing drain', 'Foundation / Crawlspace', { w: `${BSMT} && ['exterior-membrane','both'].includes(A.bsmtWater)`, g: ['cp.811'], d: ['pre.811'],
    G: { w: 'Excavate, waterproof and drain the foundation from the exterior.', t: ['C|IRC R406.2 / R405|Waterproofing required for foundation walls enclosing habitable space where high water table conditions exist; foundation drains required around foundations retaining earth and enclosing habitable space (with exceptions).', 'M||Membrane, protection board and drain mat per manufacturer.'] } });
  T('bsmt.sump', 'Sump pump, check valve & discharge', 'Plumbing', { w: `${BSMT} && A.bsmtWater!=='none'`, d: ['bsmt.intdrain', 'bsmt.extwp'] });
  T('bsmt.egress', 'Basement egress window & window well', 'Foundation / Crawlspace', { w: `${BSMT} && A.bsmtFinish && A.bsmtEgress`, d: ['pre.eng'], g: ['cp.permit'],
    G: { w: 'Cut and install a code-compliant emergency escape opening for the finished basement.', t: ['C|IRC R310.1 / R310.2|Emergency escape and rescue opening: minimum net clear opening (5.7 sq ft; 5.0 sq ft at grade floor), minimum 24 in. height and 20 in. width, and maximum 44 in. sill height above the floor.', 'C|IRC R310.2.3|Window wells: minimum 9 sq ft with 36 in. projection/width; ladder or steps when well is deeper than 44 in.', 'P||Have the engineer confirm the header for the cut foundation opening.'] } });
  T('bsmt.walls', 'Basement wall insulation & framing', 'Framing', { w: `${BSMT} && A.bsmtFinish`, d: ['bsmt.intdrain', 'bsmt.cracks'],
    G: { w: 'Frame and insulate basement walls without trapping moisture.', t: ['P||Use foam against concrete (or a capillary break) and treated bottom plates. Avoid interior poly vapor barriers over concrete walls.', 'C|IRC R316|Foam plastics need a thermal barrier (typically 1/2 in. gypsum) on the interior.'] } });

  // ===== P05 Structural Framing =====
  phase('P05');
  T('frm.shore', 'Temporary shoring for bearing-wall removal', 'Framing', { w: BEARING, d: ['pre.eng', 'demo.interior'], g: ['cp.eng', 'cp.permit'],
    G: { w: 'Support floor/roof loads on both sides of the bearing wall before it is removed.', t: ['P||Shore walls on both sides, bearing on solid floor framing or posts down to grade where loads are large. Check what is under the shores.', 'P||Do not release shoring until beam, posts, connectors and point-load blocking are complete.'] } });
  T('frm.beam', 'Install beam, posts & bearing per engineered design', 'Framing', { w: BEARING, d: ['frm.shore', 'fdn.footpour'], g: ['cp.eng'], photo: true,
    q: ['Beam size / plies / grade match the stamped design', 'Plies fastened per design', 'Bearing length at each end', 'Posts plumb and continuous to foundation'],
    G: { w: 'Install the engineered beam and support posts with complete bearing and connections.',
      t: ['C|IRC R301.1.3|Engineered elements must be installed as designed. Deviations require engineer approval.', 'M||LVL / PSL fastening of multiple plies per manufacturer or engineer schedule.', 'P||Photograph beam stamp/label, ply nailing, bearing, and posts before covering.'],
      m: ['Posts landing on subfloor with no blocking or footing below.', 'Missing ply fastening on multi-ply LVL.'] } });
  T('frm.loadpath', 'Verify continuous load path & squash blocks', 'Framing', { w: BEARING, d: ['frm.beam'], photo: true,
    G: { w: 'Confirm every new point load is carried through floor framing to a footing.', t: ['P||Install solid blocking / squash blocks under every post through each floor level down to the girder or footing.'] } });
  T('frm.openings', 'Frame new / enlarged exterior openings (headers, jacks, kings)', 'Framing', { w: OPENINGS, d: ['pre.eng', 'demo.interior', 'pre.order'], g: ['cp.permit'],
    q: ['Header size per R602.7 tables or engineer', 'Jack/king stud count per table', 'Rough openings match window/door order', 'Wall bracing compensated where panels removed'],
    G: { w: 'Cut and frame new or resized exterior openings.',
      t: ['C|IRC R602.7|Header sizes and jack/king stud counts per the header span tables based on loads above.', 'C|IRC R602.10|Removing sheathing/wall length can reduce required wall bracing. Confirm bracing still meets the prescriptive requirements or have it engineered.', 'M||Rough opening size per the window/door manufacturer (typically unit size + 1/2 in.).'] } });
  T('frm.joists', 'Floor framing repair / reinforcement', 'Framing', { w: s('floor-joist-repair'), d: ['demo.assess'] });
  T('frm.roof', 'Roof framing repair / reinforcement', 'Framing', { w: s('roof-framing-repair'), d: ['demo.assess'],
    G: { w: 'Repair or reinforce rafters, ridge and rafter ties.', t: ['C|IRC R802|Rafter ties / ceiling joists resist rafter thrust. Do not remove ceiling joists or collar/rafter ties without an engineered alternative (ridge beam).'] } });
  T('frm.vault', 'Vaulted / raised ceiling framing per design', 'Framing', { w: s('ceiling-raise'), d: ['pre.eng', 'demo.interior'], g: ['cp.eng'] });
  T('frm.stairs', 'Stair framing', 'Framing', { w: s('stair-modify'), d: ['demo.interior'],
    q: ['Riser max 7-3/4 in., tread min 10 in.', 'Largest-smallest riser/tread within 3/8 in.', 'Headroom 6 ft 8 in.', 'Width 36 in. min'],
    G: { w: 'Frame new or altered stairs to code geometry.', t: ['C|IRC R311.7|Stair width, headroom (6 ft 8 in.), riser height (7-3/4 in. max), tread depth (10 in. min), and uniformity (3/8 in. tolerance).', 'P||Lay out with finished floor thickness top and bottom — the most common cause of non-uniform first/last risers.'] } });
  T('frm.walls', 'New interior partition walls / layout changes', 'Framing', { w: 'A.layout', d: ['demo.interior'] });
  T('frm.attic', 'Attic access opening', 'Framing', { w: 'A.attic', d: ['demo.interior'],
    G: { w: 'Provide a compliant attic access.', t: ['C|IRC R807.1|Attic access minimum 22 in. × 30 in. rough opening with 30 in. headroom above, located in a hallway or readily accessible location.', 'C|IRC N1102.2.4|Access hatches/doors to be weatherstripped and insulated to the level of the surrounding surface (energy code).'] } });
  T('frm.straighten', 'Straighten / plane walls & ceilings for flat drywall', 'Framing', { d: ['demo.interior', 'frm.walls', 'frm.beam'],
    q: ['Kitchen cabinet walls within 1/8 in. in 8 ft', 'Tile walls flat for large-format tile', 'Ceiling joists planed / furred where crowned'],
    G: { w: 'Fix crowned, bowed and twisted framing before rough-ins so drywall, tile and cabinets come out flat.', t: ['P||Use a long straightedge / string line on every kitchen and tile wall. Sister or plane — do not rely on drywall mud.', 'S|TCNA|Large-format tile substrates require tighter flatness (commonly 1/8 in. in 10 ft).'] } });
  T('b.frame', 'Bath framing: tub/shower walls, curbs, niches, recesses', 'Framing', { each: 'bath', d: ['demo.interior', 'frm.straighten'],
    q: ['Shower walls plumb & flat', 'Niche framed to tile module, not on exterior wall', 'Curb / curbless recess per waterproofing system', 'Bench support framed'],
    G: { w: 'Frame the bathroom for the selected tub/shower and waterproofing system.',
      t: ['M||Curbless showers: recess and slope per the system manufacturer. Recessing joists requires an engineered solution (do not just cut joists down).', 'P||Frame niches to the tile layout — set the niche top/bottom on a full or half tile line. Avoid niches on exterior walls (insulation and condensation).'],
      m: ['Cutting floor joists to recess a curbless shower without engineering.', 'Niche sized without looking at the tile module.'] } });
  T('frm.connectors', 'Framing connectors & hardware (hangers, straps, hold-downs)', 'Framing', { w: `${STRUCT_ANY} || A.layout`, d: ['frm.beam', 'frm.openings', 'frm.joists', 'frm.roof', 'frm.vault', 'frm.walls'], photo: true,
    q: ['Every hanger nail hole filled with specified nails', 'No drywall screws in connectors', 'Correct connector for lumber size', 'Corrosion-rated with treated lumber'],
    G: { w: 'Install all specified hangers, straps and hold-downs with the correct fasteners.', t: ['M||Install per the connector manufacturer (e.g. Simpson Strong-Tie) catalog: specified nail size/quantity — never drywall or deck screws.', 'C|IRC R317.3|Fasteners and connectors in contact with preservative-treated wood must be of the required corrosion-resistance.', 'P||Photograph connectors at the beam and posts with the nail pattern visible.'], m: ['Half-nailed hangers.', 'Using a top-flange hanger where face-mount was specified.'] } });
  T('frm.qc', 'Framing QC walk', 'Pinestone (GC)', { d: ['frm.straighten', 'frm.connectors', 'frm.stairs', 'frm.attic', 'b.frame@*'], f: ['cp.framing'],
    q: ['Plumb, level, square', 'Crowns aligned', 'Notches/bores within limits', 'Top plates tied where cut', 'Window/door ROs verified'] });
  T('frm.engobs', 'Engineer structural observation visit', 'Engineer', { w: NEEDS_ENG, d: ['frm.beam', 'frm.loadpath', 'frm.connectors'], f: ['cp.engobs'] });

  // ===== P06 Dry-In =====
  phase('P06');
  T('roof.tearoff', 'Roof tear-off & deck inspection', 'Roofing', { w: REROOF, d: ['pre.order', 'frm.roof'], g: ['cp.permit'], q: ['Weather window confirmed', 'Dry-in same day', 'Rotten / delaminated decking marked'] });
  T('roof.deck', 'Replace damaged decking & re-nail', 'Roofing', { w: `${REROOF} && A.roofDeck!=='none'`, d: ['roof.tearoff'], q: ['Panel edges on rafters, H-clips if required by span', 'Gaps per manufacturer', 'Nailing per IRC Table R602.3(1)'] });
  T('roof.ice', 'Underlayment, ice barrier & drip edge', 'Roofing', { w: REROOF, d: ['roof.deck', 'roof.tearoff'], f: ['cp.roof'],
    G: { w: 'Install underlayment, eave/valley protection and drip edge per code and the shingle/metal manufacturer.', t: ['C|IRC R905.2.7 / R905.2.8.5|Underlayment and drip edge required for asphalt shingles (drip edge at eaves and gables).', 'L|IRC R905.1.2|Ice barrier at eaves is required only where there has been a history of ice forming along the eaves — determined by the AHJ.', 'M||Underlayment type, laps and fastening per roofing manufacturer to keep the warranty.'] } });
  T('roof.flash', 'Roof flashing: step, counter, kickout, valleys, pipe boots', 'Roofing', { w: REROOF, d: ['roof.ice'], photo: true,
    q: ['Kickout flashing at every roof-to-wall termination', 'Step flashing (not continuous) at sidewalls', 'New pipe boots / flashings', 'Chimney counterflashing let into masonry'],
    G: { w: 'Flash all roof transitions so water is directed onto the roof surface, not into walls.', t: ['C|IRC R903.2|Flashing required at wall and roof intersections, changes of slope/direction, and around roof openings; kickout flashing where the eave of a roof intersects a wall.', 'M||Shingle manufacturer step-flashing and valley details.'], m: ['Missing kickout flashing — causes hidden wall rot below roof/wall intersections.', 'Reusing old cracked pipe boots.'] } });
  T('roof.vent', 'Attic ventilation: ridge & soffit balance', 'Roofing', { w: "A.roofVent==='ridge-soffit'", d: ['roof.ice'],
    G: { w: 'Provide balanced intake and exhaust attic ventilation.', t: ['C|IRC R806.1 / R806.2|Net free ventilating area 1/150 of the vented space, or 1/300 when conditions in R806.2 are met (e.g. upper/lower vent distribution).', 'C|IRC R806.3|Maintain at least 1 in. of airspace between insulation and roof sheathing at the vent — install baffles.', 'P||Do not mix ridge vents with gable or powered vents (short-circuits the ridge).'] } });
  T('roof.cover', 'Install roof covering', 'Roofing', { w: REROOF, d: ['roof.flash', 'roof.vent'] });
  T('roof.repair', 'Roof repairs', 'Roofing', { w: "A.roof==='repair'", d: ['pre.order'] });
  T('wrb.install', 'Water-resistive barrier (housewrap) & tapes', 'Siding / Exterior', { w: `${SIDING_FULL} || (${WIN} && A.windowType==='new-construction')`, d: ['frm.openings', 'demo.interior'], photo: true,
    q: ['Shingle-lapped (upper over lower)', 'Seams taped per manufacturer', 'Integrated with window/door flashing', 'Tears repaired'],
    G: { w: 'Install a continuous weather-resistive barrier integrated with all flashings.', t: ['C|IRC R703.2|A water-resistive barrier is required over sheathing behind exterior veneer, lapped and continuous to the top of walls and terminated at penetrations and building appendages.', 'M||Housewrap laps, fasteners, and tape per manufacturer.'] } });
  T('win.install', 'Install windows with flashing sequence', 'Windows & Doors', { w: WIN, d: ['pre.order', 'frm.openings', 'wrb.install'], photo: true,
    q: ['Sill pan / sloped sill flashing installed', 'Jamb flashing then head flashing (shingle order)', 'Shimmed at manufacturer locations, operable & square', 'Low-expansion foam, not standard foam', 'Egress & safety glazing verified'],
    G: { w: 'Install windows plumb, level and square with a flashing sequence that drains water to the exterior.',
      t: ['C|IRC R703.4|Flashing required at window and door openings, installed to prevent water entry into the wall cavity and per the fenestration manufacturer instructions (or pan flashing / flashing details where no instructions are provided).', 'M||Installation instructions of the specific window: sill pan, shim points, fastening, sealant. Deviations can void the warranty.', 'C|IRC R308.4|Safety glazing in hazardous locations (e.g. within 24 in. of doors, large panes near floors, at tubs/showers, at stairs).'],
      m: ['Taping the sill flange (traps water). Leave the bottom of the sill flashing unsealed to drain or follow the manufacturer.', 'Over-driving fasteners and racking the frame.'] } });
  T('win.verify', 'Verify egress, safety glazing & fall protection', 'Pinestone (GC)', { w: WIN, d: ['win.install'],
    G: { w: 'Check every sleeping room window and hazardous location after installation.', t: ['C|IRC R310|Sleeping rooms require an emergency escape opening meeting net clear opening and sill height limits. Replacement windows have an exception (R310.2.5) for existing openings — confirm with the AHJ.', 'C|IRC R312.2|Window fall protection where the opening is less than 24 in. above the floor and more than 72 in. above grade.', 'C|IRC R308.4 / R308.1|Safety glazing labeled in all hazardous locations.'] } });
  T('door.ext', 'Install exterior doors (sill pan, flashing, threshold)', 'Windows & Doors', { w: "A.extDoors!=='none'", d: ['pre.order', 'frm.openings', 'wrb.install'], photo: true,
    q: ['Sill pan with back dam', 'Threshold supported fully', 'Reveal even, latches without force', 'Deadbolt / strike screws into framing'] });
  T('dryin.check', 'Dry-in verification (hose test windows / doors)', 'Pinestone (GC)', { w: `${WIN} || A.extDoors!=='none' || ${REROOF}`, d: ['win.install', 'door.ext', 'roof.cover', 'roof.repair', 'wrb.install'],
    G: { w: 'Prove the openings and roof are watertight before insulation and drywall.', t: ['P||Spray test a sample of windows and every door from the bottom up while someone watches the interior side. Check after the first heavy rain.'] } });

  // ===== P07 Rough Plumbing & Gas =====
  phase('P07');
  T('plb.layout', 'Plumbing layout walk with trade', 'Pinestone (GC)', { w: PLB, d: ['pre.selections', 'demo.assess'],
    q: ['Fixture spec sheets on site', 'Fixture centerlines marked', 'Valve heights/locations marked', 'Water heater & manifold location set'],
    G: { w: 'Walk every fixture location with the plumber before rough-in using the actual fixture specifications.', t: ['P||Bring spec sheets for every fixture: rough-in heights for vanity drains and supplies, valve depth range, toilet rough distance, freestanding tub drain location.', 'C|IRC R307.1|Fixture clearances: water closet centerline 15 in. min to a side wall/obstruction, 21 in. clear in front; 24 in. clear in front of shower openings.'] } });
  T('plb.service', 'New water service line (meter to house)', 'Plumbing', { w: `${PLB} && A.waterService`, d: ['pre.811'], g: ['cp.811', 'cp.permit'],
    G: { w: 'Replace the service line with proper depth, sleeving and a main shutoff.', t: ['L||Pipe depth, tracer wire, and meter-side work responsibility are set by the water utility and AHJ.', 'C|IRC P2903.3 / P2903.9|Pressure must not exceed 80 psi static at fixtures (install a PRV if higher); main shutoff valve required.'] } });
  T('plb.sewer', 'Sewer lateral camera & replacement', 'Plumbing', { w: `${PLB} && A.sewerLateral!=='none'`, d: ['demo.clean'], g: ["cp.811"],
    G: { w: 'Camera the lateral to the main; replace or repair as needed.', t: ['P||Save the camera video file and footage locations. Scope again after replacement.', 'L||Connections in the right-of-way often require a separate utility permit / inspection.'] } });
  T('plb.dwv', 'DWV rough-in (drains, vents, cleanouts)', 'Plumbing', { w: DWV, d: ['plb.layout', 'frm.straighten', 'b.frame@*', 'slab.patch', 'crawl.sister'], photo: true,
    q: ['Slope 1/4 in./ft (≤2-1/2 in.) or 1/8 in./ft (≥3 in.)', 'Cleanouts accessible', 'Vents rise before horizontal', 'Long-sweep fittings where required', 'Support spacing per material'],
    G: { w: 'Install drain, waste and vent piping with correct slope, venting and accessible cleanouts.',
      t: ['C|IRC P3005.3|Horizontal drainage slope: 1/4 in. per foot for pipe 2-1/2 in. and smaller; 1/8 in. per foot for 3 in. and larger.', 'C|IRC P3005.2|Cleanouts required (e.g. at base of stacks, changes of direction over 45°, every 100 ft) and must be accessible.', 'L|IRC P3114|Air admittance valves are allowed by the IRC but local acceptance varies; confirm before relying on them (islands).'],
      m: ['Flat drain runs to make a joist cut easier.', 'Burying cleanouts behind drywall or tile with no access panel.'] } });
  T('plb.supply', 'Water supply rough-in (manifold, home runs, shutoffs)', 'Plumbing', { w: PLB, d: ['plb.layout', 'b.frame@*'], photo: true,
    q: ['PEX supported per manufacturer, no kinks', 'Stub-outs secured (drop-ear / brackets)', 'Hot on left', 'Manifold accessible and labeled'] });
  T('plb.nailplates', 'Nail plates at all pipes within 1-1/4 in. of framing face', 'Plumbing', { w: PLB, d: ['plb.dwv', 'plb.supply'], photo: true,
    G: { w: 'Protect piping from drywall and trim fasteners.', t: ['C|IRC P2603.2.1|Pipes passing through framing within 1-1/4 in. of the edge (or notched) must be protected by steel shield plates at least 1/16 in. thick (0.0575 in.) extending 2 in. beyond the pipe (verify dimensions in your edition).', 'P||Plate both faces at every bore near the edge, including top/bottom plates at stacks.'], m: ['Missing plates at vanity walls and toilet supplies — classic drywall-screw leak.'] } });
  T('plb.boring', 'Verify bored / notched framing within limits', 'Framing', { d: ['plb.dwv', 'plb.supply', 'hvac.ducts', 'ele.rough'], photo: true,
    q: ['Stud holes/notches within limits', 'Top plates cut >50% tied with metal strap', 'Joist holes not in top/bottom 2 in. or near bearing', 'Over-cut members reinforced'],
    G: { w: 'Walk all framing after trades bore and notch; repair violations before inspection.', t: ['C|IRC R602.6|Bearing-wall studs: notches ≤25% of width, bored holes ≤40% (≤60% when doubled), holes ≥5/8 in. from the edge.', 'C|IRC R602.6.1|Top plates cut more than 50% need a 16-ga. steel tie (1-1/2 in. wide) with fasteners each side.', 'C|IRC R502.8|Joist notches/holes limited in size and location (no notches in middle third; holes ≤1/3 depth, ≥2 in. from edges).'] } });
  T('b.tub', 'Set tub & verify support / leveling', 'Plumbing', { each: 'bath', w: "['tile-tub','tub-surround'].includes(B.shower)", d: ['b.frame', 'plb.dwv'],
    q: ['Tub level, bed/support per manufacturer', 'Overflow & drain tested', 'Ledger / flange supported', 'Air barrier behind tub on exterior walls'],
    G: { w: 'Set the tub before walls so it can be supported, leveled and integrated with waterproofing.', t: ['M||Mortar bed / support per tub manufacturer (common for acrylic/steel tubs).', 'C|IRC N1102.4.1.1 (Table)|Exterior walls behind tubs/showers need insulation and an air barrier separating them from the tub.'] } });
  T('b.valve', 'Shower / tub valve rough: depth, height, pressure-balance', 'Plumbing', { each: 'bath', w: "B.shower!=='none'", d: ['b.frame', 'plb.supply'], photo: true,
    q: ['Valve depth within manufacturer range for total wall thickness (backer + membrane + tile)', 'Plaster guard / test cap on', 'Valve centered & level', 'Shower head & handheld heights per layout', 'Blocking for valve & heads'],
    G: { w: 'Set valve bodies at the right depth for the final tile wall and confirm anti-scald protection.',
      t: ['M||Rough-in depth range is a manufacturer specification printed on the valve body / plaster guard. Calculate finished wall = backer + waterproofing + mortar + tile.', 'C|IRC P2708.4|Shower and tub-shower control valves must be pressure-balance, thermostatic-mixing or combination type with a high-limit stop set at max 120°F.', 'P||Photograph each valve with a tape from floor and from a corner. Record depth from stud face in the task notes.'],
      m: ['Valve set too deep for thin foam-board systems — trim kit will not reach.', 'Forgetting blocking for handheld slide bars and body sprays.'] } });
  T('b.drain', 'Shower drain set for waterproofing system', 'Plumbing', { each: 'bath', w: TILE_SHOWER + " && B.shower!=='tile-tub'", d: ['b.frame', 'plb.dwv'],
    G: { w: 'Install the drain body compatible with the chosen waterproofing system.', t: ['M||Bonding-flange drains for sheet/foam systems; clamping drain with weep holes for traditional mortar-bed liners. Match the system manufacturer — mixed systems void warranties.', 'C|IRC P2709|Shower receptors / liners, drain connection and slope requirements.'] } });
  T('b.rough', 'Bath fixture rough: toilet, vanity, tub filler', 'Plumbing', { each: 'bath', d: ['plb.dwv', 'plb.supply', 'b.frame'],
    q: ['Toilet flange at rough distance from FINISHED wall', 'Flange height accounts for finished floor', 'Vanity drain/supplies at spec heights', 'Freestanding tub drain location verified'] });
  T('plb.kitchen', 'Kitchen plumbing rough (sink, DW, ice maker, pot filler)', 'Plumbing', { w: `${PLB} && ${KIT}`, d: ['plb.dwv', 'plb.supply', 'pre.selections'],
    q: ['Sink drain height fits sink depth / disposal', 'Ice maker box located', 'Island venting method approved', 'Pot filler blocking & stub height'] });
  T('plb.laundry', 'Laundry rough (washer box, standpipe, pan)', 'Plumbing', { w: `${PLB} && A.laundry!=='none'`, d: ['plb.dwv', 'plb.supply'],
    G: { w: 'Rough the washer box and drain.', t: ['C|IRC P2706.2|Standpipe height 18–42 in. above the trap weir (verify in your edition).', 'P||Pinestone standard: washer pan with drain or leak sensor shutoff when the laundry is over finished space.'] } });
  T('plb.wh', 'Water heater rough: location, T&P discharge, pan, expansion', 'Plumbing', { w: `${PLB} && A.waterHeater!=='none'`, d: ['plb.supply'],
    G: { w: 'Install the water heater with code-required safety discharge and protection.', t: ['C|IRC P2804.6.1|T&P relief discharge piping full size, by gravity, terminating within 6 in. of the floor or to an approved location, no valves or threaded ends.', 'C|IRC P2801.6|Pan required where leakage would damage the building; drained to an approved location.', 'C|IRC P2903.4|Thermal expansion control where a backflow preventer / check valve / PRV creates a closed system.', 'M||Clearances, venting (gas) and condensate (heat pump, tankless) per manufacturer.'] } });
  T('plb.hosebib', 'Frost-free hose bibs with backflow protection', 'Plumbing', { w: `${PLB} && A.hoseBibs`, d: ['plb.supply'],
    G: { w: 'Install hose connections with vacuum breakers and slope for freeze protection.', t: ['C|IRC P2902.4.3|Hose connections require a hose-connection vacuum breaker (or integral backflow protection).', 'M||Frost-free sillcocks installed with downward slope to drain.'] } });
  T('plb.test', 'DWV & water supply pressure tests', 'Plumbing', { w: PLB, d: ['plb.dwv', 'plb.supply', 'b.rough@*', 'b.valve@*', 'b.drain@*', 'plb.kitchen', 'plb.laundry'], f: ['cp.rough-plb'], photo: true,
    q: ['DWV test on (water head or air) and holding', 'Supply under pressure and holding', 'Gauge photographed with time stamp'],
    G: { w: 'Test the rough piping before inspection and before it is concealed.', t: ['C|IRC P2503.5.1|Rough DWV test: water test (10 ft head) or air test (5 psi) held for 15 minutes.', 'C|IRC P2503.7|Water supply system test: working pressure water test or air test per the code / material listing (PEX manufacturers limit air testing).', 'M||PEX manufacturer test procedure and pressures.'] } });
  T('gas.service', 'Gas service / meter coordination with utility', 'Utility', { w: "A.gas==='new-service'", d: ['pre.811'], g: ['cp.811'] });
  T('gas.pipe', 'Gas piping rough: sizing, bonding, drips, shutoffs', 'Gas', { w: GAS, d: ['plb.layout', 'frm.straighten'], photo: true,
    q: ['Pipe sized for total connected load & length', 'Appliance shutoff in same room within 6 ft', 'Sediment traps at appliances', 'CSST bonded per manufacturer/code', 'Striker plates on CSST'],
    G: { w: 'Install gas piping sized for the connected load with required valves, sediment traps and bonding.',
      t: ['C|IRC G2413|Piping sized for the maximum demand and length using the code sizing tables.', 'C|IRC G2420.5|Accessible shutoff valve for each appliance, in the same room and within 6 ft (with listed exceptions).', 'C|IRC G2419.4|Sediment trap at appliance inlets (except listed exceptions such as ranges/dryers in some editions).', 'C|IRC G2411.1.1|CSST systems bonded to the electrical grounding electrode system (not less than 6 AWG copper) unless listed arc-resistant jacketed CSST is used per manufacturer.', 'M||CSST striker plates and bonding per the CSST manufacturer.'] } });
  T('gas.test', 'Gas pressure test & tag', 'Gas', { w: GAS, d: ['gas.pipe'], f: ['cp.rough-gas', 'cp.gasrelease'], photo: true,
    G: { w: 'Pressure test the gas system for inspection.', t: ['C|IRC G2417|Test pressure not less than 1.5 times working pressure but not less than 3 psig, held at least 10 minutes with no drop (verify in your edition).', 'L||Some AHJs and utilities require specific gauges/durations. Confirm before scheduling.'] } });

  // ===== P08 Rough HVAC =====
  phase('P08');
  T('hvac.design', 'Load calculation & duct design (Manual J / S / D)', 'HVAC', { w: "A.hvac==='full'", d: ['pre.scope'],
    G: { w: 'Size equipment and ducts from a room-by-room load calculation.', t: ['C|IRC M1401.3|Heating and cooling equipment sized per ACCA Manual S based on loads calculated with ACCA Manual J.', 'C|IRC M1601.1|Duct systems designed per ACCA Manual D (or equivalent).', 'P||Ask for the report. Undersized returns are the most common comfort/noise complaint.'] } });
  T('hvac.equip', 'Equipment locations: air handler, condenser, line set, condensate', 'HVAC', { w: HVAC, d: ['hvac.design', 'demo.assess'],
    q: ['Service clearances per manufacturer', 'Attic air handler: platform, light, receptacle, walkway', 'Condenser location clear of windows/dryer vent'] ,
    G: { w: 'Set locations that meet access and clearance requirements.', t: ['C|IRC M1305.1.3|Appliances in attics: passageway and service space, lighting and receptacle near the appliance (verify sizes in your edition).', 'M||Clearances and orientation per equipment manufacturer.'] } });
  T('hvac.ducts', 'Duct rough-in (trunks, branches, returns)', 'HVAC', { w: DUCTS, d: ['hvac.design', 'hvac.equip', 'frm.straighten', 'crawl.sister'], photo: true,
    q: ['Flex pulled tight, supported, no kinks or compressions', 'Return path from every bedroom (return or transfer)', 'Boot locations clear of joists/cabinets', 'No ducts in exterior walls'] });
  T('hvac.seal', 'Seal duct joints, seams & plenums (mastic)', 'HVAC', { w: DUCTS, d: ['hvac.ducts'], photo: true,
    G: { w: 'Seal every joint and seam so the system can pass a leakage test.', t: ['C|IRC M1601.4.1|Joints, seams and connections sealed with listed tapes, mastics or gaskets — not standard cloth duct tape.', 'C|IRC N1103.3.1|Supply and return ducts in attics insulated to R-8 (≥3 in. diameter) and R-6 elsewhere outside the building envelope (2018 IECC values; confirm edition).', 'P||Mastic every takeoff, boot collar, and plenum seam; photograph before insulation wrap.'], m: ['Sealing only the trunk and skipping boot-to-drywall and takeoffs.'] } });
  T('hvac.lineset', 'Line set, condensate & penetrations', 'HVAC', { w: HVAC, d: ['hvac.equip'],
    q: ['Suction line insulated', 'Penetrations sealed and flashed', 'Condensate trapped (where required) and sloped'] });
  T('hvac.condensate', 'Condensate drain & secondary protection', 'HVAC', { w: HVAC, d: ['hvac.equip'],
    G: { w: 'Install primary condensate drain and secondary protection where overflow could damage the building.', t: ['C|IRC M1411.3 / M1411.3.1|Condensate disposed to an approved location; auxiliary drain pan or overflow shutoff device where damage could occur (e.g. attic air handlers).', 'P||Pinestone standard: float switch on every attic or above-ceiling unit even with a secondary pan.'] } });
  T('hvac.minisplit', 'Ductless heads: locations, line routes, blocking', 'HVAC', { w: "A.hvac!=='none' && A.hvacType==='ductless'", d: ['hvac.equip'] });
  T('b.fan', 'Bath exhaust fan: ducted to exterior termination', 'HVAC', { each: 'bath', d: ['b.frame'], photo: true,
    q: ['Duct terminates OUTDOORS (roof/wall cap with damper), not into attic or soffit', 'Smooth / rigid duct, short and sloped to exterior', 'Duct insulated in unconditioned space', 'Fan rated airflow meets required rate'],
    G: { w: 'Install the bath fan so moisture actually leaves the house.',
      t: ['C|IRC M1501.1|Exhaust air discharged to the outdoors — not into attics, crawlspaces, or soffit vents where it can re-enter.', 'C|IRC R303.3 / Ch. 15 local exhaust table|Bathrooms with a tub/shower need local exhaust (commonly 50 cfm intermittent or 20 cfm continuous) where a window is not used. Confirm in your edition.', 'P||Pinestone standard: fan in every bath with a shower regardless of windows; humidity-sensing or timer control.'],
      m: ['Pointing the duct at a soffit vent (moisture comes back in).', 'Long flex runs with sags that collect condensate.'] } });
  T('hvac.hood', 'Range hood duct & make-up air', 'HVAC', { w: `${KIT} && A.rangeHood==='ducted'`, d: ['pre.selections', 'frm.straighten'],
    G: { w: 'Duct the range hood to the exterior at the manufacturer duct size.', t: ['C|IRC M1503|Range hood ducts: smooth metal, air-tight, with a backdraft damper, terminating outdoors.', 'C|IRC M1503.6 (2018)|Hoods exceeding 400 cfm require make-up air (section number varies by edition).', 'M||Duct size, maximum length and transition rules per hood manufacturer.'] } });
  T('hvac.dryer', 'Dryer exhaust duct', 'HVAC', { w: 'A.dryerVent', d: ['frm.straighten'],
    G: { w: 'Install a compliant dryer exhaust.', t: ['C|IRC M1502|Dryer exhaust: independent, terminates outdoors with a backdraft damper and no screen; 4 in. smooth metal duct; length limit (35 ft less fitting allowances) unless manufacturer allows longer; joints not fastened with screws protruding into the duct.', 'P||Install a dryer vent box in the wall to avoid crushed transition ducts.'] } });
  T('hvac.freshair', 'Whole-house mechanical ventilation', 'HVAC', { w: "A.hvac!=='none' && A.freshAir", d: ['hvac.ducts', 'hvac.equip'],
    G: { w: 'Provide balanced or supply/exhaust ventilation.', t: ['C|IRC M1505 (2018) / R303.4|Whole-house mechanical ventilation is required when the dwelling unit is tested below a specified air leakage rate (e.g. less than 5 ACH50). Confirm applicability for alterations.'] } });
  T('hvac.combustion', 'Combustion air & venting for gas appliances', 'HVAC', { w: `${GAS} && (has(A.gasAppliances,'furnace') || has(A.gasAppliances,'water-heater') || has(A.gasAppliances,'fireplace'))`, d: ['gas.pipe', 'hvac.equip'],
    G: { w: 'Verify combustion air and venting for each gas appliance.', t: ['C|IRC G2407|Combustion, ventilation and dilution air per appliance input and room volume.', 'C|IRC G2425–G2427|Vent connector sizing, clearances, termination; orphaned water heaters on oversized chimneys need re-evaluation.', 'M||Direct-vent and high-efficiency venting per manufacturer.'] } });
  T('hvac.terminations', 'Exterior terminations flashed & clear of openings', 'Pinestone (GC)', { d: ['b.fan@*', 'hvac.hood', 'hvac.dryer', 'hvac.lineset', 'hvac.combustion'],
    q: ['Each termination flashed (mounting block / roof jack)', 'Dampers move freely', 'Clearances from windows/doors per code/manufacturer'] });

  // ===== P09 Rough Electrical =====
  phase('P09');
  T('ele.walk', 'Electrical walk: devices, fixtures, switching, cabinet layout', 'Pinestone (GC)', { w: ELEC, d: ['pre.selections', 'frm.straighten'],
    q: ['Every receptacle/switch marked on studs', 'Fixture boxes centered on rooms/cabinets', 'Under-cabinet & vanity light locations', 'Dimmer/smart switch box depth'],
    G: { w: 'Mark every box with the electrician using cabinet drawings and fixture specs.', t: ['P||Mark vanity lights to the mirror size, pendants to the island centerline, and switch locations on the latch side of doors.', 'C|NEC 210.52|Receptacle spacing rules for dwelling walls and countertops (e.g. no point along a wall more than 6 ft from a receptacle; countertop spacing).'] } });
  T('ele.service', 'Service / panel upgrade: meter base, mast, grounding & bonding', 'Electrical', { w: `${ELEC} && A.service!=='none'`, d: ['pre.utilities'], f: ['cp.service'], photo: true,
    q: ['Working space in front of panel', 'Grounding electrode system complete', 'Water and gas piping bonded', 'Utility clearances for mast/drop'],
    G: { w: 'Upgrade or replace the service with a complete grounding and bonding system.',
      t: ['C|NEC 110.26|Working space in front of the panel (generally 36 in. deep, 30 in. wide, 6.5 ft high).', 'C|NEC 250.50 / 250.53|Grounding electrode system; a single rod must meet resistance limits or be supplemented (commonly two rods 6 ft apart).', 'C|NEC 250.104|Bonding of metal water piping and other metal piping (gas) likely to become energized.', 'L||Meter base, mast height and disconnect location requirements come from the serving utility (e.g. NES, MTEMC). Coordinate the cut-over date.'] } });
  T('ele.rough', 'Branch circuit rough-in (boxes, wiring, home runs)', 'Electrical', { w: ELEC, d: ['ele.walk', 'plb.dwv', 'hvac.ducts'], photo: true,
    q: ['Box depth set for finish (tile, wainscot)', 'Cable stapled within 12 in. of boxes', 'Cables not in contact with ducts/flue', 'Box fill within limits'],
    G: { w: 'Install boxes and wiring after plumbing and ducts so electrical routes around larger trades.', t: ['C|NEC 314.20|Boxes set back no more than 1/4 in. in noncombustible surfaces; flush with combustible surfaces — plan for tile and backsplash thickness.', 'C|NEC 314.16|Box fill calculations.', 'C|NEC 334.30|NM cable supported within 12 in. of boxes and at intervals not exceeding 4-1/2 ft.'] } });
  T('ele.kitchen', 'Kitchen circuits & countertop receptacles', 'Electrical', { w: `${ELEC} && ${KIT}`, d: ['ele.walk', 'pre.selections'],
    q: ['Two+ 20A small-appliance circuits', 'Dedicated DW, disposal, microwave, refrigerator (as specified)', 'Range circuit matches appliance', 'Island receptacle per adopted NEC edition'],
    G: { w: 'Provide required kitchen circuits and countertop receptacles.', t: ['C|NEC 210.11(C)(1)|At least two 20A small-appliance branch circuits for kitchen countertop receptacles.', 'C|NEC 210.52(C)|Countertop receptacle spacing (no point more than 24 in. from a receptacle along the wall line); island/peninsula rules changed in the 2023 NEC — follow the edition adopted by the AHJ.', 'C|NEC 210.8(A)|GFCI protection for kitchen receptacles (scope expands with newer editions).', 'M||Appliance circuit sizes from the appliance installation guides.'] } });
  T('b.elec', 'Bath circuits: 20A receptacle, GFCI, fan, lights', 'Electrical', { each: 'bath', w: ELEC, d: ['ele.walk', 'b.frame'],
    q: ['20A bath receptacle circuit', 'GFCI protection', 'Receptacle within 36 in. of each basin', 'Fan circuit & switching / humidity control', 'Light fixtures rated for damp/wet location in shower zone'],
    G: { w: 'Wire each bathroom to code with GFCI protection and fixtures rated for the location.', t: ['C|NEC 210.11(C)(3)|At least one 20A circuit for bathroom receptacle outlets.', 'C|NEC 210.52(D)|Receptacle within 3 ft of the outside edge of each basin.', 'C|NEC 410.10(D)|Luminaires in tub/shower zones must be listed for damp (or wet, if subject to shower spray) locations.'] } });
  T('ele.laundry', 'Laundry circuit(s)', 'Electrical', { w: `${ELEC} && A.laundry!=='none'`, d: ['ele.walk'], G: { w: 'Laundry receptacle circuit and dryer circuit.', t: ['C|NEC 210.11(C)(2)|At least one 20A circuit for laundry receptacle outlets.', 'M||Dryer circuit per dryer nameplate (electric) or 120V receptacle (gas dryer).'] } });
  T('ele.afci', 'AFCI / GFCI protection plan per adopted NEC', 'Electrical', { w: ELEC, d: ['ele.walk'],
    G: { w: 'Confirm which circuits require AFCI and GFCI protection under the locally adopted NEC.', t: ['C|NEC 210.12|AFCI protection for most dwelling 120V 15/20A branch circuits; extensions/modifications of existing circuits also trigger AFCI requirements.', 'C|NEC 210.8(A)|GFCI locations (bathrooms, kitchens, laundry, garages, outdoors, crawlspaces, basements, etc.) — the list expands by edition.', 'L||Tennessee adoption of the NEC (and any amendments) varies by AHJ / state electrical program. Confirm the edition.'] } });
  T('ele.smoke', 'Smoke & CO alarm locations (hardwired, interconnected)', 'Electrical', { d: ['ele.walk'],
    q: ['In each sleeping room', 'Outside each sleeping area', 'Each story incl. basement', 'CO alarm outside sleeping areas when fuel-burning appliance or attached garage', 'Interconnected'],
    G: { w: 'Install smoke and CO alarms where required for alterations requiring a permit.', t: ['C|IRC R314.3 / R314.4 / R314.2.2|Smoke alarms in each sleeping room, outside each sleeping area, and on each story; interconnected and hardwired with battery backup in new work. Alterations requiring a permit generally trigger compliance (with stated exceptions).', 'C|IRC R315|CO alarms required where fuel-fired appliances or an attached garage exist, outside each sleeping area and in bedrooms with fuel-burning appliances.', 'M||Clearances from ceiling fans, HVAC supplies and bathrooms per alarm manufacturer and NFPA 72 guidance.'] } });
  T('ele.nailplates', 'Cable protection: nail plates & bored-hole setbacks', 'Electrical', { w: ELEC, d: ['ele.rough'], photo: true,
    G: { w: 'Protect cable from drywall and trim fasteners.', t: ['C|NEC 300.4(A)|Bored holes in framing at least 1-1/4 in. from the nearest edge, or protected by a steel plate at least 1/16 in. thick.'] } });
  T('ele.recessed', 'Recessed lights: IC-rated, airtight, layout', 'Electrical', { w: `${ELEC} && A.recessed`, d: ['ele.walk'],
    G: { w: 'Install recessed lights that maintain the ceiling air barrier and insulation.', t: ['C|IRC N1102.4.5|Recessed luminaires in the building thermal envelope must be IC-rated, labeled for ≤2.0 cfm leakage, and sealed to the drywall with a gasket or caulk.', 'P||Lay out on a grid from cabinets / walls, not just room center. Check joist conflicts before cutting.'] } });
  T('ele.lv', 'Low-voltage: data, security, doorbell, AV, Wi-Fi', 'Low-Voltage', { w: `${ELEC} && A.lowVoltage`, d: ['ele.walk'], q: ['Structured media panel location', 'Cat6 home runs labeled', 'Low-voltage separated from power per code'] });
  T('ele.ext', 'Exterior receptacles & lighting', 'Electrical', { w: ELEC, d: ['ele.walk', 'wrb.install'],
    G: { w: 'Install outdoor receptacles and lighting with proper protection and flashing.', t: ['C|NEC 210.52(E)|Outdoor receptacle at front and back of a one-family dwelling, accessible from grade.', 'C|NEC 406.9(B)|Wet location receptacles with extra-duty in-use covers.', 'P||Use flashed mounting blocks on all siding penetrations.'] } });
  T('ele.ev', 'EV charger circuit', 'Electrical', { w: `${ELEC} && A.evCharger`, d: ['ele.service'] });
  T('ele.gen', 'Generator interlock / transfer equipment', 'Electrical', { w: `${ELEC} && A.generator`, d: ['ele.service'] });
  T('b.heatmat', 'Heated floor: circuit, thermostat, sensor conduit', 'Electrical', { each: 'bath', w: 'B.heatedFloor && ' + "A.electrical!=='none'", d: ['b.elec'],
    G: { w: 'Prepare the heated-floor circuit and sensor path.', t: ['M||Circuit size, GFCI/thermostat requirements and sensor installation per mat manufacturer.', 'P||Run a spare sensor in conduit — replacing a failed sensor under tile is otherwise impossible.'] } });
  T('ele.bond', 'Bond metal water / gas piping', 'Electrical', { w: `${ELEC} && (${GAS} || A.supplyMat==='copper')`, d: ['gas.pipe', 'plb.supply'] });
  T('ele.photo', 'Photograph all wiring with tape references', 'Pinestone (GC)', { w: ELEC, d: ['ele.rough', 'ele.nailplates'], photo: true });

  // ===== P10 Pre-Drywall =====
  phase('P10');
  T('pd.fireblock', 'Fireblocking at plates, soffits, chases, stairs & penetrations', 'Framing', { d: ['plb.test', 'ele.rough', 'hvac.ducts', 'gas.pipe', 'b.fan@*'], f: ['cp.framing'], photo: true,
    q: ['Plate penetrations (pipes, wires, flues) sealed with approved material', 'Soffits / drop ceilings blocked at walls', 'Stair stringers blocked top & bottom', 'Vertical chases blocked at each floor & ceiling', 'Concealed spaces >10 ft horizontally blocked'],
    G: { w: 'Cut off concealed draft openings so fire cannot travel through walls, floors and chases.',
      t: ['C|IRC R302.11|Fireblocking required in concealed spaces: vertically at ceiling and floor levels, horizontally at 10 ft intervals, at interconnections between vertical and horizontal spaces (soffits, drop ceilings, coves), at stair stringers top and bottom, and at openings around vents, pipes, ducts, cables and wires at ceiling and floor level.', 'C|IRC R302.11.1|Acceptable materials include 2 in. nominal lumber, two thicknesses of 1 in. lumber, 23/32 in. wood structural panel, 1/2 in. gypsum board, batts of mineral wool or glass fiber securely retained; penetrations at plates sealed with an approved material (e.g. fire-rated sealant/foam listed for fireblocking).', 'P||Use red/orange fireblock foam or rated sealant at every top-plate penetration and photograph each wall.'],
      m: ['Standard low-expansion foam at top plates (usually not an approved fireblock).', 'Missing blocking where a soffit meets a wall.', 'Tub and shower drain penetrations left open to the crawlspace.'] } });
  T('pd.draftstop', 'Draftstopping in floor / ceiling assemblies', 'Framing', { w: "A.stories!=='1' || (A.foundation==='basement' && A.bsmtFinish)", d: ['pd.fireblock'], f: ['cp.framing'],
    G: { w: 'Subdivide large concealed floor/ceiling spaces where draftstopping applies.', t: ['C|IRC R302.12|When there is usable space both above and below the concealed space of a floor/ceiling assembly, draftstops are required so that the concealed area does not exceed 1,000 sq ft, divided into approximately equal areas. Typically relevant for open-web floor trusses or suspended/furred ceilings; confirm applicability.', 'C|IRC R302.12.1|Draftstopping materials: not less than 1/2 in. gypsum board, 3/8 in. wood structural panels, or equivalent, adequately supported.'] } });
  T('pd.garage', 'Garage / dwelling separation & door', 'Drywall', { w: "A.garage==='attached'", d: ['pd.fireblock'],
    G: { w: 'Provide the required separation between the attached garage and the house.', t: ['C|IRC R302.6 (Table)|Minimum 1/2 in. gypsum board on the garage side; 5/8 in. Type X on garage ceilings under habitable rooms; supporting structure protected.', 'C|IRC R302.5.1|Door between garage and residence: solid wood or solid/honeycomb-core steel not less than 1-3/8 in., or 20-minute fire-rated. Self-closing requirements may be amended locally.', 'C|IRC R302.5.2|Ducts penetrating the separation: minimum 26-gauge steel (or other approved) with no openings into the garage.'] } });
  T('pd.backing', 'Backing & blocking (cabinets, TV, rails, fans, hardware)', 'Framing', { d: ['ele.rough', 'plb.supply', 'frm.straighten'], photo: true,
    q: ['Grab-bar / future grab-bar blocking at toilets and showers', 'Towel bars, TP holders, robe hooks', 'Shower door & curtain rod', 'Wall-hung vanity / floating shelves', 'TV mounts', 'Handrail brackets', 'Ceiling fans (fan-rated boxes)', 'Door stops / heavy mirrors'],
    G: { w: 'Install solid wood backing for everything that will hang on a wall before drywall.', t: ['P||Pinestone standard: 2x blocking at 33–36 in. and 60–66 in. in every shower and beside every toilet for current or future grab bars.', 'C|NEC 314.27(C)|Ceiling fan outlet boxes must be listed for fan support.', 'P||Photograph each blocking location with tape measurements from floor and corner — it is invisible after drywall.'],
      m: ['Relying on toggle bolts for towel bars and shower doors.', 'No backing for wall-hung vanity or upper cabinets on metal/old framing.'] } });
  T('b.blocking', 'Bath blocking verification (glass, grab bars, niche, accessories)', 'Framing', { each: 'bath', d: ['pd.backing', 'b.frame'], photo: true });
  T('pd.kitblock', 'Kitchen backing (upper cabinets, hood, island anchoring)', 'Framing', { w: KIT, d: ['pd.backing'], photo: true });
  T('pd.airseal', 'Air sealing: plates, penetrations, rims, windows, tubs', 'Insulation', { d: ['pd.fireblock', 'ele.rough', 'plb.test', 'dryin.check', 'wrb.install'], f: ['cp.insul'], photo: true,
    q: ['Top/bottom plates sealed to drywall plane', 'Wire & pipe penetrations sealed', 'Rim joists sealed', 'Window/door shims gaps foamed (low expansion)', 'Air barrier behind tubs/showers on exterior walls', 'Attic hatch gasketed'],
    G: { w: 'Create a continuous air barrier before insulation and drywall.', t: ['C|IRC N1102.4.1.1 (Table)|Air barrier and insulation installation criteria: top plates, penetrations, rim joists, windows/doors, shower/tub on exterior walls, recessed lights, etc.', 'L||Whether full energy-code air sealing/testing applies to an alteration depends on scope and AHJ. Pinestone seals regardless.'] } });
  T('pd.insulwalls', 'Wall insulation', 'Insulation', { w: "A.insulWalls!=='none'", d: ['pd.airseal'], g: ROUGH_GATES, f: ['cp.insul'], photo: true,
    q: ['Full-depth, no gaps / voids / compression (Grade I)', 'Split around wiring and pipes, not compressed behind', 'Behind tubs, boxes and in corners/headers', 'R-value labels / certificate posted'],
    G: { w: 'Install wall insulation to full depth and in contact with the air barrier.', t: ['C|IRC N1102.1.2 (Table)|Climate Zone 4 (most of Middle TN) wood-frame wall R-value: R-20 or R-13+5 continuous (2018). Climate zone and edition must be confirmed.', 'C|IRC N1102.4.1.1|Insulation fills cavities completely, in contact with the air barrier.', 'P||Pinestone QC: inspect every bay before drywall; reject compressed batts behind boxes.'] } });
  T('pd.sprayfoam', 'Spray foam (walls / roofline) & ignition/thermal barrier', 'Insulation', { w: "['open-cell','closed-cell'].includes(A.insulWalls) || A.insulAttic==='spray-roofline'", d: ['pd.airseal'], g: ROUGH_GATES, f: ['cp.insul'], photo: true,
    G: { w: 'Install spray foam at specified thickness with required protection.', t: ['C|IRC R316.4|Foam plastic separated from the interior by an approved thermal barrier (e.g. 1/2 in. gypsum board) unless listed otherwise.', 'C|IRC R316.5.3|Attics / crawlspaces entered only for service: ignition barrier or listed foam for exposed use.', 'C|IRC R806.5|Unvented attic assemblies: insulation requirements, air-impermeable insulation at the deck (or alternatives).', 'M||Thickness per pass, temperature, curing, and re-occupancy times per foam manufacturer.'] } });
  T('pd.measure', 'Record dimensions of concealed items (valves, blocking, boxes)', 'Pinestone (GC)', { d: ['pd.backing', 'b.valve@*'] });
  T('pd.photo', 'Pre-drywall photo & video record of every wall & ceiling', 'Pinestone (GC)', { d: ['pd.fireblock', 'pd.airseal', 'pd.backing', 'pd.insulwalls', 'pd.sprayfoam'], f: ['cp.predry'], photo: true,
    q: ['Each wall photographed with room label & tape measure', 'Ceilings photographed', 'Video walkthrough saved', 'Photos attached to tasks / backup file'],
    G: { w: 'Create the permanent record of everything inside the walls.', t: ['P||Photograph each wall straight-on with a tape across it at 48 in. and a room/wall label (e.g. "Kitchen — North"). Add the key shots to the related tasks in this app.'] } });
  T('pd.qc', 'Pinestone pre-drywall walkthrough', 'Pinestone (GC)', { d: ['frm.qc', 'plb.test', 'plb.nailplates', 'ele.nailplates', 'hvac.seal', 'pd.fireblock', 'pd.draftstop', 'pd.backing', 'b.blocking@*', 'pd.kitblock', 'pd.airseal', 'plb.boring', 'b.valve@*', 'hvac.terminations', 'dryin.check', 'win.verify', 'frm.loadpath', 'frm.engobs', 'b.tub@*', 'plb.wh', 'plb.hosebib', 'gas.test', 'hvac.condensate', 'hvac.lineset', 'hvac.freshair', 'ele.kitchen', 'b.elec@*', 'ele.laundry', 'ele.afci', 'ele.smoke', 'ele.recessed', 'ele.lv', 'ele.ext', 'b.heatmat@*', 'ele.bond', 'ele.photo', 'pd.measure', 'pd.garage'], f: ['cp.predry'],
    q: ['All rough inspections passed (see Inspections)', 'Nail plates everywhere within 1-1/4 in.', 'Fireblocking & penetrations sealed', 'Blocking for every accessory', 'Valve depths verified against tile wall thickness', 'Box depths match finish', 'Ducts sealed, boots secured', 'Bath fans terminate outdoors', 'Smoke/CO locations roughed', 'Insulation complete, no gaps', 'Photo record complete'],
    G: { w: 'Final internal check before anything is concealed.', t: ['P||Walk with the pre-drywall PDF checklist. Every "no" becomes a blocked task with a note. Sign off the Pinestone pre-drywall checkpoint only when every item is complete.'] } });

  // ===== P11 Drywall & Waterproofing =====
  phase('P11');
  T('dw.deliver', 'Drywall delivery: types & quantities verified', 'Drywall', { d: ['pre.order'], q: ['Moisture/mold-resistant board for baths & laundry', 'Type X where required (garage)', 'Board stocked so it does not overload framing'] });
  T('dw.hang', 'Hang drywall (ceilings first)', 'Drywall', { d: ['dw.deliver', 'pd.qc', 'pd.photo', 'pd.insulwalls', 'pd.sprayfoam', 'pd.garage'], g: [...ROUGH_GATES, 'cp.insul', 'cp.predry'],
    q: ['Fastener spacing per schedule', 'No butt joints at window/door corners', 'Board 1/2 in. off floor', 'Boxes not buried / cut oversize'],
    G: { w: 'Hang drywall only after all rough inspections and the Pinestone pre-drywall sign-off.', t: ['C|IRC R702.3.5 (Table)|Gypsum board fastener type and spacing based on framing spacing and orientation.', 'C|IRC R702.4.2|Paper-faced gypsum board is not permitted as a tile backer in tub/shower areas — use cement, fiber-cement, glass-mat gypsum, or a listed system board.', 'P||Hang ceilings first, walls tight to the ceiling; use mold-resistant board in baths outside the wet zone.'] } });
  T('dw.attic', 'Attic insulation (blown / batts) with baffles & markers', 'Insulation', { w: "['blown','batts'].includes(A.insulAttic)", d: ['dw.hang', 'roof.vent'],
    q: ['Baffles at every vented rafter bay', 'Depth markers installed', 'Hatch insulated and weatherstripped', 'Certificate posted'],
    G: { w: 'Insulate the attic floor after ceilings are hung.', t: ['C|IRC N1102.1.2 (Table)|Climate Zone 4 ceiling insulation R-49 (2018). Confirm climate zone and edition.', 'C|IRC R806.3|Baffles to maintain 1 in. airspace at vents.', 'C|IRC N1101.10.1|Blown insulation depth markers (at least one per 300 sq ft) facing the attic access, and insulation certificate.'] } });
  T('dw.finish', 'Tape, mud & sand to specified finish level', 'Drywall', { d: ['dw.hang'],
    G: { w: 'Finish joints to the specified level.', t: ['S|GA-214|Level 4 for most flat-painted walls; Level 5 (skim coat) where critical lighting or gloss paint is used.', 'P||Inspect under raking light before primer.'] } });
  T('dw.qc', 'Drywall QC with raking light', 'Pinestone (GC)', { d: ['dw.finish'], q: ['No ridging / crowned joints', 'Corners straight', 'Cabinet & tile walls flat', 'Outlet cut-outs tight'] });
  T('b.backer', 'Tile backer / board system install', 'Tile', { each: 'bath', w: TILE_SHOWER, d: ['dw.hang', 'b.valve', 'b.tub', 'b.drain', 'b.blocking'],
    q: ['Approved backer in wet area (no paper-faced gypsum)', 'Fastener type & spacing per board manufacturer', 'Flat & plumb', 'Backer overlaps tub flange per manufacturer'],
    G: { w: 'Install wet-area substrate per the waterproofing system.', t: ['C|IRC R702.4.2|Backer for wall tile in tub/shower areas: fiber-cement, fiber-mat reinforced cementitious backer, glass-mat gypsum, or fiber-reinforced gypsum backer (per the referenced standards).', 'M||Fastener and seam treatment per the board / system manufacturer.'] } });
  T('b.pan', 'Shower pan: pre-slope & liner / membrane', 'Tile', { each: 'bath', w: TILE_SHOWER + " && B.shower!=='tile-tub'", d: ['b.backer', 'b.drain'], photo: true,
    q: ['Pre-slope 1/4 in. per foot to drain', 'Liner / membrane up walls & over curb per system', 'No fasteners through liner below curb height', 'Curbless transition per system'],
    G: { w: 'Build the shower floor so water drains positively to the drain and the membrane is continuous.', t: ['C|IRC P2709|Shower receptor / liner requirements: slope toward the drain (commonly 1/4 in. per foot), liner turned up on all sides above the threshold, and no penetrations of the liner below the threshold except the drain (check exact heights in your edition).', 'M||Bonded systems (sheet/foam/liquid) use the manufacturer pan details; traditional liners need a pre-slope under the liner and weep holes kept open.'] } });
  T('b.membrane', 'Waterproof walls, niche, bench, penetrations', 'Tile', { each: 'bath', w: TILE_SHOWER, d: ['b.backer', 'b.pan'], photo: true,
    q: ['Seams & corners banded', 'Valve & shower-head penetrations sealed with gaskets/collars', 'Niche & bench fully wrapped', 'Liquid membrane thickness checked (wet-film gauge)', 'Membrane extends above shower head / to ceiling per Pinestone standard'],
    G: { w: 'Waterproof the full wet area to the system manufacturer requirements.', t: ['M||Sheet: overlap and thinset type per manufacturer. Liquid: number of coats, mil thickness, cure time per manufacturer (use a wet-film gauge).', 'S|ANSI A118.10|Load-bearing, bonded waterproof membranes for thin-set tile.', 'P||Pinestone standard: waterproof walls to at least 6 in. above the shower head; full height in steam or curbless showers.'],
      m: ['Mixing components from different waterproofing manufacturers.', 'Skipping the valve/shower-arm seals.'] } });
  T('b.flood', 'Flood test 24 hrs & photo record', 'Tile', { each: 'bath', w: TILE_SHOWER, d: ['b.membrane'], f: ['cp.flood'], photo: true,
    q: ['Drain plugged, water to just below curb / threshold', 'Water line marked and photographed at start & end', 'No drop / no leaks below (check from crawl / ceiling below)'],
    G: { w: 'Prove the shower floor waterproofing before tile.', t: ['S|ANSI A118.10 / TCNA|Flood test of membranes typically 24 hours minimum after cure.', 'M||Follow the membrane manufacturer flood-test instructions and cure times.', 'L||Some AHJs inspect shower pans (traditional liners). Confirm.'] } });
  T('b.floorprep', 'Bath floor tile substrate & uncoupling membrane', 'Tile', { each: 'bath', w: 'B.floorTile', d: ['dw.hang'],
    G: { w: 'Prepare a flat, stiff floor for tile.', t: ['S|TCNA Handbook|Deflection L/360 for ceramic/porcelain and L/720 for natural stone; flatness for large-format tile.', 'M||Uncoupling membrane and heated mat sequence per manufacturer.'] } });
  T('b.heatfloor', 'Install heated floor mat & ohm tests', 'Tile', { each: 'bath', w: 'B.heatedFloor', d: ['b.floorprep', 'b.heatmat'], photo: true,
    q: ['Ohm & insulation-resistance test before, during and after tile (recorded)', 'Sensor between wires per manufacturer', 'Wire not under toilet/vanity footprint'],
    G: { w: 'Install the heating mat and record tests that protect the warranty.', t: ['M||Record resistance values from the mat label and test results at each stage on the warranty card — required by most manufacturers.'] } });

  // ===== P12 Exterior Envelope & Site =====
  phase('P12');
  T('ext.siding', 'Install siding per manufacturer', 'Siding / Exterior', { w: SIDING_FULL, d: ['wrb.install', 'win.install', 'door.ext', 'roof.flash'],
    q: ['Clearance to grade, roof, decks per manufacturer', 'Butt joints flashed (fiber cement)', 'Penetrations on mounting blocks', 'Fastening per manufacturer (blind/face, nail type)'],
    G: { w: 'Install cladding with manufacturer clearances and joint/penetration details.', t: ['M||Fiber cement: clearances (commonly 6 in. to grade, 1–2 in. to roofs/decks), joint flashing, fastener type and paint timing per manufacturer.', 'M||Vinyl: nail in center of slots, not tight; allow expansion gaps.', 'C|IRC R703.3 / R703.10–R703.11|Siding attachment and installation per IRC tables and manufacturer.'] } });
  T('ext.sidingrepair', 'Siding / masonry repairs', 'Siding / Exterior', { w: "A.siding==='repair' || A.siding==='masonry-repair'", d: ['demo.assess'] });
  T('ext.trim', 'Exterior trim, soffit & fascia', 'Siding / Exterior', { w: `A.siding!=='none' || ${REROOF}`, d: ['ext.siding', 'roof.cover'] });
  T('ext.penetrations', 'Flash & seal all exterior penetrations', 'Siding / Exterior', { d: ['ext.siding', 'ele.ext', 'hvac.terminations', 'plb.hosebib'], q: ['Every penetration on a flashed block or boot', 'Sealant compatible with cladding'] });
  T('ext.paint', 'Exterior paint & caulk', 'Painting', { w: 'A.extPaint', d: ['ext.siding', 'ext.trim', 'ext.sidingrepair', 'site.rrp'] });
  T('ext.gutters', 'Gutters & downspouts (discharge away from foundation)', 'Roofing', { w: 'A.gutters', d: ['roof.cover', 'ext.trim', 'roof.repair'],
    G: { w: 'Collect roof water and discharge it away from the foundation.', t: ['P||Pinestone standard: downspouts discharge at least 4–6 ft from the foundation (extensions or underground to daylight).', 'L|IRC R801.3|Roof drainage to a storm sewer or at least 5 ft from foundations is required only in expansive or collapsible soil areas — determined locally.'] } });
  T('ext.grade', 'Grade soil away from foundation', 'Excavation / Site', { w: `A.grading || (${CRAWL} && ['exterior-grading','both'].includes(A.crawlDrain))`, d: ['ext.siding', 'ext.gutters'], g: ['cp.811'],
    G: { w: 'Slope the finished grade away from the house.', t: ['C|IRC R401.3|Finish grade falls a minimum of 6 in. within the first 10 ft (or swales/drains where lot lines prohibit).', 'P||Keep soil and mulch below siding clearance and weep screeds.'] } });
  T('ext.porchfoot', 'Deck / porch footings (dig, inspect, pour)', 'Concrete', { w: "A.porch==='new-deck' || A.porch==='new-porch'", d: ['pre.811'], g: ['cp.811', 'cp.permit'], f: ['cp.deckfooting'], photo: true,
    G: { w: 'Excavate and pour deck/porch footings after inspection.', t: ['C|IRC R507.3|Deck footings sized per table, bottom below frost depth set by the AHJ.', 'P||Do not pour until the footing inspection is recorded as passed (pour is a separate step after the checkpoint).'] } });
  T('ext.porch', 'Porch / deck work (ledger flashing, connections, guards)', 'Framing', { w: "A.porch!=='none'", d: ['ext.porchfoot', 'wrb.install'], g: ['cp.deckfooting'],
    q: ['Ledger flashed and attached per R507.9', 'Lateral connections as required', 'Guards 36 in. min; 4 in. sphere rule', 'Stairs: rise/run, handrail, lighting'],
    G: { w: 'Build or repair the porch/deck with a proper ledger, connections and guards.', t: ['C|IRC R507|Deck footings, posts, beams, joists, ledger attachment (R507.9) and flashing.', 'C|IRC R312.1|Guards required where walking surface is more than 30 in. above grade; 36 in. minimum height; openings reject a 4 in. sphere.'] } });
  T('ext.flatwork', 'Driveway / walkways / flatwork', 'Concrete', { w: 'A.flatwork', d: ['ext.grade', 'pre.811'], g: ['cp.811'] });
  T('ext.hvacpad', 'Condenser pad / stand, disconnect & whip', 'HVAC', { w: HVAC, d: ['hvac.lineset', 'ele.rough'] });
  T('ext.address', 'House numbers visible from street', 'Pinestone (GC)', { d: ['ext.paint', 'ext.siding'], G: { w: 'Install address numbers.', t: ['C|IRC R319.1|Address numbers visible from the street, contrasting with background, minimum 4 in. high.'] } });
  T('ext.fence', 'Fencing', 'Landscaping', { w: 'A.fence', d: ['pre.811'], g: ['cp.811'] });
  T('ext.landscape', 'Landscaping & final grading', 'Landscaping', { w: 'A.landscaping', d: ['ext.grade', 'ext.flatwork'], g: ['cp.811'] });

  // ===== P13 Interior Finishes =====
  phase('P13');
  T('fin.prime', 'Prime drywall', 'Painting', { d: ['dw.qc'] });
  T('fin.cabinets', 'Install kitchen cabinets', 'Cabinets', { w: KIT, d: ['fin.prime', 'pd.kitblock', 'dw.qc'],
    q: ['Uppers fastened into backing / studs with cabinet screws', 'Base level to highest floor point', 'Fillers & scribes', 'Appliance openings per spec sheets', 'Dishwasher anchor strip / side mount provision'],
    G: { w: 'Install cabinets level, plumb and secured to structure.', t: ['M||Fasten per cabinet manufacturer: cabinet screws (not drywall screws) through hanging rails into framing.', 'P||Set a level line from the high point of the floor. Check appliance openings against the actual appliance spec sheets before counters are templated.'] } });
  T('b.vanity', 'Install vanity', 'Cabinets', { each: 'bath', d: ['fin.prime', 'b.blocking'] });
  T('fin.template', 'Countertop template', 'Countertops', { w: KIT, d: ['fin.cabinets', 'b.vanity@*'], q: ['Sinks, faucets & cooktop on site for template', 'Overhang supports planned'] });
  T('fin.counters', 'Countertop install', 'Countertops', { w: KIT, d: ['fin.template'],
    G: { w: 'Install countertops with proper support.', t: ['M||Overhang support limits (brackets / corbels / steel) per fabricator and material manufacturer.', 'P||Verify sink reveal, faucet holes and seam location before fabricator leaves.'] } });
  T('fin.backsplash', 'Backsplash tile', 'Tile', { w: `${KIT} && A.backsplash`, d: ['fin.counters', 'ele.rough'], q: ['Receptacles extended to finished face', 'Movement gap at countertop, sealant not grout'] });
  T('b.tile', 'Bath wall & floor tile', 'Tile', { each: 'bath', w: TILE_SHOWER + ' || B.floorTile', d: ['b.membrane', 'b.floorprep', 'b.heatfloor', 'b.backer'], g: ['cp.flood'], photo: true,
    q: ['Layout approved (centerlines, cut sizes, niche lines)', 'Mortar coverage 95% in wet areas (pull a tile)', 'Movement joints at changes of plane & perimeter', 'Lippage within tolerance', 'Mortar type matches membrane & tile'],
    G: { w: 'Set tile with full coverage and movement accommodation.', t: ['S|ANSI A108.5|Average mortar coverage: 80% minimum in dry interior areas; 95% in wet areas and exterior.', 'S|TCNA EJ171|Movement joints at changes of plane, perimeters and at intervals; filled with sealant, not grout.', 'M||Thinset type (modified/unmodified) per membrane manufacturer (e.g. some sheet membranes require specific mortar).'], m: ['Grout in inside corners instead of sealant.', 'Not back-buttering large-format tile.'] } });
  T('b.grout', 'Grout, sealant at changes of plane, sealer', 'Tile', { each: 'bath', w: TILE_SHOWER + ' || B.floorTile', d: ['b.tile'] });
  T('fin.floorprep', 'Flooring prep: acclimation, moisture & flatness tests', 'Flooring', { w: FLOORING, d: ['dw.qc', 'crawl.final'], photo: true,
    q: ['Moisture of subfloor/slab recorded', 'Material acclimated per manufacturer', 'Flatness within manufacturer tolerance', 'Crawlspace / HVAC operating (interior conditions)'],
    G: { w: 'Verify the substrate before flooring — most flooring failures are moisture or flatness.', t: ['M||Moisture limits (wood MC difference; concrete RH or MVER) and flatness tolerance come from the flooring manufacturer and are warranty conditions.', 'S|NWFA|Wood flooring jobsite conditions and acclimation guidelines.', 'P||Record readings in this task note with photos of the meter.'] } });
  T('fin.hardwood', 'Install new hardwood', 'Flooring', { w: "has(A.flooring,'hardwood-new')", d: ['fin.floorprep', 'fin.prime'] });
  T('fin.lvp', 'Install LVP', 'Flooring', { w: "has(A.flooring,'lvp')", d: ['fin.floorprep', 'fin.cabinets'],
    G: { w: 'Install luxury vinyl per manufacturer.', t: ['M||Expansion gaps, maximum run lengths, transitions and whether cabinets may sit on floating floors per manufacturer.'] } });
  T('fin.floortile', 'Install floor tile (non-bath)', 'Tile', { w: "has(A.flooring,'tile')", d: ['fin.floorprep'] });
  T('fin.intdoors', 'Hang interior doors', 'Finish Carpentry', { w: "A.interiorDoors!=='none'", d: ['fin.prime', 'fin.hardwood', 'fin.lvp', 'fin.floortile'], q: ['Reveals even', 'Undercut for return air / flooring', 'Latch without force'] });
  T('fin.trim', 'Trim: base, casing, crown', 'Finish Carpentry', { w: 'A.trim', d: ['fin.intdoors', 'fin.cabinets', 'fin.lvp', 'fin.hardwood'] });
  T('fin.stairs', 'Stair finish: treads, handrails, guards', 'Finish Carpentry', { w: `${s('stair-modify')} || A.stories!=='1'`, d: ['fin.prime'],
    G: { w: 'Finish stairs with compliant handrails and guards.', t: ['C|IRC R311.7.8|Handrail on at least one side of stairs with 4+ risers, 34–38 in. above nosings, continuous, with graspable profile (R311.7.8.5).', 'C|IRC R312.1|Guards at open sides more than 30 in. above floor/grade; 36 in. min height; 4 in. sphere (4-3/8 in. at stair sides).'] } });
  T('fin.closets', 'Closet shelving / systems', 'Finish Carpentry', { w: 'A.closets', d: ['fin.paint'] });
  T('fin.paint', 'Interior paint (caulk, fill, finish coats)', 'Painting', { w: 'A.paintInt', d: ['fin.trim', 'fin.prime'] });
  T('fin.refinish', 'Refinish hardwood floors', 'Flooring', { w: "has(A.flooring,'hardwood-refinish') || has(A.flooring,'hardwood-new')", d: ['fin.paint', 'fin.trim'],
    G: { w: 'Sand and finish hardwood late in the job to avoid damage.', t: ['M||Finish product cure time before traffic, rugs and furniture per manufacturer.'] } });
  T('b.glass', 'Shower glass enclosure', 'Glass', { each: 'bath', w: "B.glass && B.shower!=='none'", d: ['b.grout'],
    G: { w: 'Install the enclosure into solid backing with tempered/labeled glass.', t: ['C|IRC R308.4.5|Glazing in enclosures/walls facing tubs and showers is a hazardous location (safety glazing) where the bottom edge is less than 60 in. above the standing surface.'] } });
  T('b.accessories', 'Bath mirrors & accessories', 'Finish Carpentry', { each: 'bath', d: ['fin.paint', 'b.grout'] });
  T('fin.plbtrim', 'Plumbing trim-out (fixtures, valves, toilets)', 'Plumbing', { w: PLB, d: ['fin.counters', 'b.grout@*', 'b.vanity@*', 'fin.paint'],
    q: ['Toilets set on finished floor, flange height right', 'Anti-scald limit stops set', 'Escutcheons tight to tile', 'No leaks after 24 hrs'] });
  T('fin.eletrim', 'Electrical trim-out (devices, fixtures, panel directory)', 'Electrical', { w: ELEC, d: ['fin.paint', 'fin.backsplash', 'fin.counters'],
    q: ['Tamper-resistant receptacles', 'Covers straight & tight', 'Panel directory complete and specific', 'Fixtures per selections'],
    G: { w: 'Install devices, fixtures and a complete panel directory.', t: ['C|NEC 406.12|Tamper-resistant receptacles in dwelling units.', 'C|NEC 408.4|Every circuit legibly identified as to its specific purpose on the panel directory.'] } });
  T('fin.hvactrim', 'HVAC trim (grilles, registers, thermostat)', 'HVAC', { w: HVAC, d: ['fin.paint'] });
  T('fin.appliances', 'Appliance installation', 'Pinestone (GC)', { w: KIT, d: ['fin.counters', 'fin.plbtrim', 'fin.eletrim'],
    q: ['Range anti-tip bracket installed', 'Dishwasher high loop / air gap per local rule', 'Gas connector & shutoff accessible', 'Refrigerator water line tested'],
    G: { w: 'Install appliances per the manufacturer instructions.', t: ['M||Anti-tip devices for ranges are a manufacturer installation requirement.', 'L||Dishwasher air gap vs. high loop acceptance varies by AHJ.'] } });
  T('fin.fireplace', 'Fireplace finish / gas insert', 'Pinestone (GC)', { w: "['rebuild-wood','gas-insert','cosmetic'].includes(A.fireplace)", d: ['fin.prime', 'gas.pipe'],
    G: { w: 'Finish or install fireplace components to listings.', t: ['M||Clearances to combustibles (mantels, trim) per the listed appliance / insert manufacturer.', 'C|IRC R1001 / R1003|Masonry fireplace and chimney requirements when rebuilding.'] } });
  T('fin.hardware', 'Cabinet & door hardware, accessories', 'Finish Carpentry', { d: ['fin.paint', 'fin.cabinets', 'fin.intdoors'] });
  T('fin.touchup', 'Final caulk & paint touch-up', 'Painting', { d: ['fin.hardware', 'fin.eletrim', 'fin.plbtrim', 'fin.refinish'] });
  T('fin.carpet', 'Install carpet', 'Flooring', { w: "has(A.flooring,'carpet')", d: ['fin.touchup'] });

  // ===== P14 Commissioning & Closeout =====
  phase('P14');
  T('com.plb', 'Plumbing commissioning (leaks, flush, temps)', 'Plumbing', { w: PLB, d: ['fin.plbtrim'], f: ['cp.final-plb'],
    q: ['Every fixture run; checked for leaks below (incl. crawl)', 'Aerators cleaned after flush', 'Shower / tub max temp tested ≤120°F', 'Water heater set & T&P discharge verified', 'Main & fixture shutoffs operate'],
    G: { w: 'Run and verify every fixture before final inspection.', t: ['C|IRC P2708.4|Shower valve high-limit stop set to limit outlet temperature to 120°F maximum.', 'P||Use a thermometer at each shower and record readings in the note.'] } });
  T('com.hvac', 'HVAC startup & commissioning', 'HVAC', { w: HVAC, d: ['fin.hvactrim', 'ext.hvacpad'], f: ['cp.final-mech'],
    q: ['Refrigerant charge verified per manufacturer', 'Static pressure within equipment rating', 'Airflow at each register checked', 'Condensate & float switch tested with water', 'Filter installed; thermostat programmed'],
    G: { w: 'Start up and verify the system — not just "it blows cold."', t: ['M||Charge, airflow and static pressure per equipment manufacturer.', 'S|ACCA QI (Standard 5)|Quality installation verification practices.', 'P||Request the startup sheet from the HVAC contractor and attach it to this task.'] } });
  T('com.ele', 'Electrical testing (GFCI/AFCI, polarity, alarms)', 'Electrical', { w: ELEC, d: ['fin.eletrim'], g: ['cp.service'], f: ['cp.final-elec'],
    q: ['Every receptacle tested with plug-in tester', 'Every GFCI / AFCI tested & reset', 'Smoke / CO alarms tested & interconnected', 'Every fixture & fan operates', 'Panel directory matches'] });
  T('com.gas', 'Gas appliance startup & leak check', 'Gas', { w: GAS, d: ['fin.appliances', 'com.hvac'], g: ['cp.gasrelease'], f: ['cp.final-gas'],
    q: ['Leak check at all appliance connections', 'Burners adjusted', 'CO check at appliances', 'Vent draft verified'] });
  T('com.fans', 'Verify bath fan, hood & dryer exhaust airflow', 'Pinestone (GC)', { d: ['fin.eletrim', 'hvac.terminations'], q: ['Each bath fan pulls (tissue / flow test) and damper opens', 'Range hood exhausts outdoors', 'Dryer damper opens freely'] });
  T('com.blower', 'Blower door / duct leakage testing', 'Insulation', { w: `${DUCTS} || A.insulWalls!=='none'`, d: ['fin.eletrim', 'fin.hvactrim'], f: ['cp.blower'],
    G: { w: 'Test air tightness and duct leakage where required or as Pinestone verification.', t: ['C|IRC N1102.4.1.2 / N1103.3.3|Building air leakage and duct leakage testing requirements for new construction; applicability to alterations is limited — confirm with AHJ.', 'P||Pinestone recommended: duct leakage test on every full HVAC replacement.'] } });
  T('com.water', 'Water-intrusion check after rain', 'Pinestone (GC)', { d: ['ext.gutters', 'ext.grade', 'roof.cover', 'dryin.check'], q: ['Crawl/basement dry', 'No interior stains at windows/doors', 'Gutters & downspouts discharging correctly'] });
  T('com.crawl', 'Crawlspace post-work humidity & sump check', 'Pinestone (GC)', { w: CRAWL, d: ['crawl.final', 'com.hvac'], q: ['RH reading recorded and compared to baseline', 'Sump / dehumidifier tested', 'No leaks at new plumbing'] });
  T('com.punch', 'Pinestone internal punch walk', 'Pinestone (GC)', { d: ['fin.touchup', 'com.plb', 'com.ele', 'com.hvac'],
    G: { w: 'Walk the house room-by-room and create the punch list.', t: ['P||Use the separate Pinestone Punch List tool for room-by-room items and sub PDFs; record the punch-list status here.'] } });
  T('com.punchfix', 'Complete punch items', 'Pinestone (GC)', { d: ['com.punch'] });
  T('com.clean', 'Final construction clean & filter change', 'Cleaning', { d: ['com.punchfix', 'fin.carpet'], q: ['Inside cabinets & drawers', 'Windows & tracks', 'HVAC filter replaced after construction dust', 'Registers cleaned'] });
  T('com.finals', 'Request & pass final inspections', 'Pinestone (GC)', { d: ['com.plb', 'com.hvac', 'com.ele', 'com.gas', 'com.punchfix'], f: ['cp.final-bldg', 'cp.co'] });
  T('com.docs', 'Handoff package: warranties, manuals, as-built photos, shutoffs', 'Pinestone (GC)', { d: ['com.finals'],
    q: ['Warranties & manuals', 'Paint & finish schedule', 'Shutoff / panel / cleanout locations', 'Pre-drywall photo record', 'Permit closeout / CO copy', 'Subcontractor list'],
    G: { w: 'Hand over everything the owner (or next buyer) needs to maintain the house.', t: ['P||Export this project PDF set (full sequence + inspections) and include the pre-drywall photo record.'] } });
  T('com.walk', 'Owner walkthrough & acceptance', 'Owner', { d: ['com.clean', 'com.docs'], f: ['cp.client'] });
  T('com.archive', 'Archive project: export backup file & PDFs', 'Pinestone (GC)', { d: ['com.walk'],
    G: { w: 'Create the permanent project record.', t: ['P||Export the project backup file (includes photos) and the full PDF set; store them in the Pinestone project folder and a second location.'] } });

  const LIB = { LIBRARY_VERSION, PHASES, TRADES, CHECKPOINTS, TASKS };
  root.PCOS_LIB = LIB;
  if (typeof module !== 'undefined' && module.exports) module.exports = LIB;
})(typeof window !== 'undefined' ? window : globalThis);
