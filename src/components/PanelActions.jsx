import { useConfigurator } from '../context/ConfiguratorContext'

export default function PanelActions() {
  const { totalPrice, setSummaryOpen, setQuoteModalOpen, completionPercent } = useConfigurator()

  return (
    <div className="flex-shrink-0 w-full lg:w-[500px] xl:w-[551px] flex items-center gap-2 lg:gap-2.5 lg:px-0 lg:pr-4 p-1">
      <button
        onClick={() => setSummaryOpen(true)}
        className={`summary-btn flex-[1.3] flex items-center justify-center gap-1.5 lg:gap-2 px-2.5 lg:px-4 py-3 lg:py-5 rounded-xl hover:bg-[#2a2a2a] transition-colors ${completionPercent >= 100 ? 'summary-btn-complete animate-stroke-complete' : ''}`}
        style={{ '--stroke-angle': `${completionPercent * 3.6}deg` }}
      >
        <span className="text-[10px] sm:text-[13px] tracking-widest uppercase text-white whitespace-nowrap font-bold">
          SUMMARY · ${totalPrice.toLocaleString()}
        </span>
        <svg className="w-2.5 h-2.5 lg:w-3.5 lg:h-3.5 text-white flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
        </svg>
      </button>

      <button
        onClick={() => setQuoteModalOpen(true)}
        className="flex-1 flex items-center justify-center gap-1.5 px-3 lg:px-4 py-3 lg:py-5 bg-[#DA634B] hover:bg-[#c5573f] rounded-xl transition-all shadow-md active:scale-[0.98]"
      >
        <span className="text-[10px] sm:text-[13px] font-bold tracking-widest uppercase text-white whitespace-nowrap">
          CHECKOUT
        </span>
        <svg className="w-3.5 h-3.5 text-white flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
      </button>

    </div>
  )
}