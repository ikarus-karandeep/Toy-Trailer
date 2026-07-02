import { createContext, useContext, useState, useMemo, useCallback } from 'react'

const makeToggle = (setter) => (id) =>
  setter(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

const ConfiguratorContext = createContext(null)

export function ConfiguratorProvider({ children, initialConfig: ic = {} }) {
  const [activeTab, setActiveTab] = useState('SIZE & CAPACITY')
  const [viewMode, setViewMode] = useState('EXTERIOR')
  const [summaryOpen, setSummaryOpen] = useState(false)

  // Size & Capacity
  const [width, setWidth] = useState(ic.width ?? '7ft')
  const [length, setLength] = useState(ic.length ?? '36')
  const [interiorHeight, setInteriorHeight] = useState(ic.interiorHeight ?? '7ft0')
  const [axleAngled, setAxleAngled] = useState(ic.axleAngled ?? false)
  const [axleAtp, setAxleAtp] = useState(ic.axleAtp ?? true)
  const [axleRating, setAxleRating] = useState(ic.axleRating ?? '5200torsion')
  const [spreadAxle, setSpreadAxle] = useState(ic.spreadAxle ?? true)

  // Exterior
  const [exteriorFinish, setExteriorFinish] = useState(ic.exteriorFinish ?? 'standard')
  const [selectedColor, setSelectedColor] = useState(ic.selectedColor ?? 'pink')
  const [frontStyle, setFrontStyle] = useState(ic.frontStyle ?? 'vnose')
  const [sideDoorsType, setSideDoorsType] = useState(ic.sideDoorsType ?? 'flatpanel')
  const [exteriorBuild, setExteriorBuild] = useState(ic.exteriorBuild ?? 'fullscrewless')
  const [protection, setProtection] = useState(ic.protection ?? 'onepieceroof')
  const [wheel, setWheel] = useState(ic.wheel ?? 'aluminumradial')
  const [spareTire, setSpareTire] = useState(ic.spareTire ?? true)
  const [lugType, setLugType] = useState(ic.lugType ?? '5lug')

  // Interior
  const [floor, setFloor] = useState(ic.floor ?? '34plywood')
  const [walls, setWalls] = useState(ic.walls ?? '38plywood')
  const [ceiling, setCeiling] = useState(ic.ceiling ?? 'thermal')
  const [cabinets, setCabinetsRaw] = useState(ic.cabinets ?? ['vnosebase'])
  const [toolBox, setToolBox] = useState(ic.toolBox ?? 'frontbox')
  const [leftSide, setLeftSide] = useState(ic.leftSide ?? true)
  const [rightSide, setRightSide] = useState(ic.rightSide ?? true)

  // Systems
  const [electrical, setElectrical] = useState(ic.electrical ?? '110v8space')
  const [battery, setBattery] = useState(ic.battery ?? '12vbatterybox')
  const [lights, setLightsRaw] = useState(ic.lights ?? ['dome', 'racing'])
  const [ventilation, setVentilation] = useState(ic.ventilation ?? 'sidewallvents')
  const [climateControl, setClimateControl] = useState(ic.climateControl ?? 'wirebrace')

  // Loading
  const [rampType, setRampType] = useState(ic.rampType ?? 'heavyduty')
  const [atpRamp, setAtpRamp] = useState(ic.atpRamp ?? true)
  const [rearDoor, setRearDoor] = useState(ic.rearDoor ?? true)
  const [tieDowns, setTieDownsRaw] = useState(ic.tieDowns ?? ['drings'])
  const [jacks, setJacksRaw] = useState(ic.jacks ?? ['folddownstabilizer'])

  // Add-Ons
  const [waterPackage, setWaterPackage] = useState(ic.waterPackage ?? 'largewater')
  const [bathroom, setBathroom] = useState(ic.bathroom ?? null)
  const [awning, setAwningRaw] = useState(ic.awning ?? [])

  // Front Style addons (Front Style node graph)
  const [angledLights, setAngledLights] = useState(ic.angledLights ?? false)
  const [stairs, setStairs] = useState(ic.stairs ?? false)
  const [vNoseETrack, setVNoseETrack] = useState(ic.vNoseETrack ?? false)
  const [batteryBox, setBatteryBox] = useState(ic.batteryBox ?? false)

  // Base addons (Base node graph)
  const [escapeDoor, setEscapeDoor] = useState(ic.escapeDoor ?? 'none')
  const [generatorBox, setGeneratorBox] = useState(ic.generatorBox ?? false)

  // Cabinet Addons
  const [winchSystem, setWinchSystem] = useState(ic.winchSystem ?? false)

  // System/Exterior Addons (from Addons node graph)
  const [extendedTripleTongue, setExtendedTripleTongue] = useState(ic.extendedTripleTongue ?? false)
  const [radioPackageSpeaker, setRadioPackageSpeaker] = useState(ic.radioPackageSpeaker ?? false)
  const [rearSpoiler, setRearSpoiler] = useState(ic.rearSpoiler ?? false)

  // Structural / Exterior Addons
  const [ladderRacks, setLadderRacks] = useState(ic.ladderRacks ?? false)
  const [sidewallVents, setSidewallVents] = useState(ic.sidewallVents ?? false)
  const [recessedTireBox, setRecessedTireBox] = useState(ic.recessedTireBox ?? false)
  const [interiorTireMount, setInteriorTireMount] = useState(ic.interiorTireMount ?? false)

  const [showDimensions, setShowDimensions] = useState(false)

  const [visitedTabs, setVisitedTabs] = useState(new Set(['SIZE & CAPACITY']))
  const markTabVisited = useCallback((tab) => setVisitedTabs(prev => new Set([...prev, tab])), [])
  const completionPercent = useMemo(() => Math.round((visitedTabs.size / 6) * 100), [visitedTabs])

  const totalPrice = 106995

  const toggleLight   = useCallback(makeToggle(setLightsRaw),   [])
  const toggleTieDown = useCallback(makeToggle(setTieDownsRaw), [])
  const toggleJack    = useCallback(makeToggle(setJacksRaw),    [])
  const toggleCabinet = useCallback(makeToggle(setCabinetsRaw), [])
  const toggleAwning  = useCallback(makeToggle(setAwningRaw),   [])

  const value = useMemo(() => ({
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
  }), [
    activeTab, viewMode, summaryOpen,
    width, length, interiorHeight, axleAngled, axleAtp, axleRating, spreadAxle,
    exteriorFinish, selectedColor, frontStyle, sideDoorsType, exteriorBuild, protection, wheel, spareTire, lugType,
    floor, walls, ceiling, cabinets, toolBox, leftSide, rightSide,
    electrical, battery, lights, ventilation, climateControl,
    rampType, atpRamp, rearDoor, tieDowns, jacks,
    waterPackage, bathroom, awning,
    angledLights, stairs, vNoseETrack, batteryBox,
    escapeDoor, generatorBox, winchSystem,
    extendedTripleTongue, radioPackageSpeaker, rearSpoiler,
    ladderRacks, sidewallVents, recessedTireBox, interiorTireMount,
    showDimensions, visitedTabs, completionPercent,
    toggleLight, toggleTieDown, toggleJack, toggleCabinet, toggleAwning, markTabVisited,
  ])

  return (
    <ConfiguratorContext.Provider value={value}>
      {children}
    </ConfiguratorContext.Provider>
  )
}

export const useConfigurator = () => useContext(ConfiguratorContext)
