import { useState } from 'react'
import { useConfigurator } from '../context/ConfiguratorContext'
import {
  WIDTH_OPTIONS, LENGTH_OPTIONS, INTERIOR_HEIGHT_OPTIONS, AXLE_RATING_OPTIONS,
  AXLE_SUSPENSION_OPTIONS, AXLE_CAPACITY_OPTIONS,
  ELECTRICAL_OPTIONS, OFF_GRID_POWER_OPTIONS, INTERIOR_LIGHTING_OPTIONS, EXTERIOR_LIGHTING_OPTIONS,
  PASSIVE_VENTILATION_OPTIONS, CLIMATE_CONTROL_OPTIONS, ROOFTOP_AC_OPTIONS, MINI_SPLIT_OPTIONS,
  REAR_ENTRANCE_OPTIONS, D_RINGS_OPTIONS, ADDITIONAL_D_RINGS_OPTIONS, E_TRACKS_OPTIONS, JACKS_OPTIONS,
  BATHROOM_PACKAGE_OPTIONS,
  EXTERIOR_FINISH_OPTIONS, COLOR_OPTIONS, FRONT_STYLE_OPTIONS, EXTERIOR_BUILD_OPTIONS,
  PROTECTION_TYPE_OPTIONS, PROTECTION_SIZE_OPTIONS, FRONT_PROTECTION_OPTIONS,
  WHEEL_TYPE_OPTIONS, FLOOR_MATERIAL_OPTIONS, FLOOR_OVERLAY_OPTIONS, FLOOR_INSULATION_OPTIONS,
  WALL_MATERIAL_OPTIONS, WALL_INSULATION_OPTIONS, CEILING_MATERIAL_OPTIONS, CEILING_INSULATION_OPTIONS,
  BASE_CABINET_OPTIONS, OVERHEAD_CABINET_OPTIONS, FULL_HEIGHT_CABINET_OPTIONS, TOOL_BOX_OPTIONS,
  SIDE_DOOR_OPTIONS, ROOF_BUILD_OPTIONS, LUG_OPTIONS, TIRE_SIZE_OPTIONS, WATER_PACKAGE_OPTIONS, EXTERIOR_ACCESSORIES_OPTIONS, WINCH_OPTIONS, GENERATOR_BOX_OPTIONS, ESCAPE_DOOR_SIZE_OPTIONS
} from '../constants/configData'

const LIGHT_OPTIONS = [...INTERIOR_LIGHTING_OPTIONS, ...EXTERIOR_LIGHTING_OPTIONS];
const VENTILATION_OPTIONS = PASSIVE_VENTILATION_OPTIONS;
const CLIMATE_OPTIONS = [...CLIMATE_CONTROL_OPTIONS, ...ROOFTOP_AC_OPTIONS, ...MINI_SPLIT_OPTIONS];
const RAMP_OPTIONS = REAR_ENTRANCE_OPTIONS;
const TIE_DOWN_OPTIONS = [...D_RINGS_OPTIONS, ...ADDITIONAL_D_RINGS_OPTIONS, ...E_TRACKS_OPTIONS];
const PROTECTION_OPTIONS = [...PROTECTION_TYPE_OPTIONS, ...PROTECTION_SIZE_OPTIONS, ...FRONT_PROTECTION_OPTIONS];
const WHEEL_OPTIONS = WHEEL_TYPE_OPTIONS;
const FLOOR_OPTIONS = [...FLOOR_MATERIAL_OPTIONS, ...FLOOR_OVERLAY_OPTIONS, ...FLOOR_INSULATION_OPTIONS];
const WALL_OPTIONS = [...WALL_MATERIAL_OPTIONS, ...WALL_INSULATION_OPTIONS];
const CEILING_OPTIONS = [...CEILING_MATERIAL_OPTIONS, ...CEILING_INSULATION_OPTIONS];
const CABINET_OPTIONS = [...BASE_CABINET_OPTIONS, ...OVERHEAD_CABINET_OPTIONS, ...FULL_HEIGHT_CABINET_OPTIONS];
const BATTERY_OPTIONS = OFF_GRID_POWER_OPTIONS;
const BATHROOM_OPTIONS = BATHROOM_PACKAGE_OPTIONS;

const TABS = ['TRAILER BUILD', 'CONFIGURATIONS', 'ADD-ONS', 'APPEARANCE']
const find = (opts, id) => opts.find(o => o.id === id)

function LineItem({ label, price, onRemove }) {
  return (
    <div className="flex items-center justify-between bg-[#252525] rounded-lg px-4 py-3">
      <span className="text-white text-xs font-semibold tracking-widest uppercase">{label}</span>
      <div className="flex items-center gap-3">
        {price != null && (
          <span className="text-[#DA634B] text-sm font-bold">+${price.toLocaleString()}</span>
        )}
        {onRemove && (
          <button onClick={onRemove} className="text-gray-500 hover:text-red-400 transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

export default function SummaryPanel() {
  const ctx = useConfigurator()
  const { summaryOpen, setSummaryOpen, totalPrice } = ctx
  const [activeTab, setActiveTab] = useState('TRAILER BUILD')
  const [instructions, setInstructions] = useState('')

  if (!summaryOpen) return null

  const getItems = () => {
    const {
      width, length, interiorHeight, axleAngled, axleAtp, axleRating, axleSuspension, axleCapacity,
      electrical, battery, lights, toggleLight, ventilation, climateControl,
      rampType, atpRamp, rearDoor, tieDowns, toggleTieDown, jacks, toggleJack,
      waterPackage, setWaterPackage, bathroom, setBathroom, awning, toggleAwning,
      exteriorFinish, selectedColor, exteriorAccessories, frontStyle, sideDoorsType, exteriorBuild, roofBuild, protectionType, protectionSize, frontProtection, lugType, tireSize, wheelType, spareTire, setSpareTire,
      floor, walls, ceiling, cabinets, toggleCabinet, toolBox, stairs, setStairs,
      angledLights, setAngledLights, vNoseETrack, setVNoseETrack, batteryBox, setBatteryBox,
      escapeDoor, setEscapeDoor, generatorBox, setGeneratorBox, winchSystem, setWinchSystem,
      sideDoorBarLock, setSideDoorBarLock, concessionDoor, setConcessionDoor,
      driverSideDoor, passengerSideDoor,
      extendedTripleTongue, setExtendedTripleTongue, radioPackageSpeaker, setRadioPackageSpeaker, rearSpoiler, setRearSpoiler,
      ladderRacks, setLadderRacks, sidewallVents, setSidewallVents, recessedTireBox, setRecessedTireBox, interiorTireMount, setInteriorTireMount
    } = ctx

    if (activeTab === 'TRAILER BUILD') {
      const items = []
      const w = find(WIDTH_OPTIONS, width); if (w) items.push({ label: `WIDTH: ${w.label}`, price: w.price })
      const l = find(LENGTH_OPTIONS, length); if (l) items.push({ label: `LENGTH: ${l.label}`, price: l.price })
      const h = find(INTERIOR_HEIGHT_OPTIONS, interiorHeight); if (h && !h.isStandard) items.push({ label: `HEIGHT: ${h.label}`, price: h.price })
      if (axleAngled || axleAtp) {
        const axleLabel = [axleAngled ? 'ANGLED' : 'FLAT', axleAtp ? '+ ATP' : ''].filter(Boolean).join(' ')
        items.push({ label: `AXLE: ${axleLabel}`, price: axleAtp ? 9999 : 0 })
      }
      const susp = find(AXLE_SUSPENSION_OPTIONS, axleSuspension); if (susp && !susp.isStandard) items.push({ label: `SUSPENSION: ${susp.label}`, price: susp.price })
      const cap = find(AXLE_CAPACITY_OPTIONS, axleCapacity); if (cap && !cap.isStandard) items.push({ label: `CAPACITY: ${cap.label}`, price: cap.price })
      return items
    }
    if (activeTab === 'CONFIGURATIONS') {
      const items = []
      const e = find(ELECTRICAL_OPTIONS, electrical); if (e) items.push({ label: e.label, price: e.price })
      const b = find(BATTERY_OPTIONS, battery); if (b) items.push({ label: b.label, price: b.price })
      const v = find(VENTILATION_OPTIONS, ventilation); if (v && v.id !== 'none') items.push({ label: v.label, price: v.price })
      if (ctx.acPrep) items.push({ label: 'WIRE & BRACE FOR A/C (PREP ONLY)', price: 70, onRemove: () => ctx.setAcPrep(false) })
      const cc = find(CLIMATE_OPTIONS, climateControl); if (cc && cc.id !== 'none') items.push({ label: cc.label, price: cc.price })
      const r = find(RAMP_OPTIONS, rampType); if (r) items.push({ label: r.label, price: r.price })
      if (atpRamp) { items.push({ label: 'ATP ON RAMP', price: 400 }) }
      if (rearDoor) { items.push({ label: 'REAR DOOR', price: 0 }) }
      const sd = find(SIDE_DOOR_OPTIONS, sideDoorsType); if (sd && !sd.isStandard) items.push({ label: sd.label, price: sd.price })
      
      if (driverSideDoor === '48x78') {
        items.push({ label: '48" X 78" SIDE DOOR UPGRADE', price: 120, onRemove: () => ctx.setDriverSideDoor('36x78') });
      }
      
      if (passengerSideDoor === '36x78' || passengerSideDoor === '36x72') {
        items.push({ label: 'ADDITIONAL 36" SIDE DOOR', price: 295, onRemove: () => ctx.setPassengerSideDoor('none') });
      } else if (passengerSideDoor === '48x78') {
        items.push({ label: 'ADDITIONAL 48" X 78" SIDE DOOR', price: 335, onRemove: () => ctx.setPassengerSideDoor('none') });
      }

      // if (sideDoorBarLock) {
      //   items.push({ label: 'BAR LOCK ON SIDE DOOR', price: 60, onRemove: () => setSideDoorBarLock(false) });
      // }
      lights.forEach(id => { const o = find(LIGHT_OPTIONS, id); if (o && o.price) items.push({ label: o.label, price: o.price, onRemove: () => toggleLight(id) }) })
      tieDowns.forEach(id => { 
        const o = find(TIE_DOWN_OPTIONS, id); 
        if (o) {
          if (id === 'wall' || id === 'floor') {
            const len = parseInt(ctx.length) || 0;
            items.push({ label: `${len}'x ${o.label}`, price: (o.price || 0) * len, onRemove: () => toggleTieDown(id) });
          } else {
            const qty = (ctx.dRings && typeof ctx.dRings[id] === 'number' && ctx.dRings[id] > 0) ? ctx.dRings[id] : 1;
            items.push({ label: qty > 1 ? `${qty}x ${o.label}` : o.label, price: (o.price || 0) * qty, onRemove: () => toggleTieDown(id) });
          }
        }
      })
      jacks.forEach(id => { const o = find(JACKS_OPTIONS, id); if (o) items.push({ label: o.label, price: o.price, onRemove: () => toggleJack(id) }) })
      return items
    }
    if (activeTab === 'ADD-ONS') {
      const items = []
      const wp = find(WATER_PACKAGE_OPTIONS, waterPackage); if (wp && wp.id !== 'none') items.push({ label: wp.label, price: wp.price })
      if (bathroom) { const o = find(BATHROOM_OPTIONS, bathroom); if (o) items.push({ label: o.label, price: o.price, onRemove: () => setBathroom(null) }) }
      if (stairs) { items.push({ label: 'STAIRS', price: 150, onRemove: () => setStairs(false) }) }
      if (angledLights) { items.push({ label: 'ANGLED LIGHTS', price: 200, onRemove: () => setAngledLights(false) }) }
      if (vNoseETrack) { items.push({ label: 'V-NOSE E-TRACK', price: 100, onRemove: () => setVNoseETrack(false) }) }
      if (batteryBox) { items.push({ label: 'BATTERY BOX', price: 120, onRemove: () => setBatteryBox(false) }) }
      if (escapeDoor && escapeDoor !== 'none') { 
        const ed = find(ESCAPE_DOOR_SIZE_OPTIONS, escapeDoor);
        items.push({ label: ed ? ed.label : 'ESCAPE DOOR', price: ed ? ed.price : null, onRemove: () => setEscapeDoor('none') }) 
      }
      if (concessionDoor && concessionDoor !== 'none') {
        const isConcessionPriced = ctx.glassScreen
                                 && ctx.concessionWidth === '72in'
                                 && ctx.concessionHeight === '36in';
        if (isConcessionPriced) {
          items.push({ label: "3'x6' CONCESSION WINDOW (WITH GLASS)", price: 1250, onRemove: () => ctx.setConcessionDoor('none') })
        } else {
          items.push({ label: "CONCESSION DOOR / WINDOW", price: 0, onRemove: () => ctx.setConcessionDoor('none') })
        }
      }
      if (generatorBox && generatorBox !== 'none') { items.push({ label: 'GENERATOR BOX', price: 500, onRemove: () => setGeneratorBox('none') }) }
      if (winchSystem) { items.push({ label: 'WINCH SYSTEM', price: 1000, onRemove: () => setWinchSystem(false) }) }
      if (extendedTripleTongue) { items.push({ label: 'EXTENDED TRIPLE TONGUE', price: 400, onRemove: () => setExtendedTripleTongue(false) }) }
      if (radioPackageSpeaker) { items.push({ label: 'RADIO PACKAGE SPEAKER', price: 600, onRemove: () => setRadioPackageSpeaker(false) }) }
      if (rearSpoiler) { items.push({ label: 'REAR SPOILER', price: 300, onRemove: () => setRearSpoiler(false) }) }
      if (ladderRacks) { items.push({ label: 'LADDER RACKS', price: 250, onRemove: () => setLadderRacks(false) }) }
      if (sidewallVents) { items.push({ label: 'SIDEWALL VENTS', price: 150, onRemove: () => setSidewallVents(false) }) }
      if (recessedTireBox) { items.push({ label: 'RECESSED TIRE BOX', price: 200, onRemove: () => setRecessedTireBox(false) }) }
      if (interiorTireMount) { items.push({ label: 'INTERIOR TIRE MOUNT', price: 100, onRemove: () => setInteriorTireMount(false) }) }
      return items
    }
    if (activeTab === 'APPEARANCE') {
      const items = []
      const ef = find(EXTERIOR_FINISH_OPTIONS, exteriorFinish); if (ef && !ef.isStandard) items.push({ label: ef.label, price: ef.price })
      const col = find(COLOR_OPTIONS, selectedColor); if (col) items.push({ label: `COLOR: ${col.label}` })
      const ea = find(EXTERIOR_ACCESSORIES_OPTIONS, exteriorAccessories); if (ea && ea.id !== 'none') items.push({ label: ea.label, price: ea.price })
      const fs = find(FRONT_STYLE_OPTIONS, frontStyle); if (fs && !fs.isStandard) items.push({ label: fs.label, price: fs.price })
      const eb = find(EXTERIOR_BUILD_OPTIONS, exteriorBuild); if (eb && !eb.isStandard) items.push({ label: eb.label, price: eb.price })
      const rb = find(ROOF_BUILD_OPTIONS, roofBuild); if (rb && !rb.isStandard) items.push({ label: rb.label, price: rb.price })
      const pt = find(PROTECTION_OPTIONS, protectionType); if (pt && !pt.isStandard) items.push({ label: pt.label, price: pt.price })
      const ps = find(PROTECTION_OPTIONS, protectionSize); if (ps && !ps.isStandard) items.push({ label: ps.label, price: ps.price })
      const fp = find(PROTECTION_OPTIONS, frontProtection); if (fp && !fp.isStandard) items.push({ label: fp.label, price: fp.price })
      const lt = find(LUG_OPTIONS, lugType); if (lt && !lt.isStandard) items.push({ label: lt.label, price: lt.price })
      const ts = find(TIRE_SIZE_OPTIONS, tireSize); if (ts && !ts.isStandard) items.push({ label: ts.label, price: ts.price })
      const wh = find(WHEEL_OPTIONS, wheelType); if (wh && !wh.isStandard) items.push({ label: wh.label, price: wh.price })
      if (spareTire) { items.push({ label: 'SPARE TIRE', price: 250, onRemove: () => setSpareTire(false) }) }
      const fl = find(FLOOR_OPTIONS, floor); if (fl && !fl.isStandard) items.push({ label: fl.label, price: fl.price })
      const wa = find(WALL_OPTIONS, walls); if (wa && !wa.isStandard) items.push({ label: wa.label, price: wa.price })
      const ce = find(CEILING_OPTIONS, ceiling); if (ce && !ce.isStandard) items.push({ label: ce.label, price: ce.price })
      cabinets.forEach(id => { const o = find(CABINET_OPTIONS, id); if (o) items.push({ label: o.label, price: o.price, onRemove: () => toggleCabinet(id) }) })
      const tb = find(TOOL_BOX_OPTIONS, toolBox); if (tb && tb.id !== 'none') items.push({ label: `TOOL BOX: ${tb.label}`, price: tb.price })
      return items
    }
    return []
  }

  const items = getItems()

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:mr-1 lg:items-end lg:justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={() => setSummaryOpen(false)} />
      <div
        className="relative bg-[#1a1a1a] w-full lg:w-[500px] xl:w-[551px] max-h-[90dvh] flex flex-col overflow-hidden lg:mr-0 lg:mb-4 rounded-t-2xl lg:rounded-2xl animate-slide-up"
        style={{
          border: '1px solid transparent',
          backgroundImage: 'linear-gradient(#1a1a1a, #1a1a1a), linear-gradient(135deg, #F05637 0%, #FFCDC0 50%, #F05637 100%)',
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
        }}
      >
        <div className="flex items-center justify-between px-8 pt-7 pb-4">
          <h2 className="text-white text-3xl font-bold">Your Build</h2>
          <button onClick={() => setSummaryOpen(false)} className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mx-6 mb-4 bg-[#252525] rounded-xl p-4 flex items-center gap-4">
          <img src="/trailer.png" alt="Trailer" className="w-24 h-14 object-contain"
            onError={(e) => { e.currentTarget.style.display = 'none' }} />
          <div>
            <p className="text-white font-bold text-base tracking-widest uppercase">CAR HAULER</p>
            <p className="text-white text-2xl font-bold">${totalPrice.toLocaleString()}</p>
          </div>
        </div>

        <div className="flex border-b border-[#333] px-6">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-3 py-3 text-[10px] font-bold tracking-widest uppercase transition-colors whitespace-nowrap ${
                activeTab === tab ? 'text-white border-b-2 border-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >{tab}</button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-2 scrollbar-thin min-h-[120px]">
          {items.length === 0
            ? <p className="text-gray-500 text-sm text-center py-8">No upgrades selected</p>
            : items.map((item, i) => <LineItem key={i} {...item} />)
          }
        </div>

        <div className="px-6 pt-4 border-t border-[#333]">
          <p className="text-white text-sm font-semibold mb-2">Special Instructions</p>
          <textarea value={instructions} onChange={e => setInstructions(e.target.value)}
            placeholder="I need it for a car meet in 3 weeks"
            rows={2}
            className="w-full bg-[#252525] border border-[#333] rounded-lg px-4 py-3 text-white text-sm placeholder-gray-600 resize-none outline-none focus:border-[#DA634B] transition-colors"
          />
        </div>

        <div className="px-6 py-4">
          <div className="space-y-1 mb-3">
            {[['Trailer Build', `$${ctx.pricing?.trailerBuild?.toLocaleString()}`], ['Configurations', `$${ctx.pricing?.configurations?.toLocaleString()}`], ['Appearance', `$${ctx.pricing?.appearance?.toLocaleString()}`]].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm text-gray-400"><span>{k}</span><span>{v}</span></div>
            ))}
          </div>
          <div className="flex justify-between text-white font-bold text-lg pt-3 border-t border-[#333]">
            <span>Total</span><span>${totalPrice.toLocaleString()}</span>
          </div>
        </div>

        <div className="px-6 pb-6">
          <button className="w-full py-4 rounded-xl flex items-center justify-center gap-2 text-sm font-bold tracking-widest uppercase text-white transition-all"
            style={{
              border: '1px solid transparent',
              backgroundImage: 'linear-gradient(#252525, #252525), linear-gradient(135deg, #F05637, #FFCDC0, #F05637)',
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box',
            }}
          >
            CONNECT WITH US
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
