import React from 'react'
import { useConfigurator } from '../../context/ConfiguratorContext'

export default function PitPackPanel() {
  const { setShowPitPackUpsell } = useConfigurator()

  return (
    <div className="h-full flex flex-col p-6 lg:pt-0">
      <div className="border border-[#0099ff] rounded-lg bg-[#1a1a1a] shadow-[0_0_15px_rgba(0,153,255,0.3)] flex flex-col h-full overflow-hidden">
        
        {/* Header */}
        <div className="p-5 flex justify-between items-center border-b border-[#3a3a3a]">
          <h2 className="text-white font-semibold text-lg tracking-wider">ADD PIT PACK · $ 5,596 - $ 6,911</h2>
          <button 
            onClick={() => setShowPitPackUpsell(false)}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            aria-label="Add Pit Pack"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto scrollbar-thin">
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-1">
              WHAT'S INCLUDED
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </h3>
            <ul className="grid grid-cols-2 gap-y-3 gap-x-4">
              <li className="text-[11px] text-gray-200 flex items-start gap-2">
                <span className="mt-1">•</span> ATP/RTP Floor & Ramp
              </li>
              <li className="text-[11px] text-gray-200 flex items-start gap-2">
                <span className="mt-1">•</span> White metal walls & ceiling
              </li>
              <li className="text-[11px] text-gray-200 flex items-start gap-2">
                <span className="mt-1">•</span> Front base + overhead cabinets
              </li>
              <li className="text-[11px] text-gray-200 flex items-start gap-2">
                <span className="mt-1">•</span> Angled racing lights
              </li>
              <li className="text-[11px] text-gray-200 flex items-start gap-2">
                <span className="mt-1">•</span> Rear loading lights
              </li>
              <li className="text-[11px] text-gray-200 flex items-start gap-2">
                <span className="mt-1">•</span> 50 amp electric
              </li>
              <li className="text-[11px] text-gray-200 flex items-start gap-2">
                <span className="mt-1">•</span> 12v deep cycle battery
              </li>
              <li className="text-[11px] text-gray-200 flex items-start gap-2">
                <span className="mt-1">•</span> Trickle charger
              </li>
              <li className="text-[11px] text-gray-200 flex items-start gap-2">
                <span className="mt-1">•</span> Blackout - Interior
              </li>
            </ul>
          </div>
          
          <div className="border-t border-[#3a3a3a] pt-4">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-2">
              <span className="text-gray-500">•</span> STACKS WITH TRACK PACK
            </p>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest flex items-start gap-2">
              <span className="text-gray-500">•</span> CONFIGURATIONS CAN BE CHANGED INDEPENDENTLY DOWN THE LINE
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
