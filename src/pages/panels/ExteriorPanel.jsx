import { useEffect } from 'react'
import { useConfigurator } from '../../context/ConfiguratorContext'
import {
  EXTERIOR_FINISH_OPTIONS,
  COLOR_OPTIONS,
  FRONT_STYLE_OPTIONS,
  FRONT_STYLE_NOTES,
  EXTERIOR_BUILD_OPTIONS,
  PROTECTION_OPTIONS,
  WHEEL_OPTIONS,
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
    frontStyle, setFrontStyle,
    exteriorBuild, setExteriorBuild,
    protection, setProtection,
    wheel, setWheel,
    spareTire, setSpareTire,
    lugType, setLugType,
    sideDoorsType, setSideDoorsType,
    angledLights, setAngledLights,
    stairs, setStairs,
    vNoseETrack, setVNoseETrack,
    batteryBox, setBatteryBox,
    extendedTripleTongue, setExtendedTripleTongue,
    rearSpoiler, setRearSpoiler,
    length,
  } = useConfigurator()

  const isShortTrailer = parseFloat(length) < 23.5

  useEffect(() => {
    if (isShortTrailer) setSideDoorsType('flatpanel')
  }, [isShortTrailer])

  const show = (title) => !activeSectionTitle || activeSectionTitle === title

  return (
    <>
      {show('EXTERIOR FINISH') && (
        <OptionSection title="EXTERIOR FINISH">
          <div className="flex flex-col gap-2">
            {EXTERIOR_FINISH_OPTIONS.map((opt) => (
              <OptionPill
                key={opt.id}
                label={opt.label}
                price={opt.price}
                isStandard={opt.isStandard}
                isSelected={exteriorFinish === opt.id}
                onClick={() => setExteriorFinish(opt.id)}
              />
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-3 gap-2 mt-3">
            {COLOR_OPTIONS.map((opt) => (
              <ColorSwatch
                key={opt.id}
                id={opt.id}
                label={opt.label}
                color={opt.color}
                image={opt.image}
                isSelected={selectedColor === opt.id}
                onClick={() => setSelectedColor(opt.id)}
              />
            ))}
          </div>
        </OptionSection>
      )}

      {show('FRONT STYLE') && (
        <OptionSection title="FRONT STYLE">
          <div className="flex flex-col gap-2">
            {FRONT_STYLE_OPTIONS.map((opt) => (
              <OptionPill
                key={opt.id}
                label={opt.label}
                price={opt.price}
                isStandard={opt.isStandard}
                isSelected={frontStyle === opt.id}
                onClick={() => setFrontStyle(opt.id)}
              />
            ))}
          </div>

          <img
            src="/Cabinets.png"
            alt="Front style preview"
            className="mt-3 w-3/4 mx-auto rounded-xl object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />

          <ul className="flex flex-col gap-1 px-1 mt-1">
            {FRONT_STYLE_NOTES.map((note) => (
              <li key={note} className="flex items-start gap-2 text-gray-400 text-xs tracking-wider uppercase">
                <span className="mt-0.5 text-gray-500">•</span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </OptionSection>
      )}

      {show('FRONT STYLE ADDONS') && (
        <OptionSection title="FRONT STYLE ADDONS">
          <div className="flex flex-col gap-3">
            <ToggleSwitch
              label="STAIRS"
              checked={stairs}
              onChange={setStairs}
            />
            <ToggleSwitch
              label="ANGLED LIGHTS"
              checked={angledLights}
              onChange={setAngledLights}
            />
            <ToggleSwitch
              label="BATTERY BOX"
              checked={batteryBox}
              onChange={setBatteryBox}
            />
            {frontStyle === 'vnose' && (
              <ToggleSwitch
                label="V-NOSE E TRACK"
                checked={vNoseETrack}
                onChange={setVNoseETrack}
              />
            )}
          </div>
          {frontStyle !== 'vnose' && (
            <p className="text-gray-500 text-xs tracking-wider uppercase mt-2">
              V-Nose E Track requires V-Nose front style
            </p>
          )}
        </OptionSection>
      )}

      {show('EXTERIOR BUILD') && (
        <OptionSection title="EXTERIOR BUILD">
          <div className="flex flex-col gap-2">
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
          
          <div className="mt-4 flex flex-col gap-3">
            <ToggleSwitch
              label="EXTENDED TRIPLE TONGUE"
              checked={extendedTripleTongue}
              onChange={setExtendedTripleTongue}
            />
            <ToggleSwitch
              label="REAR SPOILER WING"
              checked={rearSpoiler}
              onChange={setRearSpoiler}
            />
          </div>
        </OptionSection>
      )}

      {show('PROTECTION PACKAGE') && (
        <OptionSection title="PROTECTION PACKAGE">
          <div className="flex flex-col gap-2">
            {PROTECTION_OPTIONS.map((opt) => (
              <OptionPill
                key={opt.id}
                label={opt.label}
                price={opt.price}
                isStandard={opt.isStandard}
                isSelected={protection === opt.id}
                onClick={() => setProtection(opt.id)}
              />
            ))}
          </div>
        </OptionSection>
      )}

      {show('WHEEL') && (
        <OptionSection title="WHEEL">
          <div className="flex flex-col gap-2">
            {WHEEL_OPTIONS.map((opt) => (
              <OptionPill
                key={opt.id}
                label={opt.label}
                price={opt.price}
                isStandard={opt.isStandard}
                isSelected={wheel === opt.id}
                onClick={() => setWheel(opt.id)}
              />
            ))}
          </div>
          <img
            src="/wheel.png"
            alt="Wheel preview"
            className="w-32 mx-auto mt-2 object-contain"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        </OptionSection>
      )}

      {show('SIDE DOOR') && (
        <OptionSection title="SIDE DOOR">
          <div className={`flex flex-col gap-2 ${isShortTrailer ? 'opacity-50 pointer-events-none' : ''}`}>
            {SIDE_DOOR_OPTIONS.map((opt) => (
              <OptionPill
                key={opt.id}
                label={opt.label}
                price={opt.price}
                isStandard={opt.isStandard}
                isSelected={sideDoorsType === opt.id}
                onClick={() => setSideDoorsType(opt.id)}
              />
            ))}
          </div>
          {isShortTrailer && (
            <p className="text-yellow-500 text-xs tracking-wider uppercase mt-1">
              SIDE DOOR NOT AVAILABLE FOR TRAILERS UNDER 23.5'
            </p>
          )}
        </OptionSection>
      )}

      {show('SPARE TIRE') && (
        <OptionSection title="SPARE TIRE">
          <ToggleSwitch
            label="INCLUDE SPARE TIRE"
            checked={spareTire}
            onChange={setSpareTire}
          />
          {spareTire && (
            <div className="flex flex-wrap gap-2 mt-2 py-2 lg:py-3">
              {LUG_OPTIONS.map((opt) => (
                <OptionPill
                  key={opt.id}
                  label={opt.label}
                  isSelected={lugType === opt.id}
                  onClick={() => setLugType(opt.id)}
                />
              ))}
            </div>
          )}
        </OptionSection>
      )}
    </>
  )
}
