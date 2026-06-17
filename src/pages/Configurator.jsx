import { useConfigurator } from '../context/ConfiguratorContext'
import ViewToggle from '../components/ViewToggle'
import TrailerViewer from '../components/TrailerViewer'
import BottomNav from '../components/BottomNav'
import PanelActions from '../components/PanelActions'
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
  const ActivePanel = PANELS[activeTab]

  return (
    <div className="relative h-screen overflow-hidden bg-viewer">

      {/* Background fills full screen */}
      <div className="absolute inset-0 flex flex-col">

        {/* Logo — top left */}
        <div className="absolute top-5 left-6 z-10">
          <img src="/Logo Up.png" className="w-30 h-20" />
        </div>

        {/* View toggle — top center */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10">
          <ViewToggle />
        </div>

        {/* Trailer viewer fills space */}
        <TrailerViewer />

        {/* Bottom nav floats over viewer background */}
        <div className="absolute bottom-2 left-0 right-[360px] md:right-[440px] lg:right-[500px] xl:right-[551px] flex justify-center items-center z-60">
          <BottomNav />
        </div>
      </div>

      {/* Right: config panel overlaid on top of bg */}
      <div className="absolute top-0 right-0 h-full w-[360px] md:w-[440px] lg:w-[500px] xl:w-[551px] flex flex-col z-20 pb-[72px]">
        <aside className="flex-1 overflow-y-auto mt-[30px] scrollbar-hide">
          {ActivePanel && <ActivePanel />}
        </aside>
      </div>

      {/* PanelActions — fixed to bottom of viewport */}
      <div className="fixed bottom-2 right-0 w-[360px] md:w-[440px] lg:w-[500px] xl:w-[551px] z-30 ">
        <PanelActions />
      </div>
    </div>
  )
}
