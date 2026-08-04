import { useMemo } from 'react';
import {
  WIDTH_OPTIONS, LENGTH_OPTIONS, INTERIOR_HEIGHT_OPTIONS,
  AXLE_SUSPENSION_OPTIONS, AXLE_CAPACITY_OPTIONS,
  ELECTRICAL_OPTIONS, OFF_GRID_POWER_OPTIONS, INTERIOR_LIGHTING_OPTIONS, EXTERIOR_LIGHTING_OPTIONS,
  PASSIVE_VENTILATION_OPTIONS, CLIMATE_CONTROL_OPTIONS, ROOFTOP_AC_OPTIONS, MINI_SPLIT_OPTIONS,
  REAR_ENTRANCE_OPTIONS, D_RINGS_OPTIONS, ADDITIONAL_D_RINGS_OPTIONS, E_TRACKS_OPTIONS, JACKS_OPTIONS,
  BATHROOM_PACKAGE_OPTIONS,
  EXTERIOR_FINISH_OPTIONS, COLOR_OPTIONS, FRONT_STYLE_OPTIONS, EXTERIOR_BUILD_OPTIONS,
  PROTECTION_TYPE_OPTIONS, PROTECTION_SIZE_OPTIONS, FRONT_PROTECTION_OPTIONS,
  WHEEL_TYPE_OPTIONS, FLOOR_MATERIAL_OPTIONS, FLOOR_OVERLAY_OPTIONS, FLOOR_INSULATION_OPTIONS,
  WALL_MATERIAL_OPTIONS, WALL_INSULATION_OPTIONS, CEILING_MATERIAL_OPTIONS, CEILING_INSULATION_OPTIONS,
  BASE_CABINET_OPTIONS, OVERHEAD_CABINET_OPTIONS, FULL_HEIGHT_CABINET_OPTIONS, WHEEL_WALL_CABINET_OPTIONS, TOOL_BOX_OPTIONS,
  SIDE_DOOR_OPTIONS, ROOF_BUILD_OPTIONS, LUG_OPTIONS, TIRE_SIZE_OPTIONS, WATER_PACKAGE_OPTIONS, EXTERIOR_ACCESSORIES_OPTIONS,
  ESCAPE_DOOR_SIZE_OPTIONS
} from '../constants/configData';

const LIGHT_OPTIONS = [...INTERIOR_LIGHTING_OPTIONS, ...EXTERIOR_LIGHTING_OPTIONS];
const VENTILATION_OPTIONS = PASSIVE_VENTILATION_OPTIONS;
const CLIMATE_OPTIONS = [...CLIMATE_CONTROL_OPTIONS, ...ROOFTOP_AC_OPTIONS, ...MINI_SPLIT_OPTIONS];
const RAMP_OPTIONS = REAR_ENTRANCE_OPTIONS;
const TIE_DOWN_OPTIONS = [...D_RINGS_OPTIONS, ...ADDITIONAL_D_RINGS_OPTIONS, ...E_TRACKS_OPTIONS];
const PROTECTION_OPTIONS = [...PROTECTION_TYPE_OPTIONS, ...PROTECTION_SIZE_OPTIONS, ...FRONT_PROTECTION_OPTIONS];
const WHEEL_OPTIONS = WHEEL_TYPE_OPTIONS;
const FLOOR_OPTIONS = [...FLOOR_MATERIAL_OPTIONS, ...FLOOR_OVERLAY_OPTIONS, ...FLOOR_INSULATION_OPTIONS];
const WALL_OPTIONS = [...WALL_MATERIAL_OPTIONS, ...WALL_INSULATION_OPTIONS];
const CEILING_OPTIONS = [...CEILING_MATERIAL_OPTIONS, ...CEILING_INSULATION_OPTIONS];
const CABINET_OPTIONS = [...BASE_CABINET_OPTIONS, ...OVERHEAD_CABINET_OPTIONS, ...FULL_HEIGHT_CABINET_OPTIONS, ...WHEEL_WALL_CABINET_OPTIONS];
const BATTERY_OPTIONS = OFF_GRID_POWER_OPTIONS;
const BATHROOM_OPTIONS = BATHROOM_PACKAGE_OPTIONS;

const findPrice = (opts, id) => {
  const o = opts.find(x => x.id === id);
  return o && typeof o.price === 'number' ? o.price : 0;
};

export function usePricing(ctx) {
  return useMemo(() => {
    let trailerBuild = 18000; // Base price
    let configurations = 0;
    let appearance = 0;

    // TRAILER BUILD
    trailerBuild += findPrice(WIDTH_OPTIONS, ctx.width);
    trailerBuild += findPrice(LENGTH_OPTIONS, ctx.length);
    trailerBuild += findPrice(INTERIOR_HEIGHT_OPTIONS, ctx.interiorHeight);
    trailerBuild += (ctx.axleAtp ? 9999 : 0);
    trailerBuild += findPrice(AXLE_SUSPENSION_OPTIONS, ctx.axleSuspension);
    trailerBuild += findPrice(AXLE_CAPACITY_OPTIONS, ctx.axleCapacity);

    // CONFIGURATIONS (Systems & Loading & Add-ons)
    configurations += findPrice(ELECTRICAL_OPTIONS, ctx.electrical);
    configurations += findPrice(BATTERY_OPTIONS, ctx.battery);
    configurations += findPrice(VENTILATION_OPTIONS, ctx.ventilation);
    configurations += findPrice(CLIMATE_OPTIONS, ctx.climateControl);
    if (ctx.acPrep) configurations += 70;
    configurations += findPrice(RAMP_OPTIONS, ctx.rampType);
    if (ctx.atpRamp) configurations += 400;
    configurations += findPrice(SIDE_DOOR_OPTIONS, ctx.sideDoorsType);
    
    // Side Doors Pricing (Driver/Passenger strict assignments)
    if (ctx.driverSideDoor === '48x78') configurations += 120;
    
    if (ctx.passengerSideDoor === '36x78' || ctx.passengerSideDoor === '36x72') configurations += 295;
    else if (ctx.passengerSideDoor === '48x78') configurations += 335;

    if (ctx.sideDoorBarLock) configurations += 60;

    if (ctx.lights) {
      ctx.lights.forEach(id => { configurations += findPrice(LIGHT_OPTIONS, id); });
    }
    if (ctx.tieDowns) {
      ctx.tieDowns.forEach(id => { 
        let price = findPrice(TIE_DOWN_OPTIONS, id);
        if (id === 'wall' || id === 'floor') {
          const len = parseInt(ctx.length) || 0;
          price *= len;
        } else if (ctx.dRings && typeof ctx.dRings[id] === 'number' && ctx.dRings[id] > 0) {
          price *= ctx.dRings[id];
        }
        configurations += price; 
      });
    }
    if (ctx.jacks) {
      ctx.jacks.forEach(id => { configurations += findPrice(JACKS_OPTIONS, id); });
    }

    // Add-ons
    configurations += findPrice(WATER_PACKAGE_OPTIONS, ctx.waterPackage);
    configurations += findPrice(BATHROOM_OPTIONS, ctx.bathroom);
    if (ctx.stairs) configurations += 150;
    if (ctx.angledLights) configurations += 200;
    if (ctx.vNoseETrack) configurations += 100;
    if (ctx.batteryBox) configurations += 120;
    configurations += findPrice(ESCAPE_DOOR_SIZE_OPTIONS, ctx.escapeDoor);
    
    const isConcessionPriced = ctx.concessionDoor && ctx.concessionDoor !== 'none'
                            && ctx.glassScreen
                            && ctx.concessionWidth === '72in'
                            && ctx.concessionHeight === '36in';
    if (isConcessionPriced) configurations += 1250;
    
    if (ctx.generatorBox && ctx.generatorBox !== 'none') configurations += 500;
    if (ctx.winchSystem) configurations += 1000;
    if (ctx.extendedTripleTongue) configurations += 400;
    if (ctx.radioPackageSpeaker) configurations += 600;
    if (ctx.rearSpoiler) configurations += 300;
    if (ctx.ladderRacks) configurations += 250;
    if (ctx.sidewallVents) configurations += 150;
    if (ctx.recessedTireBox) configurations += 200;
    if (ctx.interiorTireMount) configurations += 100;

    // APPEARANCE
    appearance += findPrice(EXTERIOR_FINISH_OPTIONS, ctx.exteriorFinish);
    appearance += findPrice(EXTERIOR_ACCESSORIES_OPTIONS, ctx.exteriorAccessories);
    appearance += findPrice(FRONT_STYLE_OPTIONS, ctx.frontStyle);
    appearance += findPrice(EXTERIOR_BUILD_OPTIONS, ctx.exteriorBuild);
    appearance += findPrice(ROOF_BUILD_OPTIONS, ctx.roofBuild);
    appearance += findPrice(PROTECTION_OPTIONS, ctx.protectionType);
    appearance += findPrice(PROTECTION_OPTIONS, ctx.protectionSize);
    appearance += findPrice(PROTECTION_OPTIONS, ctx.frontProtection);
    appearance += findPrice(LUG_OPTIONS, ctx.lugType);
    appearance += findPrice(TIRE_SIZE_OPTIONS, ctx.tireSize);
    appearance += findPrice(WHEEL_OPTIONS, ctx.wheelType);
    if (ctx.spareTire) appearance += 250;
    appearance += findPrice(FLOOR_OPTIONS, ctx.floor);
    appearance += findPrice(WALL_OPTIONS, ctx.walls);
    appearance += findPrice(CEILING_OPTIONS, ctx.ceiling);
    
    if (ctx.cabinets) {
      ctx.cabinets.forEach(id => { 
        let price = findPrice(CABINET_OPTIONS, id);
        if (id === 'wallrun36' || id === 'wallrun16') {
          price *= parseInt(ctx.length) || 0;
        } else if (id === 'wheelwallcabinet') {
          price = (ctx.axleCount === 'triple') ? 1890 : 1620;
        } else if (id === 'frontbase36' || id === 'frontoverhead16') {
          const isVNose = ctx.frontStyle && ctx.frontStyle !== 'flatfront';
          if (!isVNose) price = 0;
        }
        appearance += price; 
      });
    }
    appearance += findPrice(TOOL_BOX_OPTIONS, ctx.toolBox);

    const totalPrice = trailerBuild + configurations + appearance;

    return {
      trailerBuild,
      configurations,
      appearance,
      totalPrice
    };
  }, [
    ctx.width, ctx.length, ctx.interiorHeight, ctx.axleAtp, ctx.axleCount, ctx.axleSuspension, ctx.axleCapacity,
    ctx.electrical, ctx.battery, ctx.ventilation, ctx.climateControl, ctx.acPrep, ctx.rampType, ctx.atpRamp,
    ctx.sideDoorsType, ctx.lights, ctx.tieDowns, ctx.jacks,
    ctx.waterPackage, ctx.bathroom, ctx.stairs, ctx.angledLights, ctx.vNoseETrack, ctx.batteryBox,
    ctx.escapeDoor, ctx.generatorBox, ctx.winchSystem, ctx.extendedTripleTongue, ctx.radioPackageSpeaker,
    ctx.rearSpoiler, ctx.ladderRacks, ctx.sidewallVents, ctx.recessedTireBox, ctx.interiorTireMount,
    ctx.exteriorFinish, ctx.exteriorAccessories, ctx.frontStyle, ctx.exteriorBuild, ctx.roofBuild,
    ctx.protectionType, ctx.protectionSize, ctx.frontProtection, ctx.lugType, ctx.tireSize, ctx.wheelType,
    ctx.spareTire, ctx.floor, ctx.walls, ctx.ceiling, ctx.cabinets, ctx.toolBox, ctx.dRings,
    ctx.driverSideDoor, ctx.passengerSideDoor, ctx.sideDoorBarLock, ctx.concessionDoor,
    ctx.glassScreen, ctx.concessionWidth, ctx.concessionHeight
  ]);
}
