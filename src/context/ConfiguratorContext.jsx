import { createContext, useContext, useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { usePricing } from '../hooks/usePricing'
import { INTERIOR_HEIGHT_OPTIONS } from '../constants/configData'

const makeToggle = (setter) => (id) =>
  setter(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

const ConfiguratorContext = createContext(null)

export function ConfiguratorProvider({ children, initialConfig: ic = {} }) {
  const [activeTab, setActiveTab] = useState('SIZE & CAPACITY')
  const [viewMode, setViewMode] = useState('EXTERIOR')
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [quoteModalOpen, setQuoteModalOpen] = useState(false)
  const [packageId, setPackageId] = useState(ic.packageId ?? null)
  const [focusedCamera, setFocusedCameraName] = useState(null)
  const [focusedCameraTrigger, setFocusedCameraTrigger] = useState(0)

  const setFocusedCamera = useCallback((val) => {
    setFocusedCameraName(val)
    if (val) setFocusedCameraTrigger(t => t + 1)
  }, [])

  const [cameraResetTrigger, setCameraResetTrigger] = useState(0)
  const triggerCameraReset = useCallback(() => setCameraResetTrigger(t => t + 1), [])


  // Size & Capacity
  const [width, setWidth] = useState(ic.width ?? '8.5ft')
  const [length, setLength] = useState(() => {
    const initLen = ic.length ?? '32'
    const isGN = (ic.width === '8.5ftgn') || (ic.frontStyle && ic.frontStyle.toLowerCase().includes('gooseneck'))
    if (isGN && parseInt(initLen, 10) < 28) return '28'
    return initLen
  })
  const [frameSize, setFrameSize] = useState(ic.frameSize ?? '6in')
  const [axleCount, setAxleCount] = useState(ic.axleCount ?? 'tandem')
  const [axleSuspension, setAxleSuspension] = useState(ic.axleSuspension ?? 'torsion')
  const [axleCapacity, setAxleCapacity] = useState(ic.axleCapacity ?? '7000lb')
  const [interiorHeight, setInteriorHeight] = useState(ic.interiorHeight ?? '8ft6')
  const [spreadAxle, setSpreadAxle] = useState(ic.spreadAxle ?? false)

  // Automatically select 'torsion' suspension when spread axle is turned on
  const isFirstSpreadAxle = useRef(true);
  useEffect(() => {
    if (isFirstSpreadAxle.current) {
      isFirstSpreadAxle.current = false;
      return;
    }
    if (spreadAxle) {
      setAxleSuspension('torsion');
    }
  }, [spreadAxle])
  const [axleAngled, setAxleAngled] = useState(ic.axleAngled ?? false)
  const [axleAtp, setAxleAtp] = useState(ic.axleAtp ?? false)
  // axleRating is DERIVED from axleCount + axleSuspension + axleCapacity
  // so the 3-D model (which reads axleRating) stays in sync automatically.
  const axleRating = useMemo(() => {
    return `${axleCapacity}-${axleSuspension}`;
  }, [axleSuspension, axleCapacity])

  // Exterior
  const [exteriorFinish, setExteriorFinish] = useState(ic.exteriorFinish ?? null)
  const [selectedColor, setSelectedColor] = useState(ic.selectedColor ?? 'black')
  const [exteriorAccessories, setExteriorAccessories] = useState(ic.exteriorAccessories && ic.exteriorAccessories !== 'rearwings' ? ic.exteriorAccessories : null)
  const [frontStyle, setFrontStyle] = useState(ic.frontStyle ?? 'vnose24')
  const [roofBuild, setRoofBuild] = useState(ic.roofBuild ?? 'onepieceroof')
  const [protectionType, setProtectionType] = useState(ic.protectionType ?? null)
  const [protectionSize, setProtectionSize] = useState(ic.protectionSize ?? '24')
  const [frontProtection, setFrontProtection] = useState(ic.frontProtection ?? 'polishedcaps')
  const [lugType, setLugType] = useState(ic.lugType ?? '5lug')
  const [tireSize, setTireSize] = useState(ic.tireSize ?? '15')
  const [wheelType, setWheelType] = useState(ic.wheelType ?? 'standardsilver')
  const [spareTire, setSpareTire] = useState(ic.spareTire ?? false)
  const [sideDoorsType, setSideDoorsType] = useState(ic.sideDoorsType ?? 'flatpanel')
  const [driverSideDoor, setDriverSideDoor] = useState(ic.driverSideDoor ?? 'none')
  const [passengerSideDoor, setPassengerSideDoor] = useState(ic.passengerSideDoor ?? '36x72')
  const [sideDoorBarLock, setSideDoorBarLock] = useState(ic.sideDoorBarLock ?? false)

  // Interior
  const [floor, setFloor] = useState(ic.floor ?? '34plywood')
  const [floorOverlay, setFloorOverlay] = useState(ic.floorOverlay && ic.floorOverlay !== 'atp' ? ic.floorOverlay : 'plywood')
  const [floorInsulation, setFloorInsulation] = useState(ic.floorInsulation ?? null)
  const [walls, setWalls] = useState(ic.walls ?? 'white_metal_walls')
  const [ceiling, setCeiling] = useState(ic.ceiling ?? 'white_metal_ceiling')
  const [wallInsulation, setWallInsulation] = useState(ic.wallInsulation ?? null)
  const [ceilingInsulation, setCeilingInsulation] = useState(ic.ceilingInsulation ?? null)
  const [atpWheelWells, setAtpWheelWells] = useState(ic.atpWheelWells ?? false)
  const [cabinets, setCabinetsRaw] = useState(ic.cabinets ?? ['frontbase36'])
  const [blackoutCabinetDoors, setBlackoutCabinetDoors] = useState(ic.blackoutCabinetDoors ?? false)
  const [useCustomCabinetColor, setUseCustomCabinetColor] = useState(ic.useCustomCabinetColor ?? false)
  const [cabinetColor, setCabinetColor] = useState(ic.cabinetColor ?? 'white')

  const [toolBox, setToolBox] = useState(ic.toolBox ?? 'none')
  const [leftSide, setLeftSide] = useState(ic.leftSide ?? true)
  const [rightSide, setRightSide] = useState(ic.rightSide ?? true)

  // Systems
  const [electrical, setElectrical] = useState(ic.electrical ?? 'none')
  const [battery, setBattery] = useState(ic.battery ?? '12vbatterybox')
  const [lights, setLightsRaw] = useState(ic.lights ?? ['dome', 'racing'])
  const [interiorLights, setInteriorLights] = useState(ic.interiorLights ?? { '12vleddome': 1, '12vflatpanel': 0 })
  const [ledRope, setLedRope] = useState(ic.ledRope ?? false)
  const [ventilation, setVentilation] = useState(ic.ventilation ?? 'none')
  const [climateControl, setClimateControl] = useState(ic.climateControl ?? 'none')
  const [acPrep, setAcPrep] = useState(ic.acPrep ?? false)
  const [receptacles, setReceptacles] = useState(ic.receptacles ?? { '110vinterior': 0, '110vgfi': 0 })



  const [exteriorLights, setExteriorLights] = useState(ic.exteriorLights ?? [])

  // Loading
  const [rampType, setRampType] = useState(ic.rampType ?? 'doublereardoors')
  const [atpRamp, setAtpRamp] = useState(ic.atpRamp ?? false)



  const [rearDoor, setRearDoor] = useState(ic.rearDoor ?? true)
  const [tieDowns, setTieDownsRaw] = useState(() => (ic.tieDowns ? ic.tieDowns.filter(t => t !== 'drings') : []))
  const [dRings, setDRings] = useState(() => {
    const initial = ic.dRings ? { ...ic.dRings } : {};
    delete initial.drings;
    delete initial.walldrings;
    const hasFloor = ic.tieDowns?.includes('floordrings');
    return {
      floordrings: initial.floordrings !== undefined ? initial.floordrings : (hasFloor ? 1 : 0),
    };
  })
  const [eTracks, setETracks] = useState(() => {
    const fromIc = ic.eTracks || {};
    return {
      wall: fromIc.wall !== undefined ? fromIc.wall : (ic.tieDowns?.includes('wall') ? 1 : 0),
      floor: fromIc.floor !== undefined ? fromIc.floor : (ic.tieDowns?.includes('floor') ? 1 : 0),
    };
  })
  const [jacks, setJacksRaw] = useState(ic.jacks ?? [])

  // Add-Ons
  const [waterPackage, setWaterPackage] = useState(ic.waterPackage ?? 'largewater')
  const [bathroom, setBathroom] = useState(ic.bathroom ?? null)
  const [awning, setAwningRaw] = useState(ic.awning ?? [])
  const [sinkPackage, setSinkPackage] = useState(ic.sinkPackage ?? null)

  // Front Style addons (Front Style node graph)
  const [angledLights, setAngledLights] = useState(ic.angledLights ?? false)
  const [stairs, setStairs] = useState(ic.stairs ?? false)
  const [vNoseETrack, setVNoseETrack] = useState(ic.vNoseETrack ?? false)
  const [batteryBox, setBatteryBox] = useState(ic.batteryBox ?? false)
  const [lShapeCounter, setLShapeCounter] = useState(ic.lShapeCounter ?? false)
  const [genDoor, setGenDoor] = useState(ic.genDoor ?? false)

  // Base addons (Base node graph)
  const [escapeDoor, setEscapeDoor] = useState(ic.escapeDoor ?? 'none')
  const [concessionDoor, setConcessionDoor] = useState(ic.concessionDoor ?? 'none')
  const [glassScreen, setGlassScreen] = useState(ic.glassScreen ?? false)
  const [generatorBox, setGeneratorBox] = useState(ic.generatorBox ?? 'none')
  const [concessionWidth, setConcessionWidth] = useState(ic.concessionWidth ?? '72in')
  const [concessionHeight, setConcessionHeight] = useState(ic.concessionHeight ?? '36in')
  const [windows, setWindows] = useState(ic.windows ?? {
    vertical: 0,
    horizontal: 0,
    egress: 0,
  })
  const [windowSizes, setWindowSizes] = useState(ic.windowSizes ?? {
    vertical: '15x30',
    horizontal: '50x30',
    egress: '30x30',
  })

  // Cabinet Addons
  const [winchSystem, setWinchSystem] = useState(ic.winchSystem ?? false)

  // Height auto assignments
  const isFirstHeightRender = useRef(true);
  useEffect(() => {
    const heightIndex = INTERIOR_HEIGHT_OPTIONS.findIndex(o => o.id === interiorHeight);
    if (heightIndex >= 2) {
      setRampType('superduty');
    }

  }, [interiorHeight, setRampType]);

  // Awning length clamping based on trailer length
  useEffect(() => {
    if (!length || !awning || awning.length === 0) return;
    const trailerLen = parseInt(length);
    const currentAwning = parseInt(awning[0]);
    
    const isInvalid = currentAwning > trailerLen || 
                      (currentAwning >= 24 && trailerLen < 32) || 
                      (currentAwning >= 18 && currentAwning <= 22 && trailerLen <= 28) ||
                      (currentAwning === 16 && trailerLen <= 26);
                      
    if (isInvalid) {
      const validOptions = [8, 10, 12, 14, 16, 18, 20, 22, 24].filter(v => {
        if (v >= 24 && trailerLen < 32) return false;
        if (v >= 18 && v <= 22 && trailerLen <= 28) return false;
        if (v === 16 && trailerLen <= 26) return false;
        return v <= trailerLen;
      });
      if (validOptions.length > 0) {
        setAwningRaw([`${validOptions[validOptions.length - 1]}ft`]);
      } else {
        setAwningRaw([]);
      }
    }
  }, [length, awning, setAwningRaw]);

  // System/Exterior Addons (from Addons node graph)
  const [extendedTripleTongue, setExtendedTripleTongue] = useState(ic.extendedTripleTongue ?? false)
  const [radioPackageSpeaker, setRadioPackageSpeaker] = useState(ic.radioPackageSpeaker ?? false)
  const [rearSpoiler, setRearSpoiler] = useState(ic.rearSpoiler ?? false)

  // Structural / Exterior Addons
  const [ladderRacks, setLadderRacks] = useState(ic.ladderRacks ?? false)
  const [sidewallVents, setSidewallVents] = useState(ic.sidewallVents ?? false)
  const [recessedTireBox, setRecessedTireBox] = useState(ic.recessedTireBox ?? true)
  const [interiorTireMount, setInteriorTireMount] = useState(ic.interiorTireMount ?? false)

  const [showDimensions, setShowDimensions] = useState(false)

  // Door vs Cabinet conflict resolution (Always active across all panels)
  useEffect(() => {
    const hasPassengerDoor = (passengerSideDoor && passengerSideDoor !== 'none');
    const hasDriverSideConflict = (driverSideDoor && driverSideDoor !== 'none');
    
    if (hasPassengerDoor && cabinets.includes('fullheight')) {
      setCabinetsRaw(prev => prev.filter(c => c !== 'fullheight'));
    }

    // (Removed auto-stripping of wallrun cabinets on driverSideDoor per user request)

    // (Removed auto-stripping of wallrun cabinets on length < 24 to preserve user selection)

    // (Removed auto-stripping of wallrun cabinets on genDoor/escapeDoor/concessionDoor per user request)

    const hasWheelWallConflict =
      (escapeDoor && escapeDoor !== 'none') ||
      (concessionDoor === 'driver');

    if (hasWheelWallConflict && cabinets.includes('wheelwallcabinet')) {
      setCabinetsRaw(prev => prev.filter(c => c !== 'wheelwallcabinet'));
    }
  }, [driverSideDoor, passengerSideDoor, escapeDoor, concessionDoor, genDoor, length, cabinets, setCabinetsRaw]);


  // Windows & Doors conflict resolution
  useEffect(() => {
    if (concessionDoor === 'driver' && escapeDoor !== 'none') {
      setEscapeDoor('none');
    }
    if (escapeDoor !== 'none' && concessionDoor === 'driver') {
      setConcessionDoor('none');
    }
    if (concessionDoor === 'passenger') {
      if (windows.vertical > 0 || windows.horizontal > 0 || windows.egress > 0) {
        setWindows({ vertical: 0, horizontal: 0, egress: 0 });
      }
    }
    if (concessionDoor === 'none' && glassScreen) {
      setGlassScreen(false);
    }
  }, [concessionDoor, escapeDoor, windows, glassScreen, setEscapeDoor, setConcessionDoor, setWindows, setGlassScreen]);

  // Awning vs Concession Width conflict resolution
  useEffect(() => {
    if (awning?.length > 0 && awning[0] === '8ft' && concessionWidth === '96in') {
      setConcessionWidth('72in');
    }
  }, [awning, concessionWidth, setConcessionWidth]);

  // Jacks conflict resolution
  useEffect(() => {
    const isGooseneck = width === '8.5ftgn' || (frontStyle && frontStyle.toLowerCase().includes('gooseneck'));
    if (isGooseneck && jacks.includes('5000relectric')) {
      setJacksRaw(prev => prev.filter(j => j !== '5000relectric'));
    }
  }, [width, frontStyle, jacks, setJacksRaw]);

  // Gooseneck minimum length enforcement (shortest length is 28)
  useEffect(() => {
    const isGooseneck = width === '8.5ftgn' || (frontStyle && frontStyle.toLowerCase().includes('gooseneck'));
    if (isGooseneck && parseInt(length, 10) < 28) {
      setLength('28');
    }
  }, [width, frontStyle, length]);

  // Triple axle is not available on 7ft trailers
  useEffect(() => {
    if (width === '7ft' && axleCount === 'triple') {
      setAxleCount('tandem');
    }
  }, [width, axleCount]);

  const [visitedTabs, setVisitedTabs] = useState(new Set(['SIZE & CAPACITY']))
  const markTabVisited = useCallback((tab) => setVisitedTabs(prev => new Set([...prev, tab])), [])
  const completionPercent = useMemo(() => Math.round((visitedTabs.size / 6) * 100), [visitedTabs])

  const pricing = usePricing({
    width, length, interiorHeight, axleAtp, axleCount, axleSuspension, axleCapacity, spreadAxle,
    electrical, battery, ventilation, climateControl, rampType, atpRamp,
    sideDoorsType, lights, interiorLights, exteriorLights, receptacles, tieDowns, jacks,
    waterPackage, bathroom, stairs, angledLights, vNoseETrack, batteryBox, sinkPackage,
    escapeDoor, generatorBox, winchSystem, extendedTripleTongue, radioPackageSpeaker,
    rearSpoiler, ladderRacks, sidewallVents, recessedTireBox, interiorTireMount,
    exteriorFinish, exteriorAccessories, frontStyle, roofBuild,
    protectionType, protectionSize, frontProtection, lugType, tireSize, wheelType,
    spareTire, floor, floorOverlay, floorInsulation, walls, ceiling, wallInsulation, ceilingInsulation, atpWheelWells, cabinets, toolBox, dRings, eTracks,
    windows, acPrep, sideDoorBarLock, driverSideDoor, passengerSideDoor,
    concessionDoor, glassScreen, concessionWidth, concessionHeight
  })

  const totalPrice = pricing.totalPrice

  const toggleLight   = useCallback(makeToggle(setLightsRaw),   [])
  const toggleTieDown = useCallback(makeToggle(setTieDownsRaw), [])
  const toggleJack    = useCallback(makeToggle(setJacksRaw),    [])
  const toggleCabinet = useCallback(makeToggle(setCabinetsRaw), [])
  const toggleAwning  = useCallback(makeToggle(setAwningRaw),   [])

  const applyPackage = useCallback((pkgId, pkgConfig) => {
    setPackageId(pkgId);
    setExteriorAccessories(pkgConfig.exteriorAccessories ?? null);
    setRearSpoiler(pkgConfig.rearSpoiler ?? false);
    setWheelType(pkgConfig.wheelType ?? 'standardsilver');
    setAngledLights(pkgConfig.angledLights ?? false);
    setExteriorFinish(pkgConfig.exteriorFinish ?? null);
    
    // if (pkgConfig.exteriorFinish === 'blackout') {
    //   setSelectedColor('black');
    // } else {
    //   setSelectedColor('brandywine');
    // }

    const pkgTieDowns = (pkgConfig.tieDowns ?? []).filter(t => t !== 'drings');
    setTieDownsRaw(pkgTieDowns);
    setETracks(pkgConfig.eTracks ?? {
      wall: pkgTieDowns.includes('wall') ? 1 : 0,
      floor: pkgTieDowns.includes('floor') ? 1 : 0,
    });
    setDRings(pkgConfig.dRings ?? {
      floordrings: pkgTieDowns.includes('floordrings') ? 1 : 0,
    });
    setSpreadAxle(pkgConfig.spreadAxle ?? false);
    setAxleCapacity(pkgConfig.axleCapacity ?? '3500lb');
    setAxleSuspension(pkgConfig.axleSuspension ?? 'torsion');
    setCabinetsRaw(pkgConfig.cabinets ?? ['frontbase36']);
    setJacksRaw(pkgConfig.jacks ?? []);
    setElectrical(pkgConfig.electrical ?? '110v8space');
    setRecessedTireBox(pkgConfig.recessedTireBox ?? false);
    setClimateControl(pkgConfig.climateControl ?? 'none');
    setWalls(pkgConfig.walls ?? 'white_metal_walls');
    setCeiling(pkgConfig.ceiling ?? 'white_metal_ceiling');
  }, []);

  const value = useMemo(() => ({
    packageId, setPackageId, applyPackage,
    focusedCamera, setFocusedCamera, focusedCameraTrigger,
    cameraResetTrigger, triggerCameraReset,
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
    axleAngled, setAxleAngled,
    axleAtp, setAxleAtp,
    axleRating,
    exteriorFinish, setExteriorFinish,
    selectedColor, setSelectedColor,
    exteriorAccessories, setExteriorAccessories,
    frontStyle, setFrontStyle,
    roofBuild, setRoofBuild,
    protectionType, setProtectionType,
    protectionSize, setProtectionSize,
    frontProtection, setFrontProtection,
    lugType, setLugType,
    tireSize, setTireSize,
    wheelType, setWheelType,
    spareTire, setSpareTire,
    sideDoorsType, setSideDoorsType,
    driverSideDoor, setDriverSideDoor,
    passengerSideDoor, setPassengerSideDoor,
    sideDoorBarLock, setSideDoorBarLock,
    floor, setFloor,
    floorOverlay, setFloorOverlay,
    floorInsulation, setFloorInsulation,
    walls, setWalls,
    ceiling, setCeiling,
    wallInsulation, setWallInsulation,
    ceilingInsulation, setCeilingInsulation,
    atpWheelWells, setAtpWheelWells,
    cabinets, setCabinetsRaw, toggleCabinet,
    blackoutCabinetDoors, setBlackoutCabinetDoors,
    useCustomCabinetColor, setUseCustomCabinetColor,
    cabinetColor, setCabinetColor,
    toolBox, setToolBox,
    leftSide, setLeftSide,
    rightSide, setRightSide,
    electrical, setElectrical,
    battery, setBattery,
    lights, setLightsRaw, toggleLight,
    interiorLights, setInteriorLights,
    exteriorLights, setExteriorLights,
    ledRope, setLedRope,
    ventilation, setVentilation,
    climateControl, setClimateControl,
    acPrep, setAcPrep,
    receptacles, setReceptacles,
    rampType, setRampType,
    atpRamp, setAtpRamp,
    rearDoor, setRearDoor,
    tieDowns, setTieDownsRaw, toggleTieDown,
    dRings, setDRings,
    eTracks, setETracks,
    jacks, setJacksRaw, toggleJack,
    waterPackage, setWaterPackage,
    bathroom, setBathroom,
    awning, setAwningRaw, toggleAwning,
    sinkPackage, setSinkPackage,
    angledLights, setAngledLights,
    stairs, setStairs,
    vNoseETrack, setVNoseETrack,
    batteryBox, setBatteryBox,
    escapeDoor, setEscapeDoor,
    concessionDoor, setConcessionDoor,
    glassScreen, setGlassScreen,
    generatorBox, setGeneratorBox,
    concessionWidth, setConcessionWidth,
    concessionHeight, setConcessionHeight,
    lShapeCounter, setLShapeCounter,
    genDoor, setGenDoor,
    windows, setWindows,
    windowSizes, setWindowSizes,
    winchSystem, setWinchSystem,
    extendedTripleTongue, setExtendedTripleTongue,
    radioPackageSpeaker, setRadioPackageSpeaker,
    rearSpoiler, setRearSpoiler,
    ladderRacks, setLadderRacks,
    sidewallVents, setSidewallVents,
    recessedTireBox, setRecessedTireBox,
    interiorTireMount, setInteriorTireMount,
    showDimensions, setShowDimensions,
    pricing,
    totalPrice,
    completionPercent, markTabVisited,
    quoteModalOpen, setQuoteModalOpen,
  }), [
    packageId, applyPackage, activeTab, viewMode, summaryOpen, quoteModalOpen, focusedCamera, cameraResetTrigger, triggerCameraReset,
    width, length, frameSize, axleCount, axleSuspension, axleCapacity, interiorHeight,
    spreadAxle, axleAngled, axleAtp, axleRating,
    exteriorFinish, selectedColor, exteriorAccessories, frontStyle, sideDoorsType, driverSideDoor, passengerSideDoor, sideDoorBarLock, roofBuild, protectionType, protectionSize, frontProtection, lugType, tireSize, wheelType, spareTire,
    floor, floorOverlay, floorInsulation, walls, ceiling, wallInsulation, ceilingInsulation, atpWheelWells, cabinets, blackoutCabinetDoors, useCustomCabinetColor, cabinetColor, toolBox, leftSide, rightSide,
    electrical, battery, lights, interiorLights, exteriorLights, ledRope, ventilation, climateControl, acPrep, receptacles,
    rampType, atpRamp, rearDoor, tieDowns, dRings, eTracks, jacks,
    waterPackage, bathroom, awning, sinkPackage,
    angledLights, stairs, vNoseETrack, batteryBox,
    escapeDoor, concessionDoor, glassScreen, generatorBox, concessionWidth, concessionHeight, lShapeCounter, genDoor, winchSystem,
    windows, windowSizes,
    extendedTripleTongue, radioPackageSpeaker, rearSpoiler,
    ladderRacks, sidewallVents, recessedTireBox, interiorTireMount,
    showDimensions, visitedTabs, completionPercent, pricing, totalPrice,
    toggleLight, toggleTieDown, toggleJack, toggleCabinet, toggleAwning, markTabVisited,
  ])

  return (
    <ConfiguratorContext.Provider value={value}>
      {children}
    </ConfiguratorContext.Provider>
  )
}

export const useConfigurator = () => useContext(ConfiguratorContext)
