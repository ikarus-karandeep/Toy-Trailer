import { useEffect } from 'react'
import { useConfigurator } from '../../context/ConfiguratorContext'
import { usePackageBadge } from '../../hooks/usePackageBadge'
import {
  EXTERIOR_FINISH_OPTIONS,
  COLOR_OPTIONS,
  EXTERIOR_ACCESSORIES_OPTIONS,
  FRONT_STYLE_OPTIONS,
  EXTERIOR_BUILD_OPTIONS,
  ROOF_BUILD_OPTIONS,
  PROTECTION_TYPE_OPTIONS,
  PROTECTION_SIZE_OPTIONS,
  FRONT_PROTECTION_OPTIONS,
  WHEEL_TYPE_OPTIONS,
  TIRE_SIZE_OPTIONS,
  LUG_OPTIONS,
  SIDE_DOOR_OPTIONS,
} from '../../constants/configData'
import OptionSection from '../../components/OptionSection'
import OptionPill from '../../components/OptionPill'
import ColorSwatch from '../../components/ColorSwatch'
import ToggleSwitch from '../../components/ToggleSwitch'

export default function ExteriorPanel({ activeSectionTitle }) {
  const {
    exteriorFinish, setExteriorFinish,
    selectedColor, setSelectedColor,
    preBlackoutColor, setPreBlackoutColor,
    exteriorAccessories, setExteriorAccessories,
    frontStyle, setFrontStyle,
    exteriorBuild, setExteriorBuild,
    roofBuild, setRoofBuild,
    protectionType, setProtectionType,
    protectionSize, setProtectionSize,
    frontProtection, setFrontProtection,
    lugType, setLugType,
    tireSize, setTireSize,
    wheelType, setWheelType,
    spareTire, setSpareTire,
    sideDoorsType, setSideDoorsType,
    width, length,
    stairs, setStairs,
  } = useConfigurator()

  const getBadge = usePackageBadge()

  const isShortTrailer = parseFloat(length) < 23.5

  useEffect(() => {
    if (isShortTrailer) setSideDoorsType('flatpanel')
  }, [isShortTrailer])

  const show = (title) => !activeSectionTitle || activeSectionTitle === title

  return (
    <>
      {show('EXTERIOR FINISH') && (
  <OptionSection title="EXTERIOR FINISH">

    <div className="bg-[#1a1a1a] rounded-3xl border border-[#2a2a2a] p-5">
      <div className="flex flex-wrap gap-2">
        {EXTERIOR_FINISH_OPTIONS.map((opt) => (
          <OptionPill
            key={opt.id}
            label={opt.label}
            price={opt.price}
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
                  setSelectedColor('black')
                  setProtectionType('atp')
                }
              }
            }}
            packageBadge={getBadge(opt.id)}
          />
        ))}

      </div>

      {exteriorFinish === 'blackout' && (
        <div className="mt-4 bg-[#111111] rounded-2xl p-5 border border-[#2a2a2a]">
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

    <div className="mt-6 bg-[#1a1a1a] rounded-3xl border border-[#2a2a2a] p-6">
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
          <div className="flex flex-wrap gap-2">
            {EXTERIOR_ACCESSORIES_OPTIONS.map((opt) => (
              <OptionPill
                key={opt.id}
                label={opt.label}
                price={opt.price}
                isStandard={opt.isStandard}
                isSelected={exteriorAccessories === opt.id}
                onClick={() => setExteriorAccessories(opt.id)}
              />
            ))}
          </div>
          <div className="border-t border-[#5D5E60] my-5" />
          {width === '8.5ftgn' && (
            <p className="text-gray-400 text-xs"> Cannot add stairs on gooseneck model</p>
          )}
          <ToggleSwitch
            label="INCLUDE STAIRS"
            checked={stairs}
            onChange={setStairs}
            disabled={width === '8.5ftgn'}
          />
        </OptionSection>
      )}

      {show('FRONT STYLE') && (
        <OptionSection title="FRONT STYLE">
          <p className="text-gray-400 text-xs mb-3">V-nose adds 3ft of nose storage. Flat front maximizes cargo floor length</p>
          <div className="flex flex-wrap gap-2">
            {FRONT_STYLE_OPTIONS.map((opt) => (
              <OptionPill
                key={opt.id}
                label={opt.label}
                price={opt.price}
                isStandard={opt.isStandard}
                isSelected={frontStyle === opt.id}
                isLocked={width === '8.5ftgn'}
                onClick={() => setFrontStyle(opt.id)}
              />
            ))}
          </div>
          <img
            src="/Front Style.png"/>
        </OptionSection>
      )}

      {(show('EXTERIOR BUILD') || show('ROOF BUILD')) && (
  <OptionSection>
    {/* EXTERIOR BUILD */}
    {(show('EXTERIOR BUILD') || !activeSectionTitle) && (
      <div>
        <h2 className="text-white font-medium text-[13px] md:text-[18px] lg:text-[20px] tracking-widest uppercase mb-2">EXTERIOR BUILD</h2>
        <p className="text-gray-400 text-xs tracking-wider mb-6">
          Conceals fasteners on major panels
        </p>
        <div className="flex flex-wrap gap-2">
          {EXTERIOR_BUILD_OPTIONS.map((opt) => (
            <OptionPill
              key={opt.id}
              label={opt.label}
              price={opt.price}
              isStandard={opt.isStandard}
              isSelected={exteriorBuild === opt.id}
              onClick={() => setExteriorBuild(opt.id)}
            />
          ))}
        </div>
      </div>
    )}

    {/* DIVIDER */}
    {(!activeSectionTitle || (show('EXTERIOR BUILD') && show('ROOF BUILD'))) && (
      <div className="border-t border-[#5D5E60]"></div>
    )}

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
              price={opt.price}
              isStandard={opt.isStandard}
              isSelected={roofBuild === opt.id}
              onClick={() => setRoofBuild(opt.id)}
            />
          ))}
        </div>
      </div>
    )}
  </OptionSection>
)}

      {(show('TRAILER PROTECTION (SIDES & REAR)') || show('TRAILER PROTECTION (FRONT)')) && (
  <OptionSection title="TRAILER PROTECTION (SIDES & REAR)">

    {/* TYPE + SIZE */}
    {(show('TRAILER PROTECTION (SIDES & REAR)') || !activeSectionTitle) && (
      <div>
        <h4 className="text-white text-[11px] md:text-sm font-normal uppercase tracking-wider mb-3">Type</h4>
        <div className="flex flex-wrap gap-2">
          {PROTECTION_TYPE_OPTIONS.map((opt) => (
            <OptionPill
              key={opt.id}
              label={opt.label}
              price={opt.price}
              isStandard={opt.isStandard}
              isSelected={protectionType === opt.id}
              isLocked={exteriorFinish === 'blackout' && opt.id !== 'atp'}
              onClick={() => {
                if (exteriorFinish === 'blackout' && opt.id !== 'atp') return;
                setProtectionType(opt.id);
              }}
            />
          ))}
        </div>

        <h4 className="text-white text-[11px] md:text-sm font-normal uppercase tracking-wider mb-3 mt-6">Size</h4>
        <div className="flex flex-wrap gap-2">
          {PROTECTION_SIZE_OPTIONS.map((opt) => (
            <OptionPill
              key={opt.id}
              label={opt.label}
              price={opt.price}
              isStandard={opt.isStandard}
              isSelected={protectionSize === opt.id}
              onClick={() => setProtectionSize(opt.id)}
            />
          ))}
        </div>
      </div>
    )}

    {/* DIVIDER */}
    {(!activeSectionTitle || (show('TRAILER PROTECTION (SIDES & REAR)') && show('TRAILER PROTECTION (FRONT)'))) && (
      <div className="border-t border-[#5D5E60] my-6" />
    )}

    {/* TRAILER PROTECTION (FRONT) */}
    {(show('TRAILER PROTECTION (FRONT)') || !activeSectionTitle) && (
      <div>
        <h4 className="text-white text-[11px] md:text-sm font-semibold uppercase tracking-wider mb-1">Trailer Protection (Front)</h4>
        <p className="text-gray-400 text-xs tracking-wider mb-4">Requires Flat Front</p>
        <div className="flex flex-wrap gap-2">
          {FRONT_PROTECTION_OPTIONS.map((opt) => (
            <OptionPill
              key={opt.id}
              label={opt.label}
              price={opt.price}
              isStandard={opt.isStandard}
              isSelected={frontProtection === opt.id}
              onClick={() => setFrontProtection(opt.id)}
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
            price={opt.price}
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
            price={opt.price}
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
            price={opt.price}
            isStandard={opt.isStandard}
            isSelected={wheelType === opt.id}
            onClick={() => setWheelType(opt.id)}
          />
        ))}
      </div>

      {/* Wheel preview image */}
      <div className="flex justify-center my-6">
        <img src="/wheel type.png"/>
      </div>
    </div>

    <div className="border-t border-[#5D5E60] my-5" />

    {/* SPARE TIRE TOGGLE */}
    <ToggleSwitch
      label="INCLUDE SPARE TIRE"
      checked={spareTire}
      onChange={setSpareTire}
    />

  </OptionSection>
)}
    </>
  )
}
