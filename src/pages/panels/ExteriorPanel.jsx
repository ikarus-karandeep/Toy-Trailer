import { useState, useEffect } from 'react'
import { useConfigurator } from '../../context/ConfiguratorContext'
import { usePackageBadge } from '../../hooks/usePackageBadge'
import {
  EXTERIOR_FINISH_OPTIONS,
  COLOR_OPTIONS,
  EXTERIOR_ACCESSORIES_OPTIONS,
  FRONT_STYLE_OPTIONS,
  ROOF_BUILD_OPTIONS,
  PROTECTION_TYPE_OPTIONS,
  PROTECTION_SIZE_OPTIONS,
  FRONT_PROTECTION_OPTIONS,
  WHEEL_TYPE_OPTIONS,
  TIRE_SIZE_OPTIONS,
  LUG_OPTIONS,
  SIDE_DOOR_OPTIONS,
  AWNING_OPTIONS,
  LADDER_RACK_OPTIONS,
} from '../../constants/configData'
import OptionSection from '../../components/OptionSection'
import OptionPill from '../../components/OptionPill'
import ColorSwatch from '../../components/ColorSwatch'
import ToggleSwitch from '../../components/ToggleSwitch'
import CarouselSlider from '../../components/CarouselSlider'

export default function ExteriorPanel({ activeSectionTitle }) {
  const {
    exteriorFinish, setExteriorFinish,
    selectedColor, setSelectedColor,
    preBlackoutColor, setPreBlackoutColor,
    exteriorAccessories, setExteriorAccessories,
    frontStyle, setFrontStyle,
    roofBuild, setRoofBuild,
    protectionType, setProtectionType,
    protectionSize, setProtectionSize,
    frontProtection, setFrontProtection,
    lugType, setLugType,
    tireSize, setTireSize,
    wheelType, setWheelType,
    sideDoorsType, setSideDoorsType,
    blackoutCabinetDoors, setBlackoutCabinetDoors,
    width, length,
    stairs, setStairs,
    ladderRacks, setLadderRacks,
    axleAtp, setAxleAtp,
    awning, setAwningRaw,
    viewMode, setViewMode,
    setFocusedCamera
  } = useConfigurator()

  const [awningLength, setAwningLength] = useState(awning?.length > 0 ? awning[0] : '18ft')

  const trailerLen = parseInt(length || '24');
  const maxAwningLen = Math.min(22, trailerLen - 2);

  // Sync local slider state with global awning state changes and auto-clamp to (trailer length - 2)
  useEffect(() => {
    if (awning && awning.length > 0) {
      const currentLen = parseInt(awning[0]);
      if (currentLen > maxAwningLen) {
        const validOpts = AWNING_OPTIONS.filter(o => parseInt(o.id) <= maxAwningLen);
        const bestOpt = validOpts[validOpts.length - 1];
        if (bestOpt) {
          setAwningLength(bestOpt.id);
          setAwningRaw([bestOpt.id]);
        }
      } else {
        setAwningLength(awning[0]);
      }
    }
  }, [length, awning, maxAwningLen, setAwningRaw]);

  const awningLengthOptions = AWNING_OPTIONS.filter(opt => {
    const optLen = parseInt(opt.id);
    return optLen <= maxAwningLen;
  });

  const getAwningBadge = (len) => {
    const opt = AWNING_OPTIONS.find(o => o.id === len)
    if (opt && opt.price > 0) return `+$${opt.price.toLocaleString()}`
    return null
  }

  const getBadge = usePackageBadge()

  const show = (title) => {
    if (!activeSectionTitle) return true
    if (activeSectionTitle === 'EXTERIOR ACCESSORIES' && (title === 'LADDER RACKS' || title === 'AWNINGS')) return true
    return activeSectionTitle === title
  }

  return (
    <div className="contents">
      {show('EXTERIOR FINISH') && (
  <OptionSection title="EXTERIOR FINISH">

    <div className="bg-[#1a1a1a] rounded-3xl border border-[#2a2a2a] p-4 lg:p-5">
      <div className="flex flex-wrap gap-2">
        {EXTERIOR_FINISH_OPTIONS.map((opt) => (
          <OptionPill
            key={opt.id}
            label={opt.label}
            price={opt.price} badge={opt.badge}
            isStandard={opt.isStandard}
            isSelected={exteriorFinish === opt.id}
            isLocked={!!opt.disabled}
            onClick={() => {
              if (opt.disabled) return;
              if (exteriorFinish === opt.id) {
                setExteriorFinish(null)
              } else {
                setExteriorFinish(opt.id)
                if (opt.id === 'blackout') {
                  // setSelectedColor('black')
                  setProtectionType('atp')
                  if (setBlackoutCabinetDoors) setBlackoutCabinetDoors(true)
                }
              }
            }}
            packageBadge={getBadge(opt.id)}
          />
        ))}

      </div>

      {exteriorFinish === 'blackout' && (
        <div className="mt-4 bg-[#111111] rounded-2xl p-4 lg:p-5 border border-[#2a2a2a]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-300 text-xs tracking-widest uppercase font-semibold">
              What's Included
            </span>
            <span className="w-5 h-5 rounded-full border border-gray-500 text-gray-400 text-[10px] flex items-center justify-center">
              i
            </span>
          </div>
          <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-white text-sm">
            <div className="flex items-start gap-2">
              <span className="mt-1 w-1 h-1 rounded-full bg-white shrink-0" />
              <span>Black exterior trim</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-1 w-1 h-1 rounded-full bg-white shrink-0" />
              <span>Black ATP fenders</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-1 w-1 h-1 rounded-full bg-white shrink-0" />
              <span>Black door trim</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-1 w-1 h-1 rounded-full bg-white shrink-0" />
              <span>Black Stoneguard</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-1 w-1 h-1 rounded-full bg-white shrink-0" />
              <span>Black noseguard</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-1 w-1 h-1 rounded-full bg-white shrink-0" />
              <span>Black ATP stepwell</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-1 w-1 h-1 rounded-full bg-white shrink-0" />
              <span>Black barlocks/camlocks w/ black hasps</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-1 w-1 h-1 rounded-full bg-white shrink-0" />
              <span>Black Wheels</span>
            </div>
          </div>
        </div>
      )}
    </div>

    <div className="mt-6 bg-[#1a1a1a] rounded-3xl border border-[#2a2a2a] p-4 lg:p-6">
      <div className="flex justify-center mb-6">
        <span className="border border-gray-500 rounded-full px-6 py-2 text-gray-300 text-xs tracking-widest uppercase">
          Standard Exterior Colors
        </span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-3 gap-3 sm:gap-4">
        {COLOR_OPTIONS.map((opt) => (
          <ColorSwatch
            key={opt.id}
            id={opt.id}
            label={opt.label}
            color={opt.color}
            image={opt.image}
            isSelected={selectedColor === opt.id}
            onClick={() => {
              setSelectedColor(opt.id);
            }}
          />
        ))}
      </div>
    </div>

  </OptionSection>
)}

      {show('EXTERIOR ACCESSORIES') && (
        <OptionSection title="EXTERIOR ACCESSORIES">
          <ToggleSwitch
            label="REAR SPOILER WING W/ (2) RACING LIGHTS (STANDALONE)"
            subtext="Rear wing w/ 2 racing lights — available separately on any build"
            price={540}
            checked={exteriorAccessories === 'rearwingspoiler'}
            onChange={(val) => {
              setExteriorAccessories(val ? 'rearwingspoiler' : null);
              if (val) {
                setFocusedCamera("Rear Spoiler Wing w_ Angled Lights Camera");
              }
            }}
          />
        </OptionSection>
      )}

      {show('AWNINGS') && (
        <OptionSection title="AWNINGS">
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
                  let selectedLen = awningLength;
                  if (parseInt(selectedLen) > maxAwningLen) {
                    const validOpts = AWNING_OPTIONS.filter(o => parseInt(o.id) <= maxAwningLen);
                    selectedLen = validOpts[validOpts.length - 1]?.id || `${maxAwningLen}ft`;
                    setAwningLength(selectedLen);
                  }
                  setAwningRaw([selectedLen])
                  setFocusedCamera("Electric Awning Camera")
                }
              }}
            />
          </div>
          {awning?.length > 0 && (
            <div className="mt-4">
              <CarouselSlider
                options={awningLengthOptions}
                value={awningLength}
                onChange={(val) => {
                  setAwningLength(val)
                  setAwningRaw([val])
                  setFocusedCamera("Electric Awning Camera")
                }}
                badge={getAwningBadge(awningLength)}
                formatLabel={(opt) => opt.label}
              />
              {/* <p className="text-gray-400 text-[11px] text-center mt-2">
                Max awning size is {maxAwningLen}ft (max 22ft).
              </p> */}
            </div>
          )}
        </OptionSection>
      )}

      {show('FRONT STYLE') && (
        <OptionSection title="FRONT STYLE">
          <p className="text-gray-400 text-xs mb-3">V-nose adds 3ft of nose storage</p>
          <div className="flex flex-wrap gap-2">
            {FRONT_STYLE_OPTIONS.map((opt) => (
              <OptionPill
                key={opt.id}
                label={opt.label}
                price={opt.price} badge={opt.badge}
                isStandard={opt.isStandard}
                isSelected={frontStyle === opt.id}
                isLocked={width === '8.5ftgn'}
                onClick={() => {
                  setFrontStyle(opt.id)
                  if (opt.id === 'extendedvnose') {
                    setFocusedCamera("Sidewind(Extended V - Nose) Camera.001")
                  } else {
                    setFocusedCamera("Front Style Camera")
                  }
                }}
              />
            ))}
          </div>
          <img 
            src={{
              'vnose24': '/vnose.png',
              'flatfront': '/flatfront.png',
              'slantvnose': '/slant.png',
              'extendedvnose': '/extended.png'
            }[frontStyle] || "/Front Style.png"} 
            className="w-[120px] sm:w-[150px] md:w-full md:max-w-[200px] lg:max-w-[300px] mx-auto object-contain my-4" 
            alt="Front Style"
          />
        </OptionSection>
      )}

      {(show('ROOF BUILD')) && (
  <OptionSection>
    {/* ROOF BUILD */}
    {(show('ROOF BUILD') || !activeSectionTitle) && (
      <div>
        <h2 className="text-white font-medium text-[13px] md:text-[18px] lg:text-[20px] tracking-widest uppercase mb-2">ROOF BUILD</h2>
        <p className="text-gray-400 text-xs tracking-wider mb-6">
          Seamless Aluminum Roof available on 8.5x14-28ft
        </p>
        <div className="flex flex-wrap gap-2">
          {ROOF_BUILD_OPTIONS.map((opt) => (
            <OptionPill
              key={opt.id}
              label={opt.label}
              price={opt.price} badge={opt.badge}
              isStandard={opt.isStandard}
              isSelected={roofBuild === opt.id}
              onClick={() => setRoofBuild(roofBuild === opt.id ? null : opt.id)}
            />
          ))}
        </div>
      </div>
    )}
  </OptionSection>
)}

      {show('LADDER RACKS') && (
        <OptionSection title="LADDER RACKS">
          <div className="flex flex-col gap-2">
            {LADDER_RACK_OPTIONS.map((opt) => {
              const isSelected = ladderRacks === opt.id || (opt.id === 'standard' && ladderRacks === true)
              return (
                <OptionPill
                  key={opt.id}
                  fullWidth={true}
                  label={opt.label}
                  isSelected={isSelected}
                  onClick={() => {
                    const nextVal = isSelected ? false : opt.id
                    setLadderRacks(nextVal)
                    if (nextVal) setFocusedCamera("Top Supports Camera")
                  }}
                />
              )
            })}
          </div>
          <div className="border-t border-[#5D5E60] my-5" />
          <ToggleSwitch
            label="ROOF LADDER"
            price={150}
            checked={stairs}
            onChange={(val) => {
              setStairs(val);
              if (val) {
                if (frontStyle === 'flatfront') {
                  setFocusedCamera("Stair (Flat Front) Camera");
                } else {
                  setFocusedCamera("Stair (V-Nose) Camera");
                }
              }
            }}
            disabled={width === '8.5ftgn' || frontStyle === 'extendedvnose'}
            disabledReason={(width === '8.5ftgn' || frontStyle === 'extendedvnose') ? `Cannot add roof ladder on ${(width === '8.5ftgn') ? 'gooseneck model' : 'extended v-nose'}` : null}
          />
        </OptionSection>
      )}


      {(show('TRAILER PROTECTION (SIDES & REAR)') || show('TRAILER PROTECTION (FRONT)')) && (
  <OptionSection title="TRAILER PROTECTION (SIDES & REAR)">

    {/* TYPE + SIZE */}
    {(show('TRAILER PROTECTION (SIDES & REAR)') || !activeSectionTitle) && (
      <div>
        <h4 className="text-white text-[11px] md:text-sm font-normal uppercase tracking-wider mb-3">Type</h4>
        <div className="flex flex-wrap gap-2">
          {PROTECTION_TYPE_OPTIONS.map((opt) => {
            const isSel = protectionType === opt.id && axleAtp !== false;
            return (
              <OptionPill
                key={opt.id}
                label={opt.label}
                price={opt.price} badge={opt.badge}
                isStandard={opt.isStandard}
                isSelected={isSel}
                isLocked={exteriorFinish === 'blackout' && opt.id !== 'atp'}
                disabledReason={exteriorFinish === 'blackout' && opt.id !== 'atp' ? "Not available with blackout package" : null}
                onClick={() => {
                  if (exteriorFinish === 'blackout' && opt.id !== 'atp') return;
                  if (isSel) {
                    setProtectionType(null);
                    setAxleAtp(false);
                  } else {
                    setProtectionType(opt.id);
                    setAxleAtp(true);
                    if (!protectionSize) setProtectionSize('24');
                  }
                }}
              />
            );
          })}
        </div>

        {(protectionType === 'atp' && axleAtp !== false) && (
          <>
            <h4 className="text-white text-[11px] md:text-sm font-normal uppercase tracking-wider mb-3 mt-6">Size</h4>
            <div className="flex flex-wrap gap-2">
              {PROTECTION_SIZE_OPTIONS.map((opt) => (
                <OptionPill
                  key={opt.id}
                  label={opt.label}
                  price={opt.price} badge={opt.badge}
                  isStandard={opt.isStandard}
                  isSelected={protectionSize === opt.id}
                  onClick={() => setProtectionSize(opt.id)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    )}

    {/* DIVIDER */}
    {(!activeSectionTitle || (show('TRAILER PROTECTION (SIDES & REAR)') && show('TRAILER PROTECTION (FRONT)'))) && (
      <div className="border-t border-[#5D5E60] my-6" />
    )}

    {/* TRAILER PROTECTION (FRONT) */}
    {(show('TRAILER PROTECTION (FRONT)') || !activeSectionTitle) && (
      <div>
        <h4 className="text-white text-[11px] md:text-sm font-semibold uppercase tracking-wider mb-4">Trailer Protection (Front)</h4>
        <div className="flex flex-wrap gap-2">
          {FRONT_PROTECTION_OPTIONS.map((opt) => (
            <OptionPill
              key={opt.id}
              label={opt.label}
              price={opt.price} badge={opt.badge}
              isStandard={opt.isStandard}
              isSelected={frontProtection === opt.id}
              onClick={() => setFrontProtection(frontProtection === opt.id ? null : opt.id)}
            />
          ))}
        </div>
      </div>
    )}

  </OptionSection>
)}

      {show('WHEELS AND FINISHING') && (
  <OptionSection title="WHEELS AND FINISHING">

    {/* LUGS */}
    <div>
      <h4 className="text-white text-[11px] md:text-sm font-semibold uppercase tracking-wider mb-3">Lugs</h4>
      <div className="flex flex-wrap gap-2">
        {LUG_OPTIONS.map((opt) => (
          <OptionPill
            key={opt.id}
            label={opt.locked ? `${opt.label} · 🔒` : opt.label}
            price={opt.price} badge={opt.badge}
            isStandard={opt.isStandard}
            isSelected={lugType === opt.id}
            onClick={() => setLugType(opt.id)}
          />
        ))}
      </div>
    </div>

    <div className="border-t border-[#5D5E60] my-5" />

    {/* TIRE SIZE */}
    <div>
      <h4 className="text-white text-[11px] md:text-sm font-semibold uppercase tracking-wider mb-3">Tire Size</h4>
      <div className="flex flex-wrap gap-2">
        {TIRE_SIZE_OPTIONS.map((opt) => (
          <OptionPill
            key={opt.id}
            label={opt.label}
            price={opt.price} badge={opt.badge}
            isStandard={opt.isStandard}
            isSelected={tireSize === opt.id}
            onClick={() => setTireSize(opt.id)}
          />
        ))}
      </div>
    </div>

    <div className="border-t border-[#5D5E60] my-5" />

    {/* WHEEL TYPE */}
    <div>
      <h4 className="text-white text-[11px] md:text-sm font-semibold uppercase tracking-wider mb-3">Wheel Type</h4>
      <div className="flex flex-wrap gap-2">
        {WHEEL_TYPE_OPTIONS.map((opt) => (
          <OptionPill
            key={opt.id}
            label={opt.label}
            price={opt.price} badge={opt.badge}
            isStandard={opt.isStandard}
            isSelected={wheelType === opt.id}
            onClick={() => setWheelType(opt.id)}
          />
        ))}
      </div>

      {/* Wheel preview image */}
      <div className="flex justify-center mt-6 mb-0">
        <img src={wheelType === 'spideraluminum' ? "/spider wheel.webp" : "/standard wheel.webp"} alt="image" className="w-[120px] sm:w-[150px] md:w-full md:max-w-[200px] lg:max-w-[300px] mx-auto object-contain my-4" />
      </div>
    </div>

  </OptionSection>
)}
    </div>
  )
}
