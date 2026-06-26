import { useConfigurator } from '../../context/ConfiguratorContext'
import {
  ELECTRICAL_OPTIONS,
  BATTERY_OPTIONS,
  LIGHT_OPTIONS,
  VENTILATION_OPTIONS,
  CLIMATE_CONTROL_OPTIONS,
} from '../../constants/configData'
import OptionSection from '../../components/OptionSection'
import OptionPill from '../../components/OptionPill'
import AlertMessage from '../../components/AlertMessage'
import ToggleSwitch from '../../components/ToggleSwitch'

export default function SystemsPanel({ activeSectionTitle }) {
  const {
    electrical, setElectrical,
    battery, setBattery,
    lights, toggleLight,
    ventilation, setVentilation,
    climateControl, setClimateControl,
    radioPackageSpeaker, setRadioPackageSpeaker,
  } = useConfigurator()

  const show = (title) => !activeSectionTitle || activeSectionTitle === title

  return (
    <>
      {show('ELECTRICAL') && (
        <OptionSection title="ELECTRICAL">
          <div className="flex flex-col gap-2">
            {ELECTRICAL_OPTIONS.map((opt) => (
              <OptionPill
                key={opt.id}
                label={opt.label}
                price={opt.price}
                isSelected={electrical === opt.id}
                onClick={() => setElectrical(opt.id)}
              />
            ))}
          </div>
          <AlertMessage message="12-SPACE PANEL REQUIRED FOR AC/BATH UPGRADES" />
          <div className="mt-4">
            <ToggleSwitch
              label="RADIO PACKAGE SPEAKER"
              checked={radioPackageSpeaker}
              onChange={setRadioPackageSpeaker}
            />
          </div>
        </OptionSection>
      )}

      {show('12V BATTERY SYSTEM') && (
        <OptionSection title="12V BATTERY SYSTEM">
          <div className="flex flex-col gap-2">
            {BATTERY_OPTIONS.map((opt) => (
              <OptionPill
                key={opt.id}
                label={opt.label}
                price={opt.price}
                isSelected={battery === opt.id}
                onClick={() => setBattery(opt.id)}
              />
            ))}
          </div>
        </OptionSection>
      )}

      {show('LIGHTS') && (
        <OptionSection title="LIGHTS">
          <div className="flex flex-col gap-2">
            {LIGHT_OPTIONS.map((opt) => (
              <OptionPill
                key={opt.id}
                label={opt.label}
                price={opt.price}
                isMulti
                isSelected={lights.includes(opt.id)}
                onClick={() => toggleLight(opt.id)}
              />
            ))}
          </div>
          <img
            src="/Cabinets.png"
            alt="Lights preview"
            className="w-full rounded-xl object-cover mt-2"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        </OptionSection>
      )}

      {show('VENTILATION') && (
        <OptionSection title="VENTILATION">
          <div className="flex flex-col gap-2">
            {VENTILATION_OPTIONS.map((opt) => (
              <OptionPill
                key={opt.id}
                label={opt.label}
                price={opt.price}
                isSelected={ventilation === opt.id}
                onClick={() => setVentilation(opt.id)}
              />
            ))}
          </div>
        </OptionSection>
      )}

      {show('CLIMATE CONTROL') && (
        <OptionSection title="CLIMATE CONTROL">
          <div className="flex flex-col gap-2">
            {CLIMATE_CONTROL_OPTIONS.map((opt) => (
              <OptionPill
                key={opt.id}
                label={opt.label}
                price={opt.price}
                isSelected={climateControl === opt.id}
                onClick={() => setClimateControl(opt.id)}
              />
            ))}
          </div>
        </OptionSection>
      )}
    </>
  )
}
