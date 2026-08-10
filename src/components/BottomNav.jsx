import { useConfigurator } from '../context/ConfiguratorContext'
import { TABS } from '../constants/configData'
import { usePackageTabCounts } from '../hooks/usePackageTabCounts'

export default function BottomNav({ onTabClick, fullWidth = false }) {
  const { activeTab, setActiveTab, markTabVisited } = useConfigurator()
  const { counts, badge } = usePackageTabCounts()

  const handleClick = (tab) => {
    setActiveTab(tab)
    markTabVisited(tab)
    onTabClick?.(tab)
  }

  return (
    <nav className={`flex items-center rounded-lg bg-[#16181b] p-1 px-3 lg:px-6 overflow-x-auto py-2 scrollbar-hide ${fullWidth ? 'w-full' : 'w-[93%]'}`}>
      <div className="flex items-center gap-2 min-w-max sm:min-w-0 sm:w-full sm:justify-between lg:w-full lg:justify-between">
        {TABS.map((tab) => {
          const count = counts[tab] || 0
          return (
            <div key={tab} className="relative flex-shrink-0 lg:flex-1 flex">
              <button
                onClick={() => handleClick(tab)}
                className={`w-full text-center py-4 px-3 lg:py-5 lg:px-3 rounded-lg text-sm lg:text-base font-normal leading-4 tracking-normal transition-all duration-150 whitespace-nowrap ${
                  activeTab === tab
                    ? 'border border-[#DA634B] text-[#DA634B] bg-[rgba(41,41,41,0.35)] shadow-[inset_0_-8px_38.8px_-7px_rgba(218,99,75,0.42)]'
                    : 'border border-transparent text-white'
                }`}
              >
                {tab}
              </button>
              {count > 0 && badge && (
                <div className="absolute -top-2 -right-2 bg-[#DA634B] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center justify-center gap-1 shadow-[0_2px_8px_rgba(0,0,0,0.5)] border border-[#ffffff30] min-w-[24px]">
                  <span>{count}</span>
                  <img src={badge} alt="package" className="w-3.5 h-3.5 object-contain drop-shadow-md" />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </nav>
  )
}