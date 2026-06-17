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
  } = useConfigurator()

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

          <div className="grid grid-cols-3 gap-2 mt-3">
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
            className="mt-4 w-full rounded-xl object-cover"
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
            className="w-48 mx-auto mt-3 object-contain"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
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
            <div className="flex gap-2 mt-2 [&>*]:flex-1">
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
