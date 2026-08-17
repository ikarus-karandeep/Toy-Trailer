import { useState, useEffect } from 'react'
import { useConfigurator } from '../../context/ConfiguratorContext'
import {
  WATER_PACKAGE_OPTIONS,
  SINK_PACKAGE_OPTIONS,
  BATHROOM_PACKAGE_OPTIONS,
  WINCH_OPTIONS,
  GENERATOR_BOX_OPTIONS,
  AWNING_OPTIONS
} from '../../constants/configData'
import OptionSection from '../../components/OptionSection'
import OptionPill from '../../components/OptionPill'
import ToggleSwitch from '../../components/ToggleSwitch'
import AlertMessage from '../../components/AlertMessage'
import DotSlider from '../../components/DotSlider'
import DetailedOptionCard from '../../components/DetailedOptionCard'

export default function AddOnsPanel({ activeSectionTitle }) {
  const { 
    bathroom, setBathroom, 
    generatorBox, setGeneratorBox,
    toolBox, setToolBox,
    ladderRacks, setLadderRacks,
    recessedTireBox, setRecessedTireBox,
    radioPackageSpeaker, setRadioPackageSpeaker,
    awning, setAwningRaw,
    sinkPackage, setSinkPackage,
    batteryBox, setBatteryBox,
    lShapeCounter, setLShapeCounter,
    genSlides, setGenSlides,
    genDoor, setGenDoor,
    frontStyle,
    length,
    cabinets,
    viewMode, setViewMode,
    waterPackage, setWaterPackage,
    setFocusedCamera
  } = useConfigurator()

  const [largeWaterOpen, setLargeWaterOpen] = useState(true)

  const [sinkPackageOpen, setSinkPackageOpen] = useState(true)

  const [fullBathOpen, setFullBathOpen] = useState(true)

  const [awningLength, setAwningLength] = useState(awning?.length > 0 ? awning[0] : '18ft')

  const [winch, setWinch] = useState('winchsystem')


  

  // Sync local slider state with global awning state changes
  useEffect(() => {
    if (awning && awning.length > 0) {
      setAwningLength(awning[0]);
    }
  }, [awning]);

  useEffect(() => {
    const hasGenBox = frontStyle === 'flatfront' && generatorBox && generatorBox !== 'none';
    if (hasGenBox) {
      if (batteryBox) {
        setBatteryBox(false);
      }
    }
  }, [frontStyle, generatorBox, batteryBox, setBatteryBox]);

  const show = (title) => {
    if (!activeSectionTitle) return true
    if (activeSectionTitle === 'WATER PACKAGE & SINK') {
      return title === 'WATER PACKAGE' || title === 'SINK PACKAGE'
    }
    if (activeSectionTitle === 'BASE ADDONS') {
      return [
        'WINCH', 
        'BUILT - IN TOOL CABINET', 
        'TONGUE MOUNTED GENERATOR BOX', 
        'ATP BATTERY BOX ON TONGUE', 
        'L-SHAPE COUNTER/HIDDEN GENERATOR BOX', 
        'LADDER RACKS',
        'RECESSED TIRE BOX',
        'RADIO PACKAGE SPEAKER'
      ].includes(title)
    }
    return activeSectionTitle === title
  }

  const handleBathroom = (id) => {
    setBathroom(bathroom === id ? null : id)
  }

  const awningLengthOptions = AWNING_OPTIONS.filter(opt => {
    const optLen = parseInt(opt.id);
    const trailerLen = parseInt(length || '24');
    return optLen <= trailerLen;
  }).map(opt => {
    const optLen = parseInt(opt.id);
    const trailerLen = parseInt(length || '24');
    let locked = false;
    if (optLen >= 24 && trailerLen < 32) locked = true;
    else if (optLen >= 18 && optLen <= 22 && trailerLen <= 28) locked = true;
    else if (optLen === 16 && trailerLen <= 26) locked = true;

    return {
      ...opt,
      locked
    };
  });

  const getAwningBadge = (len) => {
    const opt = AWNING_OPTIONS.find(o => o.id === len)
    if (opt && opt.price > 0) return `+$${opt.price.toLocaleString()}`
    return null
  }

  return (
    <>
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
                onClick={() => setSinkPackage(sinkPackage === opt.id ? null : opt.id)}
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

      {show('AWNINGS') && (
        <div className="contents">
          <OptionSection title="AWNINGS">
          {parseFloat(length) < 24 ? (
            <p className="text-gray-400 text-xs tracking-wider mb-4 -mt-3">
              * Awning options are hidden for trailers under 24ft length.
            </p>
          ) : (
            <>
              <img
                src="/Awnings.webp"
                alt="Awning preview"
                className="w-full rounded-xl object-cover mb-4"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
              <div className="flex flex-col gap-2">
            <OptionPill
              label="Electric Awning"
              isSelected={awning?.length > 0}
              onClick={() => {
                if (awning?.length > 0) {
                  setAwningRaw([])
                } else {
                  setAwningRaw([awningLength])
                }
              }}
            />
          </div>
          {awning?.length > 0 && (
            <div className="mt-6 px-4">
              <DotSlider
                options={awningLengthOptions}
                value={awningLength}
                onChange={(val) => {
                  setAwningLength(val)
                  setAwningRaw([val])
                }}
                badge={getAwningBadge(awningLength)}
              />
              {parseInt(length || '24') < 32 && (
                <p className="text-gray-400/80 text-[10px] tracking-wider mt-5 text-center px-2 leading-relaxed">
                  * Some larger awning sizes are disabled to fit your current trailer. 
                  <br/>
                  <span className="font-semibold text-gray-400">16ft</span> requires 28ft+ | <span className="font-semibold text-gray-400">18ft-22ft</span> requires 30ft+ | <span className="font-semibold text-gray-400">24ft</span> requires 32ft+
                </p>
              )}
            </div>
          )}
          </>
          )}
        </OptionSection>
        </div>
      )}

      {show('WINCH') && (
        <div className="contents">
          <OptionSection title="WINCH">
          <div className="flex flex-col gap-2">
            {WINCH_OPTIONS.map((opt) => (
              <OptionPill
                key={opt.id}
                label={opt.label}
                price={opt.price} badge={opt.badge}
                isSelected={winch === opt.id}
                onClick={() => setWinch(winch === opt.id ? null : opt.id)}
              />
            ))}
          </div>
        </OptionSection>
        </div>
      )}

      {show('TONGUE MOUNTED GENERATOR BOX') && (
        <div className="contents">
          <OptionSection title="TONGUE MOUNTED GENERATOR BOX">
          <div className="mb-8">
            <h4 className="text-white text-sm font-semibold uppercase tracking-wider mb-1">GENERATOR BOX (34"H X 36"W X 26"D)</h4>
            <p className="text-gray-400 text-xs tracking-wider mb-4">Requires flat front + Extended Tongue</p>
            <div className="flex flex-col gap-2">
              {GENERATOR_BOX_OPTIONS.map((opt) => (
                <OptionPill
                  key={opt.id}
                  label={opt.label}
                  price={opt.price} badge={opt.badge}
                  isSelected={generatorBox === opt.id}
                  isLocked={frontStyle !== 'flatfront'}
                  onClick={() => {
                    if (frontStyle === 'flatfront') {
                      setGeneratorBox(opt.id)
                    }
                  }}
                />
              ))}
            </div>
          </div>

          <div className="mb-8">
            <h4 className="text-white text-sm font-semibold uppercase tracking-wider mb-1">GENERATOR SLIDES & TRAY ONLY</h4>
            <p className="text-gray-400 text-xs tracking-wider mb-4">Add door separately</p>
            <ToggleSwitch
              label="Add your own door separately"
              checked={genSlides}
              onChange={setGenSlides}
              disabled={frontStyle !== 'flatfront'}
            />
          </div>

          <div>
            <h4 className="text-white text-sm font-semibold uppercase tracking-wider mb-1">GENERATOR DOOR 36"X36"</h4>
            <p className="text-gray-400 text-xs tracking-wider mb-4">w/ Vent & Flush Lock</p>
            <ToggleSwitch
              label="Standard gen door"
              checked={genDoor}
              onChange={setGenDoor}
              disabled={frontStyle !== 'flatfront'}
            />
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
              onChange={setBatteryBox}
            />
          )}
        </OptionSection>
        </div>
      )}
      
      {show('L-SHAPE COUNTER/HIDDEN GENERATOR BOX') && (
        <div className="contents">
        <OptionSection title="L-SHAPE COUNTER/HIDDEN GENERATOR BOX">
          <p className="text-gray-400 text-xs tracking-wider mb-4 -mt-3">Custom build</p>
          {((sinkPackage && sinkPackage !== 'none') || (cabinets && cabinets.some(c => ['wallrun36', 'frontbase36'].includes(c)))) ? (
            <div className="mt-2">
              <AlertMessage message="Hidden due to Sink/Cabinets selection" />
            </div>
          ) : (
            <ToggleSwitch
              label="Dimensions and placement quoted per order"
              checked={lShapeCounter}
              onChange={setLShapeCounter}
            />
          )}
        </OptionSection>
        </div>
      )}

      {show('LADDER RACKS') && (
        <div className="contents">
          <OptionSection title="LADDER RACKS">
          <ToggleSwitch
            label="INCLUDE LADDER RACKS"
            checked={ladderRacks}
            onChange={(val) => {
              setLadderRacks(val);
              if (val) setFocusedCamera("Top Supports Camera");
            }}
          />
        </OptionSection>
        </div>
      )}

      {show('RECESSED TIRE BOX') && (
        <div className="contents">
          <OptionSection title="RECESSED TIRE BOX">
            <ToggleSwitch
              label="INCLUDE RECESSED TIRE BOX"
              checked={recessedTireBox}
              onChange={(val) => {
                setRecessedTireBox(val);
                if (val) setFocusedCamera("Recessed Tire Box Camera");
              }}
            />
          </OptionSection>
        </div>
      )}

      {show('RADIO PACKAGE SPEAKER') && (
        <div className="contents">
          <OptionSection title="RADIO PACKAGE SPEAKER">
            <ToggleSwitch
              label="INCLUDE RADIO PACKAGE SPEAKER"
              checked={radioPackageSpeaker}
              onChange={(val) => {
                setRadioPackageSpeaker(val);
                if (val) setFocusedCamera("Radio Package Speaker Camera");
              }}
            />
          </OptionSection>
        </div>
      )}
    </>
  )
}
