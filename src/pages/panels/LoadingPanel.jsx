import { useConfigurator } from '../../context/ConfiguratorContext'
import { RAMP_OPTIONS, TIE_DOWN_OPTIONS, JACK_OPTIONS } from '../../constants/configData'
import OptionSection from '../../components/OptionSection'
import OptionPill from '../../components/OptionPill'
import AlertMessage from '../../components/AlertMessage'
import ToggleSwitch from '../../components/ToggleSwitch'

export default function LoadingPanel({ activeSectionTitle }) {
  const { rampType, setRampType, atpRamp, setAtpRamp, tieDowns, toggleTieDown, jacks, toggleJack } =
    useConfigurator()

  const show = (title) => !activeSectionTitle || activeSectionTitle === title

  return (
    <>
      {show('RAMP TYPE') && (
        <OptionSection title="RAMP TYPE">
          <div className="flex flex-col gap-2">
            {RAMP_OPTIONS.map((opt) => (
              <OptionPill
                key={opt.id}
                label={opt.label}
                price={opt.price}
                isSelected={rampType === opt.id}
                onClick={() => setRampType(opt.id)}
              />
            ))}
          </div>

          <div className="mt-4 rounded-xl overflow-hidden">
            <img
              src="/Ramp-preview.png"
              alt="Ramp preview"
              className="w-full h-48 object-cover"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
          </div>

          <AlertMessage message="8'+ HEIGHT REQUIRED FOR SUPER DUTY RAMP" />

          <div className="mt-2">
            <ToggleSwitch
              label="ATP / RTP RAMP & FLAP"
              checked={atpRamp}
              onChange={setAtpRamp}
            />
          </div>
        </OptionSection>
      )}

      {show('TIE DOWNS (MULTI-CHOICE)') && (
        <OptionSection title="TIE DOWNS (MULTI-CHOICE)">
          <div className="flex flex-col gap-2">
            {TIE_DOWN_OPTIONS.map((opt) => (
              <OptionPill
                key={opt.id}
                label={opt.label}
                price={opt.price}
                isMulti
                isSelected={tieDowns.includes(opt.id)}
                onClick={() => toggleTieDown(opt.id)}
              />
            ))}
          </div>
        </OptionSection>
      )}

      {show('JACKS (MULTI-CHOICE)') && (
        <OptionSection title="JACKS (MULTI-CHOICE)">
          <div className="flex flex-col gap-2">
            {JACK_OPTIONS.map((opt) => (
              <OptionPill
                key={opt.id}
                label={opt.label}
                price={opt.price}
                isMulti
                isSelected={jacks.includes(opt.id)}
                onClick={() => toggleJack(opt.id)}
              />
            ))}
          </div>
        </OptionSection>
      )}
    </>
  )
}
