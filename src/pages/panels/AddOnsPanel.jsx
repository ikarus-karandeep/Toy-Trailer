import { useConfigurator } from '../../context/ConfiguratorContext'
import {  BATHROOM_OPTIONS, AWNING_OPTIONS, ESCAPE_DOOR_OPTIONS } from '../../constants/configData'
import OptionSection from '../../components/OptionSection'
import OptionPill from '../../components/OptionPill'
import AlertMessage from '../../components/AlertMessage'
import ToggleSwitch from '../../components/ToggleSwitch'

export default function AddOnsPanel({ activeSectionTitle }) {
  const { waterPackage, setWaterPackage, bathroom, setBathroom, awning, toggleAwning,
    escapeDoor, setEscapeDoor,
    generatorBox, setGeneratorBox, cabinets, length,
    ladderRacks, setLadderRacks,
    sidewallVents, setSidewallVents,
    recessedTireBox, setRecessedTireBox,
    interiorTireMount, setInteriorTireMount } =
    useConfigurator()

  const hasCabinet = cabinets.includes('vnosebase') || cabinets.includes('flatfrontbase')

  const lengthFt = parseInt(length, 10)

  const show = (title) => !activeSectionTitle || activeSectionTitle === title

  const handleBathroom = (id) => {
    setBathroom(bathroom === id ? null : id)
  }

  return (
    <>
      {/* {show('WATER PACKAGE & SINK') && (
        <OptionSection title="WATER PACKAGE & SINK">
          <div className="flex flex-col gap-2">
            {WATER_OPTIONS.map((opt) => (
              <OptionPill
                key={opt.id}
                label={opt.label}
                price={opt.price}
                isMulti
                isSelected={waterPackage === opt.id}
                onClick={() => setWaterPackage(waterPackage === opt.id ? null : opt.id)}
              />
            ))}
          </div>
          <AlertMessage message="TRAILER SHOULD BE 8.5-WIDE + 110V" />
        </OptionSection>
      )} */}

      {show('BATHROOM PACKAGES') && (
        <OptionSection title="BATHROOM PACKAGES">
          <div className="flex flex-col gap-2">
            {BATHROOM_OPTIONS.map((opt) => (
              <OptionPill
                key={opt.id}
                label={opt.label}
                price={opt.price}
                isSelected={bathroom === opt.id}
                onClick={() => handleBathroom(opt.id)}
              />
            ))}
          </div>
          <AlertMessage message="TRAILER SHOULD BE 8.5-WIDE + 110V" />
        </OptionSection>
      )}

      {show('AWNINGS') && (
        <OptionSection title="AWNINGS">
          <img
            src="/Awnings.png"
            alt="Awning preview"
            className="w-full rounded-xl object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
          <div className="flex flex-col gap-2 mt-2">
            {AWNING_OPTIONS.map((opt) => (
              <OptionPill
                key={opt.id}
                label={opt.label}
                price={opt.price}
                isMulti
                isSelected={awning.includes(opt.id)}
                onClick={() => toggleAwning(opt.id)}
              />
            ))}
          </div>
          {lengthFt < 29 && (
            <AlertMessage message="AWNING REQUIRES A MINIMUM TRAILER LENGTH OF 29 FT" />
          )}
        </OptionSection>
      )}

      {show('BASE ADDONS') && (
        <OptionSection title="BASE ADDONS">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2 mb-4">
              <div className="text-xs font-semibold text-gray-400 mb-1 tracking-wider">ESCAPE DOOR</div>
              <div className="flex flex-wrap gap-2">
                {ESCAPE_DOOR_OPTIONS.map((opt) => (
                  <OptionPill
                    key={opt.id}
                    label={opt.label}
                    price={opt.price}
                    isSelected={escapeDoor === opt.id}
                    onClick={() => setEscapeDoor(opt.id)}
                  />
                ))}
              </div>
            </div>
            <ToggleSwitch
              label="GENERATOR BOX"
              checked={generatorBox}
              onChange={setGeneratorBox}
            />
            {hasCabinet && (
              <p className="text-yellow-500 text-xs tracking-wider uppercase -mt-1">
                Generator box is hidden when cabinets are applied
              </p>
            )}
            <ToggleSwitch
              label="LADDER RACKS"
              checked={ladderRacks}
              onChange={setLadderRacks}
            />
            <ToggleSwitch
              label="ALUMINUM SIDEWALL VENTS"
              checked={sidewallVents}
              onChange={setSidewallVents}
            />
            <ToggleSwitch
              label="RECESSED TIRE BOX"
              checked={recessedTireBox}
              onChange={setRecessedTireBox}
            />
            <ToggleSwitch
              label="INTERIOR TIRE MOUNT"
              checked={interiorTireMount}
              onChange={setInteriorTireMount}
            />
          </div>
          <p className="text-gray-400 text-xs tracking-wider uppercase mt-2">
            Replaces the standard side egress with a gullwing-style escape door
          </p>
        </OptionSection>
      )}
    </>
  )
}
