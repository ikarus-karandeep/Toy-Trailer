import { useState, useEffect } from 'react'
import { useConfigurator } from '../../context/ConfiguratorContext'
import {
  WATER_PACKAGE_OPTIONS,
  SINK_PACKAGE_OPTIONS,
  BATHROOM_PACKAGE_OPTIONS,
  GENERATOR_BOX_OPTIONS,
  CONCESSION_DOOR_PLACEMENT_OPTIONS
} from '../../constants/configData'
import OptionSection from '../../components/OptionSection'
import OptionPill from '../../components/OptionPill'
import ToggleSwitch from '../../components/ToggleSwitch'
import AlertMessage from '../../components/AlertMessage'
import DetailedOptionCard from '../../components/DetailedOptionCard'
import DotSlider from '../../components/DotSlider'
import VerticalDotSlider from '../../components/VerticalDotSlider'
import SegmentedControl from '../../components/SegmentedControl'

export default function AddOnsPanel({ activeSectionTitle }) {
  const { 
    bathroom, setBathroom, 
    generatorBox, setGeneratorBox,
    toolBox, setToolBox,
    sinkPackage, setSinkPackage,
    batteryBox, setBatteryBox,
    lShapeCounter, setLShapeCounter,
    width,
    frontStyle,
    length,
    cabinets,
    viewMode, setViewMode,
    waterPackage, setWaterPackage,
    spareTire, setSpareTire,
    concessionDoor, setConcessionDoor,
    glassScreen, setGlassScreen,
    concessionWidth, setConcessionWidth,
    concessionHeight, setConcessionHeight,
    escapeDoor,
    awning,
    focusedCamera, setFocusedCamera
  } = useConfigurator()

  const [largeWaterOpen, setLargeWaterOpen] = useState(true)

  const [sinkPackageOpen, setSinkPackageOpen] = useState(true)

  const [fullBathOpen, setFullBathOpen] = useState(true)

  useEffect(() => {
    const hasGenBox = generatorBox && generatorBox !== 'none';
    if (hasGenBox) {
      if (batteryBox) {
        setBatteryBox(false);
      }
    }
  }, [generatorBox, batteryBox, setBatteryBox]);

  const show = (title) => {
    if (!activeSectionTitle) return true
    if (activeSectionTitle === 'WATER PACKAGE & SINK') {
      return title === 'WATER PACKAGE' || title === 'SINK PACKAGE'
    }
    if (activeSectionTitle === 'CONCESSION DOOR' || activeSectionTitle === 'CONCESSION' || activeSectionTitle === 'CONCESSION DOOR / WINDOW') {
      return title === 'CONCESSION DOOR' || title === 'CONCESSION DOOR / WINDOW'
    }
    if (activeSectionTitle === 'BASE ADDONS') {
      return [
        'BUILT - IN TOOL CABINET', 
        'TONGUE MOUNTED GENERATOR BOX', 
        'ATP BATTERY BOX ON TONGUE', 
        'L-SHAPE COUNTER/HIDDEN GENERATOR BOX'
      ].includes(title)
    }
    return activeSectionTitle === title
  }

  const concessionWidthOptions = [
    { id: '48in', label: '48in' },
    { id: '60in', label: '60in' },
    { id: '72in', label: '72in' },
    { id: '96in', label: '96in', locked: awning?.length > 0 && awning[0] === '8ft' },
  ]
  const concessionHeightOptions = [
    { id: '48in', label: '48in' },
    { id: '36in', label: '36in' },
  ]

  const widthBadgeMap = {
    '60in': '+$320',
  }

  const handleBathroom = (id) => {
    if (bathroom === id && focusedCamera !== "Bathroom Camera") {
      setFocusedCamera("Bathroom Camera");
      return;
    }
    const newValue = bathroom === id ? null : id;
    setBathroom(newValue);
    if (newValue) {
      setFocusedCamera("Bathroom Camera");
    }
  }

  return (
    <>
    {show('BATHROOM PACKAGES') && (
        <div className="contents">
          <OptionSection title="BATHROOM PACKAGES">
          {parseFloat(length) < 28 ? (
            <p className="text-gray-400 text-xs tracking-wider mb-4 -mt-3">
              * Bathroom options are hidden for trailers under 28ft length.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
            {BATHROOM_PACKAGE_OPTIONS.map((opt) => (
              <DetailedOptionCard
                key={opt.id}
                label={opt.label}
                price={opt.price} badge={opt.badge}
                isSelected={bathroom === opt.id}
                onClick={() => handleBathroom(opt.id)}
                includedItems={
                  opt.id === 'half'
                    ? ['Half Bath + 32" x 32" shower w/surround']
                    : [
                        'Water pkg',
                        'Hand wash sink',
                        'Partition wall w/door',
                        'Coin Floor',
                        'Powered vent',
                        'Toilet',
                        'Base cabinet',
                        'White metal',
                        'LED'
                      ]
                }
              />
            ))}
          </div>
          )}
        </OptionSection>
        </div>
      )}
      {show('WATER PACKAGE') && (
        <OptionSection title="WATER PACKAGE">
          <div className="flex flex-col gap-2">
            {WATER_PACKAGE_OPTIONS.map((opt) => {
              let includedItems = [];
              if (opt.id === 'large') {
                includedItems = [
                  '42 gal fresh water',
                  '32 gal waste',
                  '6 gal heater',
                  'water pump',
                  'City gravity Water center'
                ];
              }
              return (
                <DetailedOptionCard
                  key={opt.id}
                  label={opt.label}
                  price={opt.price} badge={opt.badge}
                  isLocked={opt.locked}
                  isSelected={waterPackage === opt.id}
                  onClick={() => !opt.locked && setWaterPackage(waterPackage === opt.id ? null : opt.id)}
                  includedItems={includedItems.length > 0 ? includedItems : undefined}
                />
              );
            })}
          </div>
          <AlertMessage message={'8" MF + ELECTRICAL REQUIRED'} />
        </OptionSection>
      )}

      {show('SINK PACKAGE') && (
        <div className="contents">
          <OptionSection title="SINK PACKAGE">
          <div className="flex flex-col gap-2">
            {SINK_PACKAGE_OPTIONS.map((opt) => (
              <DetailedOptionCard
                key={opt.id}
                label={opt.label}
                price={opt.price} badge={opt.badge}
                isSelected={sinkPackage === opt.id}
                onClick={() => {
                  const newValue = sinkPackage === opt.id ? null : opt.id;
                  setSinkPackage(newValue)
                  if (newValue) setFocusedCamera("Sink Camera")
                }}
                includedItems={[
                  'Front Base Cabinet',
                  '3-bowl stainless sink',
                  'Hand wash sink',
                  'Large water package'
                ]}
              />
            ))}
          </div>
          <AlertMessage message={'8" MF + ELECTRICAL REQUIRED'} />
        </OptionSection>
        </div>
      )}

      {show('CONCESSION DOOR') && (
        <div className="contents">
        <OptionSection title="CONCESSION DOOR / WINDOW">
          <div className="mb-4">
            <p className="text-gray-400 text-[10px] tracking-wider mb-2 uppercase">Concession door placement</p>
            <div className="w-full">
              <SegmentedControl
                options={[
                  { id: 'none', label: 'NONE' },
                  ...CONCESSION_DOOR_PLACEMENT_OPTIONS.map(o => ({
                    ...o,
                    disabled: escapeDoor !== 'none' && o.id === 'driver',
                    disabledReason: escapeDoor !== 'none' && o.id === 'driver' ? "Driver side placement is disabled because an Escape Door is already on the Driver side." : null
                  }))
                ]}
                value={concessionDoor}
                onChange={(val) => {
                  setConcessionDoor(val)
                  if (val !== 'none') {
                    setFocusedCamera(val === 'driver' ? 'Concession Door L Camera' : 'Concession Door R Camera')
                  }
                }}
              />
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center">
            <div className="flex w-full items-center justify-between gap-2 px-2">
              <img src="/concession door.png" className="w-[120px] sm:w-[150px] md:w-full md:max-w-[200px] lg:max-w-[300px] mx-auto object-contain my-4" />
              <div className="h-[150px] flex-shrink-0 z-10">
                <VerticalDotSlider
                  options={concessionHeightOptions}
                  value={concessionHeight}
                  onChange={(val) => {
                    setConcessionHeight(val)
                    if (concessionDoor !== 'none') {
                      setFocusedCamera(concessionDoor === 'driver' ? 'Concession Door L Camera' : 'Concession Door R Camera')
                    }
                  }}
                />
              </div>
            </div>
            
            <div className="w-[200px] mt-6 ml-[-40px]">
              <DotSlider
                options={concessionWidthOptions}
                value={concessionWidth}
                onChange={(val) => {
                  setConcessionWidth(val)
                  if (concessionDoor !== 'none') {
                    setFocusedCamera(concessionDoor === 'driver' ? 'Concession Door L Camera' : 'Concession Door R Camera')
                  }
                }}
                badge={widthBadgeMap[concessionWidth]}
              />
            </div>
          </div>

          <div className="mt-8">
            <ToggleSwitch
              label="Glass Screen"
              checked={glassScreen}
              onChange={(val) => {
                setGlassScreen(val)
                if (concessionDoor !== 'none') {
                  setFocusedCamera(concessionDoor === 'driver' ? 'Concession Door L Camera' : 'Concession Door R Camera')
                }
              }}
              disabled={concessionDoor === 'none'}
              disabledReason={concessionDoor === 'none' ? "Requires a concession door" : null}
            />
          </div>
        </OptionSection>
        </div>
      )}


      {show('TONGUE MOUNTED GENERATOR BOX') && (
        <div className="contents">
          <OptionSection title="TONGUE MOUNTED GENERATOR BOX">
            <div>
              <h4 className="text-white text-sm font-semibold uppercase tracking-wider mb-1">GENERATOR BOX (34"H X 36"W X 26"D)</h4>
              <div className="flex flex-col gap-2 mt-4">
                {GENERATOR_BOX_OPTIONS.map((opt) => {
                  const isGooseneck = width === '8.5ftgn' || frontStyle === 'gooseneck';
                  return (
                    <OptionPill
                      key={opt.id}
                      label={opt.label}
                      price={opt.price} badge={opt.badge}
                      isSelected={generatorBox === opt.id}
                      isLocked={isGooseneck}
                      disabledReason={isGooseneck ? "Not available on Gooseneck models" : null}
                      onClick={() => {
                        if (isGooseneck) return;
                        setGeneratorBox(opt.id);
                        if (opt.id !== 'none') {
                          if (frontStyle === 'extendedvnose') {
                            setFocusedCamera("Tongue Mounted Generator Box Extended V-Nose Camera");
                          } else if (frontStyle === 'flatfront') {
                            setFocusedCamera("Tongue Mounted Generator Box Flat Front Camera");
                          } else {
                            setFocusedCamera("Tongue Mounted Generator Box V-Nose Camera");
                          }
                        }
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </OptionSection>
        </div>
      )}
      
      {show('ATP BATTERY BOX ON TONGUE') && (
        <div className="contents">
        <OptionSection title="ATP BATTERY BOX ON TONGUE">
          <p className="text-gray-400 text-xs tracking-wider mb-4 -mt-3">Requires extended TTT</p>
          {(frontStyle === 'flatfront' && generatorBox && generatorBox !== 'none') ? (
            <div className="mt-2">
              <AlertMessage message="Hidden due to Tongue Mounted Generator Box selection" />
            </div>
          ) : (
            <ToggleSwitch
              label="Battery box on tongue"
              checked={batteryBox}
              onChange={(val) => {
                setBatteryBox(val)
                if (val) {
                  const cameraName = frontStyle === 'extendedvnose' 
                    ? 'ATP Battery Box(Extended V-Nose) Camera'
                    : 'ATP Battery Box(Flat Front, V-Nose, Slant V-Nose) Camera';
                  setFocusedCamera(cameraName)
                }
              }}
            />
          )}
        </OptionSection>
        </div>
      )}
      
      {show('L-SHAPE COUNTER/HIDDEN GENERATOR BOX') && (
        <div className="contents">
        <OptionSection title="L-SHAPE COUNTER/HIDDEN GENERATOR BOX">
          <p className="text-gray-400 text-xs tracking-wider mb-4 -mt-3">Custom build</p>
          <ToggleSwitch
            label="Dimensions and placement quoted per order"
            checked={lShapeCounter}
            onChange={(val) => {
              setLShapeCounter(val);
              if (val) setFocusedCamera("L_Shape_Counter_Hidden_Generator_Box_Camera");
            }}
            disabled={((sinkPackage && sinkPackage !== 'none') || (cabinets && cabinets.some(c => ['wallrun36', 'frontbase36'].includes(c))))}
            disabledReason={((sinkPackage && sinkPackage !== 'none') || (cabinets && cabinets.some(c => ['wallrun36', 'frontbase36'].includes(c)))) ? "Hidden due to Sink/Cabinets selection" : null}
          />
        </OptionSection>
        </div>
      )}


    </>
  )
}
