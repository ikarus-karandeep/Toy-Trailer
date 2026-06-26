import { useConfigurator } from '../../context/ConfiguratorContext'
import {
  FLOOR_OPTIONS,
  WALL_OPTIONS,
  CEILING_OPTIONS,
  CABINET_OPTIONS,
  CABINET_NOTES,
  TOOL_BOX_OPTIONS,
} from '../../constants/configData'
import OptionSection from '../../components/OptionSection'
import OptionPill from '../../components/OptionPill'
import ToggleSwitch from '../../components/ToggleSwitch'

export default function InteriorPanel({ activeSectionTitle }) {
  const {
    floor, setFloor,
    walls, setWalls,
    ceiling, setCeiling,
    cabinets, toggleCabinet,
    toolBox, setToolBox,
    leftSide, setLeftSide,
    rightSide, setRightSide,
    winchSystem, setWinchSystem,
  } = useConfigurator()

  const show = (title) => !activeSectionTitle || activeSectionTitle === title

  return (
    <>
      {show('FLOOR') && (
        <OptionSection title="FLOOR">
          <div className="flex flex-wrap gap-2">
            {FLOOR_OPTIONS.map((opt) => (
              <OptionPill
                key={opt.id}
                label={opt.label}
                price={opt.price}
                isStandard={opt.isStandard}
                isSelected={floor === opt.id}
                onClick={() => setFloor(opt.id)}
              />
            ))}
          </div>
        </OptionSection>
      )}

      {show('WALLS') && (
        <OptionSection title="WALLS">
          <div className="flex flex-wrap gap-2">
            {WALL_OPTIONS.map((opt) => (
              <OptionPill
                key={opt.id}
                label={opt.label}
                price={opt.price}
                isStandard={opt.isStandard}
                isSelected={walls === opt.id}
                onClick={() => setWalls(opt.id)}
              />
            ))}
          </div>
        </OptionSection>
      )}

      {show('CEILING') && (
        <OptionSection title="CEILING">
          <div className="flex flex-col gap-2">
            {CEILING_OPTIONS.map((opt) => (
              <OptionPill
                key={opt.id}
                label={opt.label}
                price={opt.price}
                isStandard={opt.isStandard}
                isSelected={ceiling === opt.id}
                onClick={() => setCeiling(opt.id)}
              />
            ))}
          </div>
        </OptionSection>
      )}

      {show('CABINETS') && (
        <OptionSection title="CABINETS">
          <div className="flex flex-col gap-2">
            {CABINET_OPTIONS.map((opt) => (
              <OptionPill
                key={opt.id}
                label={opt.label}
                price={opt.price}
                isMulti
                isSelected={cabinets.includes(opt.id)}
                onClick={() => toggleCabinet(opt.id)}
              />
            ))}
          </div>

          <img
            src="/Cabinets.png"
            alt="Cabinet preview"
            className="w-3/4 mx-auto rounded-xl object-cover mt-2"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />

          <ul className="flex flex-col gap-1 px-1 mt-1">
            {CABINET_NOTES.map((note) => (
              <li key={note} className="flex items-start gap-2 text-gray-400 text-xs tracking-wider uppercase">
                <span className="mt-0.5 text-gray-500">•</span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <ToggleSwitch
              label="WINCH SYSTEM"
              checked={winchSystem}
              onChange={setWinchSystem}
            />
          </div>
        </OptionSection>
      )}

      {show('TOOL BOX') && (
        <OptionSection title="TOOL BOX">
          <div className="grid grid-cols-[max-content_max-content] gap-x-2 gap-y-2">
            {TOOL_BOX_OPTIONS.map((opt) => (
              <OptionPill
                key={opt.id}
                label={opt.label}
                price={opt.price}
                isSelected={toolBox === opt.id}
                onClick={() => setToolBox(opt.id)}
              />
            ))}
          </div>
        </OptionSection>
      )}

      {show('DOOR SIDES') && (
        <OptionSection title="DOOR SIDES">
          <div className="flex flex-col gap-3">
            <ToggleSwitch
              label="LEFT SIDE DOORS"
              checked={leftSide}
              onChange={setLeftSide}
            />
            <ToggleSwitch
              label="RIGHT SIDE DOORS"
              checked={rightSide}
              onChange={setRightSide}
            />
          </div>
          <p className="text-gray-400 text-xs tracking-wider uppercase mt-2">
            Controls which sides display door panels or covers
          </p>
        </OptionSection>
      )}
    </>
  )
}
