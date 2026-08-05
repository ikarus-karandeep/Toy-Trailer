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
  WHEEL_WALL_CABINET_OPTIONS,
  TOOL_BOX_OPTIONS
} from '../../constants/configData'
import OptionSection from '../../components/OptionSection'
import OptionPill from '../../components/OptionPill'
import ToggleSwitch from '../../components/ToggleSwitch'

export default function InteriorPanel({ activeSectionTitle }) {
  const {
    floor, setFloor,
    floorOverlay, setFloorOverlay,
    walls, setWalls,
    ceiling, setCeiling,
    cabinets, toggleCabinet, setCabinetsRaw,
    blackoutCabinetDoors, setBlackoutCabinetDoors,
    toolBox, setToolBox,
    length, axleCount, frontStyle,
    bathroom,
    genDoor,
    driverSideDoor, passengerSideDoor, escapeDoor, concessionDoor,
    sinkPackage,
    viewMode, setViewMode,
    setExteriorFinish, setAngledLights, setElectrical, setBattery, setLightsRaw, setAtpRamp,
    wallInsulation, setWallInsulation,
    ceilingInsulation, setCeilingInsulation,
    floorInsulation, setFloorInsulation,
    atpWheelWells, setAtpWheelWells
  } = useConfigurator()

  const getBadge = usePackageBadge()

  // Local state for new UI components (until context is fully updated)
  const [pitPack, setPitPack] = useState(false)
  const [pitPackOpen, setPitPackOpen] = useState(true)

  const show = (title) => !activeSectionTitle || activeSectionTitle === title

  const hasPassengerDoor = (passengerSideDoor && passengerSideDoor !== 'none');
  const hasDriverSideConflict = (driverSideDoor && driverSideDoor !== 'none');
  const hasGenDoorConflict = false; // user requested to remove conflict
  const hasWallRunConflict = hasDriverSideConflict || hasGenDoorConflict;
  const hasWheelWallConflict =
    (escapeDoor && escapeDoor !== 'none') ||
    (concessionDoor === 'driver');
  const hasSinkConflict = sinkPackage === 'sink';
  const hasBathroom = bathroom && bathroom !== 'none';
  const hasFullHeightConflict = hasPassengerDoor || hasBathroom || parseFloat(length) < 24;



  useEffect(() => {
    // Removed automatic overhead cabinet removal when base cabinet is not selected
  }, [cabinets])

  return (
    <div 
      className="contents" 
      onClickCapture={() => { 
        if (viewMode !== 'INTERIOR') setViewMode('INTERIOR'); 
      }}
    >
      {show('PIT PACK') && (
        <OptionSection title="PIT PACK">
          <div className="flex flex-col gap-2">
            {PIT_PACK_OPTIONS.map((opt) => (
              <div key={opt.id} className="w-full">
                <OptionPill
                  label={opt.label}
                  price={opt.price} badge={opt.badge}
                  originalPrice={opt.originalPrice}
                  isSelected={pitPack}
                  hasSettings
                  onClick={() => {
                    const newValue = !pitPack
                    setPitPack(newValue)
                    if (newValue) {
                      setCabinetsRaw(prev => [...new Set([...prev, 'frontbase36', 'frontoverhead16'])])
                      setWalls('white_metal_walls')
                      setCeiling('white_metal_ceiling')
                      if (setExteriorFinish) setExteriorFinish('blackout')
                      if (setBlackoutCabinetDoors) setBlackoutCabinetDoors(true)
                      setFloorOverlay('atp')
                      if (setAtpRamp) setAtpRamp(true)
                      if (setAngledLights) setAngledLights(true)
                      if (setElectrical) setElectrical('50amp')
                      if (setBattery) setBattery('12vdeepcycle')
                    }
                  }}
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
                  price={opt.price} badge={opt.badge}
                  isSelected={floor === opt.id}
                  onClick={() => setFloor(opt.id)}
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
                  price={opt.price} badge={opt.badge}
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
                  price={opt.price} badge={opt.badge}
                  isSelected={floorInsulation === opt.id}
                  onClick={() => setFloorInsulation(opt.id === floorInsulation ? null : opt.id)}
                />
              ))}
            </div>
          </div>

          <div>
            <ToggleSwitch
              label="ATP Covered Wheel Wells (+$236 each)"
              checked={atpWheelWells}
              onChange={setAtpWheelWells}
            />
            <p className="text-gray-400 text-[11px] mt-1 ml-14">Diamond plate over axle humps — clean floor look</p>
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
                  price={opt.price} badge={opt.badge}
                  isSelected={walls === opt.id}
                  onClick={() => setWalls(opt.id)}
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
                  price={opt.price} badge={opt.badge}
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
                  price={opt.price} badge={opt.badge}
                  isSelected={ceiling === opt.id}
                  onClick={() => setCeiling(opt.id)}
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
                  price={opt.price} badge={opt.badge}
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
            <p className="text-gray-400 text-xs tracking-wider mb-4">ATP Diamond Plate Finish. Countertop Included.</p>
            <p className="text-gray-400 text-xs tracking-wider mb-4">Wall cabinet runs require a specified run length — price updates live as the slider moves.</p>
            {hasSinkConflict && (
              <p className="text-xs mb-3 text-gray-400 p-2.5 rounded-lg leading-relaxed">
                * Base cabinets are disabled because the Sink Package is currently applied.
              </p>
            )}
            {parseFloat(length) < 24 && (
              <p className="text-xs mb-3 text-gray-400 p-2.5 rounded-lg leading-relaxed">
                * Wall Run 36"H cabinet is disabled for trailers under 24ft length.
              </p>
            )}
            {hasDriverSideConflict && (
              <p className="text-xs mb-3 text-gray-400 p-2.5 rounded-lg leading-relaxed">
                * Wall Run 36"H cabinet is disabled because a driver side door is currently applied.
              </p>
            )}
            <div className="flex flex-col gap-2">
              {BASE_CABINET_OPTIONS.map((opt) => {
                let isLocked = hasSinkConflict;
                if (opt.id === 'wallrun36') {
                  if (parseFloat(length) < 24) isLocked = true;
                  if (hasWallRunConflict) isLocked = true;
                }
                let displayPrice = opt.price;
                if ((opt.id === 'frontbase36' || opt.id === 'frontoverhead16') && frontStyle === 'flatfront') {
                  displayPrice = 0;
                }
                
                return (
                  <OptionPill
                    key={opt.id}
                    label={opt.label}
                    price={displayPrice}
                    isLocked={isLocked}
                    isSelected={cabinets.includes(opt.id)}
                    hasSettings={opt.id === 'frontbase36'}
                    onClick={() => {
                      if (isLocked) return;
                      if (!cabinets.includes(opt.id)) {
                        const baseIds = BASE_CABINET_OPTIONS.map(o => o.id);
                        const toRemove = [...baseIds];
                        const newCabinets = cabinets.filter(c => !toRemove.includes(c));
                        setCabinetsRaw([...newCabinets, opt.id]);
                      } else {
                        // Toggle off - do not remove overhead automatically
                        const newCabinets = cabinets.filter(c => c !== opt.id);
                        setCabinetsRaw(newCabinets);
                      }
                    }}
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
            <p className="text-gray-400 text-xs tracking-wider mb-4">N/A with Slant/ Slant V-Nose.</p>
            <p className="text-gray-400 text-xs tracking-wider mb-4">Wall cabinet runs require a specified run length — price updates live as the slider moves.</p>
            <div className="flex flex-col gap-2">
              {OVERHEAD_CABINET_OPTIONS.map((opt) => {
                let isLocked = false;
                if (opt.id === 'wallrun16') {
                  if (parseFloat(length) < 24) isLocked = true;
                  if (hasWallRunConflict) isLocked = true;
                }
                
                return (
                  <OptionPill
                    key={opt.id}
                    label={opt.label}
                    price={(opt.id === 'frontoverhead16' && frontStyle === 'flatfront') ? 0 : opt.price}
                    isLocked={isLocked}
                    isSelected={cabinets.includes(opt.id)}
                    onClick={() => {
                      if (isLocked) return;
                      if (!cabinets.includes(opt.id)) {
                        // Remove other overhead cabinets when selecting one
                        const overheadIds = OVERHEAD_CABINET_OPTIONS.map(o => o.id);
                        const newCabinets = cabinets.filter(c => !overheadIds.includes(c));
                        setCabinetsRaw([...newCabinets, opt.id]);
                      } else {
                        // Toggle off
                        setCabinetsRaw(cabinets.filter(c => c !== opt.id));
                      }
                    }}
                    isMulti={true}
                  />
                );
              })}
            </div>
          </div>
          <p className='border-t border-[#5D5E60]'></p>

          <div className="mb-4">
            <h4 className="text-white text-sm font-semibold uppercase tracking-wider mb-3">FLOOR TO CEILING CABINETS</h4>
            {hasFullHeightConflict && (
              <p className="text-xs mb-3 text-gray-400 p-2.5 rounded-lg leading-relaxed">
                * Floor to Ceiling Cabinet is not available
                {parseFloat(length) < 24
                  ? ' for trailers under 24ft length.'
                  : hasBathroom && hasPassengerDoor
                  ? ' when a Bathroom and a Passenger Side Door are both applied.'
                  : hasBathroom
                  ? ' when a Bathroom is applied.'
                  : ' when a Passenger Side Door is applied.'}
              </p>
            )}
            <div className="flex flex-col gap-2">
              {FULL_HEIGHT_CABINET_OPTIONS.map((opt) => (
                <OptionPill
                  key={opt.id}
                  label={opt.label}
                  price={opt.price} badge={opt.badge}
                  isSelected={cabinets.includes(opt.id)}
                  onClick={() => toggleCabinet(opt.id)}
                  isMulti={true}
                  isLocked={hasFullHeightConflict}
                />
              ))}
            </div>
          </div>
          <p className='border-t border-[#5D5E60]'></p>

          <div className="mb-4">
            <h4 className="text-white text-sm font-semibold uppercase tracking-wider mb-3">WHEEL WALL CABINET</h4>
            {hasWheelWallConflict && (
              <p className="text-xs mb-3 text-gray-400 p-2.5 rounded-lg leading-relaxed">
                * Wheel Wall Cabinet is not available when an Escape Door or Driver Side Concession Door is applied.
              </p>
            )}
            <div className="flex flex-col gap-2">
              {WHEEL_WALL_CABINET_OPTIONS.map((opt) => {
                let displayPrice = opt.price;
                if (opt.id === 'wheelwallcabinet') {
                  displayPrice = (axleCount === 'triple') ? 1890 : 1620;
                }
                return (
                <OptionPill
                  key={opt.id}
                  label={opt.label}
                  price={displayPrice}
                  isSelected={cabinets.includes(opt.id)}
                  onClick={() => !hasWheelWallConflict && toggleCabinet(opt.id)}
                  isMulti={true}
                  isLocked={hasWheelWallConflict}
                  packageBadge={getBadge(opt.id)}
                />
              )})}
            </div>
          </div>
          <div>
            <ToggleSwitch
              label="Blackout Cabinet Doors"
              checked={blackoutCabinetDoors}
              onChange={setBlackoutCabinetDoors}
            />
          </div>
        </OptionSection>
      )}

      {show('CABINETS') && (
        <OptionSection title="BUILT - IN TOOL CABINET">
          <ToggleSwitch
            label="INCLUDE TOOL CABINET"
            checked={toolBox !== 'none' && toolBox !== false}
            onChange={(checked) => setToolBox(checked ? 'frontbox' : 'none')}
          />
        </OptionSection>
      )}
    </div>
  )
}
