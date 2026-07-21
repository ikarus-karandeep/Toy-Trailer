import { createContext, useContext, useState, useMemo, useCallback } from 'react'

const makeToggle = (setter) => (id) =>
  setter(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

const ConfiguratorContext = createContext(null)

export function ConfiguratorProvider({ children, initialConfig: ic = {} }) {
  const [activeTab, setActiveTab] = useState('SIZE & CAPACITY')
  const [viewMode, setViewMode] = useState('EXTERIOR')
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [packageId] = useState(ic.packageId ?? null)

  // Size & Capacity
  const [width, setWidth] = useState(ic.width ?? '7ft')
  const [length, setLength] = useState(ic.length ?? '32')
  const [frameSize, setFrameSize] = useState(ic.frameSize ?? '6in')
  const [axleCount, setAxleCount] = useState(ic.axleCount ?? 'tandem')
  const [axleSuspension, setAxleSuspension] = useState(ic.axleSuspension ?? 'torsion')
  const [axleCapacity, setAxleCapacity] = useState(ic.axleCapacity ?? '3500lb')
  const [interiorHeight, setInteriorHeight] = useState(ic.interiorHeight ?? '7ft0')
  const [spreadAxle, setSpreadAxle] = useState(ic.spreadAxle ?? true)
  const [narrowTrackAxle, setNarrowTrackAxle] = useState(ic.narrowTrackAxle ?? false)
  const [axleAngled, setAxleAngled] = useState(ic.axleAngled ?? false)
  const [axleAtp, setAxleAtp] = useState(ic.axleAtp ?? true)
  // axleRating is DERIVED from axleCount + axleSuspension + axleCapacity
  // so the 3-D model (which reads axleRating) stays in sync automatically.
  const axleRating = useMemo(() => {
    if (axleCount === 'triple') return '10000lbtandem'
    if (axleCapacity === '7000lb') return 'torsion' === axleSuspension ? '8000torsion16k' : '8000torsion16k'
    if (axleCapacity === '6000lb') return axleSuspension === 'dropspring' ? '7000dropspring' : '7000torsion'
    // 3500lb
    return axleSuspension === 'dropspring' ? '5200leafspring' : '5200torsion'
  }, [axleCount, axleSuspension, axleCapacity])

  // Exterior
  const [exteriorFinish, setExteriorFinish] = useState(ic.exteriorFinish ?? 'blackout')
  const [selectedColor, setSelectedColor] = useState(ic.selectedColor ?? 'pewter')
  const [exteriorAccessories, setExteriorAccessories] = useState(ic.exteriorAccessories ?? 'rearwingspoiler')
  const [frontStyle, setFrontStyle] = useState(ic.frontStyle ?? 'vnose24')
  const [exteriorBuild, setExteriorBuild] = useState(ic.exteriorBuild ?? 'semiscrewed')
  const [roofBuild, setRoofBuild] = useState(ic.roofBuild ?? 'onepieceroof')
  const [protectionType, setProtectionType] = useState(ic.protectionType ?? 'atp')
  const [protectionSize, setProtectionSize] = useState(ic.protectionSize ?? '12')
  const [frontProtection, setFrontProtection] = useState(ic.frontProtection ?? 'polishedcaps')
  const [lugType, setLugType] = useState(ic.lugType ?? '5lug')
  const [tireSize, setTireSize] = useState(ic.tireSize ?? '15')
  const [wheelType, setWheelType] = useState(ic.wheelType ?? 'standardsilver')
  const [spareTire, setSpareTire] = useState(ic.spareTire ?? true)
  const [sideDoorsType, setSideDoorsType] = useState(ic.sideDoorsType ?? 'flatpanel')

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
  const [rampType, setRampType] = useState(ic.rampType ?? 'barndoors')
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
    packageId,
    activeTab, setActiveTab,
    viewMode, setViewMode,
    summaryOpen, setSummaryOpen,
    width, setWidth,
    length, setLength,
    frameSize, setFrameSize,
    axleCount, setAxleCount,
    axleSuspension, setAxleSuspension,
    axleCapacity, setAxleCapacity,
    interiorHeight, setInteriorHeight,
    spreadAxle, setSpreadAxle,
    narrowTrackAxle, setNarrowTrackAxle,
    axleAngled, setAxleAngled,
    axleAtp, setAxleAtp,
    axleRating,
    exteriorFinish, setExteriorFinish,
    selectedColor, setSelectedColor,
    exteriorAccessories, setExteriorAccessories,
    frontStyle, setFrontStyle,
    exteriorBuild, setExteriorBuild,
    roofBuild, setRoofBuild,
    protectionType, setProtectionType,
    protectionSize, setProtectionSize,
    frontProtection, setFrontProtection,
    lugType, setLugType,
    tireSize, setTireSize,
    wheelType, setWheelType,
    spareTire, setSpareTire,
    sideDoorsType, setSideDoorsType,
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
    packageId, activeTab, viewMode, summaryOpen,
    width, length, frameSize, axleCount, axleSuspension, axleCapacity, interiorHeight,
    spreadAxle, narrowTrackAxle, axleAngled, axleAtp, axleRating,
    exteriorFinish, selectedColor, exteriorAccessories, frontStyle, sideDoorsType, exteriorBuild, roofBuild, protectionType, protectionSize, frontProtection, lugType, tireSize, wheelType, spareTire,
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
