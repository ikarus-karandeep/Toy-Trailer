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
    acPrep, setAcPrep,
    receptacles, setReceptacles,
    interiorLights, setInteriorLights,
    exteriorLights, setExteriorLights,
    ledRope, setLedRope,
    width, length,
    stairs, setStairs,
    viewMode, setViewMode,
    setFocusedCamera
  } = useConfigurator()

  const getBadge = usePackageBadge()

  // Local state for new UI components (until context is fully updated)
  const [panel12Space, setPanel12Space] = useState(false)
  const [offGridPower, setOffGridPower] = useState([])

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
                  price={opt.price} badge={opt.badge}
                  isSelected={electrical === opt.id}
                  onClick={() => {
                    const prevElectrical = electrical;
                    setElectrical(opt.id);
                    
                    if (opt.id === '30amp' || opt.id === '50amp') {
                      if (prevElectrical !== '30amp' && prevElectrical !== '50amp') {
                        setReceptacles(prev => ({ 
                          ...prev, 
                          '110vinterior': (prev['110vinterior'] || 0) + 2 
                        }));
                        setInteriorLights(prev => ({ 
                          ...prev, 
                          '12vflatpanel': (prev['12vflatpanel'] || 0) + 1 
                        }));
                      }
                    } else if (opt.id === 'none') {
                      if (prevElectrical === '30amp' || prevElectrical === '50amp') {
                        setReceptacles(prev => ({ 
                          ...prev, 
                          '110vinterior': Math.max((prev['110vinterior'] || 0) - 2, 0) 
                        }));
                        setInteriorLights(prev => ({ 
                          ...prev, 
                          '12vflatpanel': Math.max((prev['12vflatpanel'] || 0) - 1, 0) 
                        }));
                      }
                    }
                  }}
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
                <img src="/Panel capacity.png" className="w-[90px] sm:w-[110px] md:w-[130px] lg:w-[150px] mx-auto object-contain my-3" />
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
                <img src="/Receptacle.png" className="w-[90px] sm:w-[110px] md:w-[130px] lg:w-[150px] mx-auto object-contain my-3" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {RECEPTACLE_OPTIONS.map((opt) => {
                const qty = receptacles[opt.id] || 0
                return (
                  <OptionPill
                    key={opt.id}
                    label={opt.label}
                    price={opt.price} badge={opt.badge}
                    isSelected={qty > 0}
                    quantity={qty > 0 ? qty : undefined}
                    onQuantityChange={(newQty) => updateQuantity(setReceptacles, opt.id, newQty)}
                    onClick={() => {
                      updateQuantity(setReceptacles, opt.id, qty === 0 ? 1 : 0);
                      if (qty === 0) {
                        if (opt.id === '110vgfi') setFocusedCamera("110V GFI Receptacle (20 AMP) Camera");
                        if (opt.id === '110vinterior') setFocusedCamera("110V Interior Receptacle (15 AMP) Camera");
                      }
                    }}
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
              <div className="rounded-xl p-4 inline-block">
                <img src="/grid power.png" className="w-[90px] sm:w-[110px] md:w-[130px] lg:w-[150px] mx-auto object-contain my-3" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {OFF_GRID_POWER_OPTIONS.map((opt) => (
                <OptionPill
                  key={opt.id}
                  label={opt.label}
                  price={opt.price} badge={opt.badge}
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
          <div className="mb-6 contents">
            <div className="mb-6">
            <h4 className="text-white text-sm font-normal uppercase tracking-wider mb-1">INTERIOR LIGHTING</h4>
            <p className="text-gray-400 text-xs tracking-wider mb-4">Required for AC + Bathroom Build</p>
            <div className="flex justify-center mb-4">
              <img src="/Light.png" className="w-[90px] sm:w-[110px] md:w-[130px] lg:w-[150px] mx-auto object-contain my-3" />
            </div>
            <div className="flex flex-col gap-2">
              {INTERIOR_LIGHTING_OPTIONS.map((opt) => {
                if (opt.id === 'ledrope') {
                  return (
                    <OptionPill
                      key={opt.id}
                      label={opt.label}
                      price={opt.price} badge={opt.badge}
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
                    price={opt.price} badge={opt.badge}
                    isSelected={qty > 0}
                    quantity={qty > 0 ? qty : undefined}
                    onQuantityChange={(newQty) => updateQuantity(setInteriorLights, opt.id, newQty)}
                    onClick={() => updateQuantity(setInteriorLights, opt.id, qty === 0 ? 1 : 0)}
                  />
                )
              })}
            </div>
          </div>
          </div>
          <p className='border-t border-[#5D5E60]'></p>
          <div className="contents">
          <div>
            <h4 className="text-white text-sm font-normal uppercase tracking-wider mb-1">EXTERIOR LIGHTING</h4>
            <p className="text-gray-400 text-xs tracking-wider mb-4">Racing Style Exterior Light</p>
            <div className="flex flex-col gap-2">
              {EXTERIOR_LIGHTING_OPTIONS.map((opt) => (
                <OptionPill
                  key={opt.id}
                  label={opt.label}
                  price={opt.price}
                  badge={opt.badge}
                  subtext={opt.subtext}
                  isSelected={exteriorLights.includes(opt.id)}
                  onClick={() => toggleArrayItem(setExteriorLights, opt.id)}
                  isMulti={true}
                />
              ))}
            </div>
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
                price={opt.price} badge={opt.badge}
                isSelected={climateControl === opt.id}
                onClick={() => setClimateControl(opt.id)}
                packageBadge={getBadge(opt.id)}
              />
            ))}
          </div>

          <div className="mb-8 contents">
          <div className="mb-8">
            <h4 className="text-white text-sm font-normal uppercase tracking-wider mb-1">PASSIVE VENTILATION</h4>
            <p className="text-gray-400 text-xs tracking-wider mb-4">Required for AC + Bathroom Build</p>
            <div className="flex flex-col gap-2">
              {PASSIVE_VENTILATION_OPTIONS.map((opt) => (
                <OptionPill
                  key={opt.id}
                  label={opt.label}
                  price={opt.price} badge={opt.badge}
                  isSelected={ventilation === opt.id}
                  onClick={() => {
                    const newValue = opt.id === ventilation ? null : opt.id;
                    setVentilation(newValue);
                    if (newValue === 'nonpoweredvent' || newValue === 'smokenonpowered') {
                      setFocusedCamera("Non-Powered Roof Vent Camera");
                    } else if (newValue === '2waysidewall') {
                      setFocusedCamera("Aluminum Sidewall Vents Camera");
                    }
                  }}
                />
              ))}
            </div>
          </div>
          </div>

          <div className="mb-8 contents">
          <div className="mb-8">
            <h4 className="text-white text-sm font-normal uppercase tracking-wider mb-1">AC PREP</h4>
            <p className="text-gray-400 text-xs tracking-wider mb-4">Required for any AC build now or prepping for later.</p>
            <ToggleSwitch
              label="Wire & Brace for AC"
              checked={acPrep}
              onChange={setAcPrep}
            />
          </div>
          </div>

          <div className="mb-8 contents">
          <div className="mb-8">
            <h4 className="text-white text-sm font-normal uppercase tracking-wider mb-1">ROOFTOP AC</h4>
            {/* <p className="text-gray-400 text-xs tracking-wider mb-3">Interior insulation Required. 13.5K BTU best for 14-24ft build. 15K BTU best for 26-32ft build</p> */}
            {/* <div className="bg-[#1A1A1A] rounded-lg p-3 mb-4 flex items-start gap-3 border border-[#333]"> */}
              {/* <span className="bg-[#333] text-gray-300 text-[10px] font-bold px-2 py-0.5 rounded tracking-wider uppercase mt-0.5 whitespace-nowrap">NOTE</span> */}
              <p className="text-gray-400 text-xs leading-relaxed mb-4">Always recommend insulation alongside AC. Pairing them as a bundle in UX increases AOV and reduces performance complaints.</p>
            {/* </div> */}
            <div className="flex flex-col gap-2">
              {ROOFTOP_AC_OPTIONS.map((opt) => (
                <OptionPill
                  key={opt.id}
                  label={opt.label}
                  price={opt.price} badge={opt.badge}
                  isSelected={climateControl === opt.id}
                  onClick={() => {
                    const newValue = opt.id === climateControl ? 'none' : opt.id;
                    setClimateControl(newValue);
                    if (newValue !== 'none') {
                      setFocusedCamera("AC Unit Camera");
                    }
                  }}
                  packageBadge={getBadge(opt.id)}
                />
              ))}
            </div>
          </div>
          </div>

          <div className="contents">
          <div>
            <h4 className="text-white text-sm font-normal uppercase tracking-wider mb-1">MINI SPLIT</h4>
            {/* <p className="text-gray-400 text-xs tracking-wider mb-3">
              Requires Extended TTT
              {climateControl === '12kminisplit' && <><br/><br/>12K: Wall-Mount. Cool & comfortable</>}
              {climateControl === '18kminisplit' && <><br/><br/>18K: Heat + Cool - Best choice for anyone spending real time in trailer</>}
              {climateControl === '24kminisplit' && <><br/><br/>24K: High Capacity - Best for large builds</>}
            </p> */}
            {/* <div className="bg-[#1A1A1A] rounded-lg p-3 mb-4 flex items-start gap-3 border border-[#333]"> */}
              {/* <span className="bg-[#333] text-gray-300 text-[10px] font-bold px-2 py-0.5 rounded tracking-wider uppercase mt-0.5 whitespace-nowrap">NOTE</span> */}
              <p className="text-gray-400 text-xs leading-relaxed mb-4">Mini splits: heating AND cooling, lower roofline, quieter, better for living quarter builds and where ceiling clearance matters.</p>
            {/* </div> */}
            <div className="flex flex-col gap-2">
              {MINI_SPLIT_OPTIONS.map((opt) => (
                <OptionPill
                  key={opt.id}
                  label={opt.label}
                  price={opt.price} badge={opt.badge}
                  isSelected={climateControl === opt.id}
                  onClick={() => {
                    const newValue = opt.id === climateControl ? 'none' : opt.id;
                    setClimateControl(newValue);
                    if (newValue !== 'none') {
                      setFocusedCamera("Mini Split AC Camera");
                    }
                  }}
                  packageBadge={getBadge(opt.id)}
                />
              ))}
            </div>
          </div>
          </div>
        </OptionSection>
      )}
    </>
  )
}
