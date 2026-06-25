import { useState, useRef, useEffect } from 'react'
import '@google/model-viewer'
import { useConfigurator } from '../context/ConfiguratorContext'
import { PANEL_SECTIONS } from '../constants/configData'
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

export default function Configurator() {
  const { activeTab, viewMode, setViewMode } = useConfigurator()
  const [sectionIdx, setSectionIdx] = useState(0)
  const mobileARRef = useRef()
  const [arModelReady, setArModelReady] = useState(false)
  const [arLaunching, setArLaunching] = useState(false)

  useEffect(() => {
    const viewer = mobileARRef.current
    if (!viewer) return
    const onLoad = () => setArModelReady(true)
    viewer.addEventListener('load', onLoad)
    return () => viewer.removeEventListener('load', onLoad)
  }, [])

  const handleMobileAR = () => {
    const viewer = mobileARRef.current
    if (!viewer) return
    if (arModelReady && viewer.canActivateAR) {
      viewer.activateAR()
    } else {
      setArLaunching(true)
      const onReady = () => {
        viewer.removeEventListener('load', onReady)
        if (viewer.canActivateAR) viewer.activateAR()
        setArLaunching(false)
      }
      viewer.addEventListener('load', onReady)
    }
  }
  const ActivePanel = PANELS[activeTab]

  const activeSectionTitle = sectionIdx !== null
    ? PANEL_SECTIONS[activeTab]?.[sectionIdx]
    : undefined

  const handleTabClick = () => setSectionIdx(0)

  return (
    <>
      {/* ── TABLET / MOBILE layout (below lg) ── */}
      <div className="lg:hidden relative h-dvh flex flex-col overflow-hidden bg-viewer">

        {/* Logo — absolute over canvas */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center px-4 pt-3 pb-1 pointer-events-none">
          <img src="/Logo Up.png" className="w-20 h-14 object-contain pointer-events-auto" />
          <div className="hidden sm:flex absolute left-0 right-0 justify-center">
            <div className="pointer-events-auto">
              <ViewToggle />
            </div>
          </div>
        </div>

        {/* Trailer viewer + view controls overlaid */}
        <div className="flex-1 min-h-0 flex flex-col relative">
          <TrailerViewer />

          {/* View controls — overlaid at bottom of canvas */}
          <div className="absolute bottom-4 left-0 right-0 z-20 flex items-center justify-center gap-2">
            <button aria-label="360 View" className="w-8 h-7 flex items-center justify-center bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg hover:border-[#DA634B] transition-colors">
              <img src="/eyes.png" className="w-4 h-4 object-contain" />
            </button>
            <button aria-label="Scenic View" className="w-8 h-7 flex items-center justify-center bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg hover:border-[#DA634B] transition-colors">
              <img src="/view.png" className="w-4 h-4 object-contain" />
            </button>
            <button aria-label="Customize" className="w-8 h-7 flex items-center justify-center bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg hover:border-[#DA634B] transition-colors">
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

        {/* Bottom controls — in flow below canvas */}
        <div className="flex-shrink-0 z-20">

          {/* Drawer — only when a section is selected */}
          {sectionIdx !== null && (
            <div className="max-h-[30vh] overflow-y-auto scrollbar-hide">
              {ActivePanel && <ActivePanel activeSectionTitle={activeSectionTitle} />}
            </div>
          )}

          {/* Section pills */}
          <SectionSubNav sectionIdx={sectionIdx} setSectionIdx={setSectionIdx} />

          {/* Main tab navigation */}
          <div className="px-4 py-1 mb-2">
            <BottomNav onTabClick={handleTabClick} fullWidth />
          </div>

          {/* Summary / Connect */}
          <div className="px-4 pb-2">
            <PanelActions />
          </div>
        </div>

        {/* Hidden model-viewer preloads in background so AR launches instantly on tap */}
        <model-viewer
          ref={mobileARRef}
          src={`${window.location.origin}/models/Base.glb`}
          ar
          ar-modes="quick-look webxr scene-viewer"
          class="absolute w-0 h-0 opacity-0 pointer-events-none overflow-hidden"
        />

      </div>

      {/* ── DESKTOP layout (lg+) ── */}
      <div className="hidden lg:block relative h-dvh overflow-hidden bg-viewer">

        {/* Background layer — constrained to the left of the right panel */}
        <div className="absolute top-0 left-0 bottom-0 right-[360px] md:right-[440px] lg:right-[500px] xl:right-[551px] flex flex-col">

          {/* Logo — top left */}
          <div className="absolute top-6 left-6 z-10">
            <img src="/Logo Up.png" className="w-30 h-20" />
          </div>

          {/* View toggle — centered in viewer area */}
          <div className="absolute top-6 left-0 right-0 flex justify-center z-10">
            <ViewToggle />
          </div>

          {/* Trailer viewer */}
          <TrailerViewer />

          {/* Bottom nav */}
          <div className="flex-shrink-0 flex justify-center items-center py-6">
            <BottomNav />
          </div>
        </div>

        {/* Right config panel */}
        <div className="absolute top-0 right-0 h-full w-[360px] md:w-[440px] lg:w-[500px] xl:w-[551px] flex flex-col z-20 pb-[72px]">
          <aside className="flex-1 overflow-y-auto mt-[30px] pr-4 scrollbar-hide">
            {ActivePanel && <ActivePanel />}
          </aside>
        </div>

        {/* PanelActions — fixed to bottom of viewport */}
        <div className="fixed bottom-6 right-0 w-[360px] md:w-[440px] lg:w-[500px] xl:w-[551px] z-30 pr-4">
          <PanelActions />
        </div>
      </div>

      {/* Summary panel — works on both layouts */}
      <SummaryPanel />

      {arLaunching && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
          <span className="text-white text-sm tracking-widest uppercase">Launching AR...</span>
        </div>
      )}
    </>
  )
}
