import { useMemo } from 'react';
import {
  WIDTH_OPTIONS, LENGTH_OPTIONS, INTERIOR_HEIGHT_OPTIONS,
  AXLE_SUSPENSION_OPTIONS, AXLE_CAPACITY_OPTIONS,
  ELECTRICAL_OPTIONS, OFF_GRID_POWER_OPTIONS, INTERIOR_LIGHTING_OPTIONS, EXTERIOR_LIGHTING_OPTIONS,
  RECEPTACLE_OPTIONS,
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

    
    // Side Doors Pricing (Driver/Passenger strict assignments)
    if (ctx.driverSideDoor === '48x78') configurations += 120;
    
    if (ctx.passengerSideDoor === '36x78' || ctx.passengerSideDoor === '36x72') configurations += 295;
    else if (ctx.passengerSideDoor === '48x78') configurations += 335;

    if (ctx.sideDoorBarLock) configurations += 60;

    if (ctx.lights) {
      const interiorLightIds = new Set(Object.keys(ctx.interiorLights || {}));
      const exteriorLightIds = new Set(ctx.exteriorLights || []);
      ctx.lights.forEach(id => { 
        if (!interiorLightIds.has(id) && !exteriorLightIds.has(id)) {
          configurations += findPrice(LIGHT_OPTIONS, id); 
        }
      });
    }
    // interiorLights: quantity-based (id -> qty object)
    if (ctx.interiorLights) {
      Object.entries(ctx.interiorLights).forEach(([id, qty]) => {
        if (qty > 0) {
          const opt = INTERIOR_LIGHTING_OPTIONS.find(o => o.id === id);
          if (opt && typeof opt.price === 'number') configurations += opt.price * qty;
        }
      });
    }
    // exteriorLights: boolean array
    if (ctx.exteriorLights) {
      ctx.exteriorLights.forEach(id => {
        const opt = EXTERIOR_LIGHTING_OPTIONS.find(o => o.id === id);
        if (opt && typeof opt.price === 'number') configurations += opt.price;
      });
    }
    // receptacles: quantity-based (id -> qty object)
    if (ctx.receptacles) {
      Object.entries(ctx.receptacles).forEach(([id, qty]) => {
        if (qty > 0) {
          const opt = RECEPTACLE_OPTIONS.find(o => o.id === id);
          if (opt && typeof opt.price === 'number') configurations += opt.price * qty;
        }
      });
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
    if (ctx.batteryBox) configurations += 120;
    configurations += findPrice(ESCAPE_DOOR_SIZE_OPTIONS, ctx.escapeDoor);
    
    const isConcessionPriced = ctx.concessionDoor && ctx.concessionDoor !== 'none'
                            && ctx.glassScreen
                            && ctx.concessionWidth === '72in'
                            && ctx.concessionHeight === '36in';
    if (isConcessionPriced) configurations += 1250;
    
    if (ctx.generatorBox && ctx.generatorBox !== 'none') configurations += 500;
    if (ctx.ladderRacks) configurations += 250;
    if (ctx.recessedTireBox) configurations += 200;


    // APPEARANCE
    let exteriorFinishPrice = findPrice(EXTERIOR_FINISH_OPTIONS, ctx.exteriorFinish);
    if (ctx.exteriorFinish === 'blackout') {
      exteriorFinishPrice *= parseInt(ctx.length) || 0;
    }
    appearance += exteriorFinishPrice;
    appearance += findPrice(EXTERIOR_ACCESSORIES_OPTIONS, ctx.exteriorAccessories);
    appearance += findPrice(FRONT_STYLE_OPTIONS, ctx.frontStyle);
    appearance += findPrice(EXTERIOR_BUILD_OPTIONS, ctx.exteriorBuild);
    let roofBuildPrice = findPrice(ROOF_BUILD_OPTIONS, ctx.roofBuild);
    if (ctx.roofBuild === 'onepieceroof') roofBuildPrice *= parseInt(ctx.length) || 0;
    appearance += roofBuildPrice;

    appearance += findPrice(PROTECTION_OPTIONS, ctx.protectionType);

    let protectionSizePrice = findPrice(PROTECTION_OPTIONS, ctx.protectionSize);
    if (ctx.protectionSize === '24') protectionSizePrice *= parseInt(ctx.length) || 0;
    appearance += protectionSizePrice;
    appearance += findPrice(PROTECTION_OPTIONS, ctx.frontProtection);
    appearance += findPrice(LUG_OPTIONS, ctx.lugType);
    appearance += findPrice(TIRE_SIZE_OPTIONS, ctx.tireSize);
    appearance += findPrice(WHEEL_OPTIONS, ctx.wheelType);
    if (ctx.spareTire) {
      if (ctx.lugType === '6lug') {
        appearance += 200;
      } else if (ctx.lugType === '8lug') {
        appearance += 0;
      } else {
        appearance += 160;
      }
    }
    appearance += findPrice(FLOOR_OPTIONS, ctx.floor);
    if (ctx.floorOverlay) {
      let floorOverlayPrice = findPrice(FLOOR_OPTIONS, ctx.floorOverlay);
      if (['atp', 'rtp', 'coin'].includes(ctx.floorOverlay)) {
        floorOverlayPrice *= (parseInt(ctx.length) || 0);
      }
      appearance += floorOverlayPrice;
    }
    appearance += findPrice(WALL_OPTIONS, ctx.walls);
    if (ctx.wallInsulation) {
      let wallInsulationPrice = findPrice(WALL_OPTIONS, ctx.wallInsulation);
      appearance += wallInsulationPrice * (parseInt(ctx.length) || 0);
    }
    appearance += findPrice(CEILING_OPTIONS, ctx.ceiling);
    if (ctx.ceilingInsulation) {
      let ceilingInsulationPrice = findPrice(CEILING_OPTIONS, ctx.ceilingInsulation);
      appearance += ceilingInsulationPrice * (parseInt(ctx.length) || 0);
    }
    if (ctx.atpWheelWells) appearance += 472; // $236 each * 2
    
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
    ctx.sideDoorsType, ctx.lights, ctx.interiorLights, ctx.exteriorLights, ctx.receptacles, ctx.tieDowns, ctx.jacks,
    ctx.waterPackage, ctx.bathroom, ctx.stairs, ctx.angledLights, ctx.vNoseETrack, ctx.batteryBox,
    ctx.escapeDoor, ctx.generatorBox, ctx.winchSystem, ctx.extendedTripleTongue, ctx.radioPackageSpeaker,
    ctx.rearSpoiler, ctx.ladderRacks, ctx.sidewallVents, ctx.recessedTireBox, ctx.interiorTireMount,
    ctx.exteriorFinish, ctx.exteriorAccessories, ctx.frontStyle, ctx.exteriorBuild, ctx.roofBuild,
    ctx.protectionType, ctx.protectionSize, ctx.frontProtection, ctx.lugType, ctx.tireSize, ctx.wheelType,
    ctx.spareTire, ctx.floor, ctx.floorOverlay, ctx.walls, ctx.ceiling, ctx.wallInsulation, ctx.ceilingInsulation, ctx.atpWheelWells, ctx.cabinets, ctx.toolBox, ctx.dRings,
    ctx.driverSideDoor, ctx.passengerSideDoor, ctx.sideDoorBarLock, ctx.concessionDoor,
    ctx.glassScreen, ctx.concessionWidth, ctx.concessionHeight
  ]);
}
