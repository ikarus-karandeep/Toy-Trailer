import { useConfigurator } from '../../context/ConfiguratorContext'
import { WATER_OPTIONS, BATHROOM_OPTIONS, AWNING_OPTIONS } from '../../constants/configData'
import OptionSection from '../../components/OptionSection'
import OptionPill from '../../components/OptionPill'
import AlertMessage from '../../components/AlertMessage'

export default function AddOnsPanel() {
  const { waterPackage, setWaterPackage, bathroom, setBathroom, awning, toggleAwning } =
    useConfigurator()

  const handleBathroom = (id) => {
    setBathroom(bathroom === id ? null : id)
  }

  return (
    <>
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
      </OptionSection>
    </>
  )
}
