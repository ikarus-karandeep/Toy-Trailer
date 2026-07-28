import { useState, useEffect } from 'react'
import { useConfigurator } from '../../context/ConfiguratorContext'
import {
  WATER_PACKAGE_OPTIONS,
  SINK_PACKAGE_OPTIONS,
  BATHROOM_PACKAGE_OPTIONS,
  WINCH_OPTIONS,
  GENERATOR_BOX_OPTIONS
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
    length
  } = useConfigurator()

  const [waterPackage, setWaterPackage] = useState(null)
  const [largeWaterOpen, setLargeWaterOpen] = useState(true)

  const [sinkPackageOpen, setSinkPackageOpen] = useState(true)

  const [fullBathOpen, setFullBathOpen] = useState(true)

  const [awningLength, setAwningLength] = useState('18ft')

  const [winch, setWinch] = useState('winchsystem')

  const [generatorBoxSelection, setGeneratorBoxSelection] = useState(null)
  const [genSlides, setGenSlides] = useState(false)
  const [genDoor, setGenDoor] = useState(false)
  
  const [lShapeCounter, setLShapeCounter] = useState(false)

  useEffect(() => {
    if (!length) return;
    const maxAwning = parseInt(length);
    const currentAwning = parseInt(awningLength);
    if (currentAwning > maxAwning) {
      const validOptions = [8, 10, 12, 14, 16, 18, 20, 22].filter(v => v <= maxAwning);
      if (validOptions.length > 0) {
        const newLen = `${validOptions[validOptions.length - 1]}ft`;
        setAwningLength(newLen);
        if (awning?.length > 0) {
          setAwningRaw([newLen]);
        }
      }
    }
  }, [length, awningLength, awning, setAwningRaw]);

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

  const awningLengthOptions = [
    { id: '8ft', label: '8ft' },
    { id: '10ft', label: '10ft' },
    { id: '12ft', label: '12ft' },
    { id: '14ft', label: '14ft' },
    { id: '16ft', label: '16ft' },
    { id: '18ft', label: '18ft' },
    { id: '20ft', label: '20ft' },
    { id: '22ft', label: '22ft' },
  ].filter(opt => parseInt(opt.id) <= parseInt(length || '22'))
  const awningBadgeMap = {
    '20ft': '+$203 - Added Battery'
  }

  return (
    <>
      {show('WATER PACKAGE') && (
        <OptionSection title="WATER PACKAGE">
          <div className="flex flex-col gap-2">
            {WATER_PACKAGE_OPTIONS.map((opt) => (
              <div key={opt.id} className="w-full">
                <OptionPill
                  label={opt.label}
                  price={opt.price}
                  isLocked={opt.locked}
                  isSelected={waterPackage === opt.id}
                  hasSettings={opt.id === 'large'}
                  onClick={() => !opt.locked && setWaterPackage(waterPackage === opt.id ? null : opt.id)}
                />
                
                {waterPackage === 'large' && opt.id === 'large' && (
                  <div className="mt-4 bg-[#111111] rounded-2xl p-5 border border-[#DA634B]">
                    <div 
                      className="flex items-center justify-between mb-4 cursor-pointer"
                      onClick={() => setLargeWaterOpen(!largeWaterOpen)}
                    >
                      <span className="text-gray-300 text-xs tracking-widest uppercase font-semibold">
                        What's Included
                      </span>
                      <span className="w-5 h-5 rounded-full border border-gray-500 text-gray-400 text-[10px] flex items-center justify-center">
                        <svg className={`w-3 h-3 transition-transform ${largeWaterOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </span>
                    </div>
                    {largeWaterOpen && (
                      <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-white text-[12px] lg:text-sm">
                        <div className="flex items-start gap-2">
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-white shrink-0" />
                          <span>42 gal fresh water</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-white shrink-0" />
                          <span>32 gal waste</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-white shrink-0" />
                          <span>6 gal heater</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-white shrink-0" />
                          <span>water pump</span>
                        </div>
                        <div className="flex items-start gap-2 col-span-2">
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-white shrink-0" />
                          <span>City gravity Water center</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          <AlertMessage message={'8" MF + ELECTRICAL REQUIRED'} />
        </OptionSection>
      )}

      {show('SINK PACKAGE') && (
        <OptionSection title="SINK PACKAGE">
          <div className="flex flex-col gap-2">
            {SINK_PACKAGE_OPTIONS.map((opt) => (
              <div key={opt.id} className="w-full">
                <OptionPill
                  label={opt.label}
                  price={opt.price}
                  isSelected={sinkPackage === opt.id}
                  hasSettings
                  onClick={() => setSinkPackage(sinkPackage === opt.id ? null : opt.id)}
                />
                
                {sinkPackage === opt.id && (
                  <div className="mt-4 bg-[#111111] rounded-2xl p-5 border border-[#DA634B]">
                    <div 
                      className="flex items-center justify-between mb-4 cursor-pointer"
                      onClick={() => setSinkPackageOpen(!sinkPackageOpen)}
                    >
                      <span className="text-gray-300 text-xs tracking-widest uppercase font-semibold">
                        What's Included
                      </span>
                      <span className="w-5 h-5 rounded-full border border-gray-500 text-gray-400 text-[10px] flex items-center justify-center">
                        <svg className={`w-3 h-3 transition-transform ${sinkPackageOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </span>
                    </div>
                    {sinkPackageOpen && (
                      <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-white text-[12px] lg:text-sm">
                        <div className="flex items-start gap-2">
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-white shrink-0" />
                          <span>Front Base Cabinet</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-white shrink-0" />
                          <span>3-bowl stainless sink</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-white shrink-0" />
                          <span>Hand wash sink</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-white shrink-0" />
                          <span>Large water package</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          <AlertMessage message={'8" MF + ELECTRICAL REQUIRED'} />
        </OptionSection>
      )}

      {show('BATHROOM PACKAGES') && (
        <OptionSection title="BATHROOM PACKAGES">
          <div className="flex flex-col gap-2">
            {BATHROOM_PACKAGE_OPTIONS.map((opt) => (
              <DetailedOptionCard
                key={opt.id}
                label={opt.label}
                price={opt.price}
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
        </OptionSection>
      )}

      {show('AWNINGS') && (
        <OptionSection title="AWNINGS">
          <img
            src="/Awnings.png"
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
                badge={awningBadgeMap[awningLength]}
              />
            </div>
          )}
        </OptionSection>
      )}

      {show('WINCH') && (
        <OptionSection title="WINCH">
          <div className="flex flex-col gap-2">
            {WINCH_OPTIONS.map((opt) => (
              <OptionPill
                key={opt.id}
                label={opt.label}
                price={opt.price}
                isSelected={winch === opt.id}
                onClick={() => setWinch(winch === opt.id ? null : opt.id)}
              />
            ))}
          </div>
        </OptionSection>
      )}

      

      {show('TONGUE MOUNTED GENERATOR BOX') && (
        <OptionSection title="TONGUE MOUNTED GENERATOR BOX">
          <div className="mb-8">
            <h4 className="text-white text-sm font-semibold uppercase tracking-wider mb-1">GENERATOR BOX (34"H X 36"W X 26"D)</h4>
            <p className="text-gray-400 text-xs tracking-wider mb-4">Requires flat front + Extended Tongue</p>
            <div className="flex flex-col gap-2">
              {GENERATOR_BOX_OPTIONS.map((opt) => (
                <OptionPill
                  key={opt.id}
                  label={opt.label}
                  price={opt.price}
                  isSelected={generatorBoxSelection === opt.id}
                  onClick={() => setGeneratorBoxSelection(opt.id)}
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
            />
          </div>

          <div>
            <h4 className="text-white text-sm font-semibold uppercase tracking-wider mb-1">GENERATOR DOOR 36"X36"</h4>
            <p className="text-gray-400 text-xs tracking-wider mb-4">w/ Vent & Flush Lock</p>
            <ToggleSwitch
              label="Standard gen door"
              checked={genDoor}
              onChange={setGenDoor}
            />
          </div>
        </OptionSection>
      )}
      
      {show('ATP BATTERY BOX ON TONGUE') && (
        <OptionSection title="ATP BATTERY BOX ON TONGUE">
          <p className="text-gray-400 text-xs tracking-wider mb-4 -mt-3">Requires extended TTT</p>
          <ToggleSwitch
            label="Battery box on tongue"
            checked={batteryBox}
            onChange={setBatteryBox}
          />
        </OptionSection>
      )}
      
      {show('L-SHAPE COUNTER/HIDDEN GENERATOR BOX') && (
        <OptionSection title="L-SHAPE COUNTER/HIDDEN GENERATOR BOX">
          <p className="text-gray-400 text-xs tracking-wider mb-4 -mt-3">Custom build</p>
          <ToggleSwitch
            label="Dimensions and placement quoted per order"
            checked={lShapeCounter}
            onChange={setLShapeCounter}
          />
        </OptionSection>
      )}

      {show('LADDER RACKS') && (
        <OptionSection title="LADDER RACKS">
          <ToggleSwitch
            label="INCLUDE LADDER RACKS"
            checked={ladderRacks}
            onChange={setLadderRacks}
          />
        </OptionSection>
      )}

      {show('RECESSED TIRE BOX') && (
        <OptionSection title="RECESSED TIRE BOX">
          <ToggleSwitch
            label="INCLUDE RECESSED TIRE BOX"
            checked={recessedTireBox}
            onChange={setRecessedTireBox}
          />
        </OptionSection>
      )}

      {show('RADIO PACKAGE SPEAKER') && (
        <OptionSection title="RADIO PACKAGE SPEAKER">
          <ToggleSwitch
            label="INCLUDE RADIO PACKAGE SPEAKER"
            checked={radioPackageSpeaker}
            onChange={setRadioPackageSpeaker}
          />
        </OptionSection>
      )}
    </>
  )
}
