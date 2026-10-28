/**
 * Maps each package selection to ConfiguratorContext initialConfig values.
 * These are merged into the configurator's initial state when a package is chosen.
 */

/** Badge image path for each package */
export const PACKAGE_BADGES = {
  'track-pack':  { badge: '/track-badge.png',    name: 'Track Pack' },
  'job-site':    { badge: '/jobsite-badge.png',  name: 'Job Site' },
  'base-camp':   { badge: '/basecamp-badge.png', name: 'Base Camp' },
  'no-package':  { badge: null,                  name: 'Build From Scratch' },
}

/**
 * Which option IDs (values) are pre-selected by each package.
 * Format: { packageId: Set<string> }
 * Used by panels to show the package badge on pre-selected options.
 */
export const PACKAGE_OPTION_IDS = {
  'track-pack': new Set(['rearwingspoiler', 'spideraluminum', 'blackout', 'torsion', '7000lb', 'wall', 'floor']),
  'job-site':   new Set(['30amp', 'wall', 'floor', '5000relectric', 'frontbase36', 'frontoverhead16']),
  'base-camp':  new Set(['50amp', '18kminisplit', '5000relectric', 'frontbase36', 'frontoverhead16', 'white_metal_walls', 'white_metal_ceiling']),
  'no-package': new Set(),
}

export const PACKAGE_INITIAL_CONFIGS = {
  'track-pack': {
    // REAR SPOILER WING
    exteriorAccessories: 'rearwingspoiler',
    rearSpoiler: true,
    // SPIDER ALUMINUM MAGS
    wheelType: 'spideraluminum',
    // ANGLED RACING LIGHTS
    angledLights: true,
    // BLACKOUT PKG - EXTERIOR
    exteriorFinish: 'blackout',
    // FLOOR + WALL E-TRACK
    // E-Track IDs: 'wall' and 'floor' (from E_TRACKS_OPTIONS in configData)
    tieDowns: ['wall', 'floor'],
    eTracks: { wall: 1, floor: 1 },
    // SPREAD AXLES W/CORVETTE FENDERS
    spreadAxle: false,
    // 7000LB TORSION
    axleCapacity: '7000lb',
    axleSuspension: 'torsion',
  },

  'job-site': {
    // BASE & OVERHEAD CABINETS
    cabinets: ['frontbase36', 'frontoverhead16'],
    // ELECTRIC JACKS
    jacks: ['5000relectric'],
    // FLOOR + WALL E-TRACK
    tieDowns: ['wall', 'floor'],
    eTracks: { wall: 1, floor: 1 },
    // 30 AMP ELECTRICAL
    electrical: '30amp',
    // RECESSED TIRE BOX
    recessedTireBox: true,
  },

  'base-camp': {
    // BASE & OVERHEAD CABINETS
    cabinets: ['frontbase36', 'frontoverhead16'],
    // ELECTRIC JACK
    jacks: ['5000relectric'],
    // 18K MINI SPLIT AC W/200V WIRE
    climateControl: '18kminisplit',
    // WHITE METAL WALLS & CEILING
    walls: 'white_metal_walls',
    ceiling: 'white_metal_ceiling',
    // 50 AMP ELECTRICAL
    electrical: '50amp',
  },

  // No package — use all defaults (empty config)
  'no-package': {},
}
