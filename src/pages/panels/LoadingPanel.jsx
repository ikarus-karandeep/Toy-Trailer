import { useState } from 'react'
import { useConfigurator } from '../../context/ConfiguratorContext'
import { usePackageBadge } from '../../hooks/usePackageBadge'
import {
  REAR_ENTRANCE_OPTIONS,
  SIDE_DOOR_PLACEMENT_OPTIONS,
  SIDE_DOOR_SIZE_OPTIONS,
  ESCAPE_DOOR_SIZE_OPTIONS,
  WINDOWS_OPTIONS,
  WINDOWS_SIZE_OPTIONS,
  WINDOWS_EGRESS_OPTIONS,
  D_RINGS_OPTIONS,
  ADDITIONAL_D_RINGS_OPTIONS,
  E_TRACKS_OPTIONS,
  JACKS_OPTIONS,
  STABILIZER_OPTIONS
} from '../../constants/configData'
import OptionSection from '../../components/OptionSection'
import OptionPill from '../../components/OptionPill'
import ToggleSwitch from '../../components/ToggleSwitch'
import SegmentedControl from '../../components/SegmentedControl'

export default function LoadingPanel({ activeSectionTitle }) {
  const {
    rampType, setRampType,
    rearDoor, setRearDoor,
    tieDowns, toggleTieDown,
    dRings, setDRings,
    jacks, setJacksRaw, toggleJack,
    driverSideDoor, setDriverSideDoor,
    passengerSideDoor, setPassengerSideDoor,
    sideDoorBarLock, setSideDoorBarLock,
    escapeDoor, setEscapeDoor,
    atpRamp, setAtpRamp,
    concessionDoor,
    windows, setWindows,
    windowSizes, setWindowSizes,
    viewMode, setViewMode,
    length, width, frontStyle, awning,
    setFocusedCamera
  } = useConfigurator()

  const getBadge = usePackageBadge()

  const [sideDoorPlacement, setSideDoorPlacement] = useState('driver')
  
  const currentSideDoor = sideDoorPlacement === 'driver' ? driverSideDoor : passengerSideDoor
  const setCurrentSideDoor = sideDoorPlacement === 'driver' ? setDriverSideDoor : setPassengerSideDoor

  // concessionDoor comes from context ('none' | 'driver' | 'passenger')

  const show = (title) => {
    if (!activeSectionTitle) return true
    if (activeSectionTitle === 'JACKS' || activeSectionTitle === 'JACKS (MULTI-CHOICE)') {
      return title === 'ELECTRIC TONGUE JACK' || title === 'STABILIZERS' || title === 'STABILIZER JACKS' || title === 'JACKS (MULTI-CHOICE)'
    }
    if (activeSectionTitle === 'STABILIZERS' || activeSectionTitle === 'STABILIZER JACKS') {
      return title === 'STABILIZERS' || title === 'STABILIZER JACKS'
    }
    if (activeSectionTitle === 'ELECTRIC TONGUE JACK' || activeSectionTitle === 'TONGUE JACK') {
      return title === 'ELECTRIC TONGUE JACK' || title === 'TONGUE JACK'
    }
    return activeSectionTitle === title
  }

  const updateQuantity = (setter, key, val) => {
    setter(prev => ({ ...prev, [key]: Math.max(0, val) }))
  }

  const isGooseneck = width === '8.5ftgn' || (frontStyle && frontStyle.toLowerCase().includes('gooseneck'))
  const isExtendedVNose = frontStyle === 'extendedvnose'
  const isElectricSelected = jacks.includes('5000relectric')
  const isElectricDisabled = isGooseneck

  const handleToggleElectric = (val) => {
    if (isElectricDisabled) return
    if (val) {
      if (!jacks.includes('5000relectric')) {
        setJacksRaw(prev => [...prev, '5000relectric'])
      }
      if (isExtendedVNose) {
        setFocusedCamera("Electric Jack(Extended V-Nose) Camera")
      } else {
        setFocusedCamera("Electric Jack Camera")
      }
    } else {
      setJacksRaw(prev => prev.filter(j => j !== '5000relectric'))
    }
  }

  const handleStabilizer = (id) => {
    const FOLD_GROUP = ['folddown', 'folddownjacks']
    const SCISSOR_GROUP = ['5kscissor', '5kscissorjacks']
    const isSelected = jacks.includes(id)
    if (isSelected) {
      setJacksRaw(jacks.filter(j => j !== id))
    } else {
      if (FOLD_GROUP.includes(id)) {
        setJacksRaw([...jacks.filter(j => !FOLD_GROUP.includes(j)), id])
      } else if (SCISSOR_GROUP.includes(id)) {
        setJacksRaw([...jacks.filter(j => !SCISSOR_GROUP.includes(j)), id])
      } else {
        toggleJack(id)
      }

      if (id === 'folddown' || id === 'folddownjacks') {
        setFocusedCamera("Fold_Down_Stablizer_Jack_Inst_Camera")
      } else if (id === '5kscissorjacks') {
        setFocusedCamera("5K_Scissor_Jack_Inst_Camera")
      } else if (id === '5kscissor') {
        setFocusedCamera("5K_Scissor_Jack_w_Handle_Inst_Camera")
      }
    }
  }

  return (
    <>
      {show('REAR ENTRANCE') && (
        <div className="contents">
        <OptionSection title="REAR ENTRANCE">
          <p className="text-gray-400 text-xs tracking-wider mb-4 -mt-3">Rear Doors replace ramp and removes beavertail (on 8.5ft wide)</p>
          <div className="flex flex-col gap-2">
            {REAR_ENTRANCE_OPTIONS.map((opt) => (
              <OptionPill
                key={opt.id}
                label={opt.label}
                price={opt.price} badge={opt.badge}
                isSelected={rampType === opt.id}
                onClick={() => {
                  setRampType(opt.id)
                  setFocusedCamera("Rear Door Camera")
                }}
              />
            ))}
          </div>

          <div className="mt-6 flex justify-center">
            <img src="/Rear Entrance.png" className="w-[120px] sm:w-[150px] md:w-full md:max-w-[200px] lg:max-w-[300px] mx-auto object-contain my-4" />
          </div>

          <div className="mt-6">
            <ToggleSwitch
              label="ATP/RTP RAMP & FLAP"
              checked={atpRamp}
              onChange={(val) => {
                setAtpRamp(val)
                if (val) setFocusedCamera("Rear Door Camera")
              }}
              disabled={rampType !== 'doublereardoors'}
              disabledReason={rampType !== 'doublereardoors' ? "Can only come with double rear doors." : null}
              price={270}
              // subtext="Matching diamond plate on the ramp surface"
            />
          </div>
        </OptionSection>
        </div>
      )}

      {show('SIDE DOOR') && (
        <div className="contents">
        <OptionSection title="SIDE DOOR">
          {parseFloat(length) < 24 ? (
            <p className="text-gray-400 text-xs tracking-wider mb-4 -mt-3">
              * Side door options are hidden for trailers under 24ft length.
            </p>
          ) : (
            <>
              <p className="text-gray-400 text-xs tracking-wider mb-4 -mt-3">36" X 78" Steel base (Standard on Driver Side)</p>
              
              <div className="mb-4">
                <p className="text-gray-400 text-[10px] tracking-wider mb-2 uppercase">Side door placement</p>
                <div className="w-full">
                  <SegmentedControl
                    options={SIDE_DOOR_PLACEMENT_OPTIONS}
                    value={sideDoorPlacement}
                    onChange={(val) => {
                      setSideDoorPlacement(val)
                      if (currentSideDoor !== 'none') {
                        setFocusedCamera(val === 'driver' ? 'Door L Camera' : 'Door R Camera')
                      }
                    }}
                  />
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {SIDE_DOOR_SIZE_OPTIONS.map((opt) => {
                  let price = opt.price;
                  if (sideDoorPlacement === 'driver') {
                    if (opt.id === '48x78') price = 120;
                    else price = 0;
                  } else {
                     if (opt.id === '48x78') price = 335;
                     else price = 295;
                  }
                  
                  return (
                    <OptionPill
                      key={opt.id}
                      label={opt.label}
                      price={opt.id === 'none' ? undefined : price}
                      isSelected={currentSideDoor === opt.id}
                      onClick={() => {
                        setCurrentSideDoor(opt.id)
                        if (opt.id !== 'none') {
                          setFocusedCamera(sideDoorPlacement === 'driver' ? 'Door L Camera' : 'Door R Camera')
                        }
                      }}
                    />
                  );
                })}
              </div>
              
              {/* <div className="mt-6">
                <ToggleSwitch
                  label="Bar Lock on Side Door (+$60)"
                  checked={sideDoorBarLock}
                  onChange={setSideDoorBarLock}
                />
              </div> */}

              <div className="mt-8 flex justify-center">
                <img src="/Rear door.png" className="w-[120px] sm:w-[150px] md:w-full md:max-w-[200px] lg:max-w-[300px] mx-auto object-contain my-4" />
              </div>
            </>
          )}
        </OptionSection>
        </div>
      )}

      {show('ESCAPE DOOR') && (
        <div className="contents">
        <OptionSection title="ESCAPE DOOR">
          <p className="text-gray-400 text-xs tracking-wider mb-4 -mt-3">Secondary Access/Emergency Egress</p>

          <div className="flex flex-wrap gap-2">
            {ESCAPE_DOOR_SIZE_OPTIONS.map((opt) => (
              <OptionPill
                key={opt.id}
                label={opt.label}
                price={opt.price} badge={opt.badge}
                isSelected={escapeDoor === opt.id}
                isLocked={concessionDoor === 'driver' && opt.id !== 'none'}
                disabledReason={(concessionDoor === 'driver' && opt.id !== 'none') ? "Escape Door is disabled because a Concession Door is already on the Driver side." : null}
                onClick={() => {
                  setEscapeDoor(opt.id)
                  if (opt.id === '54x48') setFocusedCamera("Escape Door 54x48 Camera")
                  else if (opt.id === 'gullwing') setFocusedCamera("Gullwing Escape Door Camera")
                }}
              />
            ))}
          </div>

          <div className="mt-8 flex justify-center">
            <img src="/Escape door.png" className="w-[120px] sm:w-[150px] md:w-full md:max-w-[200px] lg:max-w-[300px] mx-auto object-contain my-4" />
          </div>
          
        </OptionSection>
        </div>
      )}

      {show('WINDOWS (MULTI-CHOICE)') && (
        <div className="contents">
        <OptionSection title="WINDOWS (MULTI-CHOICE)">
          {parseFloat(length) < 24 ? (
            <p className="mb-4 -mt-3">
              * Window options are hidden for trailers under 24ft length.
            </p>
          ) : (
            <>
              <div className="flex flex-col gap-6 mb-4">
                {WINDOWS_OPTIONS.map((opt) => {
                  const qty = windows[opt.id] || 0;
                  return (
                    <div key={opt.id} className="flex flex-col gap-2">
                      <OptionPill
                        label={opt.label}
                        price={opt.price} badge={opt.badge}
                        isSelected={qty > 0}
                        isLocked={concessionDoor === 'passenger'}
                        disabledReason={concessionDoor === 'passenger' ? "Windows are disabled when a Concession Door is on the Passenger side." : null}
                        onClick={() => {
                          const newQty = qty === 0 ? 1 : 0;
                          updateQuantity(setWindows, opt.id, newQty);
                          if (newQty > 0) {
                            if (opt.id === 'vertical') setFocusedCamera("15×30 Vertical Slider Camera")
                            else if (opt.id === 'horizontal') setFocusedCamera("50×30 Horizontal Slider Camera")
                          }
                        }}
                      />
                      {qty > 0 && (
                        <div className="flex flex-wrap gap-2 pl-4">
                          {WINDOWS_SIZE_OPTIONS.map((sizeOpt) => {
                            let isLocked = concessionDoor === 'passenger';
                            return (
                              <OptionPill
                                key={sizeOpt.id}
                                label={sizeOpt.label}
                                price={opt.price} badge={opt.badge}
                                isSelected={windowSizes[opt.id] === sizeOpt.id}
                                isLocked={isLocked}
                                disabledReason={isLocked ? "Windows are disabled when a Concession Door is on the Passenger side." : null}
                                onClick={() => {
                                  setWindowSizes(prev => ({ ...prev, [opt.id]: sizeOpt.id }))
                                  if (opt.id === 'vertical') setFocusedCamera("15×30 Vertical Slider Camera")
                                  else if (opt.id === 'horizontal') setFocusedCamera("50×30 Horizontal Slider Camera")
                                }}
                              />
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}

                {WINDOWS_EGRESS_OPTIONS.map((opt) => {
              const qty = windows[opt.id] || 0;
              return (
                <div key={opt.id} className="flex flex-col gap-2">
                  <OptionPill
                    label={opt.label}
                    price={opt.price} badge={opt.badge}
                    isSelected={qty > 0}
                    isLocked={concessionDoor === 'passenger'}
                    disabledReason={concessionDoor === 'passenger' ? "Windows are disabled when a Concession Door is on the Passenger side." : null}
                    onClick={() => {
                      const newQty = qty === 0 ? 1 : 0;
                      updateQuantity(setWindows, opt.id, newQty);
                      if (newQty > 0) {
                         setFocusedCamera("30×30 Egress Camera");
                      }
                    }}
                  />
                  {qty > 0 && (
                    <div className="flex flex-wrap gap-2 pl-4">
                      {WINDOWS_SIZE_OPTIONS.map((sizeOpt) => {
                        let isLocked = concessionDoor === 'passenger';
                        return (
                          <OptionPill
                            key={sizeOpt.id}
                            label={sizeOpt.label}
                            price={opt.price} badge={opt.badge}
                            isSelected={windowSizes[opt.id] === sizeOpt.id}
                            isLocked={isLocked}
                            disabledReason={isLocked ? "Windows are disabled when a Concession Door is on the Passenger side." : null}
                            onClick={() => {
                              setWindowSizes(prev => ({ ...prev, [opt.id]: sizeOpt.id }))
                              setFocusedCamera("30×30 Egress Camera");
                            }}
                          />
                        )
                      })}
                    </div>
                  )}
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
        <div className="contents">
        <OptionSection title="TIE DOWNS (MULTI-CHOICE)">
          <div className="mb-6">
            <h4 className="text-white text-sm font-semibold uppercase tracking-wider mb-3">D-RINGS</h4>
            <div className="flex flex-col gap-2">
              {D_RINGS_OPTIONS.map((opt) => (
                <OptionPill
                  key={opt.id}
                  label={opt.label}
                  isSelected={tieDowns.includes(opt.id)}
                  onClick={() => {
                    toggleTieDown(opt.id)
                    if (!tieDowns.includes(opt.id)) setFocusedCamera("D-Rings Camera")
                  }}
                />
              ))}
              
              {ADDITIONAL_D_RINGS_OPTIONS.map((opt) => {
                const qty = dRings[opt.id]
                return (
                  <OptionPill
                    key={opt.id}
                    label={opt.label}
                    price={opt.price} badge={opt.badge}
                    isSelected={tieDowns.includes(opt.id) || qty > 0}
                    quantity={qty}
                    onQuantityChange={(val) => {
                      updateQuantity(setDRings, opt.id, val)
                      if (val === 0 && tieDowns.includes(opt.id)) toggleTieDown(opt.id)
                      if (val > 0 && !tieDowns.includes(opt.id)) toggleTieDown(opt.id)
                      if (val > 0) setFocusedCamera("D-Rings Camera")
                    }}
                    onClick={() => {
                      const newValue = qty === 0 ? 1 : 0
                      updateQuantity(setDRings, opt.id, newValue)
                      toggleTieDown(opt.id)
                      if (newValue > 0) setFocusedCamera("D-Rings Camera")
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
                  price={opt.price} badge={opt.badge}
                  isSelected={tieDowns.includes(opt.id)}
                  onClick={() => {
                    toggleTieDown(opt.id)
                    if (!tieDowns.includes(opt.id)) {
                      if (opt.id === 'wall') setFocusedCamera("Wall E-Track Camera")
                      else if (opt.id === 'floor') setFocusedCamera("Floor E-Track Camera")
                    }
                  }}
                  packageBadge={getBadge(opt.id)}
                />
              ))}
            </div>
          </div>
        </OptionSection>
        </div>
      )}

      {show('ELECTRIC TONGUE JACK') && (
        <div className="contents">
        <OptionSection title="ELECTRIC TONGUE JACK">
          <ToggleSwitch
            label="5000lb Electric Tongue Jack w/ Deep Cycle Battery"
            // subtext="Includes deep-cycle battery"
            checked={isElectricSelected}
            onChange={handleToggleElectric}
            disabled={isElectricDisabled}
            disabledReason={isElectricDisabled ? "Electric Tongue Jack is not compatible with gooseneck models" : null}
            price={540}
          />
        </OptionSection>
        </div>
      )}

      {show('STABILIZERS') && (
        <div className="contents">
        <OptionSection title="STABILIZERS">
          <div className="flex flex-col gap-2">
            {STABILIZER_OPTIONS.map((opt) => (
              <OptionPill
                key={opt.id}
                label={opt.label}
                price={opt.price} badge={opt.badge}
                isSelected={jacks.includes(opt.id)}
                onClick={() => handleStabilizer(opt.id)}
                packageBadge={getBadge(opt.id)}
              />
            ))}
          </div>
        </OptionSection>
        </div>
      )}

    </>
  )
}
