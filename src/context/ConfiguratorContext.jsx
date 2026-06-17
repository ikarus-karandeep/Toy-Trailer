import { createContext, useContext, useState } from 'react'

const ConfiguratorContext = createContext(null)

export function ConfiguratorProvider({ children }) {
  const [activeTab, setActiveTab] = useState('SIZE & CAPACITY')
  const [viewMode, setViewMode] = useState('EXTERIOR')
  const [summaryOpen, setSummaryOpen] = useState(false)

  // Size & Capacity
  const [width, setWidth] = useState('8ft')
  const [length, setLength] = useState('8x26')
  const [interiorHeight, setInteriorHeight] = useState('7ft0')
  const [axle, setAxle] = useState('tandem')
  const [axleRating, setAxleRating] = useState('5200torsion')
  const [spreadAxle, setSpreadAxle] = useState(true)

  // Exterior
  const [exteriorFinish, setExteriorFinish] = useState('standard')
  const [selectedColor, setSelectedColor] = useState('pink')
  const [frontStyle, setFrontStyle] = useState('vnose')
  const [exteriorBuild, setExteriorBuild] = useState('fullscrewless')
  const [protection, setProtection] = useState('onepieceroof')
  const [wheel, setWheel] = useState('aluminumradial')
  const [spareTire, setSpareTire] = useState(true)
  const [lugType, setLugType] = useState('5lug')

  // Interior
  const [floor, setFloor] = useState('34plywood')
  const [walls, setWalls] = useState('38plywood')
  const [ceiling, setCeiling] = useState('thermal')
  const [cabinets, setCabinetsRaw] = useState(['vnosebase'])
  const [toolBox, setToolBox] = useState('frontbox')

  // Systems
  const [electrical, setElectrical] = useState('110v8space')
  const [battery, setBattery] = useState('12vbatterybox')
  const [lights, setLightsRaw] = useState(['dome', 'racing'])
  const [ventilation, setVentilation] = useState('sidewallvents')
  const [climateControl, setClimateControl] = useState('wirebrace')

  // Loading
  const [rampType, setRampType] = useState('heavyduty')
  const [atpRamp, setAtpRamp] = useState(true)
  const [tieDowns, setTieDownsRaw] = useState(['drings'])
  const [jacks, setJacksRaw] = useState(['folddownstabilizer'])

  // Add-Ons
  const [waterPackage, setWaterPackage] = useState('largewater')
  const [bathroom, setBathroom] = useState(null)
  const [awning, setAwningRaw] = useState([])

  const totalPrice = 106995

  const toggleLight = (id) =>
    setLightsRaw((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )

  const toggleTieDown = (id) =>
    setTieDownsRaw((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )

  const toggleJack = (id) =>
    setJacksRaw((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )

  const toggleCabinet = (id) =>
    setCabinetsRaw((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )

  const toggleAwning = (id) =>
    setAwningRaw((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )

  return (
    <ConfiguratorContext.Provider
      value={{
        activeTab, setActiveTab,
        viewMode, setViewMode,
        summaryOpen, setSummaryOpen,
        width, setWidth,
        length, setLength,
        interiorHeight, setInteriorHeight,
        axle, setAxle,
        axleRating, setAxleRating,
        spreadAxle, setSpreadAxle,
        exteriorFinish, setExteriorFinish,
        selectedColor, setSelectedColor,
        frontStyle, setFrontStyle,
        exteriorBuild, setExteriorBuild,
        protection, setProtection,
        wheel, setWheel,
        spareTire, setSpareTire,
        lugType, setLugType,
        floor, setFloor,
        walls, setWalls,
        ceiling, setCeiling,
        cabinets, toggleCabinet,
        toolBox, setToolBox,
        electrical, setElectrical,
        battery, setBattery,
        lights, toggleLight,
        ventilation, setVentilation,
        climateControl, setClimateControl,
        rampType, setRampType,
        atpRamp, setAtpRamp,
        tieDowns, toggleTieDown,
        jacks, toggleJack,
        waterPackage, setWaterPackage,
        bathroom, setBathroom,
        awning, toggleAwning,
        totalPrice,
      }}
    >
      {children}
    </ConfiguratorContext.Provider>
  )
}

export const useConfigurator = () => useContext(ConfiguratorContext)
