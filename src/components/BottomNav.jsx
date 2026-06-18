import { useConfigurator } from '../context/ConfiguratorContext'
import { TABS } from '../constants/configData'

export default function BottomNav({ onTabClick, fullWidth = false }) {
  const { activeTab, setActiveTab, markTabVisited } = useConfigurator()

  const handleClick = (tab) => {
    setActiveTab(tab)
    markTabVisited(tab)
    onTabClick?.(tab)
  }

  return (
    <nav className={`flex items-center rounded-lg bg-[#16181b] p-1 px-3 lg:px-6 overflow-x-auto scrollbar-hide ${fullWidth ? 'w-full' : 'w-[93%]'}`}>
      <div className="flex items-center gap-2 min-w-max sm:min-w-0 sm:w-full sm:justify-between lg:w-full lg:justify-between">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => handleClick(tab)}
            className={`flex-shrink-0 lg:flex-1 text-center py-4 px-3 lg:px-3 rounded-lg text-[10px] lg:text-base font-normal leading-4 tracking-normal transition-all duration-150 whitespace-nowrap ${
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