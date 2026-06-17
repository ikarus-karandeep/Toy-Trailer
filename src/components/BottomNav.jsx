import { useConfigurator } from '../context/ConfiguratorContext'
import { TABS } from '../constants/configData'

export default function BottomNav() {
  const { activeTab, setActiveTab } = useConfigurator()

  return (
    <nav className="flex items-center justify-center w-[93%] rounded-lg bg-[#16181b] h-[82px] px-6">
      <div className="flex items-center justify-between gap-2 w-full">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 text-center py-5 gap-5 rounded-lg text-base font-normal leading-4 tracking-normal transition-all duration-150 whitespace-nowrap ${
              activeTab === tab
                ? 'border border-[#DA634B] text-[#DA634B] bg-[rgba(41,41,41,0.35)] shadow-[inset_0_-8px_38.8px_-7px_rgba(218,99,75,0.42)]'
                : 'border border-transparent text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
    </nav>
  )
}