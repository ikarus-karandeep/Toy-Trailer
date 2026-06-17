export const PANEL_SECTIONS = {
  'SIZE & CAPACITY': ['WIDTH', 'LENGTH', 'INTERIOR HEIGHT', 'AXLE', 'AXLE RATING & SUSPENSION', 'SPREAD AXLE'],
  'EXTERIOR': ['EXTERIOR FINISH', 'FRONT STYLE', 'EXTERIOR BUILD', 'PROTECTION PACKAGE', 'WHEEL', 'SPARE TIRE'],
  'INTERIOR': ['FLOOR', 'WALLS', 'CEILING', 'CABINETS', 'TOOL BOX'],
  'SYSTEMS': ['ELECTRICAL', '12V BATTERY SYSTEM', 'LIGHTS', 'VENTILATION', 'CLIMATE CONTROL'],
  'LOADING': ['RAMP TYPE', 'TIE DOWNS (MULTI-CHOICE)', 'JACKS (MULTI-CHOICE)'],
  'ADD-ONS': ['WATER PACKAGE & SINK', 'BATHROOM PACKAGES', 'AWNINGS'],
}

export const TABS = [
  'SIZE & CAPACITY',
  'EXTERIOR',
  'INTERIOR',
  'SYSTEMS',
  'LOADING',
  'ADD-ONS',
];

// Size & Capacity
export const WIDTH_OPTIONS = [
  { id: '6ft', label: "6'", price: 9999, note: "6' WIDE BASE FOR 18' - 24'" },
  { id: '8ft', label: "8'", price: 9999, note: "8' WIDE BASE FOR 26' - 34'" },
];

export const LENGTH_OPTIONS = [
  { id: '8x26', label: "8' x 26'", price: 9999 },
  { id: '8x28', label: "8' x 28'", price: 9999 },
  { id: '8x30', label: "8' x 30'", price: 9999 },
  { id: '8x32', label: "8' x 32'", price: 9999 },
  { id: '8x34', label: "8' x 34'", price: 9999 },
];

export const INTERIOR_HEIGHT_OPTIONS = [
  { id: '6ft7', label: '6\' 7"', isStandard: true },
  { id: '7ft0', label: '7\' 0"', price: 9999 },
  { id: '8ft0', label: '8\' 0"', price: 9999 },
  { id: '8ft6', label: '8\' 6"', price: 9999 },
  { id: '9ft0', label: '9\' 0"', price: 9999 },
  { id: '9ft6', label: '9\' 6"', price: 9999 },
  { id: '10ft0', label: '10\' 0"', price: 9999 },
  { id: '10ft6', label: '10\' 6"', price: 9999 },
];

export const AXLE_OPTIONS = [
  { id: 'tandem', label: 'TANDEM', isStandard: true },
  { id: 'triple', label: 'TRIPLE', price: 9999 },
];

export const AXLE_RATING_OPTIONS = [
  { id: '5200leafspring', label: '5200 lb Leaf Spring', isStandard: true },
  { id: '5200torsion', label: '5200 lb Torsion', price: 9999 },
  { id: '7000dropspring', label: '7000 lb Drop Spring', price: 9999 },
  { id: '7000torsion', label: '7000 lb Torsion', price: 9999 },
  { id: '8000torsion16k', label: '8000 lb Torsion 16K', price: 9999 },
  { id: 'triple5200torsion', label: 'Triple 5200 lb Torsion', price: 9999 },
  { id: 'triple7000torsion', label: 'Triple 7000 lb Torsion', price: 9999 },
];

// Exterior
export const EXTERIOR_FINISH_OPTIONS = [
  { id: 'standard', label: 'STANDARD COLORS', isStandard: true },
  { id: 'premium', label: 'PREMIUM COLORS', price: 9999 },
  { id: 'blackout', label: 'BLACKOUT PACKAGE', price: 9999 },
];

export const COLOR_OPTIONS = [
  { id: 'pink', label: 'PINK', color: '#d4357a', image: '/Pink.png' },
  { id: 'pewter', label: 'PEWTER', color: '#9ba0a8' , image: '/pewter.png'},
  { id: 'emerald', label: 'EMERALD GREEN', color: '#3a8c5c', image: '/Emerald Green.png' },
  { id: 'brandywine', label: 'BRANDY WINE', color: '#7a1f30' , image: '/Brandy Wine.png'},
  { id: 'sierra', label: 'SIERRA DESERT', color: '#c49a5a', image: '/Sierra Desert.png' },
  { id: 'orange', label: 'ORANGE', color: '#e07820' , image: '/Orange.png'},
  { id: 'purple', label: 'PURPLE', color: '#6b2fa0' , image: '/Purple.png'},
  { id: 'yellow', label: 'YELLOW', color: '#c8a800' , image: '/Yellow.png'},
];

export const FRONT_STYLE_OPTIONS = [
  { id: 'vnose', label: 'V-NOSE W/ ATP DIAMOND PLATE', isStandard: true },
  { id: 'flatfront', label: 'FLAT FRONT W/ ROUNDED ATP CORNERS', price: 9999 },
];

export const FRONT_STYLE_NOTES = [
  'V-NOSE ADDS 3FT OF NOSE STORAGE',
  'FLAT FRONT MAXIMIZES CARGO FLOOR LENGTH',
];

export const EXTERIOR_BUILD_OPTIONS = [
  { id: 'semiscrewless', label: 'SEMI-SCREWLESS', isStandard: true },
  { id: 'fullscrewless', label: 'FULL SCREWLESS', price: 9999 },
];

export const PROTECTION_OPTIONS = [
  { id: '24atpsidesrear', label: '24" ATP SIDES & REAR', isStandard: true },
  { id: 'onepieceroof', label: 'ONE PIECE ALUMINUM ROOF', price: 9999 },
];

export const WHEEL_OPTIONS = [
  { id: 'blacksteel', label: 'BLACK STEEL WHEELS', isStandard: true },
  { id: 'aluminumradial', label: 'ALUMINUM RADIAL', price: 9999 },
];

export const LUG_OPTIONS = [
  { id: '5lug', label: '5-LUG' },
  { id: '6lug', label: '6-LUG' },
];

// Interior
export const FLOOR_OPTIONS = [
  { id: '34plywood', label: '3/4" PLYWOOD', isStandard: true },
  { id: 'atp', label: 'ATP/RTP/ COIN', price: 9999 },
  { id: 'double34', label: 'DOUBLE 3/4" PLYWOOD', price: 9999 },
];

export const WALL_OPTIONS = [
  { id: '38plywood', label: '3/8" PLYWOOD', isStandard: true },
  { id: '34plywood', label: '3/4" PLYWOOD', price: 9999 },
  { id: 'aluminum', label: 'ALUMINUM INTERIOR WALLS', price: 9999 },
  { id: 'insulation', label: 'WALL INSULATION', price: 9999 },
  { id: 'atpwheels', label: 'ATP COVERED WHEEL WELLS', price: 9999 },
];

export const CEILING_OPTIONS = [
  { id: 'thermal', label: 'THERMAL LINER', isStandard: true },
  { id: 'aluminum', label: 'ALUMINUM INTERIOR CEILING', price: 9999 },
  { id: 'insulation', label: 'CEILING INSULATION', price: 9999 },
];

export const CABINET_OPTIONS = [
  { id: 'vnosebase', label: 'V-NOSE BASE CABINETS', price: 9999 },
  { id: 'vnoseoverhead', label: 'V-NOSE OVERHEAD CABINETS', price: 9999 },
  { id: 'basewall', label: 'BASE CABINETS - WALL RUN', price: 9999 },
  { id: 'overheadwall', label: 'OVERHEAD CABINETS - WALL RUN', price: 9999 },
  { id: 'folddownshelf', label: 'FOLD DOWN SHELF', price: 9999 },
  { id: 'wheelwall', label: 'WHEEL WALL CABINET', price: 9999 },
];

export const CABINET_NOTES = [
  'V-NOSE ADDS 3FT OF NOSE STORAGE',
  'FLAT FRONT MAXIMIZES CARGO FLOOR LENGTH',
];

export const TOOL_BOX_OPTIONS = [
  { id: 'none', label: 'NONE' },
  { id: 'frontbox', label: 'FRONT BOX', price: 9999 },
  { id: 'sidebox', label: 'SIDE BOX', price: 9999 },
  { id: 'both', label: 'BOTH', price: 9999 },
];

// Systems
export const ELECTRICAL_OPTIONS = [
  { id: 'none', label: 'NO ELECTRICAL', price: 9999 },
  { id: '110v8space', label: '110V 50AMP: 8-SPACE PANEL', price: 9999 },
  { id: '110v12space', label: '110V 50AMP: 12-SPACE PANEL', price: 9999 },
];

export const BATTERY_OPTIONS = [
  { id: '12vpackage', label: '12V PACKAGE', price: 9999 },
  { id: '12vbatterybox', label: '12V BATTERY + BOX', price: 9999 },
  { id: '50amotor', label: '50A MOTOR BASE PLUG', price: 9999 },
];

export const LIGHT_OPTIONS = [
  { id: 'dome', label: 'DOME LIGHTS', price: null },
  { id: 'strip', label: 'STRIP LIGHTS', price: 9999 },
  { id: 'flatpanel', label: 'FLAT PANEL', price: 9999 },
  { id: 'racing', label: 'RACING LIGHTS (EXTERIOR)', price: 9999 },
];

export const VENTILATION_OPTIONS = [
  { id: 'roofvent', label: 'ROOF VENT' },
  { id: 'sidewallvents', label: 'SIDEWALL VENTS', price: 9999 },
];

export const CLIMATE_CONTROL_OPTIONS = [
  { id: 'none', label: 'NO CLIMATE CONTROL' },
  { id: '13000btu', label: '13,000 BTU A/C + HEAT STRIP', price: 9999 },
  { id: '15000btu', label: '15,000 BTU A/C + HEAT STRIP', price: 9999 },
  { id: 'ministplit13k', label: 'MINI SPLIT 13K BTU', price: 9999 },
  { id: 'ministplit18k', label: 'MINI SPLIT 18K BTU', price: 9999 },
  { id: 'ministplit24k', label: 'MINI SPLIT 24K BTU', price: 9999 },
  { id: 'wirebrace', label: 'WIRE & BRACE FOR A/C (PREP ONLY)', price: 9999 },
];

// Loading
export const RAMP_OPTIONS = [
  { id: 'heavyduty', label: 'HEAVY DUTY RAMP - 4500 LB', price: 9999 },
  { id: 'superduty', label: 'SUPER DUTY RAMP - 7,000 LB', price: 9999 },
  { id: 'barndoors', label: 'DOUBLE BARN DOORS', price: 9999 },
];

export const TIE_DOWN_OPTIONS = [
  { id: 'drings', label: 'D-RINGS' },
  { id: 'walletrack', label: 'WALL E-TRACK' },
  { id: 'flooretrack', label: 'FLOOR E-TRACK + STEEL BACKER' },
  { id: 'additionalwalldrings', label: 'ADDITIONAL WALL D-RINGS' },
  { id: 'additionalfloordrings', label: 'ADDITIONAL FLOOR D-RINGS + BACKER' },
];

export const JACK_OPTIONS = [
  { id: 'folddownstabilizer', label: 'FOLD DOWN STABILIZER JACKS' },
  { id: '5kscissor', label: '5K SCISSOR JACKS' },
  { id: '5kelectrictongue', label: '5K ELECTRIC TONGUE JACK + BATTERY' },
];

// Add-Ons
export const WATER_OPTIONS = [
  { id: 'largewater', label: 'LARGE WATER PACKAGE', price: 9999 },
  { id: 'largesink', label: 'LARGE SINK PACKAGE', price: 9999 },
];

export const BATHROOM_OPTIONS = [
  { id: 'halfbath', label: 'HALF BATHROOM PACKAGE', price: 9999 },
  { id: 'full34x34', label: 'FULL BATHROOM - 34" x 34"', price: 9999 },
  { id: 'full36x36', label: 'FULL BATHROOM - 36" x 36"', price: 9999 },
];

export const AWNING_OPTIONS = [
  { id: 'awning18', label: "ELECTRIC AWNING 18'", price: 9999 },
  { id: 'awning20', label: "ELECTRIC AWNING 20'", price: 9999 },
  { id: 'awning22', label: "ELECTRIC AWNING 22'", price: 9999 },
  { id: 'awning24', label: "ELECTRIC AWNING 24'", price: 9999 },
];
