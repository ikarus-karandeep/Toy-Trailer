import { useState, useEffect } from 'react'
import { useConfigurator } from '../../context/ConfiguratorContext'
import { usePackageBadge } from '../../hooks/usePackageBadge'
import {
  PIT_PACK_OPTIONS,
  FLOOR_MATERIAL_OPTIONS,
  FLOOR_OVERLAY_OPTIONS,
  FLOOR_INSULATION_OPTIONS,
  WALL_MATERIAL_OPTIONS,
  WALL_INSULATION_OPTIONS,
  CEILING_MATERIAL_OPTIONS,
  CEILING_INSULATION_OPTIONS,
  BASE_CABINET_OPTIONS,
  OVERHEAD_CABINET_OPTIONS,
  FULL_HEIGHT_CABINET_OPTIONS,
  TOOL_BOX_OPTIONS
} from '../../constants/configData'
import OptionSection from '../../components/OptionSection'
import OptionPill from '../../components/OptionPill'
import ToggleSwitch from '../../components/ToggleSwitch'

export default function InteriorPanel({ activeSectionTitle }) {
  const {
    floor, setFloor,
    walls, setWalls,
    ceiling, setCeiling,
    cabinets, toggleCabinet, setCabinetsRaw,
    toolBox, setToolBox,
    length,
  } = useConfigurator()

  const getBadge = usePackageBadge()

  // Local state for new UI components (until context is fully updated)
  const [pitPack, setPitPack] = useState(false)
  const [pitPackOpen, setPitPackOpen] = useState(true)

  const [floorMaterial, setFloorMaterial] = useState('34plywood')
  const [floorOverlay, setFloorOverlay] = useState(null)
  const [floorInsulation, setFloorInsulation] = useState(null)
  const [atpWheelWells, setAtpWheelWells] = useState(false)

  const [wallMaterial, setWallMaterial] = useState('38plywood')
  const [wallInsulation, setWallInsulation] = useState(null)

  const [ceilingMaterial, setCeilingMaterial] = useState('thermaply')
  const [ceilingInsulation, setCeilingInsulation] = useState(null)

  const [blackoutCabinetDoors, setBlackoutCabinetDoors] = useState(false)

  const show = (title) => !activeSectionTitle || activeSectionTitle === title

  useEffect(() => {
    if (parseFloat(length) < 24 && cabinets.includes('wallrun36')) {
      setCabinetsRaw(prev => prev.filter(c => c !== 'wallrun36' && c !== 'wallrun16'))
    }
  }, [length, cabinets, setCabinetsRaw])

  useEffect(() => {
    if (!cabinets.includes('wallrun36') && cabinets.includes('wallrun16')) {
      setCabinetsRaw(prev => prev.filter(c => c !== 'wallrun16'))
    }
    if (!cabinets.includes('frontbase36') && cabinets.includes('frontoverhead16')) {
      setCabinetsRaw(prev => prev.filter(c => c !== 'frontoverhead16'))
    }
  }, [cabinets])

  return (
    <>
      {show('PIT PACK') && (
        <OptionSection title="PIT PACK">
          <div className="flex flex-col gap-2">
            {PIT_PACK_OPTIONS.map((opt) => (
              <div key={opt.id} className="w-full">
                <OptionPill
                  label={opt.label}
                  price={opt.price}
                  originalPrice={opt.originalPrice}
                  isSelected={pitPack}
                  hasSettings
                  onClick={() => setPitPack(!pitPack)}
                />
                
                {pitPack && (
                  <div className="mt-4 bg-[#111111] rounded-2xl p-5 border border-[#2a2a2a]">
                    <div 
                      className="flex items-center justify-between mb-4 cursor-pointer"
                      onClick={() => setPitPackOpen(!pitPackOpen)}
                    >
                      <span className="text-gray-300 text-xs tracking-widest uppercase font-semibold">
                        What's Included
                      </span>
                      <span className="w-5 h-5 rounded-full border border-gray-500 text-gray-400 text-[10px] flex items-center justify-center">
                        <svg className={`w-3 h-3 transition-transform ${pitPackOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </span>
                    </div>
                    {pitPackOpen && (
                      <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-white text-[12px] lg:text-sm">
                        <div className="flex items-start gap-2">
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-white shrink-0" />
                          <span>Base & overhead Cabinet</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-white shrink-0" />
                          <span>ATP/RTP floor & Ramp</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-white shrink-0" />
                          <span>White metal walls & ceiling</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-white shrink-0" />
                          <span>(2) Angled racing Lights</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-white shrink-0" />
                          <span>2 rear loading lights</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-white shrink-0" />
                          <span>50 AMP electric</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-white shrink-0" />
                          <span>12v deep cycle battery</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-white shrink-0" />
                          <span>Solar Trickle Charger</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-white shrink-0" />
                          <span>Blackout interior</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </OptionSection>
      )}

      {show('FLOOR') && (
        <OptionSection title="FLOOR">
          <div className="mb-6">
            <h4 className="text-white text-sm font-semibold uppercase tracking-wider mb-1">MATERIAL</h4>
            <p className="text-gray-400 text-xs tracking-wider mb-4">Choose double ply wood for extra structural rigidity</p>
            <div className="flex flex-wrap gap-2">
              {FLOOR_MATERIAL_OPTIONS.map((opt) => (
                <OptionPill
                  key={opt.id}
                  label={opt.label}
                  price={opt.price}
                  isSelected={floorMaterial === opt.id}
                  onClick={() => setFloorMaterial(opt.id)}
                  packageBadge={getBadge(opt.id)}
                />
              ))}
            </div>
          </div>
          <p className='border-t border-[#5D5E60]'></p>
          <div className="mb-6">
            <h4 className="text-white text-sm font-semibold uppercase tracking-wider mb-3">FLOOR OVERLAY</h4>
            <div className="flex flex-wrap gap-2">
              {FLOOR_OVERLAY_OPTIONS.map((opt) => (
                <OptionPill
                  key={opt.id}
                  label={opt.label}
                  price={opt.price}
                  isSelected={floorOverlay === opt.id}
                  onClick={() => setFloorOverlay(opt.id === floorOverlay ? null : opt.id)}
                />
              ))}
            </div>
          </div>
          <p className='border-t border-[#5D5E60]'></p>
          <div className="mb-6">
            <h4 className="text-white text-sm font-semibold uppercase tracking-wider mb-1">FLOOR INSULATION</h4>
            <p className="text-gray-400 text-xs tracking-wider mb-4">Thermal Floor Insulation</p>
            <div className="flex flex-wrap gap-2">
              {FLOOR_INSULATION_OPTIONS.map((opt) => (
                <OptionPill
                  key={opt.id}
                  label={opt.label}
                  price={opt.price}
                  isSelected={floorInsulation === opt.id}
                  onClick={() => setFloorInsulation(opt.id === floorInsulation ? null : opt.id)}
                />
              ))}
            </div>
          </div>

          <div>
            <ToggleSwitch
              label="ATP Covered Wheel Wells - $440 ($135 each)"
              checked={atpWheelWells}
              onChange={setAtpWheelWells}
            />
          </div>
        </OptionSection>
      )}

      {show('WALLS') && (
        <OptionSection title="WALLS">
          <div className="mb-4">
            <h4 className="text-white text-sm font-semibold uppercase tracking-wider mb-1">MATERIAL</h4>
            <p className="text-gray-400 text-xs tracking-wider mb-4">White Metal Walls w/ Clean, Durable, Washable Liners</p>
            <div className="flex flex-wrap gap-2">
              {WALL_MATERIAL_OPTIONS.map((opt) => (
                <OptionPill
                  key={opt.id}
                  label={opt.label}
                  price={opt.price}
                  isSelected={wallMaterial === opt.id}
                  onClick={() => setWallMaterial(opt.id)}
                  packageBadge={getBadge(opt.id)}
                />
              ))}
            </div>
          </div>
          <p className='border-t border-[#5D5E60]'></p>
          <div>
            <h4 className="text-white text-sm font-semibold uppercase tracking-wider mb-1">WALL INSULATION</h4>
            <p className="text-gray-400 text-xs tracking-wider mb-4">Thermal + Acoustic Wall Insulation. Pair with AC</p>
            <div className="flex flex-wrap gap-2">
              {WALL_INSULATION_OPTIONS.map((opt) => (
                <OptionPill
                  key={opt.id}
                  label={opt.label}
                  price={opt.price}
                  isSelected={wallInsulation === opt.id}
                  onClick={() => setWallInsulation(opt.id === wallInsulation ? null : opt.id)}
                />
              ))}
            </div>
          </div>
        </OptionSection>
      )}

      {show('CEILING') && (
        <OptionSection title="CEILING">
          <div className="mb-4">
            <h4 className="text-white text-sm font-semibold uppercase tracking-wider mb-3">MATERIAL</h4>
            <div className="flex flex-col gap-2">
              {CEILING_MATERIAL_OPTIONS.map((opt) => (
                <OptionPill
                  key={opt.id}
                  label={opt.label}
                  price={opt.price}
                  isSelected={ceilingMaterial === opt.id}
                  onClick={() => setCeilingMaterial(opt.id)}
                  packageBadge={getBadge(opt.id)}
                />
              ))}
            </div>
          </div>
          <p className='border-t border-[#5D5E60]'></p>
          <div>
            <h4 className="text-white text-sm font-semibold uppercase tracking-wider mb-1">CEILING INSULATION</h4>
            <p className="text-gray-400 text-xs tracking-wider mb-4">Thermal + Acoustic Ceiling Insulation. Pairs with AC</p>
            <div className="flex flex-wrap gap-2">
              {CEILING_INSULATION_OPTIONS.map((opt) => (
                <OptionPill
                  key={opt.id}
                  label={opt.label}
                  price={opt.price}
                  isSelected={ceilingInsulation === opt.id}
                  onClick={() => setCeilingInsulation(opt.id === ceilingInsulation ? null : opt.id)}
                />
              ))}
            </div>
          </div>
        </OptionSection>
      )}

      {show('CABINETS') && (
        <OptionSection title="CABINETS">
          <div className="mb-4">
            <h4 className="text-white text-sm font-semibold uppercase tracking-wider mb-1">BASE CABINETS</h4>
            <p className="text-gray-400 text-xs tracking-wider mb-4">ATP Diamond Plate Finish. Countertop Included</p>
            <div className="flex flex-col gap-2">
              {BASE_CABINET_OPTIONS.map((opt) => {
                let isLocked = false;
                if (opt.id === 'wallrun36' && parseFloat(length) < 24) isLocked = true;
                
                return (
                  <OptionPill
                    key={opt.id}
                    label={opt.label}
                    price={opt.price}
                    isLocked={isLocked}
                    isSelected={cabinets.includes(opt.id)}
                    hasSettings={opt.id === 'frontbase36'}
                    onClick={() => !isLocked && toggleCabinet(opt.id)}
                    isMulti={true}
                    packageBadge={getBadge(opt.id)}
                  />
                );
              })}
            </div>
          </div>
          <p className='border-t border-[#5D5E60]'></p>
          <div className="mb-4">
            <h4 className="text-white text-sm font-semibold uppercase tracking-wider mb-1">OVERHEAD CABINETS</h4>
            <p className="text-gray-400 text-xs tracking-wider mb-4">N/A with Slant/ Slant V-Nose</p>
            <div className="flex flex-col gap-2">
              {OVERHEAD_CABINET_OPTIONS.map((opt) => {
                let isLocked = true;
                if (opt.id === 'wallrun16' && cabinets.includes('wallrun36')) isLocked = false;
                if (opt.id === 'frontoverhead16' && cabinets.includes('frontbase36')) isLocked = false;
                
                return (
                  <OptionPill
                    key={opt.id}
                    label={opt.label}
                    price={opt.price}
                    isLocked={isLocked}
                    isSelected={cabinets.includes(opt.id)}
                    onClick={() => !isLocked && toggleCabinet(opt.id)}
                    isMulti={true}
                  />
                );
              })}
            </div>
          </div>
          <p className='border-t border-[#5D5E60]'></p>

          <div className="mb-4">
            <h4 className="text-white text-sm font-semibold uppercase tracking-wider mb-3">FLOOR TO CEILING CABINETS</h4>
            <div className="flex flex-col gap-2">
              {FULL_HEIGHT_CABINET_OPTIONS.map((opt) => (
                <OptionPill
                  key={opt.id}
                  label={opt.label}
                  price={opt.price}
                  isSelected={cabinets.includes(opt.id)}
                  onClick={() => toggleCabinet(opt.id)}
                  isMulti={true}
                />
              ))}
            </div>
          </div>
          <p className='border-t border-[#5D5E60]'></p>
          <div>
            <ToggleSwitch
              label="Blackout Cabinet Doors"
              checked={blackoutCabinetDoors}
              onChange={setBlackoutCabinetDoors}
            />
          </div>
        </OptionSection>
      )}

      {/* {show('TOOL BOX') && (
        <OptionSection title="TOOL BOX">
          <div className="grid grid-cols-[max-content_max-content] gap-x-2 gap-y-2">
            {TOOL_BOX_OPTIONS.map((opt) => (
              <OptionPill
                key={opt.id}
                label={opt.label}
                price={opt.price}
                isSelected={toolBox === opt.id}
                onClick={() => setToolBox(opt.id)}
              />
            ))}
          </div>
        </OptionSection>
      )} */}
    </>
  )
}
