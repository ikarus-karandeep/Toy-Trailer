import { QRCodeSVG } from 'qrcode.react'
import LZString from 'lz-string'
import { useConfigurator } from '../context/ConfiguratorContext'
import { PACKAGE_INITIAL_CONFIGS } from '../constants/packageConfigs'

// Mirror the defaults from ConfiguratorContext — only changed fields are encoded
// so the QR payload stays small and the QR code stays scannable.
const DEFAULTS = {
  width: '8.5ft', length: '32', frameSize: '6in', axleCount: 'tandem',
  axleSuspension: 'torsion', axleCapacity: '7000lb', interiorHeight: '8ft6',
  spreadAxle: false, narrowTrackAxle: false, axleAngled: false, axleAtp: true,
  exteriorFinish: null, selectedColor: 'brandywine', exteriorAccessories: 'none',
  frontStyle: 'vnose24', exteriorBuild: 'semiscrewed', roofBuild: 'onepieceroof',
  protectionType: 'atp', protectionSize: '24', frontProtection: 'polishedcaps',
  lugType: '5lug', tireSize: '15', wheelType: 'standardsilver', spareTire: true,
  sideDoorsType: 'flatpanel', driverSideDoor: '36x78', passengerSideDoor: 'none', sideDoorBarLock: false,
  floor: '34plywood', floorOverlay: 'atp', floorInsulation: null, walls: 'white_metal_walls',
  ceiling: 'white_metal_ceiling', wallInsulation: null, ceilingInsulation: null, atpWheelWells: false,
  cabinets: ['frontbase36'], blackoutCabinetDoors: false, toolBox: 'none', leftSide: true, rightSide: true,
  electrical: 'none', battery: '12vbatterybox', lights: ['dome', 'racing'],
  interiorLights: { '12vleddome': 0, '12vflatpanel': 0 }, exteriorLights: [],
  ledRope: false, ventilation: 'none', climateControl: 'none', acPrep: false,
  receptacles: { '110vinterior': 0, '110vgfi': 0 }, rampType: 'doublereardoors', atpRamp: true,
  rearDoor: true, tieDowns: ['drings'], dRings: { drings: 0, walldrings: 0, floordrings: 0 },
  jacks: [''], waterPackage: 'largewater', bathroom: null, awning: [], sinkPackage: null,
  angledLights: false, stairs: false, vNoseETrack: false, batteryBox: false,
  escapeDoor: 'none', concessionDoor: 'none', glassScreen: false, generatorBox: 'none',
  concessionWidth: '72in', concessionHeight: '36in', lShapeCounter: false, genSlides: false,
  genDoor: false, windows: { vertical: 0, horizontal: 0, egress: 0 },
  windowSizes: { vertical: '15x30', horizontal: '50x30', egress: '30x30' },
  winchSystem: false, extendedTripleTongue: false, radioPackageSpeaker: false,
  rearSpoiler: false, ladderRacks: false, sidewallVents: false, recessedTireBox: false, interiorTireMount: false
}

export default function QRModal({ onClose, onOpenAR, exporting }) {
  const config = useConfigurator()

  const packageDefaults = { 
    ...DEFAULTS, 
    ...(config.packageId ? PACKAGE_INITIAL_CONFIGS[config.packageId] || {} : {}) 
  }

  const all = {}
  for (const key of Object.keys(packageDefaults)) {
    if (config[key] !== undefined) {
      all[key] = config[key]
    } else {
      all[key] = packageDefaults[key]
    }
  }

  // Only include fields that differ from the active package defaults to keep the QR payload minimal
  const delta = {}
  for (const key of Object.keys(all)) {
    if (JSON.stringify(all[key]) !== JSON.stringify(packageDefaults[key])) delta[key] = all[key]
  }

  // Ensure packageId is passed so the AR viewer knows the base configuration
  if (config.packageId) {
    delta.packageId = config.packageId
  }

  const encoded = LZString.compressToEncodedURIComponent(JSON.stringify(delta))
  const url = `${window.location.origin}/?arKey=${encoded}#ar`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#1a1a1a] border border-[#3a3a3a] rounded-2xl p-8 flex flex-col items-center gap-6 max-w-sm w-full mx-4">
        <h2 className="text-white text-xl font-bold tracking-widest uppercase text-center">
          View In Your Driveway
        </h2>

        <div className="bg-white p-4 rounded-xl">
          <QRCodeSVG
            value={url}
            size={220}
            level="H"
            imageSettings={{
              src: '/ikarus_logo.png',
              width: 44,
              height: 52,
              excavate: true,
            }}
          />
        </div>

        <p className="text-gray-400 text-sm text-center leading-relaxed">
          Scan with your phone to view the trailer in AR
        </p>

        {/* <button
          onClick={onOpenAR}
          disabled={exporting}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[#DA634B] rounded-lg text-sm font-semibold tracking-widest uppercase text-white hover:bg-[#c5573f] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exporting ? 'PREPARING AR...' : 'OPEN IN AR ON THIS DEVICE'}
        </button> */}

        <button
          onClick={onClose}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[#DA634B] rounded-lg text-sm font-semibold tracking-widest uppercase text-white hover:bg-[#c5573f] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
