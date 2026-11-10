/* Pinestone Construction OS — Project setup questions (structured, conditional).
 * Every field writes to project.answers[id]. "show" is an expression evaluated
 * against the current answers (A). Hidden fields keep their stored values but
 * are ignored by conditions that check visibility-dependent parents.
 */
(function (root) {
  'use strict';
  const Q = {};

  Q.BATH_FIELDS = [
    { id: 'name', label: 'Bathroom name', type: 'text', placeholder: 'e.g. Primary Bath' },
    { id: 'shower', label: 'Shower / tub type', type: 'select', options: [
      ['tile-tub', 'Tub with tiled walls'], ['tile-shower-curb', 'Tiled walk-in shower (curbed)'],
      ['tile-curbless', 'Tiled curbless shower'], ['tub-surround', 'Tub with prefab surround'],
      ['prefab-shower', 'Prefab shower unit'], ['none', 'No tub or shower (powder room)']] },
    { id: 'wp', label: 'Waterproofing method', type: 'select', show: "['tile-tub','tile-shower-curb','tile-curbless'].includes(B.shower)", options: [
      ['sheet', 'Bonded sheet membrane (e.g. Schluter-KERDI type)'], ['liquid', 'Liquid-applied membrane (e.g. RedGard / Hydro Ban type)'],
      ['foam-board', 'Foam board system (e.g. Wedi / GoBoard type)'], ['mortar-bed', 'Traditional liner + mortar bed (clamping drain)']] },
    { id: 'floorTile', label: 'Tile floor', type: 'toggle' },
    { id: 'heatedFloor', label: 'Heated floor', type: 'toggle', show: 'B.floorTile' },
    { id: 'niche', label: 'Shower niche(s)', type: 'toggle', show: "B.shower!=='none'" },
    { id: 'bench', label: 'Shower bench', type: 'toggle', show: "['tile-shower-curb','tile-curbless'].includes(B.shower)" },
    { id: 'glass', label: 'Glass shower enclosure', type: 'toggle', show: "B.shower!=='none'" },
    { id: 'relocate', label: 'Fixtures relocated from existing locations', type: 'toggle' },
    { id: 'vanity', label: 'Vanity', type: 'select', options: [['single', 'Single'], ['double', 'Double'], ['pedestal', 'Pedestal / wall-hung sink']] },
  ];

  Q.SECTIONS = [
    { id: 'general', title: 'Property & Permitting', fields: [
      { id: 'yearBuilt', label: 'Year built', type: 'buttons', options: [['pre1978', 'Before 1978'], ['1978plus', '1978 or later'], ['unknown', 'Unknown']],
        help: 'Pre-1978 homes are "target housing" under the EPA RRP rule (lead-safe work practices).' },
      { id: 'stories', label: 'Stories (above foundation)', type: 'buttons', options: [['1', '1'], ['1.5', '1.5'], ['2', '2'], ['3', '3']] },
      { id: 'attic', label: 'Accessible attic above living space', type: 'toggle' },
      { id: 'garage', label: 'Garage', type: 'buttons', options: [['none', 'None'], ['attached', 'Attached'], ['detached', 'Detached']] },
      { id: 'historic', label: 'Historic overlay, conservation zoning, or HOA design review applies', type: 'toggle' },
      { id: 'hazTesting', label: 'Hazardous materials (asbestos / lead / mold) status', type: 'select', options: [
        ['not-done', 'Not yet tested'], ['done-clear', 'Tested — no abatement needed'], ['done-abatement', 'Tested — abatement required']] },
      { id: 'layout', label: 'Interior layout changes (new or moved walls)', type: 'toggle' },
    ] },
    { id: 'foundation', title: 'Foundation', fields: [
      { id: 'foundation', label: 'Foundation type', type: 'buttons', options: [['crawlspace', 'Crawlspace'], ['slab', 'Slab'], ['basement', 'Basement']] },
      { id: 'crawlStrategy', label: 'Crawlspace strategy', type: 'buttons', show: "A.foundation==='crawlspace'", options: [
        ['vented', 'Vented (keep vents)'], ['encapsulated', 'Encapsulated / unvented'], ['conditioned', 'Conditioned (supply air)']] },
      { id: 'crawlMoisture', label: 'Observed crawlspace conditions', type: 'checks', show: "A.foundation==='crawlspace'", options: [
        ['standing-water', 'Standing water / poor drainage'], ['high-humidity', 'High humidity / condensation'], ['wood-rot', 'Wood rot'], ['mold', 'Mold / microbial growth'], ['termite', 'Termite / WDI damage']] },
      { id: 'crawlFraming', label: 'Crawlspace framing work', type: 'checks', show: "A.foundation==='crawlspace'", options: [
        ['sister-joists', 'Sister / replace floor joists'], ['replace-sill', 'Replace sill plate / rim'], ['new-piers', 'New piers / footings'],
        ['girder-repair', 'Girder repair / supplement'], ['shim-supports', 'Shim / adjust supports (floor leveling)']] },
      { id: 'subfloor', label: 'Subfloor', type: 'buttons', show: "A.foundation==='crawlspace' || A.foundation==='basement'", options: [['keep', 'Keep existing'], ['partial', 'Partial replacement'], ['full', 'Full replacement']] },
      { id: 'crawlDrain', label: 'Crawlspace drainage', type: 'select', show: "A.foundation==='crawlspace'", options: [
        ['none', 'No drainage work'], ['interior-sump', 'Interior drain + sump'], ['exterior-grading', 'Exterior grading / gutters only'], ['both', 'Interior drain + sump AND exterior grading']] },
      { id: 'crawlInsul', label: 'Crawlspace insulation', type: 'select', show: "A.foundation==='crawlspace'", options: [
        ['none', 'None / existing to remain'], ['floor-batts', 'Floor insulation (between joists)'], ['wall-rigid', 'Foundation wall rigid foam'], ['wall-spray', 'Foundation wall / rim spray foam']] },
      { id: 'slabWork', label: 'Slab work', type: 'checks', show: "A.foundation==='slab' || A.foundation==='basement'", options: [
        ['underslab-plumbing', 'Underslab plumbing changes (trenching)'], ['slab-patch', 'Slab patching / infill'], ['new-slab', 'New slab section / addition'],
        ['leveling', 'Floor leveling / grinding'], ['moisture-test', 'Concrete moisture testing for flooring']] },
      { id: 'bsmtWater', label: 'Basement waterproofing', type: 'select', show: "A.foundation==='basement'", options: [
        ['none', 'None'], ['interior-drain', 'Interior drain tile + sump'], ['exterior-membrane', 'Exterior excavation + membrane'], ['both', 'Both']] },
      { id: 'bsmtCracks', label: 'Foundation wall crack repair', type: 'toggle', show: "A.foundation==='basement'" },
      { id: 'bsmtFinish', label: 'Finish basement as habitable space', type: 'toggle', show: "A.foundation==='basement'" },
      { id: 'bsmtEgress', label: 'New basement egress window', type: 'toggle', show: "A.foundation==='basement' && A.bsmtFinish" },
      { id: 'radon', label: 'Radon mitigation (passive or active)', type: 'toggle', show: "A.foundation!=='crawlspace' || A.crawlStrategy!=='vented'" },
    ] },
    { id: 'structure', title: 'Structural & Demolition', fields: [
      { id: 'structural', label: 'Structural modifications', type: 'checks', options: [
        ['remove-bearing-wall', 'Remove / open a load-bearing wall (beam)'], ['new-exterior-opening', 'New or enlarged exterior wall openings'],
        ['floor-joist-repair', 'Floor framing repair / reinforcement'], ['roof-framing-repair', 'Roof framing repair / reinforcement'],
        ['foundation-repair', 'Foundation / pier repair'], ['stair-modify', 'New or modified stair'], ['ceiling-raise', 'Vault / raise ceiling']] },
      { id: 'engineer', label: 'Engineer of record involved', type: 'buttons', options: [['yes', 'Yes'], ['no', 'No']],
        help: 'Beam installation, bearing-wall removal and ceiling vaulting normally require an engineered design. Confirm with your AHJ.' },
      { id: 'demoScope', label: 'Demolition scope', type: 'buttons', options: [['full-gut', 'Full interior gut to studs'], ['partial', 'Partial']] },
      { id: 'plaster', label: 'Plaster and lath walls to remove', type: 'toggle' },
      { id: 'fireplace', label: 'Fireplace / chimney', type: 'select', options: [
        ['none', 'None / no work'], ['remove', 'Remove chimney / fireplace'], ['rebuild-wood', 'Rebuild / reline wood-burning'], ['gas-insert', 'Gas insert or gas log set'], ['cosmetic', 'Cosmetic refacing only']] },
    ] },
    { id: 'envelope', title: 'Roof, Windows & Doors', fields: [
      { id: 'roof', label: 'Roof', type: 'select', options: [['none', 'No roof work'], ['repair', 'Repairs only'], ['reroof-shingle', 'Full reroof — asphalt shingle'], ['reroof-metal', 'Full reroof — metal']] },
      { id: 'roofDeck', label: 'Roof decking replacement', type: 'buttons', show: "A.roof.startsWith('reroof')", options: [['none', 'None expected'], ['partial', 'Partial'], ['full', 'Full']] },
      { id: 'roofVent', label: 'Attic / roof ventilation', type: 'select', show: "A.roof!=='none' || A.attic", options: [
        ['no-change', 'No change'], ['ridge-soffit', 'Ridge + soffit vents'], ['unvented', 'Unvented attic (spray foam at roofline)']] },
      { id: 'gutters', label: 'New gutters & downspouts', type: 'toggle' },
      { id: 'windows', label: 'Windows', type: 'buttons', options: [['none', 'None'], ['some', 'Some replaced'], ['all', 'All replaced']] },
      { id: 'windowType', label: 'Window install type', type: 'buttons', show: "A.windows!=='none'", options: [['new-construction', 'New-construction (nail fin)'], ['replacement-insert', 'Replacement / insert']] },
      { id: 'windowNewOpenings', label: 'New or resized window openings', type: 'toggle', show: "A.windows!=='none'" },
      { id: 'extDoors', label: 'Exterior doors', type: 'buttons', options: [['none', 'No change'], ['replace', 'Replace in existing openings'], ['new-openings', 'New / resized openings']] },
      { id: 'interiorDoors', label: 'Interior doors', type: 'buttons', options: [['none', 'Keep existing'], ['new-prehung', 'New prehung'], ['slab-only', 'Slabs only']] },
    ] },
    { id: 'exterior', title: 'Exterior & Site', fields: [
      { id: 'siding', label: 'Siding', type: 'select', options: [['none', 'No siding work'], ['repair', 'Repairs only'], ['full-vinyl', 'Full replace — vinyl'],
        ['full-fibercement', 'Full replace — fiber cement'], ['full-wood', 'Full replace — wood / engineered wood'], ['masonry-repair', 'Masonry repair / tuckpointing']] },
      { id: 'extPaint', label: 'Exterior paint', type: 'toggle' },
      { id: 'porch', label: 'Porch / deck', type: 'select', options: [['none', 'None'], ['repair', 'Repair existing'], ['new-deck', 'New deck'], ['new-porch', 'New / rebuilt porch']] },
      { id: 'grading', label: 'Regrade / improve drainage around foundation', type: 'toggle' },
      { id: 'flatwork', label: 'Driveway / walkways / concrete flatwork', type: 'toggle' },
      { id: 'landscaping', label: 'Landscaping', type: 'toggle' },
      { id: 'fence', label: 'Fencing', type: 'toggle' },
    ] },
    { id: 'plumbing', title: 'Plumbing & Gas', fields: [
      { id: 'plumbing', label: 'Plumbing scope', type: 'buttons', options: [['none', 'None'], ['partial', 'Partial'], ['full', 'Full repipe']] },
      { id: 'supplyMat', label: 'Water supply material', type: 'buttons', show: "A.plumbing!=='none'", options: [['pex', 'PEX'], ['copper', 'Copper'], ['cpvc', 'CPVC']] },
      { id: 'dwv', label: 'Drain / waste / vent', type: 'buttons', show: "A.plumbing!=='none'", options: [['none', 'Keep existing'], ['partial', 'Partial replacement'], ['full', 'Full replacement']] },
      { id: 'waterService', label: 'Replace water service line (meter to house)', type: 'toggle', show: "A.plumbing!=='none'" },
      { id: 'sewerLateral', label: 'Sewer lateral', type: 'buttons', show: "A.plumbing!=='none'", options: [['none', 'No work'], ['scope-only', 'Camera scope only'], ['replace', 'Replace / repair']] },
      { id: 'waterHeater', label: 'Water heater', type: 'select', show: "A.plumbing!=='none'", options: [['none', 'Keep existing'], ['tank-gas', 'Tank — gas'], ['tank-elec', 'Tank — electric'], ['tankless-gas', 'Tankless — gas'], ['heat-pump', 'Heat pump water heater']] },
      { id: 'laundry', label: 'Laundry', type: 'buttons', show: "A.plumbing!=='none'", options: [['none', 'No laundry work'], ['existing', 'Existing location'], ['relocate', 'New / relocated']] },
      { id: 'hoseBibs', label: 'New / replaced hose bibs', type: 'toggle', show: "A.plumbing!=='none'" },
      { id: 'gas', label: 'Natural gas / propane', type: 'buttons', options: [['none', 'No gas'], ['existing', 'Existing service — new piping'], ['new-service', 'New gas service']] },
      { id: 'gasAppliances', label: 'Gas appliances', type: 'checks', show: "A.gas!=='none'", options: [['range', 'Range / cooktop'], ['water-heater', 'Water heater'], ['furnace', 'Furnace'], ['dryer', 'Dryer'], ['fireplace', 'Fireplace / logs']] },
      { id: 'gasPipe', label: 'Gas piping', type: 'buttons', show: "A.gas!=='none'", options: [['black-iron', 'Black iron'], ['csst', 'CSST'], ['mixed', 'Mixed']] },
    ] },
    { id: 'mep', title: 'Electrical & HVAC', fields: [
      { id: 'electrical', label: 'Electrical scope', type: 'buttons', options: [['none', 'None'], ['partial', 'Partial'], ['full-rewire', 'Full rewire']] },
      { id: 'service', label: 'Electrical service', type: 'buttons', show: "A.electrical!=='none'", options: [['none', 'Keep existing'], ['panel-replace', 'Panel replacement'], ['service-upgrade', 'Service upgrade (meter / mast / panel)']] },
      { id: 'recessed', label: 'Recessed lighting', type: 'toggle', show: "A.electrical!=='none'" },
      { id: 'lowVoltage', label: 'Low-voltage (data, security, AV)', type: 'toggle', show: "A.electrical!=='none'" },
      { id: 'extLighting', label: 'Exterior lighting changes', type: 'toggle', show: "A.electrical!=='none'" },
      { id: 'evCharger', label: 'EV charger circuit', type: 'toggle', show: "A.electrical!=='none'" },
      { id: 'generator', label: 'Generator interlock / transfer switch', type: 'toggle', show: "A.electrical!=='none'" },
      { id: 'hvac', label: 'HVAC scope', type: 'buttons', options: [['none', 'None'], ['equipment', 'Equipment replacement only'], ['full', 'Full new system incl. ductwork']] },
      { id: 'hvacType', label: 'System type', type: 'select', show: "A.hvac!=='none'", options: [['heat-pump-split', 'Split heat pump'], ['gas-furnace-ac', 'Gas furnace + AC'], ['ducted-mini', 'Ducted mini-split'], ['ductless', 'Ductless mini-split heads']] },
      { id: 'ductLoc', label: 'Ductwork location', type: 'select', show: "A.hvac==='full' && A.hvacType!=='ductless'", options: [['attic', 'Attic'], ['crawl', 'Crawlspace'], ['basement', 'Basement'], ['conditioned', 'Inside conditioned space']] },
      { id: 'rangeHood', label: 'Range hood', type: 'buttons', options: [['none', 'None'], ['ducted', 'Ducted to exterior'], ['recirc', 'Recirculating']] },
      { id: 'dryerVent', label: 'New / rerouted dryer vent', type: 'toggle' },
      { id: 'freshAir', label: 'Whole-house mechanical ventilation (ERV / fresh air)', type: 'toggle', show: "A.hvac!=='none'" },
    ] },
    { id: 'baths', title: 'Bathrooms', group: 'baths', fields: Q.BATH_FIELDS },
    { id: 'kitchen', title: 'Kitchen', fields: [
      { id: 'kitchen', label: 'Kitchen scope', type: 'buttons', options: [['none', 'None'], ['refresh', 'Refresh (same layout)'], ['full', 'Full remodel']] },
      { id: 'kitchenLayout', label: 'Relocate sink, range, or appliances', type: 'toggle', show: "A.kitchen!=='none'" },
      { id: 'cabinets', label: 'Cabinets', type: 'buttons', show: "A.kitchen!=='none'", options: [['stock', 'Stock'], ['semi-custom', 'Semi-custom'], ['custom', 'Custom']] },
      { id: 'counters', label: 'Countertops', type: 'select', show: "A.kitchen!=='none'", options: [['quartz', 'Quartz'], ['granite', 'Granite / natural stone'], ['solid-surface', 'Solid surface'], ['laminate', 'Laminate'], ['butcher', 'Butcher block']] },
      { id: 'backsplash', label: 'Tile backsplash', type: 'toggle', show: "A.kitchen!=='none'" },
      { id: 'island', label: 'Island', type: 'select', show: "A.kitchen!=='none'", options: [['none', 'No island'], ['no-utilities', 'Island — no utilities'], ['with-electric', 'Island — electric only'], ['with-sink', 'Island — sink / plumbing + electric']] },
      { id: 'range', label: 'Range fuel', type: 'buttons', show: "A.kitchen!=='none'", options: [['gas', 'Gas'], ['electric', 'Electric'], ['induction', 'Induction']] },
      { id: 'dishwasher', label: 'Dishwasher', type: 'toggle', show: "A.kitchen!=='none'" },
      { id: 'disposal', label: 'Disposal', type: 'toggle', show: "A.kitchen!=='none'" },
      { id: 'potFiller', label: 'Pot filler', type: 'toggle', show: "A.kitchen!=='none'" },
    ] },
    { id: 'interior', title: 'Insulation, Drywall & Finishes', fields: [
      { id: 'insulWalls', label: 'Wall insulation', type: 'select', options: [['none', 'None'], ['batts', 'Batts (fiberglass / mineral wool)'], ['blown-dense', 'Dense-pack / blown-in blanket'], ['open-cell', 'Open-cell spray foam'], ['closed-cell', 'Closed-cell spray foam']] },
      { id: 'insulAttic', label: 'Attic / ceiling insulation', type: 'select', options: [['none', 'None / existing'], ['blown', 'Blown-in on attic floor'], ['batts', 'Batts on attic floor'], ['spray-roofline', 'Spray foam at roofline']] },
      { id: 'drywall', label: 'Drywall', type: 'buttons', options: [['full', 'Full new drywall'], ['partial', 'Partial / patching']] },
      { id: 'drywallFinish', label: 'Drywall finish level', type: 'buttons', options: [['level4', 'Level 4'], ['level5', 'Level 5']] },
      { id: 'flooring', label: 'Flooring types', type: 'checks', options: [['hardwood-refinish', 'Refinish existing hardwood'], ['hardwood-new', 'New hardwood'], ['lvp', 'LVP / luxury vinyl'], ['tile', 'Tile (non-bath areas)'], ['carpet', 'Carpet']] },
      { id: 'trim', label: 'New interior trim (base, casing)', type: 'toggle' },
      { id: 'paintInt', label: 'Interior paint', type: 'toggle' },
      { id: 'closets', label: 'Closet systems / shelving', type: 'toggle' },
    ] },
  ];

  Q.DEFAULTS = {
    yearBuilt: 'unknown', stories: '1', attic: true, garage: 'none', historic: false, hazTesting: 'not-done', layout: false,
    foundation: 'crawlspace', crawlStrategy: 'vented', crawlMoisture: [], crawlFraming: [], subfloor: 'keep', crawlDrain: 'none', crawlInsul: 'none',
    slabWork: [], bsmtWater: 'none', bsmtCracks: false, bsmtFinish: false, bsmtEgress: false, radon: false,
    structural: [], engineer: 'no', demoScope: 'full-gut', plaster: false, fireplace: 'none',
    roof: 'none', roofDeck: 'none', roofVent: 'no-change', gutters: false, windows: 'none', windowType: 'new-construction', windowNewOpenings: false,
    extDoors: 'none', interiorDoors: 'new-prehung',
    siding: 'none', extPaint: false, porch: 'none', grading: false, flatwork: false, landscaping: false, fence: false,
    plumbing: 'full', supplyMat: 'pex', dwv: 'full', waterService: false, sewerLateral: 'scope-only', waterHeater: 'tank-elec', laundry: 'existing', hoseBibs: true,
    gas: 'none', gasAppliances: [], gasPipe: 'black-iron',
    electrical: 'full-rewire', service: 'panel-replace', recessed: true, lowVoltage: false, extLighting: true, evCharger: false, generator: false,
    hvac: 'full', hvacType: 'heat-pump-split', ductLoc: 'attic', rangeHood: 'ducted', dryerVent: true, freshAir: false,
    baths: [],
    kitchen: 'full', kitchenLayout: false, cabinets: 'semi-custom', counters: 'quartz', backsplash: true, island: 'none', range: 'electric', dishwasher: true, disposal: true, potFiller: false,
    insulWalls: 'batts', insulAttic: 'blown', drywall: 'full', drywallFinish: 'level4', flooring: ['lvp'], trim: true, paintInt: true, closets: false,
  };

  Q.BATH_DEFAULTS = { name: '', shower: 'tile-shower-curb', wp: 'sheet', floorTile: true, heatedFloor: false, niche: true, bench: false, glass: true, relocate: false, vanity: 'single' };

  // New projects start with NO code edition: it must be confirmed for the property's AHJ.
  // (v1.0 projects keep whatever they stored.)
  Q.JURISDICTION_DEFAULTS = { state: 'TN', ahj: '', codeEdition: '', energyCode: '', electricalCode: '', climateZone: '', permitNo: '', notes: '' };
  Q.CODE_EDITIONS = ['2018 IRC', '2021 IRC', '2024 IRC', '2015 IRC', '2012 IRC', 'Other / local amendments'];

  root.PCOS_Q = Q;
  if (typeof module !== 'undefined' && module.exports) module.exports = Q;
})(typeof window !== 'undefined' ? window : globalThis);
