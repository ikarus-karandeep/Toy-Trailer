import { createContext, useContext, useState, useMemo } from 'react'

const ConfiguratorContext = createContext(null)

export function ConfiguratorProvider({ children }) {
  const [activeTab, setActiveTab] = useState('SIZE & CAPACITY')
  const [viewMode, setViewMode] = useState('EXTERIOR')
  const [summaryOpen, setSummaryOpen] = useState(false)

  // Size & Capacity
  const [width, setWidth] = useState('7ft')
  const [length, setLength] = useState('36')
  const [interiorHeight, setInteriorHeight] = useState('7ft0')
  const [axleAngled, setAxleAngled] = useState(false)
  const [axleAtp, setAxleAtp] = useState(true)
  const [axleRating, setAxleRating] = useState('5200torsion')
  const [spreadAxle, setSpreadAxle] = useState(true)

  // Exterior
  const [exteriorFinish, setExteriorFinish] = useState('standard')
  const [selectedColor, setSelectedColor] = useState('pink')
  const [frontStyle, setFrontStyle] = useState('vnose')
  const [sideDoorsType, setSideDoorsType] = useState('flatpanel')
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
  const [leftSide, setLeftSide] = useState(true)
  const [rightSide, setRightSide] = useState(true)

  // Systems
  const [electrical, setElectrical] = useState('110v8space')
  const [battery, setBattery] = useState('12vbatterybox')
  const [lights, setLightsRaw] = useState(['dome', 'racing'])
  const [ventilation, setVentilation] = useState('sidewallvents')
  const [climateControl, setClimateControl] = useState('wirebrace')

  // Loading
  const [rampType, setRampType] = useState('heavyduty')
  const [atpRamp, setAtpRamp] = useState(true)
  const [rearDoor, setRearDoor] = useState(true)
  const [tieDowns, setTieDownsRaw] = useState(['drings'])
  const [jacks, setJacksRaw] = useState(['folddownstabilizer'])

  // Add-Ons
  const [waterPackage, setWaterPackage] = useState('largewater')
  const [bathroom, setBathroom] = useState(null)
  const [awning, setAwningRaw] = useState([])

  // Front Style addons (Front Style node graph)
  const [angledLights, setAngledLights] = useState(false)
  const [stairs, setStairs] = useState(false)
  const [vNoseETrack, setVNoseETrack] = useState(false)
  const [batteryBox, setBatteryBox] = useState(false)

  // Base addons (Base node graph)
  const [escapeDoor, setEscapeDoor] = useState('none')
  const [generatorBox, setGeneratorBox] = useState(false)

  // Cabinet Addons
  const [winchSystem, setWinchSystem] = useState(false)

  // System/Exterior Addons (from Addons node graph)
  const [extendedTripleTongue, setExtendedTripleTongue] = useState(false)
  const [radioPackageSpeaker, setRadioPackageSpeaker] = useState(false)
  const [rearSpoiler, setRearSpoiler] = useState(false)

  // Structural / Exterior Addons
  const [ladderRacks, setLadderRacks] = useState(false)
  const [sidewallVents, setSidewallVents] = useState(false)
  const [recessedTireBox, setRecessedTireBox] = useState(false)
  const [interiorTireMount, setInteriorTireMount] = useState(false)

  const [showDimensions, setShowDimensions] = useState(false)

  const [visitedTabs, setVisitedTabs] = useState(new Set(['SIZE & CAPACITY']))
  const markTabVisited = (tab) => setVisitedTabs(prev => new Set([...prev, tab]))
  const completionPercent = useMemo(() => Math.round((visitedTabs.size / 6) * 100), [visitedTabs])

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
        axleAngled, setAxleAngled,
        axleAtp, setAxleAtp,
        axleRating, setAxleRating,
        spreadAxle, setSpreadAxle,
        exteriorFinish, setExteriorFinish,
        sideDoorsType, setSideDoorsType,
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
        leftSide, setLeftSide,
        rightSide, setRightSide,
        electrical, setElectrical,
        battery, setBattery,
        lights, toggleLight,
        ventilation, setVentilation,
        climateControl, setClimateControl,
        rampType, setRampType,
        atpRamp, setAtpRamp,
        rearDoor, setRearDoor,
        tieDowns, toggleTieDown,
        jacks, toggleJack,
        waterPackage, setWaterPackage,
        bathroom, setBathroom,
        awning, toggleAwning,
        angledLights, setAngledLights,
        stairs, setStairs,
        vNoseETrack, setVNoseETrack,
        batteryBox, setBatteryBox,
        escapeDoor, setEscapeDoor,
        generatorBox, setGeneratorBox,
        winchSystem, setWinchSystem,
        extendedTripleTongue, setExtendedTripleTongue,
        radioPackageSpeaker, setRadioPackageSpeaker,
        rearSpoiler, setRearSpoiler,
        ladderRacks, setLadderRacks,
        sidewallVents, setSidewallVents,
        recessedTireBox, setRecessedTireBox,
        interiorTireMount, setInteriorTireMount,
        showDimensions, setShowDimensions,
        totalPrice,
        completionPercent, markTabVisited,
      }}
    >
      {children}
    </ConfiguratorContext.Provider>
  )
}

export const useConfigurator = () => useContext(ConfiguratorContext)
