import { QRCodeSVG } from 'qrcode.react'
import LZString from 'lz-string'
import { useConfigurator } from '../context/ConfiguratorContext'

// Mirror the defaults from ConfiguratorContext — only changed fields are encoded
// so the QR payload stays small and the QR code stays scannable.
const DEFAULTS = {
  width: '7ft', length: '36', interiorHeight: '7ft0',
  axleAngled: false, axleAtp: true, axleRating: '5200torsion', spreadAxle: true,
  frontStyle: 'vnose', sideDoorsType: 'flatpanel', wheel: 'aluminumradial',
  rampType: 'heavyduty', rearDoor: true, leftSide: true, rightSide: true,
  cabinets: ['vnosebase'], toolBox: 'frontbox',
  lights: ['dome', 'racing'], tieDowns: ['drings'], jacks: ['folddownstabilizer'],
  bathroom: null, awning: [],
  angledLights: false, stairs: false, vNoseETrack: false, batteryBox: false,
  escapeDoor: 'none', generatorBox: false, winchSystem: false,
  extendedTripleTongue: false, radioPackageSpeaker: false, rearSpoiler: false,
  ladderRacks: false, sidewallVents: false, recessedTireBox: false,
  interiorTireMount: false, climateControl: 'wirebrace',
}

export default function QRModal({ onClose, onOpenAR, exporting }) {
  const config = useConfigurator()

  const all = {
    width: config.width, length: config.length, interiorHeight: config.interiorHeight,
    axleAngled: config.axleAngled, axleAtp: config.axleAtp,
    axleRating: config.axleRating, spreadAxle: config.spreadAxle,
    frontStyle: config.frontStyle, sideDoorsType: config.sideDoorsType,
    wheel: config.wheel, rampType: config.rampType, rearDoor: config.rearDoor,
    leftSide: config.leftSide, rightSide: config.rightSide,
    cabinets: config.cabinets, toolBox: config.toolBox,
    lights: config.lights, tieDowns: config.tieDowns, jacks: config.jacks,
    bathroom: config.bathroom, awning: config.awning,
    angledLights: config.angledLights, stairs: config.stairs,
    vNoseETrack: config.vNoseETrack, batteryBox: config.batteryBox,
    escapeDoor: config.escapeDoor, generatorBox: config.generatorBox,
    winchSystem: config.winchSystem, extendedTripleTongue: config.extendedTripleTongue,
    radioPackageSpeaker: config.radioPackageSpeaker, rearSpoiler: config.rearSpoiler,
    ladderRacks: config.ladderRacks, sidewallVents: config.sidewallVents,
    recessedTireBox: config.recessedTireBox, interiorTireMount: config.interiorTireMount,
    climateControl: config.climateControl,
  }

  // Only include fields that differ from defaults to keep the QR payload minimal
  const delta = {}
  for (const key of Object.keys(all)) {
    if (JSON.stringify(all[key]) !== JSON.stringify(DEFAULTS[key])) delta[key] = all[key]
  }

  const encoded = LZString.compressToEncodedURIComponent(JSON.stringify(delta))
  const url = `${window.location.origin}/#ar?c=${encoded}`

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
              width: 52,
              height: 52,
              excavate: true,
            }}
          />
        </div>

        <p className="text-gray-400 text-sm text-center leading-relaxed">
          Scan with your phone to view the trailer in AR
        </p>

        <button
          onClick={onOpenAR}
          disabled={exporting}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[#DA634B] rounded-lg text-sm font-semibold tracking-widest uppercase text-white hover:bg-[#c5573f] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exporting ? 'PREPARING AR...' : 'OPEN IN AR ON THIS DEVICE'}
        </button>

        <button
          onClick={onClose}
          className="text-gray-500 text-sm hover:text-gray-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
