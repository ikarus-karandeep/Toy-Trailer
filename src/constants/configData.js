export const PANEL_SECTIONS = {
  'SIZE & CAPACITY': ['WIDTH', 'LENGTH', 'FRAME SIZE', 'AXLE COUNT', 'AXLE SUSPENSION', 'AXLE CAPACITY', 'INTERIOR HEIGHT', 'SPREAD AXLE W/ CORVETTE FENDERS', 'NARROW TRACK AXLE'],
  'EXTERIOR': ['EXTERIOR FINISH', 'FRONT STYLE', 'FRONT STYLE ADDONS', 'EXTERIOR BUILD', 'PROTECTION PACKAGE', 'WHEEL', 'SPARE TIRE', 'SIDE DOOR'],
  'INTERIOR': ['FLOOR', 'WALLS', 'CEILING', 'CABINETS', 'TOOL BOX', 'DOOR SIDES'],
  'SYSTEMS': ['ELECTRICAL', '12V BATTERY SYSTEM', 'LIGHTS', 'VENTILATION', 'CLIMATE CONTROL'],
  'LOADING': ['RAMP TYPE', 'TIE DOWNS (MULTI-CHOICE)', 'JACKS (MULTI-CHOICE)'],
  'ADD-ONS': ['WATER PACKAGE & SINK', 'BATHROOM PACKAGES', 'AWNINGS', 'BASE ADDONS'],
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
  { id: '7ft',    label: '7FT',     price: null,  note: "7' wide trailer" },
  { id: '8.5ft',  label: '8.5FT',  price: null,  note: "8.5' wide trailer" },
  { id: '8.5ftgn', label: '8.5FT GN', price: 9999, note: "8.5' gooseneck wide" },
];

export const LENGTH_OPTIONS = [
  { id: '14', label: "14'", price: null },
  { id: '16', label: "16'", price: null },
  { id: '18', label: "18'", price: null },
  { id: '20', label: "20'", price: null },
  { id: '22', label: "22'", price: null },
  { id: '24', label: "24'", price: null },
  { id: '26', label: "26'", price: 320,  badge: '+$320 - 6000lb Base Axle' },
  { id: '28', label: "28'", price: 320,  badge: '+$320 - 6000lb Base Axle' },
  { id: '30', label: "30'", price: 320,  badge: '+$320 - 6000lb Base Axle' },
  { id: '32', label: "32'", price: 320,  badge: '+$320 - 6000lb Base Axle' },
  { id: '34', label: "34'", price: 320,  badge: '+$320 - 6000lb Base Axle' },
  { id: '36', label: "36'", price: 320,  badge: '+$320 - 6000lb Base Axle' },
];

export const FRAME_SIZE_OPTIONS = [
  { id: '4in',  label: '4"',  isStandard: false, price: null, locked: true },
  { id: '6in',  label: '6"',       isStandard: true },
  { id: '8in',  label: '8"',       isStandard: false, price: null },
];

export const AXLE_COUNT_OPTIONS = [
  { id: 'tandem', label: 'TANDEM', isStandard: true },
  { id: 'triple', label: 'TRIPLE', price: 9999 },
];

export const AXLE_SUSPENSION_OPTIONS = [
  { id: 'dropspring', label: 'DROP SPRING', isStandard: false, price: null },
  { id: 'torsion',    label: 'TORSION',     isStandard: true },
];

export const AXLE_CAPACITY_OPTIONS = [
  { id: '3500lb',  label: '3500LB',  isStandard: true },
  { id: '6000lb',  label: '6000LB',  price: 999 },
  { id: '7000lb',  label: '7000LB',  price: -1006 },
];

export const INTERIOR_HEIGHT_OPTIONS = [
  { id: '7ft0',  label: "7'0\"",  value: 0,  price: null, isStandard: true },
  { id: '7ft6',  label: "7'6\"",  value: 1,  price: 9999 },
  { id: '8ft0',  label: "8'0\"",  value: 2,  price: 9999 },
  { id: '8ft6',  label: "8'6\"",  value: 3,  price: 9999 },
  { id: '9ft0',  label: "9'0\"",  value: 4,  price: 9999 },
  { id: '9ft6',  label: "9'6\"",  value: 5,  price: 9999 },
  { id: '10ft0', label: "10'0\"", value: 6,  price: 9999 },
];

export const AXLE_OPTIONS = [
  { id: 'baseatp',         label: 'BASE ATP',          isStandard: true },
  { id: 'atpangledside',   label: 'ATP ANGLED SIDE',   price: 9999 },
  { id: 'atpflatside',     label: 'ATP FLAT SIDE',     price: 9999 },
  { id: 'panelangledside', label: 'PANEL ANGLED SIDE', price: 9999 },
  { id: 'panelflatside',   label: 'PANEL FLAT SIDE',   price: 9999 },
];

export const AXLE_RATING_OPTIONS = [
  { id: '5200leafspring', label: '5200 lb Leaf Spring', isStandard: true },
  { id: '5200torsion',    label: '5200 lb Torsion',     price: 9999 },
  { id: '7000dropspring', label: '7000 lb Drop Spring', price: 9999 },
  { id: '7000torsion',    label: '7000 lb Torsion',     price: 9999 },
  { id: '8000torsion16k', label: '8000 lb Torsion 16K', price: 9999 },
  { id: '10000lbtandem',  label: '10,000 lb Tandem',   price: 9999 },
];

// Exterior
export const EXTERIOR_FINISH_OPTIONS = [
  { id: 'blackout', label: 'BLACKOUT PACKAGE (EXTERIOR)', price: 320 },
];

export const EXTERIOR_ACCESSORIES_OPTIONS = [
  { id: 'none', label: 'NONE', isStandard: true },
  { id: 'rearwings', label: 'REAR WINGS' },
  { id: 'rearwingspoiler', label: 'REAR WING SPOILER W/ 2 ANGLED LIGHTS', price: 473 },
];

export const COLOR_OPTIONS = [
  { id: 'white',        label: 'WHITE',          color: '#ffffff',  image: '/white.png' },
  { id: 'black',        label: 'BLACK',          color: '#1a1a1a',  image: '/black.png' },
  { id: 'charcolgrey',  label: 'CHARCOAL GREY',  color: '#555b63',  image: '/charcol grey.png' },
  { id: 'silver',       label: 'SILVER',         color: '#b0b8c1',  image: '/Silver.png' },
  { id: 'red',          label: 'RED',            color: '#cf1a1a',  image: '/red.png' },
  { id: 'indigoblue',   label: 'INDIGO BLUE',    color: '#3f4aad',  image: '/indigo blue.png' },
  { id: 'yellow',       label: 'YELLOW',         color: '#c8a800',  image: '/Yellow.png' },
  { id: 'orange',       label: 'ORANGE',         color: '#e07820',  image: '/Orange.png' },
  { id: 'electricblue', label: 'ELECTRIC BLUE',  color: '#0080ff',  image: '/electric blue.png' },
  { id: 'electricgreen',label: 'ELECTRIC GREEN', color: '#1a8c2a',  image: '/electric green.png' },
  { id: 'sierra',       label: 'SAHARA DESERT',  color: '#c49a5a',  image: '/sahara desert.png' },
  { id: 'brandywine',   label: 'BRANDY WINE',    color: '#7a1f30',  image: '/Brandy Wine.png' },
  { id: 'pink',         label: 'PINK',           color: '#d4357a',  image: '/Pink.png' },
  { id: 'emerald',      label: 'EMERALD GREEN',  color: '#3a8c5c',  image: '/Emerald Green.png' },
  { id: 'purple',       label: 'PURPLE',         color: '#6b2fa0',  image: '/Purple.png' },
];


export const SIDE_DOOR_OPTIONS = [
  { id: 'flatpanel',   label: 'FLAT PANEL',   isStandard: true },
  { id: 'singledoor',  label: 'SINGLE DOOR',  price: 9999 },
  { id: 'doubledoor',  label: 'DOUBLE DOOR',  price: 9999 },
]

export const FRONT_STYLE_OPTIONS = [
  { id: 'vnose24', label: 'V-NOSE W/ 24" STONE GUARD' },
  { id: 'flatfront', label: 'FLAT FRONT', price: 0 },
  { id: 'slantvnose', label: 'SLANT V-NOSE W/ ATP ON SLANT', price: 203 },
  { id: 'extendedvnose', label: "5' EXTENDED V-NOSE (INCL EXT TTT + SIDEWIND JACK)", price: 575 },
];

export const FRONT_STYLE_NOTES = [
  'V-NOSE ADDS 3FT OF NOSE STORAGE',
  'FLAT FRONT MAXIMIZES CARGO FLOOR LENGTH',
];

export const EXTERIOR_BUILD_OPTIONS = [
  { id: 'semiscrewed', label: 'SEMI-SCREWED' },
];

export const ROOF_BUILD_OPTIONS = [
  { id: 'onepieceroof', label: 'ONE PIECE ALUMINUM ROOF - SDYNAMIC' },
];

export const PROTECTION_TYPE_OPTIONS = [
  { id: 'atp', label: 'ATP' },
  { id: 'anodized', label: 'ANODIZED' },
  { id: 'coloredmetal', label: 'COLORED METAL' },
];

export const PROTECTION_SIZE_OPTIONS = [
  { id: '12', label: '12"', price: 320 },
  { id: '24', label: '24"', price: 440 },
];

export const FRONT_PROTECTION_OPTIONS = [
  { id: 'polishedcaps', label: 'POLISHED ANODIZED ALUMINUM CORNER CAPS', price: 419 },
];

export const WHEEL_TYPE_OPTIONS = [
  { id: 'standardsilver', label: 'STANDARD SILVER' },
  { id: 'blacksteel', label: 'BLACK STEEL' },
  { id: 'spideraluminum', label: 'SPIDER ALUMINUM MAGS - SDYNAMIC' },
];

export const TIRE_SIZE_OPTIONS = [
  { id: '15', label: '15"', price: 808 },
  { id: '16', label: '16"', price: 440 },
];

export const LUG_OPTIONS = [
  { id: '5lug', label: '5-LUG' },
  { id: '6lug', label: '6-LUG' },
  { id: '8lug', label: '8-LUG' },
];

// Interior
export const PIT_PACK_OPTIONS = [
  { id: 'pitpack', label: 'PIT PACK', price: 5599, originalPrice: 4911 },
];

export const FLOOR_MATERIAL_OPTIONS = [
  { id: '34plywood', label: '3/4" PLYWOOD', isStandard: true },
  { id: 'double34', label: 'DOUBLE 3/4" PLYWOOD - $DYNAMIC', price: null },
];

export const FLOOR_OVERLAY_OPTIONS = [
  { id: 'atp', label: 'ATP', price: 608 },
  { id: 'rtp', label: 'RTP', price: 440 },
  { id: 'coin', label: 'COIN', price: 440 },
  { id: 'tile', label: 'TILE FLOOR', price: 440 },
];

export const FLOOR_INSULATION_OPTIONS = [
  { id: 'rfoil_sheetmetal', label: 'R-FOIL + SHEET METAL', price: 808 },
];

export const WALL_MATERIAL_OPTIONS = [
  { id: '38plywood', label: '3/8" PLYWOOD', isStandard: true },
  { id: '34plywood', label: '3/4" PLYWOOD - $DYNAMIC', price: null },
  { id: 'white_metal_walls', label: '.030 WHITE METAL WALLS - $DYNAMIC', price: null },
];

export const WALL_INSULATION_OPTIONS = [
  { id: 'rfoil_walls', label: 'R-FOIL', price: 808 },
];

export const CEILING_MATERIAL_OPTIONS = [
  { id: 'thermaply', label: 'THERMA-PLY', isStandard: true },
  { id: 'white_metal_ceiling', label: '.030 WHITE METAL CEILING - $DYNAMIC', price: null },
  { id: 'atp_ceiling', label: 'ATP CEILING (DIAMOND PLATE CEILING) - $DYNAMIC', price: null },
];

export const CEILING_INSULATION_OPTIONS = [
  { id: 'rfoil_ceiling', label: 'R-FOIL', price: 608 },
];

export const BASE_CABINET_OPTIONS = [
  { id: 'wallrun36', label: 'WALL RUN 36"H - $DYNAMIC', price: null },
  { id: 'frontbase36', label: 'FRONT BASE 36"H', price: 1089 },
];

export const OVERHEAD_CABINET_OPTIONS = [
  { id: 'wallrun16', label: 'WALL RUN 16"H', locked: true },
  { id: 'frontoverhead16', label: 'FRONT OVERHEAD 16"H', locked: true },
];

export const FULL_HEIGHT_CABINET_OPTIONS = [
  { id: 'fullheight', label: 'FULL HEIGHT CABINET - $DYNAMIC', price: null },
];

export const TOOL_BOX_OPTIONS = [
  { id: 'none', label: 'NONE' },
  { id: 'frontbox', label: 'FRONT BOX', price: 9999 },
];

// Systems
export const ELECTRICAL_OPTIONS = [
  { id: 'none', label: 'NO ELECTRICAL', price: null },
  { id: '30amp', label: '30 AMP PACKAGE', price: 450 },
  { id: '50amp', label: '50 AMP PACKAGE', price: 540 },
];

export const RECEPTACLE_OPTIONS = [
  { id: '110vinterior', label: '110V INTERIOR RECEPTACLE (15 AMP)', price: 2000 },
  { id: '110vgfi', label: '110V GFI RECEPTACLE (20 AMP)', price: null },
];

export const OFF_GRID_POWER_OPTIONS = [
  { id: '12vdeepcycle', label: '12V DEEP CYCLE BATTERY W/BOX', price: 2000 },
  { id: '12vsolartrickle', label: '12V SOLAR TRICKLE CHARGER', price: 1999 },
];

export const INTERIOR_LIGHTING_OPTIONS = [
  { id: '12vleddome', label: '12V LED DOME LIGHT' },
  { id: '12vflatpanel', label: '12V 24" FLAT PANEL LED (2 INCLUDED)' },
  { id: 'ledrope', label: 'LED ROPE LIGHTING - $DYNAMIC', price: null },
];

export const EXTERIOR_LIGHTING_OPTIONS = [
  { id: '12vangledracing', label: '12V ANGLED RACING LED EXTERIOR LIGHT 24"', price: 1200 },
];

export const PASSIVE_VENTILATION_OPTIONS = [
  { id: 'nonpoweredvent', label: 'NON-POWERED VENT', price: 2000 },
  { id: 'smokenonpowered', label: 'SMOKE COLORED NON-POWERED VENT', price: 3499 },
  { id: '2waysidewall', label: '2-WAY SIDEWALL VENTS (SET OF 2)', price: 9999 },
];

export const CLIMATE_CONTROL_OPTIONS = [
  { id: 'none', label: 'NO CLIMATE CONTROL' },
];

export const ROOFTOP_AC_OPTIONS = [
  { id: '135kbtu', label: '13.5K BTU A/C + HEAT STRIP', price: 15999 },
  { id: '15kbtu', label: '15K BTU A/C + HEAT STRIP', price: 20000 },
];

export const MINI_SPLIT_OPTIONS = [
  { id: '12kminisplit', label: '12K MINI SPLIT AC', price: 30999 },
  { id: '18kminisplit', label: '18K MINI SPLIT AC W/220V WIRE', price: 8999 },
  { id: '24kminisplit', label: '24K MINI SPLIT AC W/220V WIRE', price: 14999 },
];

// Loading
export const REAR_ENTRANCE_OPTIONS = [
  { id: 'heavyduty', label: 'HEAVY DUTY RAMP W/FLAP - 4500 LB' },
  { id: 'doublereardoors', label: 'DOUBLE REAR DOORS I/O RAMP' },
  { id: 'rampdropjacks', label: 'RAMP DOOR W/ DROP LEG JACKS - $538' },
  { id: 'superduty', label: 'SUPER DUTY RAMP W/ DROP LEG JACKS (7000LB CAPACITY) - $743' },
];

export const SIDE_DOOR_PLACEMENT_OPTIONS = [
  { id: 'driver', label: 'DRIVER SIDE' },
  { id: 'passenger', label: 'PASSENGER SIDE' },
];

export const SIDE_DOOR_SIZE_OPTIONS = [
  { id: 'none', label: 'NONE' },
  { id: '36x72', label: '36" X 72" - $412' },
  { id: '36x78', label: '36" X 78" - $412' },
  { id: '48x78', label: '48" X 78" - $500' },
];

export const ESCAPE_DOOR_PLACEMENT_OPTIONS = [
  { id: 'driver', label: 'DRIVER SIDE' },
  { id: 'passenger', label: 'PASSENGER SIDE' },
];

export const ESCAPE_DOOR_SIZE_OPTIONS = [
  { id: '54x48', label: '54" X 48"' },
];

export const CONCESSION_DOOR_PLACEMENT_OPTIONS = [
  { id: 'driver', label: 'DRIVER SIDE' },
  { id: 'passenger', label: 'PASSENGER SIDE' },
];

export const WINDOWS_OPTIONS = [
  { id: 'vertical', label: 'VERTICAL GLIDER', price: 568 },
  { id: 'horizontal', label: 'HORIZONTAL SLIDER', price: 568 },
];

export const WINDOWS_SIZE_OPTIONS = [
  { id: '30x15', label: '30" X 15"', price: 412 },
  { id: '30x30', label: '30" X 30"', price: 412 },
  { id: '36x36', label: '36" X 36"', price: 500 },
];

export const WINDOWS_EGRESS_OPTIONS = [
  { id: 'egress', label: 'EGRESS', price: null },
];

export const D_RINGS_OPTIONS = [
  { id: 'drings4', label: 'D-RINGS (4) (5000LBS)' },
];

export const ADDITIONAL_D_RINGS_OPTIONS = [
  { id: 'walldrings', label: 'ADDITIONAL WALL D-RINGS (5000LBS)', price: 16 },
  { id: 'floordrings', label: 'ADDITIONAL FLOOR D-RINGS + BACKER', price: 16 },
];

export const E_TRACKS_OPTIONS = [
  { id: 'wall', label: 'WALL E-TRACK (CONTINUOUS ALUMINUM TRACK ALONG WALL) - $DYNAMIC' },
  { id: 'floor', label: 'FLOOR E-TRACK + STEEL BACKER - $DYNAMIC' },
  { id: 'small', label: 'SMALL SECTION E-TRACK - $DYNAMIC' },
];

export const JACKS_OPTIONS = [
  { id: 'folddown', label: 'FOLD DOWN STABILIZER JACK (PAIR) (REAR CORNER STABILIZER)', price: 44 },
  { id: '5kscissor', label: '5K SCISSOR JACK W/ HANDLE (PAIR) (HEAVY DUTY SIDE STABILIZER)', price: 135 },
  { id: '5000relectric', label: '5000R ELECTRIC TONGUE JACK W/DEEP CYCLE BATTERY', price: 526 },
];

// Add-Ons
export const WATER_PACKAGE_OPTIONS = [
  { id: 'small', label: 'SMALL WATER PACKAGE', locked: true },
  { id: 'large', label: 'LARGE WATER PACKAGE', price: 1721 },
];

export const SINK_PACKAGE_OPTIONS = [
  { id: 'sink', label: 'SINK PACKAGE', price: 1399 },
];

export const BATHROOM_PACKAGE_OPTIONS = [
  { id: 'half', label: 'HALF BATHROOM PACKAGE', price: 4224 },
  { id: 'full', label: 'FULL BATHROOM PACKAGE', price: 5410 },
];

export const WINCH_OPTIONS = [
  { id: 'winchsystem', label: 'WINCH SYSTEM (4500LB - 8000LB)' },
  { id: 'winchplate', label: 'WINCH PLATE ONLY', price: 68 },
];

export const GENERATOR_BOX_OPTIONS = [
  { id: 'lidonly', label: 'LID ONLY (NO DOOR, SLIDES OR TRAY)', price: 432 },
  { id: 'venteddoor', label: 'VENTED DOOR ONLY', price: 776 },
  { id: 'venteddoorslides', label: 'VENTED DOOR + SLIDES + TRAY', price: 1114 },
  { id: 'insulated', label: 'INSULATED INTERIOR COMPARTMENT W/DOOR, SLIDES & TRAY', price: 1114 },
];
