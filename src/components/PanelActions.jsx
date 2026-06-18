import { useConfigurator } from '../context/ConfiguratorContext'

export default function PanelActions() {
  const { totalPrice, setSummaryOpen, completionPercent } = useConfigurator()

  return (
    <div className="flex-shrink-0 w-full lg:w-[500px] xl:w-[551px] flex items-center gap-2 lg:gap-3 lg:px-0 lg:pr-4 p-1">
      <button
        onClick={() => setSummaryOpen(true)}
        className={`summary-btn flex-1 flex items-center justify-center gap-1.5 lg:gap-2 px-2 lg:px-4 py-4 rounded-lg hover:bg-[#2a2a2a] transition-colors ${completionPercent >= 100 ? 'summary-btn-complete animate-stroke-complete' : ''}`}
        style={{ '--stroke-angle': `${completionPercent * 3.6}deg` }}
      >
        <span className="text-[10px] sm:text-[14px] tracking-widest uppercase text-white whitespace-nowrap">
          SUMMARY · ${totalPrice.toLocaleString()}
        </span>
        <svg className="w-2.5 h-2.5 lg:w-3.5 lg:h-3.5 text-white flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
        </svg>
      </button>

      <button className="flex-1 flex items-center justify-center gap-1.5 lg:gap-2 px-2 lg:px-4 py-4 bg-[#404040] border border-[#555] rounded-lg transition-colors">
        <span className="text-[10px] sm:text-[14px] tracking-widest uppercase text-white whitespace-nowrap">
          <span className="lg:hidden">CONNECT</span>
          <span className="hidden lg:inline">CONNECT WITH US</span>
        </span>
        <svg className="w-2.5 h-2.5 lg:w-3.5 lg:h-3.5 text-gray-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
        </svg>
      </button>
    </div>
  )
}