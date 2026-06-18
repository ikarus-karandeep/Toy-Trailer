import { useConfigurator } from '../../context/ConfiguratorContext'
import {
  WIDTH_OPTIONS,
  LENGTH_OPTIONS,
  INTERIOR_HEIGHT_OPTIONS,
  AXLE_OPTIONS,
  AXLE_RATING_OPTIONS,
} from '../../constants/configData'
import OptionSection from '../../components/OptionSection'
import OptionPill from '../../components/OptionPill'
import AlertMessage from '../../components/AlertMessage'

export default function SizeCapacityPanel({ activeSectionTitle }) {
  const {
    width, setWidth,
    length, setLength,
    interiorHeight, setInteriorHeight,
    axle, setAxle,
    axleRating, setAxleRating,
    spreadAxle, setSpreadAxle,
  } = useConfigurator()

  const selectedWidthOption = WIDTH_OPTIONS.find((o) => o.id === width)
  const show = (title) => !activeSectionTitle || activeSectionTitle === title

  return (
    <>
      {show('WIDTH') && (
        <OptionSection title="WIDTH">
          <div className="flex flex-wrap gap-2 py-2 lg:py-2">
            {WIDTH_OPTIONS.map((opt) => (
              <OptionPill
                key={opt.id}
                label={opt.label}
                price={opt.price}
                isSelected={width === opt.id}
                onClick={() => setWidth(opt.id)}
              />
            ))}
          </div>
          {selectedWidthOption && (
            <div className="flex items-center gap-4 px-1 mt-1">
              {WIDTH_OPTIONS.map((opt) => (
                <div key={opt.id} className="flex items-center gap-1.5">
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      width === opt.id ? 'bg-[#DA634B]' : 'bg-[#3a3a3a]'
                    }`}
                  />
                  <span className="text-gray-400 text-xs tracking-wider">{opt.note}</span>
                </div>
              ))}
            </div>
          )}
        </OptionSection>
      )}

      {show('LENGTH') && (
        <OptionSection title="LENGTH">
          <div className="flex flex-wrap gap-2 py-2 gap-2">
            {LENGTH_OPTIONS.map((opt) => (
              <OptionPill
                key={opt.id}
                label={opt.label}
                price={opt.price}
                isSelected={length === opt.id}
                onClick={() => setLength(opt.id)}
              />
            ))}
          </div>
          <div className="flex items-center gap-4 px-1 mt-1">
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-[#DA634B]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-gray-400 text-xs tracking-wider">5200 LBS BASE AXLE</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-[#DA634B]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-gray-400 text-xs tracking-wider">HEAVY CLASS</span>
            </div>
          </div>
        </OptionSection>
      )}

      {show('INTERIOR HEIGHT') && (
        <OptionSection title="INTERIOR HEIGHT">
          <div className="flex flex-wrap gap-2">
            {INTERIOR_HEIGHT_OPTIONS.map((opt) => (
              <OptionPill
                key={opt.id}
                label={opt.label}
                price={opt.price}
                isStandard={opt.isStandard}
                isSelected={interiorHeight === opt.id}
                onClick={() => setInteriorHeight(opt.id)}
              />
            ))}
          </div>
          <AlertMessage message="8'+ HEIGHT AUTO UPGRADES RAMP & WINCH" />
        </OptionSection>
      )}

      {show('AXLE') && (
        <OptionSection title="AXLE">
          <div className="flex flex-wrap gap-2 py-2 lg:py-3">
            {AXLE_OPTIONS.map((opt) => (
              <OptionPill
                key={opt.id}
                label={opt.label}
                price={opt.price}
                isStandard={opt.isStandard}
                isSelected={axle === opt.id}
                onClick={() => setAxle(opt.id)}
              />
            ))}
          </div>
          <img
            src="/Axle.png"
            alt="Axle preview"
            className="w-3/4 mx-auto object-contain mt-1 rounded"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        </OptionSection>
      )}

      {show('AXLE RATING & SUSPENSION') && (
        <OptionSection title="AXLE RATING & SUSPENSION">
          <div className="flex flex-col gap-2">
            {AXLE_RATING_OPTIONS.map((opt) => (
              <OptionPill
                key={opt.id}
                label={opt.label}
                price={opt.price}
                isStandard={opt.isStandard}
                isSelected={axleRating === opt.id}
                onClick={() => setAxleRating(opt.id)}
              />
            ))}
          </div>
          <AlertMessage message="26' - 34' BUILDS START FROM 5200LB LEAF SPRING BASE" />
        </OptionSection>
      )}

      {show('SPREAD AXLE') && (
        <OptionSection title="SPREAD AXLE">
          <div className="flex items-center justify-between bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-4 py-3 gap-4">
            <span className="text-gray-300 text-sm leading-snug">
              Widens the wheelbase gap for a more planted, aggressive stance
            </span>
            <button
              role="switch"
              aria-checked={spreadAxle}
              onClick={() => setSpreadAxle(!spreadAxle)}
              className={`relative inline-flex flex-shrink-0 items-center w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
                spreadAxle ? 'bg-[#DA634B]' : 'bg-[#3a3a3a]'
              }`}
            >
              <span
                className={`inline-block w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-200 ${
                  spreadAxle ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
              {spreadAxle && (
                <svg className="absolute right-1.5 w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          </div>
          <AlertMessage message="REQUIRES TORSION SUSPENSION" />
        </OptionSection>
      )}
    </>
  )
}
