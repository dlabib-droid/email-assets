/* Sample project used by "Create sample project" and by the automated tests:
 * 1950s crawlspace full gut — bearing wall removal, full MEP, two tiled baths, kitchen, exterior. */
(function (root) {
  'use strict';
  const DEMO = {
    name: 'Sample — 1418 Linden Ave Full Gut',
    address: '1418 Linden Ave, Nashville, TN 37212',
    jurisdiction: { state: 'TN', ahj: 'Metro Nashville Codes (confirm)', codeEdition: '2018 IRC', climateZone: '4A', permitNo: '' },
    answers: {
      yearBuilt: 'pre1978', stories: '1', attic: true, garage: 'none', historic: false, hazTesting: 'done-clear', layout: true,
      foundation: 'crawlspace', crawlStrategy: 'encapsulated', crawlMoisture: ['high-humidity', 'wood-rot'], crawlFraming: ['sister-joists', 'replace-sill', 'new-piers'],
      subfloor: 'partial', crawlDrain: 'both', crawlInsul: 'wall-rigid', radon: false,
      structural: ['remove-bearing-wall', 'new-exterior-opening', 'floor-joist-repair'], engineer: 'yes', demoScope: 'full-gut', plaster: true, fireplace: 'none',
      roof: 'reroof-shingle', roofDeck: 'partial', roofVent: 'ridge-soffit', gutters: true,
      windows: 'all', windowType: 'new-construction', windowNewOpenings: true, extDoors: 'replace', interiorDoors: 'new-prehung',
      siding: 'full-fibercement', extPaint: true, porch: 'repair', grading: true, flatwork: false, landscaping: false, fence: false,
      plumbing: 'full', supplyMat: 'pex', dwv: 'full', waterService: true, sewerLateral: 'scope-only', waterHeater: 'tankless-gas', laundry: 'relocate', hoseBibs: true,
      gas: 'existing', gasAppliances: ['range', 'water-heater'], gasPipe: 'black-iron',
      electrical: 'full-rewire', service: 'service-upgrade', recessed: true, lowVoltage: true, extLighting: true, evCharger: false, generator: false,
      hvac: 'full', hvacType: 'heat-pump-split', ductLoc: 'attic', rangeHood: 'ducted', dryerVent: true, freshAir: false,
      baths: [
        { id: 'b1', name: 'Primary Bath', shower: 'tile-shower-curb', wp: 'sheet', floorTile: true, heatedFloor: true, niche: true, bench: true, glass: true, relocate: true, vanity: 'double' },
        { id: 'b2', name: 'Hall Bath', shower: 'tile-tub', wp: 'liquid', floorTile: true, heatedFloor: false, niche: true, bench: false, glass: false, relocate: false, vanity: 'single' },
      ],
      kitchen: 'full', kitchenLayout: true, cabinets: 'semi-custom', counters: 'quartz', backsplash: true, island: 'with-electric', range: 'gas', dishwasher: true, disposal: true, potFiller: false,
      insulWalls: 'batts', insulAttic: 'blown', drywall: 'full', drywallFinish: 'level4', flooring: ['hardwood-refinish', 'tile', 'lvp'], trim: true, paintInt: true, closets: true,
    },
  };
  root.PCOS_DEMO = DEMO;
  if (typeof module !== 'undefined' && module.exports) module.exports = DEMO;
})(typeof window !== 'undefined' ? window : globalThis);
