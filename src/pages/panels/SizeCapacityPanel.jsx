import { useConfigurator } from '../../context/ConfiguratorContext'
import { usePackageBadge } from '../../hooks/usePackageBadge'
import {
  WIDTH_OPTIONS,
  LENGTH_OPTIONS,
  FRAME_SIZE_OPTIONS,
  AXLE_COUNT_OPTIONS,
  AXLE_SUSPENSION_OPTIONS,
  AXLE_CAPACITY_OPTIONS,
  INTERIOR_HEIGHT_OPTIONS,
} from '../../constants/configData'
import OptionSection from '../../components/OptionSection'
import OptionPill from '../../components/OptionPill'
import ToggleSwitch from '../../components/ToggleSwitch'
import DotSlider from '../../components/DotSlider'

export default function SizeCapacityPanel({ activeSectionTitle }) {
  const {
    width, setWidth,
    length, setLength,
    frameSize, setFrameSize,
    axleCount, setAxleCount,
    axleSuspension, setAxleSuspension,
    axleCapacity, setAxleCapacity,
    interiorHeight, setInteriorHeight,
    spreadAxle, setSpreadAxle,
    narrowTrackAxle, setNarrowTrackAxle,
  } = useConfigurator()

  const getBadge = usePackageBadge()

  const show = (title) => !activeSectionTitle || activeSectionTitle === title

  const lengthIndex = LENGTH_OPTIONS.findIndex((o) => o.id === length)
  const selectedLength = LENGTH_OPTIONS[lengthIndex] ?? LENGTH_OPTIONS[0]
  const heightIndex = INTERIOR_HEIGHT_OPTIONS.findIndex((o) => o.id === interiorHeight)
  const selectedHeight = INTERIOR_HEIGHT_OPTIONS[heightIndex] ?? INTERIOR_HEIGHT_OPTIONS[0]

  const lengthFt = parseInt(length, 10)
  const needsSuperDutyRamp = heightIndex >= 2 // 8'0" or above


  return (
    <>
      {/* WIDTH */}
      {show('WIDTH') && (
        <OptionSection title="WIDTH">
          <div className="flex flex-wrap gap-2">
            {WIDTH_OPTIONS.map((opt) => (
              <OptionPill
                key={opt.id}
                label={opt.label}
                price={opt.price}
                isSelected={width === opt.id}
                isLocked={opt.locked}
                onClick={() => setWidth(opt.id)}
              />
            ))}
          </div>
        </OptionSection>
      )}

      {/* LENGTH */}
{show('LENGTH') && (
  <OptionSection title="LENGTH">
    <p className="text-gray-400 text-xs tracking-wider -mt-4">
      6&quot; frame on 14–24ft, 8&quot; frame on 26–36ft
    </p>

    {/* Trailer SVG diagram */}
    <div className="flex justify-center my-2">
      <img src="/Length.png"/>
    </div>

    <DotSlider
      options={LENGTH_OPTIONS}
      value={length}
      onChange={setLength}
      badge={selectedLength.badge || null}
    />
  </OptionSection>
)}

      {/* FRAME SIZE (AUTO ASSIGNED) */}
      {show('FRAME SIZE') && (
        <OptionSection title="FRAME SIZE (AUTO ASSIGNED)">
          <p className="text-gray-400 text-xs tracking-wider -mt-4">
            8&quot; frame auto assigned (required for 8.5 x 26&apos;+ builds)
          </p>
          <div className="flex flex-wrap gap-2">
            {FRAME_SIZE_OPTIONS.map((opt) => (
              <OptionPill
                key={opt.id}
                label={opt.label}
                isStandard={opt.isStandard}
                isSelected={frameSize === opt.id}
                isLocked={opt.locked}
                onClick={() => setFrameSize(opt.id)}
              />
            ))}
          </div>
        </OptionSection>
      )}

      {/* AXLES COMBINED */}
      {(show('AXLE COUNT') || show('AXLE SUSPENSION') || show('AXLE CAPACITY')) && (
        <OptionSection>
          {/* AXLE COUNT */}
          {(show('AXLE COUNT') || !activeSectionTitle) && (
            <div>
              <h2 className="text-white font-medium text-[18px] lg:text-[20px] tracking-widest uppercase mb-2">AXLE COUNT</h2>
              <p className="text-gray-400 text-xs tracking-wider mb-6">
                Tandem Axle default for builds under 34ft.
              </p>
              <div className="flex flex-wrap gap-2">
                {AXLE_COUNT_OPTIONS.map((opt) => (
                  <OptionPill
                    key={opt.id}
                    label={opt.label}
                    price={opt.price}
                    isStandard={opt.isStandard}
                    isSelected={axleCount === opt.id}
                    onClick={() => setAxleCount(opt.id)}
                  />
                ))}
              </div>

              {/* Axle diagram */}
              <div className="flex justify-center mt-6">
                <img src={axleCount === 'triple' ? "/triple.png" : "/Axle count.png"} alt="Axle Count"/>
              </div>
            </div>
          )}

          {/* DIVIDER */}
          {(!activeSectionTitle || (show('AXLE COUNT') && show('AXLE SUSPENSION'))) && (
            <div className="border-t border-[#5D5E60]"></div>
          )}

          {/* AXLE SUSPENSION */}
          {(show('AXLE SUSPENSION') || !activeSectionTitle) && (
            <div>
              <h2 className="text-white font-medium text-[18px] lg:text-[20px] tracking-widest uppercase mb-2">AXLE SUSPENSION</h2>
              <p className="text-gray-400 text-xs tracking-wider mb-6">
                Torsion Required For Spread Axle
              </p>
              <div className="flex flex-wrap gap-2">
                {AXLE_SUSPENSION_OPTIONS.map((opt) => (
                  <OptionPill
                    key={opt.id}
                    label={opt.label}
                    isStandard={opt.isStandard}
                    isSelected={axleSuspension === opt.id}
                    onClick={() => setAxleSuspension(opt.id)}
                    packageBadge={getBadge(opt.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* DIVIDER */}
          {(!activeSectionTitle || (show('AXLE SUSPENSION') && show('AXLE CAPACITY'))) && (
            <div className="border-t border-[#5D5E60]"></div>
          )}

          {/* AXLE CAPACITY */}
          {(show('AXLE CAPACITY') || !activeSectionTitle) && (
            <div>
              <h2 className="text-white font-medium text-[18px] lg:text-[20px] tracking-widest uppercase mb-2">AXLE CAPACITY</h2>
              <p className="text-gray-400 text-xs tracking-wider mb-6">
                6000lbs axle capacity for 26ft+.
              </p>
              <div className="flex flex-wrap gap-2">
                {AXLE_CAPACITY_OPTIONS.map((opt) => (
                  <OptionPill
                    key={opt.id}
                    label={opt.label}
                    price={opt.price}
                    isStandard={opt.isStandard}
                    isSelected={axleCapacity === opt.id}
                    onClick={() => setAxleCapacity(opt.id)}
                    packageBadge={getBadge(opt.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </OptionSection>
      )}

      {/* INTERIOR HEIGHT */}
      {show('INTERIOR HEIGHT') && (
        <OptionSection title="INTERIOR HEIGHT">
          {/* Slider */}
          <DotSlider
            options={INTERIOR_HEIGHT_OPTIONS}
            value={interiorHeight}
            onChange={setInteriorHeight}
            badge={needsSuperDutyRamp ? '+$1,520 · Super Duty Ramp Required' : null}
          />
        </OptionSection>
      )}

      {/* SPREAD AXLE W/ CORVETTE FENDERS */}
      {show('SPREAD AXLE W/ CORVETTE FENDERS') && (
        <OptionSection title="SPREAD AXLE W/ CORVETTE FENDERS">
          <p className="text-gray-400 text-xs tracking-wider -mt-4">
            Auto Applies Torsion
          </p>
          <ToggleSwitch
            label="Wider stance, Corvette-style fenders"
            checked={spreadAxle}
            onChange={setSpreadAxle}
          />
        </OptionSection>
      )}

      {/* NARROW TRACK AXLE */}
      {show('NARROW TRACK AXLE') && (
        <OptionSection title="NARROW TRACK AXLE">
          <p className="text-gray-400 text-xs tracking-wider -mt-4">
            Applicable on 7ft wide trailer
          </p>
          <ToggleSwitch
            label="Reduces track width."
            checked={narrowTrackAxle}
            onChange={setNarrowTrackAxle}
          />
        </OptionSection>
      )}
    </>
  )
}
