import { useConfigurator } from '../context/ConfiguratorContext'
import { PANEL_SECTIONS } from '../constants/configData'

export default function SectionSubNav({ sectionIdx, setSectionIdx }) {
  const { activeTab } = useConfigurator()
  const sections = PANEL_SECTIONS[activeTab] || []

  const handleClick = (i) => {
    setSectionIdx(sectionIdx === i ? null : i)
  }

  return (
    <div className="overflow-x-auto scrollbar-hide flex-shrink-0">
    <div className="flex justify-center gap-2 px-4 py-2 min-w-full w-max">
      {sections.map((section, i) => (
        <button
          key={section}
          onClick={() => handleClick(i)}
          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase transition-colors ${
            sectionIdx === i
              ? 'bg-[#DA634B] text-white'
              : 'bg-[#2a2a2a] border border-[#3a3a3a] text-gray-400 hover:border-[#DA634B] hover:text-white'
          }`}
        >
          {section}
          {sectionIdx === i && (
            <span className="text-white text-xs leading-none">×</span>
          )}
        </button>
      ))}
    </div>
    </div>
  )
}
