import { useState } from 'react'
import { useConfigurator } from '../../context/ConfiguratorContext'
import { usePackageBadge } from '../../hooks/usePackageBadge'
import {
  ELECTRICAL_OPTIONS,
  RECEPTACLE_OPTIONS,
  OFF_GRID_POWER_OPTIONS,
  INTERIOR_LIGHTING_OPTIONS,
  EXTERIOR_LIGHTING_OPTIONS,
  CLIMATE_CONTROL_OPTIONS,
  PASSIVE_VENTILATION_OPTIONS,
  ROOFTOP_AC_OPTIONS,
  MINI_SPLIT_OPTIONS
} from '../../constants/configData'
import OptionSection from '../../components/OptionSection'
import OptionPill from '../../components/OptionPill'
import DetailedOptionCard from '../../components/DetailedOptionCard'
import ToggleSwitch from '../../components/ToggleSwitch'

export default function SystemsPanel({ activeSectionTitle }) {
  const {
    electrical, setElectrical,
    climateControl, setClimateControl,
    ventilation, setVentilation,
    receptacles, setReceptacles,
    interiorLights, setInteriorLights,
    ledRope, setLedRope,
  } = useConfigurator()

  const getBadge = usePackageBadge()

  // Local state for new UI components (until context is fully updated)
  const [panel12Space, setPanel12Space] = useState(false)
  const [offGridPower, setOffGridPower] = useState([])
  
  const [exteriorLights, setExteriorLights] = useState([])
  

  const [acPrep, setAcPrep] = useState(false)

  const show = (title) => !activeSectionTitle || activeSectionTitle === title

  const toggleArrayItem = (setter, item) => {
    setter(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item])
  }

  const updateQuantity = (setter, key, val) => {
    setter(prev => ({ ...prev, [key]: val }))
  }

  return (
    <>
      {show('ELECTRICAL') && (
        <OptionSection title="ELECTRICAL">
          <div className="flex flex-col gap-2">
            {ELECTRICAL_OPTIONS.map((opt) => {
              let includedItems = [];
              if (opt.id === '30amp') {
                includedItems = [
                  '(2) Receptacles',
                  '(1) Switch',
                  '(2) 110V 24" Flat Panel LEDs',
                  '125 AMP 8-Space panel box w/ 30 AMP motorbase plug & cord'
                ];
              } else if (opt.id === '50amp') {
                includedItems = [
                  '(2) Receptacles',
                  '(1) Switch',
                  '(2) 110V 24" Flat Panel LEDs',
                  '125 AMP 8-Space panel box w/ 50 AMP motorbase plug & cord'
                ];
              }

              return (
                <DetailedOptionCard
                  key={opt.id}
                  label={opt.label}
                  price={opt.price}
                  isSelected={electrical === opt.id}
                  onClick={() => setElectrical(opt.id)}
                  includedItems={includedItems}
                  packageBadge={getBadge(opt.id)}
                />
              );
            })}
          </div>
          <p className='border-t border-[#5D5E60] mt-6'></p>
          <div className="mt-6">
            <h4 className="text-white text-sm font-normal uppercase tracking-wider mb-1">PANEL CAPACITY</h4>
            <p className="text-gray-400 text-xs tracking-wider mb-4">Required for AC + Bathroom Build</p>
            <div className="flex justify-center mb-4">
              <div className="rounded-xl p-4 inline-block">
                <img src="/Panel capacity.png" />
              </div>
            </div>
            <ToggleSwitch
              label="12-Space Panel"
              checked={panel12Space}
              onChange={setPanel12Space}
            />
          </div>
          <p className='border-t border-[#5D5E60]'></p>
          <div className="mt-6">
            <h4 className="text-white text-sm font-normal uppercase tracking-wider mb-1">RECEPTACLE</h4>
            <p className="text-gray-400 text-xs tracking-wider mb-4">Required for AC + Bathroom Build</p>
            <div className="flex justify-center mb-4">
              <div className="rounded-xl p-4 inline-block">
                <img src="/Receptacle.png" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {RECEPTACLE_OPTIONS.map((opt) => {
                const qty = receptacles[opt.id] || 0
                return (
                  <OptionPill
                    key={opt.id}
                    label={opt.label}
                    price={opt.price}
                    isSelected={qty > 0}
                    quantity={qty}
                    onQuantityChange={(newQty) => updateQuantity(setReceptacles, opt.id, newQty)}
                    onClick={() => updateQuantity(setReceptacles, opt.id, qty === 0 ? 1 : 0)}
                  />
                )
              })}
            </div>
          </div>
          <p className='border-t border-[#5D5E60]'></p>
          <div className="mt-6">
            <h4 className="text-white text-sm font-normal uppercase tracking-wider mb-1">OFF-GRID POWER</h4>
            <p className="text-gray-400 text-xs tracking-wider mb-4">12V Battery requires 7-Way Plug. Solar Charger keeps battery maintained.</p>
            <div className="flex justify-center mb-4">
              <div className="border border-[#3a3a3a] rounded-xl p-4 inline-block">
                <img src="/grid power.png" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {OFF_GRID_POWER_OPTIONS.map((opt) => (
                <OptionPill
                  key={opt.id}
                  label={opt.label}
                  price={opt.price}
                  isSelected={offGridPower.includes(opt.id)}
                  hasSettings
                  onClick={() => toggleArrayItem(setOffGridPower, opt.id)}
                  isMulti={true}
                />
              ))}
            </div>
          </div>
        </OptionSection>
      )}

      {show('LIGHTS') && (
        <OptionSection title="LIGHTS">
          <div className="mb-6">
            <h4 className="text-white text-sm font-normal uppercase tracking-wider mb-1">INTERIOR LIGHTING</h4>
            <p className="text-gray-400 text-xs tracking-wider mb-4">Required for AC + Bathroom Build</p>
            <div className="flex justify-center mb-4">
              <img src="/Light.png" />
            </div>
            <div className="flex flex-col gap-2">
              {INTERIOR_LIGHTING_OPTIONS.map((opt) => {
                if (opt.id === 'ledrope') {
                  return (
                    <OptionPill
                      key={opt.id}
                      label={opt.label}
                      price={opt.price}
                      isSelected={ledRope}
                      onClick={() => setLedRope(!ledRope)}
                    />
                  )
                }
                const qty = interiorLights[opt.id] || 0
                return (
                  <OptionPill
                    key={opt.id}
                    label={opt.label}
                    price={opt.price}
                    isSelected={qty > 0}
                    quantity={qty}
                    onQuantityChange={(newQty) => updateQuantity(setInteriorLights, opt.id, newQty)}
                    onClick={() => updateQuantity(setInteriorLights, opt.id, qty === 0 ? 1 : 0)}
                  />
                )
              })}
            </div>
          </div>
          <p className='border-t border-[#5D5E60]'></p>
          <div>
            <h4 className="text-white text-sm font-normal uppercase tracking-wider mb-1">EXTERIOR LIGHTING</h4>
            <p className="text-gray-400 text-xs tracking-wider mb-4">Racing Style Exterior Light</p>
            <div className="flex flex-col gap-2">
              {EXTERIOR_LIGHTING_OPTIONS.map((opt) => (
                <OptionPill
                  key={opt.id}
                  label={opt.label}
                  price={opt.price}
                  isSelected={exteriorLights.includes(opt.id)}
                  hasSettings
                  onClick={() => toggleArrayItem(setExteriorLights, opt.id)}
                  isMulti={true}
                />
              ))}
            </div>
          </div>
        </OptionSection>
      )}

      {show('CLIMATE CONTROL') && (
        <OptionSection title="CLIMATE CONTROL">
          <div className="flex flex-col gap-2 mb-8">
            {CLIMATE_CONTROL_OPTIONS.map((opt) => (
              <OptionPill
                key={opt.id}
                label={opt.label}
                price={opt.price}
                isSelected={climateControl === opt.id}
                onClick={() => setClimateControl(opt.id)}
                packageBadge={getBadge(opt.id)}
              />
            ))}
          </div>

          <div className="mb-8">
            <h4 className="text-white text-sm font-normal uppercase tracking-wider mb-1">PASSIVE VENTILATION</h4>
            <p className="text-gray-400 text-xs tracking-wider mb-4">Required for AC + Bathroom Build</p>
            <div className="flex flex-col gap-2">
              {PASSIVE_VENTILATION_OPTIONS.map((opt) => (
                <OptionPill
                  key={opt.id}
                  label={opt.label}
                  price={opt.price}
                  isSelected={ventilation === opt.id}
                  onClick={() => {
                    const newValue = opt.id === ventilation ? null : opt.id;
                    console.warn(`[DEBUG UI] User clicked vent option: ${opt.label} | Setting ventilation state to:`, newValue);
                    setVentilation(newValue);
                  }}
                />
              ))}
            </div>
          </div>

          <div className="mb-8">
            <h4 className="text-white text-sm font-normal uppercase tracking-wider mb-1">AC PREP</h4>
            <p className="text-gray-400 text-xs tracking-wider mb-4">Required for any AC build now or prepping for later.</p>
            <ToggleSwitch
              label="Wire & Brace for AC"
              checked={acPrep}
              onChange={setAcPrep}
            />
          </div>

          <div className="mb-8">
            <h4 className="text-white text-sm font-normal uppercase tracking-wider mb-1">ROOFTOP AC</h4>
            <p className="text-gray-400 text-xs tracking-wider mb-4">Interior insulation Required. 13.5K BTU best for 14-24ft build. 15K BTU best for 26-32ft build</p>
            <div className="flex flex-col gap-2">
              {ROOFTOP_AC_OPTIONS.map((opt) => (
                <OptionPill
                  key={opt.id}
                  label={opt.label}
                  price={opt.price}
                  isSelected={climateControl === opt.id}
                  onClick={() => setClimateControl(opt.id === climateControl ? 'none' : opt.id)}
                  packageBadge={getBadge(opt.id)}
                />
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-white text-sm font-normal uppercase tracking-wider mb-1">MINI SPLIT</h4>
            <p className="text-gray-400 text-xs tracking-wider mb-4">Requires Extended TTT<br/><br/>12K: Wall-Mount. Cool & comfortable<br/><br/>18K: Heat + Cool - Best choice for anyone spending real time in trailer<br/><br/>24K: High Capacity - Best for large builds</p>
            <div className="flex flex-col gap-2">
              {MINI_SPLIT_OPTIONS.map((opt) => (
                <OptionPill
                  key={opt.id}
                  label={opt.label}
                  price={opt.price}
                  isSelected={climateControl === opt.id}
                  onClick={() => setClimateControl(opt.id === climateControl ? 'none' : opt.id)}
                  packageBadge={getBadge(opt.id)}
                />
              ))}
            </div>
          </div>
        </OptionSection>
      )}
    </>
  )
}
