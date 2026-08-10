import { useState, useRef } from 'react'
import { useConfigurator } from '../context/ConfiguratorContext'
import { PANEL_SECTIONS, TABS } from '../constants/configData'
import ViewToggle from '../components/ViewToggle'
import TrailerViewer from '../components/TrailerViewer'
import BottomNav from '../components/BottomNav'
import PanelActions from '../components/PanelActions'
import SummaryPanel from '../components/SummaryPanel'
import SectionSubNav from '../components/SectionSubNav'
import SizeCapacityPanel from './panels/SizeCapacityPanel'
import ExteriorPanel from './panels/ExteriorPanel'
import InteriorPanel from './panels/InteriorPanel'
import SystemsPanel from './panels/SystemsPanel'
import LoadingPanel from './panels/LoadingPanel'
import AddOnsPanel from './panels/AddOnsPanel'

const PANELS = {
  'SIZE & CAPACITY': SizeCapacityPanel,
  EXTERIOR: ExteriorPanel,
  INTERIOR: InteriorPanel,
  SYSTEMS: SystemsPanel,
  LOADING: LoadingPanel,
  'ADD-ONS': AddOnsPanel,
}

export default function Configurator({ onModelReady }) {
  const { activeTab, setActiveTab, viewMode, setViewMode, showDimensions, setShowDimensions } = useConfigurator()
  const [sectionIdx, setSectionIdx] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  const viewerRef = useRef()

  const handleMobileAR = () => viewerRef.current?.openARViewer()
  const ActivePanel = PANELS[activeTab]

  const activeSectionTitle = sectionIdx !== null
    ? PANEL_SECTIONS[activeTab]?.[sectionIdx]
    : undefined

  const handleTabClick = () => setSectionIdx(0)

  return (
    <>
      {/* ── UNIFIED RESPONSIVE LAYOUT ── */}
      <div className="relative h-dvh flex flex-col lg:block overflow-hidden bg-viewer">

        {/* ── LEFT SIDE / MAIN VIEWER AREA ── */}
        <div className={`flex-1 min-h-0 flex flex-col relative lg:absolute lg:top-0 lg:left-0 lg:bottom-0 transition-all duration-300 ${fullscreen ? 'lg:right-0' : 'lg:right-[500px] xl:right-[551px]'}`}>
          
          {/* Logo & Top View Toggle */}
          <div className="absolute top-0 left-0 right-0 z-20 flex items-center gap-6 px-4 pt-4 pb-1 pointer-events-none lg:top-8 lg:left-8 lg:px-0 lg:pt-0 lg:pb-0">
            <button
              onClick={() => {
                const currentIndex = TABS.indexOf(activeTab)
                if (currentIndex > 0) {
                  setActiveTab(TABS[currentIndex - 1])
                } else {
                  // On first tab — go back to package selection
                  window.location.hash = 'package'
                }
              }}
              className="pointer-events-auto flex items-center justify-center w-10 h-10 lg:w-14 lg:h-14 bg-[#3a3a3a] hover:bg-[#4a4a4a] text-white rounded-xl lg:rounded-[20px] transition-colors shadow-lg"
              aria-label="Previous Menu"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 12H4M4 12L10 18M4 12L10 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <img src="/Logo Up.png" className="w-20 h-14 object-contain pointer-events-auto lg:w-30 lg:h-20" />
            
            {/* Mobile View Toggle */}
            <div className="hidden sm:flex lg:hidden absolute left-0 right-0 justify-center">
              <div className="pointer-events-auto">
                <ViewToggle />
              </div>
            </div>
          </div>

          {/* Desktop View Toggle */}
          <div className="hidden lg:flex absolute top-6 left-0 right-0 justify-center z-10 pointer-events-none">
            <div className="pointer-events-auto">
              <ViewToggle />
            </div>
          </div>

          {/* Trailer Viewer */}
          <div className="flex-1 min-h-0 flex flex-col relative">
            <TrailerViewer ref={viewerRef} onModelReady={onModelReady} fullscreen={fullscreen} onToggleFullscreen={() => setFullscreen(prev => !prev)} />

            {/* Mobile View controls — overlaid at bottom of canvas */}
            <div className="lg:hidden absolute bottom-4 left-0 right-0 z-20 flex items-center justify-center gap-2">
              <button
                aria-label="Toggle Fullscreen"
                onClick={() => setFullscreen(prev => !prev)}
                className={`w-8 h-7 flex items-center justify-center bg-[#2a2a2a] rounded-lg transition-colors border ${fullscreen ? 'border-[#DA634B]' : 'border-[#3a3a3a] hover:border-[#DA634B]'}`}
              >
                <img src="/eyes.png" className="w-4 h-4 object-contain" />
              </button>
              {/* <button aria-label="Scenic View" className="w-8 h-7 flex items-center justify-center bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg hover:border-[#DA634B] transition-colors">
                <img src="/view.png" className="w-4 h-4 object-contain" />
              </button> */}
              <button
                aria-label="Toggle Dimensions"
                onClick={() => setShowDimensions(prev => !prev)}
                className={`w-8 h-7 flex items-center justify-center bg-[#2a2a2a] rounded-lg transition-colors border ${showDimensions ? 'border-[#DA634B]' : 'border-[#3a3a3a] hover:border-[#DA634B]'}`}
              >
                <img src="/Dimension.png" className="w-4 h-4 object-contain" />
              </button>
              <button
                onClick={handleMobileAR}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg text-[10px] font-semibold tracking-widest uppercase text-gray-300 hover:border-[#DA634B] hover:text-white transition-all"
              >
                <span className="sm:hidden">AR</span>
                <span className="hidden sm:inline">VIEW IN YOUR DRIVEWAY</span>
              </button>
              <button
                onClick={() => setViewMode(viewMode === 'EXTERIOR' ? 'INTERIOR' : 'EXTERIOR')}
                className="sm:hidden flex items-center gap-1.5 px-3 py-1.5 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg text-[10px] font-semibold tracking-widest uppercase text-gray-300 hover:border-[#DA634B] hover:text-white transition-all"
              >
                VIEW {viewMode}
              </button>
            </div>
          </div>

          {/* Desktop Bottom Nav */}
          <div className="hidden lg:flex flex-shrink-0 justify-center items-center mb-6">
            <BottomNav />
          </div>
        </div>

        {/* ── RIGHT/BOTTOM PANEL AREA ── */}
        <div className={`flex-shrink-0 z-20 flex flex-col lg:absolute lg:top-0 lg:right-0 lg:h-full lg:w-[500px] xl:w-[551px] lg:pb-[72px] transition-all duration-300 ${fullscreen ? 'hidden' : ''}`}>
          
          {/* Mobile Panel Layout */}
          <div className="lg:hidden flex flex-col">
            {sectionIdx !== null && (
              <div key={`mobile-${activeTab}-${sectionIdx}`} className="max-h-[30vh] overflow-y-auto scrollbar-hide">
                {ActivePanel && <ActivePanel activeSectionTitle={activeSectionTitle} />}
              </div>
            )}
            <SectionSubNav sectionIdx={sectionIdx} setSectionIdx={setSectionIdx} />
            <div className="px-4 py-1 mb-2">
              <BottomNav onTabClick={handleTabClick} fullWidth />
            </div>
            <div className="px-4 pb-2">
              <PanelActions />
            </div>
          </div>

          {/* Desktop Panel Layout */}
          <aside key={`desktop-${activeTab}`} className="hidden lg:block flex-1 overflow-y-auto mt-[30px] pr-4 scrollbar-hide">
            {ActivePanel && <ActivePanel />}
          </aside>
        </div>

        {/* Desktop PanelActions */}
        <div className={`fixed bottom-6 right-0 w-[500px] xl:w-[551px] z-30 pr-4 ${fullscreen ? 'hidden' : 'hidden lg:block'}`}>
          <PanelActions />
        </div>

      </div>

      {/* Summary panel — works on both layouts */}
      <SummaryPanel />
    </>
  )
}
