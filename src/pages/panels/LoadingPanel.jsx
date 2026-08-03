import { useState } from 'react'
import { useConfigurator } from '../../context/ConfiguratorContext'
import { usePackageBadge } from '../../hooks/usePackageBadge'
import {
  REAR_ENTRANCE_OPTIONS,
  SIDE_DOOR_PLACEMENT_OPTIONS,
  SIDE_DOOR_SIZE_OPTIONS,
  ESCAPE_DOOR_SIZE_OPTIONS,
  CONCESSION_DOOR_PLACEMENT_OPTIONS,
  WINDOWS_OPTIONS,
  WINDOWS_SIZE_OPTIONS,
  WINDOWS_EGRESS_OPTIONS,
  D_RINGS_OPTIONS,
  ADDITIONAL_D_RINGS_OPTIONS,
  E_TRACKS_OPTIONS,
  JACKS_OPTIONS
} from '../../constants/configData'
import OptionSection from '../../components/OptionSection'
import OptionPill from '../../components/OptionPill'
import ToggleSwitch from '../../components/ToggleSwitch'
import DotSlider from '../../components/DotSlider'
import VerticalDotSlider from '../../components/VerticalDotSlider'
import SegmentedControl from '../../components/SegmentedControl'

export default function LoadingPanel({ activeSectionTitle }) {
  const {
    rampType, setRampType,
    rearDoor, setRearDoor,
    tieDowns, toggleTieDown,
    jacks, setJacksRaw, toggleJack,
    driverSideDoor, setDriverSideDoor,
    passengerSideDoor, setPassengerSideDoor,
    escapeDoor, setEscapeDoor,
    atpRamp, setAtpRamp,
    concessionDoor, setConcessionDoor,
    glassScreen, setGlassScreen,
    windows, setWindows,
    windowSizes, setWindowSizes,
    viewMode, setViewMode,
    concessionWidth, setConcessionWidth,
    concessionHeight, setConcessionHeight,
    length, width, frontStyle,
  } = useConfigurator()

  const getBadge = usePackageBadge()

  const [sideDoorPlacement, setSideDoorPlacement] = useState('passenger')
  
  const currentSideDoor = sideDoorPlacement === 'driver' ? driverSideDoor : passengerSideDoor
  const setCurrentSideDoor = sideDoorPlacement === 'driver' ? setDriverSideDoor : setPassengerSideDoor

  const [blackoutFrame, setBlackoutFrame] = useState(false)

  // concessionDoor comes from context ('none' | 'driver' | 'passenger')

  const [dRings, setDRings] = useState({
    drings: 0, // Standard D-rings default
    walldrings: 0,
    floordrings: 0,
  })

  const show = (title) => !activeSectionTitle || activeSectionTitle === title

  const updateQuantity = (setter, key, val) => {
    setter(prev => ({ ...prev, [key]: Math.max(0, val) }))
  }

  const concessionWidthOptions = [
    { id: '48in', label: '48in' },
    { id: '60in', label: '60in' },
    { id: '72in', label: '72in' },
    { id: '96in', label: '96in' },
  ]
  const concessionHeightOptions = [
    { id: '48in', label: '48in' },
    { id: '36in', label: '36in' },
  ]

  const widthBadgeMap = {
    '60in': '+$320',
  }

  return (
    <>
      {show('REAR ENTRANCE') && (
        <div className="contents" onClickCapture={() => { if (viewMode !== 'EXTERIOR') setViewMode('EXTERIOR'); }}>
        <OptionSection title="REAR ENTRANCE">
          <p className="text-gray-400 text-xs tracking-wider mb-4 -mt-3">Rear Doors replace ramp and removes beavertail (on 8.5ft wide)</p>
          <div className="flex flex-col gap-2">
            {REAR_ENTRANCE_OPTIONS.map((opt) => (
              <OptionPill
                key={opt.id}
                label={opt.label}
                price={opt.price}
                isSelected={rampType === opt.id}
                onClick={() => setRampType(opt.id)}
              />
            ))}
          </div>

          <div className="mt-6 flex justify-center">
            <img src="/Rear Entrance.png" />
          </div>

          <div className="mt-6">
            <ToggleSwitch
              label="ATP / RTP RAMP & FLAP"
              checked={atpRamp}
              onChange={setAtpRamp}
              disabled={rampType !== 'doublereardoors'}
            />
          </div>
        </OptionSection>
        </div>
      )}

      {show('SIDE DOOR') && (
        <div className="contents" onClickCapture={() => { if (viewMode !== 'EXTERIOR') setViewMode('EXTERIOR'); }}>
        <OptionSection title="SIDE DOOR">
          {parseFloat(length) < 24 ? (
            <p className="text-gray-400 text-xs tracking-wider mb-4 -mt-3">
              * Side door options are hidden for trailers under 24ft length.
            </p>
          ) : (
            <>
              <p className="text-gray-400 text-xs tracking-wider mb-4 -mt-3">36" X 78" Steel base</p>
              
              <div className="mb-4">
                <p className="text-gray-400 text-[10px] tracking-wider mb-2 uppercase">Side door placement</p>
                <div className="w-full">
                  <SegmentedControl
                    options={SIDE_DOOR_PLACEMENT_OPTIONS}
                    value={sideDoorPlacement}
                    onChange={setSideDoorPlacement}
                  />
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {SIDE_DOOR_SIZE_OPTIONS.map((opt) => (
                  <OptionPill
                    key={opt.id}
                    label={opt.label}
                    isSelected={currentSideDoor === opt.id}
                    onClick={() => setCurrentSideDoor(opt.id)}
                  />
                ))}
              </div>
              
              <div className="mt-8 flex justify-center">
                <img src="/Rear door.png" />
              </div>
            </>
          )}
        </OptionSection>
        </div>
      )}

      {show('ESCAPE DOOR') && (
        <div className="contents" onClickCapture={() => { if (viewMode !== 'EXTERIOR') setViewMode('EXTERIOR'); }}>
        <OptionSection title="ESCAPE DOOR">
          <p className="text-gray-400 text-xs tracking-wider mb-4 -mt-3">Secondary Access/Emergency Egress</p>

          {concessionDoor === 'driver' && (
            <p className="text-[#DA634B] text-xs tracking-wider mb-4 -mt-3">
              * Escape Door is disabled because a Concession Door is already on the Driver side.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {ESCAPE_DOOR_SIZE_OPTIONS.map((opt) => (
              <OptionPill
                key={opt.id}
                label={opt.label}
                isSelected={escapeDoor === opt.id}
                isLocked={concessionDoor === 'driver' && opt.id !== 'none'}
                onClick={() => setEscapeDoor(opt.id)}
              />
            ))}
          </div>

          <div className="mt-8 flex justify-center">
            <img src="/Escape door.png" />
          </div>
          
          <div className="mt-6">
            <ToggleSwitch
              label="Blackout Frame"
              checked={blackoutFrame}
              onChange={setBlackoutFrame}
            />
          </div>
        </OptionSection>
        </div>
      )}

      {show('CONCESSION DOOR / WINDOW') && (
        <div className="contents" onClickCapture={() => { if (viewMode !== 'EXTERIOR') setViewMode('EXTERIOR'); }}>
        <OptionSection title="CONCESSION DOOR / WINDOW">
          {/* None / activate toggle */}
          <div className="flex flex-col gap-2 mb-4">
            <OptionPill
              label="NONE"
              isSelected={concessionDoor === 'none'}
              onClick={() => setConcessionDoor('none')}
            />
          </div>

          {escapeDoor !== 'none' && (
            <p className="text-[#DA634B] text-xs tracking-wider mb-4 -mt-3">
              * Driver side placement is disabled because an Escape Door is already on the Driver side.
            </p>
          )}

          {/* Side selector — only shown when door is active */}
          {concessionDoor !== 'none' && (
            <div className="mb-4">
              <p className="text-gray-400 text-[10px] tracking-wider mb-2 uppercase">Concession door placement</p>
              <div className="w-full">
                <SegmentedControl
                  options={CONCESSION_DOOR_PLACEMENT_OPTIONS.map(o => ({
                    ...o,
                    disabled: escapeDoor !== 'none' && o.id === 'driver'
                  }))}
                  value={concessionDoor}
                  onChange={setConcessionDoor}
                />
              </div>
            </div>
          )}

          {/* Activate by picking a side */}
          {concessionDoor === 'none' && (
            <div className="mb-4">
              <p className="text-gray-400 text-[10px] tracking-wider mb-2 uppercase">Select side to enable</p>
              <div className="w-full">
                <SegmentedControl
                  options={CONCESSION_DOOR_PLACEMENT_OPTIONS.map(o => ({
                    ...o,
                    disabled: escapeDoor !== 'none' && o.id === 'driver'
                  }))}
                  value={concessionDoor === 'none' ? '' : concessionDoor}
                  onChange={(val) => setConcessionDoor(val)}
                />
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-col items-center">
            <div className="flex w-full items-center justify-between gap-2 px-2">
              <img src="/concession door.png" className="flex-1 min-w-0 object-contain max-h-[150px]" />
              <div className="h-[150px] flex-shrink-0 z-10">
                <VerticalDotSlider
                  options={concessionHeightOptions}
                  value={concessionHeight}
                  onChange={setConcessionHeight}
                />
              </div>
            </div>
            
            <div className="w-[200px] mt-6 ml-[-40px]">
              <DotSlider
                options={concessionWidthOptions}
                value={concessionWidth}
                onChange={setConcessionWidth}
                badge={widthBadgeMap[concessionWidth]}
              />
            </div>
          </div>

          <div className="mt-8">
            <ToggleSwitch
              label="Glass Screen"
              checked={glassScreen}
              onChange={setGlassScreen}
            />
          </div>
        </OptionSection>
        </div>
      )}

      {show('WINDOWS (MULTI-CHOICE)') && (
        <div className="contents" onClickCapture={() => { if (viewMode !== 'EXTERIOR') setViewMode('EXTERIOR'); }}>
        <OptionSection title="WINDOWS (MULTI-CHOICE)">
          {parseFloat(length) < 24 ? (
            <p className="text-gray-400 text-xs tracking-wider mb-4 -mt-3">
              * Window options are hidden for trailers under 24ft length.
            </p>
          ) : (
            <>
              {concessionDoor === 'passenger' && (
                <p className="text-[#DA634B] text-xs tracking-wider mb-4 -mt-3">
                  * Windows are disabled when a Concession Door is on the Passenger side.
                </p>
              )}
              <div className="flex flex-col gap-6 mb-4">
            {WINDOWS_OPTIONS.map((opt) => {
              const qty = windows[opt.id]
              return (
                <div key={opt.id} className="flex flex-col gap-2">
                  <OptionPill
                    label={opt.label}
                    price={opt.price}
                    isSelected={qty > 0}
                    isLocked={concessionDoor === 'passenger'}
                    quantity={qty}
                    onQuantityChange={(val) => updateQuantity(setWindows, opt.id, val)}
                    onClick={() => updateQuantity(setWindows, opt.id, qty === 0 ? 1 : 0)}
                  />
                  <div className="flex flex-wrap gap-2 pl-4">
                    {WINDOWS_SIZE_OPTIONS.map((sizeOpt) => {
                      let isLocked = concessionDoor === 'passenger';
                      return (
                        <OptionPill
                          key={sizeOpt.id}
                          label={sizeOpt.label}
                          price={sizeOpt.price}
                          isSelected={qty > 0 && windowSizes[opt.id] === sizeOpt.id}
                          isLocked={isLocked}
                          onClick={() => setWindowSizes(prev => ({ ...prev, [opt.id]: sizeOpt.id }))}
                        />
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex flex-col gap-6">
            {WINDOWS_EGRESS_OPTIONS.map((opt) => {
              const qty = windows[opt.id]
              return (
                <div key={opt.id} className="flex flex-col gap-2">
                  <OptionPill
                    label={opt.label}
                    price={opt.price}
                    isSelected={qty > 0}
                    isLocked={concessionDoor === 'passenger'}
                    quantity={qty}
                    onQuantityChange={(val) => updateQuantity(setWindows, opt.id, val)}
                    onClick={() => updateQuantity(setWindows, opt.id, qty === 0 ? 1 : 0)}
                  />
                  <div className="flex flex-wrap gap-2 pl-4">
                    {WINDOWS_SIZE_OPTIONS.map((sizeOpt) => {
                      let isLocked = concessionDoor === 'passenger';
                      return (
                        <OptionPill
                          key={sizeOpt.id}
                          label={sizeOpt.label}
                          price={sizeOpt.price}
                          isSelected={qty > 0 && windowSizes[opt.id] === sizeOpt.id}
                          isLocked={isLocked}
                          onClick={() => setWindowSizes(prev => ({ ...prev, [opt.id]: sizeOpt.id }))}
                        />
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
          </>
          )}
        </OptionSection>
        </div>
      )}

      {show('TIE DOWNS (MULTI-CHOICE)') && (
        <div className="contents" onClickCapture={() => { if (viewMode !== 'INTERIOR') setViewMode('INTERIOR'); }}>
        <OptionSection title="TIE DOWNS (MULTI-CHOICE)">
          <div className="mb-6">
            <h4 className="text-white text-sm font-semibold uppercase tracking-wider mb-3">D-RINGS</h4>
            <div className="flex flex-col gap-2">
              {D_RINGS_OPTIONS.map((opt) => (
                <OptionPill
                  key={opt.id}
                  label={opt.label}
                  isSelected={tieDowns.includes(opt.id)}
                  onClick={() => toggleTieDown(opt.id)}
                />
              ))}
              
              {ADDITIONAL_D_RINGS_OPTIONS.map((opt) => {
                const qty = dRings[opt.id]
                return (
                  <OptionPill
                    key={opt.id}
                    label={opt.label}
                    price={opt.price}
                    isSelected={tieDowns.includes(opt.id) || qty > 0}
                    quantity={qty}
                    onQuantityChange={(val) => {
                      updateQuantity(setDRings, opt.id, val)
                      if (val === 0 && tieDowns.includes(opt.id)) toggleTieDown(opt.id)
                      if (val > 0 && !tieDowns.includes(opt.id)) toggleTieDown(opt.id)
                    }}
                    onClick={() => {
                      updateQuantity(setDRings, opt.id, qty === 0 ? 1 : 0)
                      toggleTieDown(opt.id)
                    }}
                  />
                )
              })}
            </div>
          </div>

          <div>
            <h4 className="text-white text-sm font-semibold uppercase tracking-wider mb-3">E-TRACKS</h4>
            <div className="flex flex-col gap-2">
              {E_TRACKS_OPTIONS.map((opt) => (
                <OptionPill
                  key={opt.id}
                  label={opt.label}
                  isSelected={tieDowns.includes(opt.id)}
                  onClick={() => toggleTieDown(opt.id)}
                  packageBadge={getBadge(opt.id)}
                />
              ))}
            </div>
          </div>
        </OptionSection>
        </div>
      )}

      {show('JACKS (MULTI-CHOICE)') && (
        <div className="contents" onClickCapture={() => { if (viewMode !== 'EXTERIOR') setViewMode('EXTERIOR'); }}>
        <OptionSection title="JACKS (MULTI-CHOICE)">
          {width === '8.5ftgn' || (frontStyle && frontStyle.toLowerCase().includes('gooseneck')) ? (
            <p className="text-gray-400 text-xs mb-3"> Electric Tongue Jack is not compatible with gooseneck models</p>
          ) : null}
          <div className="flex flex-col gap-2">
            {JACKS_OPTIONS.map((opt) => {
              // Radio-group logic:
              //  Fold Down group  → 'folddown' and 'folddownjacks' are mutually exclusive
              //  Scissor group    → '5kscissor' and '5kscissorjacks' are mutually exclusive
              //  Electric         → free multi-toggle
              const FOLD_GROUP    = ['folddown', 'folddownjacks']
              const SCISSOR_GROUP = ['5kscissor', '5kscissorjacks']

              const handleJack = (id) => {
                const isSelected = jacks.includes(id)
                if (isSelected) {
                  // Deselect: just remove this id
                  setJacksRaw(jacks.filter(j => j !== id))
                } else {
                  // Select: remove sibling in same group first, then add
                  if (FOLD_GROUP.includes(id)) {
                    setJacksRaw([...jacks.filter(j => !FOLD_GROUP.includes(j)), id])
                  } else if (SCISSOR_GROUP.includes(id)) {
                    setJacksRaw([...jacks.filter(j => !SCISSOR_GROUP.includes(j)), id])
                  } else {
                    // Electric — free toggle
                    toggleJack(id)
                  }
                }
              }

              return (
                <OptionPill
                  key={opt.id}
                  label={opt.label}
                  price={opt.price}
                  isSelected={jacks.includes(opt.id) && !(opt.id === '5000relectric' && (width === '8.5ftgn' || (frontStyle && frontStyle.toLowerCase().includes('gooseneck'))))}
                  disabled={opt.id === '5000relectric' && (width === '8.5ftgn' || (frontStyle && frontStyle.toLowerCase().includes('gooseneck')))}
                  onClick={() => handleJack(opt.id)}
                  packageBadge={getBadge(opt.id)}
                />
              )
            })}
          </div>
        </OptionSection>
        </div>
      )}

    </>
  )
}
