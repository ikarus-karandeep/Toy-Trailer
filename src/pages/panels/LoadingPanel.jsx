import { useState } from 'react'
import { useConfigurator } from '../../context/ConfiguratorContext'
import { usePackageBadge } from '../../hooks/usePackageBadge'
import {
  REAR_ENTRANCE_OPTIONS,
  SIDE_DOOR_PLACEMENT_OPTIONS,
  SIDE_DOOR_SIZE_OPTIONS,
  ESCAPE_DOOR_PLACEMENT_OPTIONS,
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
    jacks, toggleJack,
    driverSideDoor, setDriverSideDoor,
    passengerSideDoor, setPassengerSideDoor,
    escapeDoor, setEscapeDoor,
  } = useConfigurator()

  const getBadge = usePackageBadge()

  const [atpRamp, setAtpRamp] = useState(false)
  const [sideDoorPlacement, setSideDoorPlacement] = useState('passenger')
  
  const currentSideDoor = sideDoorPlacement === 'driver' ? driverSideDoor : passengerSideDoor
  const setCurrentSideDoor = sideDoorPlacement === 'driver' ? setDriverSideDoor : setPassengerSideDoor

  const [escapeDoorPlacement, setEscapeDoorPlacement] = useState('driver')
  const [blackoutFrame, setBlackoutFrame] = useState(false)

  const [concessionDoorPlacement, setConcessionDoorPlacement] = useState('driver')
  const [concessionWidth, setConcessionWidth] = useState('60in')
  const [concessionHeight, setConcessionHeight] = useState('36in')
  const [glassScreen, setGlassScreen] = useState(false)

  const [windows, setWindows] = useState({
    vertical: 0,
    horizontal: 0,
    egress: 0,
  })
  const [windowSize, setWindowSize] = useState('30x15')
  
  const [dRings, setDRings] = useState({
    drings: 1, // Standard D-rings default
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
            />
          </div>
        </OptionSection>
      )}

      {show('SIDE DOOR') && (
        <OptionSection title="SIDE DOOR">
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
        </OptionSection>
      )}

      {show('ESCAPE DOOR') && (
        <OptionSection title="ESCAPE DOOR">
          <p className="text-gray-400 text-xs tracking-wider mb-4 -mt-3">Secondary Access/Emergency Egress</p>
          
          <div className="mb-4">
            <p className="text-gray-400 text-[10px] tracking-wider mb-2 uppercase">Escape door placement</p>
            <div className="w-full">
              <SegmentedControl
                options={ESCAPE_DOOR_PLACEMENT_OPTIONS}
                value={escapeDoorPlacement}
                onChange={setEscapeDoorPlacement}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {ESCAPE_DOOR_SIZE_OPTIONS.map((opt) => (
              <OptionPill
                key={opt.id}
                label={opt.label}
                isSelected={escapeDoor === opt.id}
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
      )}

      {show('CONCESSION DOOR') && (
        <OptionSection title="CONCESSION DOOR">
          <div className="mb-4">
            <p className="text-gray-400 text-[10px] tracking-wider mb-2 uppercase">Concession door placement</p>
            <div className="w-full">
              <SegmentedControl
                options={CONCESSION_DOOR_PLACEMENT_OPTIONS}
                value={concessionDoorPlacement}
                onChange={setConcessionDoorPlacement}
              />
            </div>
          </div>

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
      )}

      {show('WINDOWS') && (
        <OptionSection title="WINDOWS">
          <div className="flex flex-col gap-2 mb-4">
            {WINDOWS_OPTIONS.map((opt) => {
              const qty = windows[opt.id]
              return (
                <OptionPill
                  key={opt.id}
                  label={opt.label}
                  price={opt.price}
                  isSelected={qty > 0}
                  quantity={qty}
                  onQuantityChange={(val) => updateQuantity(setWindows, opt.id, val)}
                  onClick={() => updateQuantity(setWindows, opt.id, qty === 0 ? 1 : 0)}
                />
              )
            })}
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {WINDOWS_SIZE_OPTIONS.map((opt) => (
              <OptionPill
                key={opt.id}
                label={opt.label}
                price={opt.price}
                isSelected={windowSize === opt.id}
                onClick={() => setWindowSize(opt.id)}
              />
            ))}
          </div>

          <div className="flex flex-col gap-2">
            {WINDOWS_EGRESS_OPTIONS.map((opt) => {
              const qty = windows[opt.id]
              return (
                <OptionPill
                  key={opt.id}
                  label={opt.label}
                  price={opt.price}
                  isSelected={qty > 0}
                  quantity={qty}
                  onQuantityChange={(val) => updateQuantity(setWindows, opt.id, val)}
                  onClick={() => updateQuantity(setWindows, opt.id, qty === 0 ? 1 : 0)}
                />
              )
            })}
          </div>
        </OptionSection>
      )}

      {show('TIE DOWNS (MULTI-CHOICE)') && (
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
      )}

      {show('JACKS (MULTI-CHOICE)') && (
        <OptionSection title="JACKS (MULTI-CHOICE)">
          <div className="flex flex-col gap-2">
            {JACKS_OPTIONS.map((opt) => (
              <OptionPill
                key={opt.id}
                label={opt.label}
                price={opt.price}
                isSelected={jacks.includes(opt.id)}
                onClick={() => toggleJack(opt.id)}
                packageBadge={getBadge(opt.id)}
              />
            ))}
          </div>
        </OptionSection>
      )}
    </>
  )
}
