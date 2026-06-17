import { useState } from 'react'
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
  const { activeTab } = useConfigurator()
  const [sectionIdx, setSectionIdx] = useState(null)
  const ActivePanel = PANELS[activeTab]

  const activeSectionTitle = sectionIdx !== null
    ? PANEL_SECTIONS[activeTab]?.[sectionIdx]
    : undefined

  const handleTabClick = () => setSectionIdx(null)

  return (
    <>
      {/* ── TABLET / MOBILE layout (below lg) ── */}
      <div className="lg:hidden relative h-dvh overflow-hidden bg-viewer">

        {/* Trailer viewer — fills entire screen */}
        <div className="absolute inset-0 flex flex-col">
          <TrailerViewer />
        </div>

        {/* Header row — overlaid top */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-center px-4 pt-3 pb-1">
          <div className="absolute left-4">
            <img src="/Logo Up.png" className="w-20 h-14 object-contain" />
          </div>
          <ViewToggle />
        </div>

        {/* Bottom overlay — all controls sit on top of viewer */}
        <div className="absolute bottom-0 left-0 right-0 z-20">

          {/* Gradient fade — only when drawer is closed */}
          {sectionIdx === null && (
            <div className="h-16 pointer-events-none" />
          )}

          {/* View controls — above drawer content */}
          <div className="flex items-center justify-center gap-3 py-2 ">
            <button aria-label="360 View" className="w-11 h-9 flex items-center justify-center bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg hover:border-[#DA634B] transition-colors">
              <img src="/eyes.png" />
            </button>
            <button aria-label="Scenic View" className="w-11 h-9 flex items-center justify-center bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg hover:border-[#DA634B] transition-colors">
              <img src="/view.png" />
            </button>
            <button aria-label="Customize" className="w-11 h-9 flex items-center justify-center bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg hover:border-[#DA634B] transition-colors">
              <img src="/Dimension.png" />
            </button>
            <button className="flex items-center gap-2 px-5 py-3 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg text-sm font-semibold tracking-widest uppercase text-gray-300 hover:border-[#DA634B] hover:text-white transition-all">
              VIEW IN YOUR DRIVEWAY
            </button>
          </div>

          {/* Drawer — only when a section is selected */}
          {sectionIdx !== null && (
            <div className="max-h-[30vh] overflow-y-auto scrollbar-hide">
              {ActivePanel && <ActivePanel activeSectionTitle={activeSectionTitle} />}
            </div>
          )}

          {/* Section pills */}
          <div className="">
            <SectionSubNav sectionIdx={sectionIdx} setSectionIdx={setSectionIdx} />
          </div>

          {/* Main tab navigation */}
          <div className="px-2 py-1">
            <BottomNav onTabClick={handleTabClick} fullWidth />
          </div>

          {/* Summary / Connect */}
          <div className="px-0 pb-2">
            <PanelActions />
          </div>
        </div>
      </div>

      {/* ── DESKTOP layout (lg+) ── */}
      <div className="hidden lg:block relative h-dvh overflow-hidden bg-viewer">

        {/* Background layer */}
        <div className="absolute inset-0 flex flex-col">

          {/* Logo — top left */}
          <div className="absolute top-5 left-6 z-10">
            <img src="/Logo Up.png" className="w-30 h-20" />
          </div>

          {/* View toggle — centered in viewer area */}
          <div className="absolute top-6 left-0 right-[360px] md:right-[440px] lg:right-[500px] xl:right-[551px] flex justify-center z-10">
            <ViewToggle />
          </div>

          {/* Trailer viewer */}
          <TrailerViewer />

          {/* Bottom nav */}
          <div className="absolute bottom-2 left-0 right-[360px] md:right-[440px] lg:right-[500px] xl:right-[551px] flex justify-center items-center z-60">
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
        <div className="fixed bottom-2 right-0 w-[360px] md:w-[440px] lg:w-[500px] xl:w-[551px] z-30 pr-4">
          <PanelActions />
        </div>
      </div>

      {/* Summary panel — works on both layouts */}
      <SummaryPanel />
    </>
  )
}
