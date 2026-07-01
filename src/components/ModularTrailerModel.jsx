import { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { applyDimensionDeformations } from '../utils/GeometryUtils'
import { BlenderNodes } from '../utils/BlenderNodes'
import { useConfigurator } from '../context/ConfiguratorContext'

const LERP_SPEED = 0.18
const LERP_THRESHOLD = 0.0005
const FEET_TO_M = 0.305

const PATHS = {
    base: '/models/Base.glb',
    baseMeshes: '/models/Base Meshes.glb',
    frontStyle: '/models/Exterior/Front Style.glb',
    rearDoors: '/models/Exterior/Rear Doors.glb',
    sideDoors: '/models/Exterior/Side Doors.glb',
    extFinish: '/models/Exterior/Exterior Finish.glb',
    tongue: '/models/Exterior/Tongue.glb',
    cabinets: '/models/Interior/Cabinets & Storage.glb',
    cargo: '/models/Interior/Cargo & Tie-Downs.glb',
    awning: '/models/Packaging/Electric Awning.glb',
    bathroom: '/models/Packaging/Full Bathroom.glb',
    spoiler: '/models/Packaging/Rear Spoiler.glb',
    gullwingDoor: '/models/Packaging/Gullwing Door.glb',
    escapeDoor: '/models/Packaging/Escape Door.glb',
    axleConfig: '/models/Structure/Axle Configs.glb',
    axle: '/models/Structure/Axle.glb',
    wheels: '/models/Structure/Wheels.glb',
    addons: '/models/Addons.glb',
}

// Tyre count is driven by the axle variant (2x = 2 Tyres, 3x = 3 Tyres)
// NOTE: wheel style (blacksteel vs aluminumradial) is a material difference only —
//       both styles share the same mesh geometry in Wheels.glb.
const WHEELS_VARIANT_MAP = {
    '2x': '2_Tyres',
    '3x': '3_Tyres',
}

// Maps frontStyle config value → exact Blender mesh name inside Front Style.glb
const FRONT_STYLE_MESH_MAP = {
    vnose: 'V_Nose_w_ATP_Diamond_Plate',
    flatfront: 'Flat_Front_w_Rounded_ATP_Corners',
}

// Cabinet Super Switch: maps frontStyle → mesh names for each cabinet type.
// Mirrors the 3 Super Switch nodes in the Blender "Cabinets" node group:
//   Super Switch 1 → Main Cabinet body (V-Nose vs Flat Front)
//   Super Switch 2 → Overhead Cabinet  (V-Nose vs Flat Front)
//   Super Switch 3 → Cabinet Toolbox Slot (V-Nose vs Flat Front)
// Boolean gates are driven by config.cabinets (array) and config.toolBox (separate key).
// Mesh names exactly match the GLB (note: V-Nose uses a hyphen, Flat_Front uses underscores).
const CABINET_MESH_MAP = {
    vnose: {
        cabinet: 'V-Nose_Cabinet',
        overhead: 'V-Nose_Overhead_Cabinet',
        toolboxSlot: 'V-Nose_Cabinet_Toolbox_Slot',
    },
    flatfront: {
        cabinet: 'Flat_Front_Cabinet',
        overhead: 'Flat_Front_Overhead_Cabinet',
        toolboxSlot: 'Flat_Front_Cabinet_Toolbox_Slot',
    },
}

// Maps axleRating + variant → mesh name inside Axle Configs.glb
const AXLE_RATING_MESH_MAP = {
    '5200leafspring': { '2x': '2X_5200_lb_Leaf_Spring', '3x': '3X_5200_lb_Leaf_Spring' },
    '5200torsion': { '2x': '2X_5200_lb_Torsion', '3x': '3X_5200_lb_Torsion' },
    '7000dropspring': { '2x': '2X_7000_lb_Leaf_Spring', '3x': '3X_7000_lb_Leaf_Spring' },
    '7000torsion': { '2x': '2X_7000_lb_Torsion', '3x': '3X_7000_lb_Torsion' },
    '8000torsion16k': { '2x': '2X_8000_lb_Torsion', '3x': '3X_8000_lb_Torsion' },
    // Triple options always use the 3X mesh
    '10000lbtandem': { '2x': '2X_10,000_lb_Tandem', '3x': '3X_10,000_lb_Tandem' },
    // 'triple7000torsion': { '2x': '2X_7000_lb_Torsion', '3x': '3X_7000_lb_Torsion' },
}

// Maps axle style + tandem(2x)/triple(3x) → mesh name(s) inside Axle.glb
// Exact names as stored in the GLB (Three.js sanitizes spaces → underscores on load)
// Structural (Side Panels section — no ATP gate, always shown):
//   Side_Panel_Bottom_Strip              always visible base skirt
//   2X_Axle_Flat_Side / 3X_Axle_Flat_Side     flat cover (no angled)
//   2X_Axle_Angled_Side / 3X_Axle_Angled_Side  angled cover
// Finishes (ATP-gated via Super Toggle in Blender graph):
//   Side_Panel_ATP                       Base ATP strip
//   2X_ATP_Flat_Side / 3X_ATP_Flat_Side         ATP flat trim
//   2X_ATP_Angled_Side / 3X_ATP_Angled_Side      ATP angled trim

// ── Side Doors & Generator Box: Door Style Switch node ────────────────────────
// Mirrors the Blender "Side Doors and Generator Box" node group.
// Each entry maps sideDoorsType → per-side mesh names for:
//   • sideDoors.glb  (door panel body, L and R)
//   • extFinish.glb  (ATP exterior finish trim, L and R)
// Generator Box body lives in addons.glb and is gated separately by the
// "Generator Box Condition" node (see useEffect below).
const DOOR_MESH_MAP = {
    //  Door Style Switch output 0: No Door / Flat Panel (default)
    flatpanel: {
        doorsL: 'Flat_Door_Panel_L', doorsR: 'Flat_Door_Panel_R',
        atpL: 'ATP_Flat_Door_Panel_L', atpR: 'ATP_Flat_Door_Panel_R',
    },
    //  Door Style Switch output 1: Single Door
    singledoor: {
        doorsL: 'Single_Door_L', doorsR: 'Single_Door_R',
        atpL: 'ATP_For_Single_Door_L', atpR: 'ATP_For_Single_Door_R',
    },
    //  Door Style Switch output 2: Double Door
    doubledoor: {
        doorsL: 'Double_Door_L', doorsR: 'Double_Door_R',
        atpL: 'ATP_For_DoubleDoor_L', atpR: 'ATP_For_DoubleDoor_R',
    },
    //  Door Style Switch output 3: Generator Box
    generatorbox: {
        doorsL: 'Generator_Box_Plate_L', doorsR: 'Generator_Box_Plate_R',
        atpL: 'ATP_Plate_Generator_Box_L', atpR: 'ATP_Plate_Generator_Box_R',
    },
}

// ── Rear Doors: Menu Switch node ──────────────────────────────────────────────
// Mirrors the Blender "Rear Doors" node group.
// Group Input: Barn Door, Heavy Duty Door, Rear Door (boolean gate)
// Menu Switch: selects which mesh to show based on rampType.
// Object Info (Original/Relative) → world-transform handled by the deform system.
const REAR_DOOR_MESH_MAP = {
    barndoors: 'Barn_Door',
    heavyduty: 'Heavy_Duty_Ramp',
    superduty: 'Super_Duty_Ramp',   // update name if mesh differs in GLB
}

// ── Front Style addons: Super Switch per addon type ────────────────────────
// Mirrors the Blender "Front Style" node group.
// Super Switch selects the front-style-specific mesh variant for each addon.
// Angled Lights + V-Nose E Track have no variant (boolean gate only).
const FRONT_STYLE_ADDON_MESH_MAP = {
    vnose: {
        stairs: 'Stair_(V-Nose)',
        battery: 'Battery_storage_(V-Nose_Cabinet)',
    },
    flatfront: {
        stairs: 'Stair_(Flat_Front)',
        battery: 'Battery_storage_(Flat_Cabinet)',
    },
}

// ── Extended Triple Tongue: 2 mesh variants (one per front style) ───────────
// Mirrors the Blender tongue node — same Super Switch pattern as stairs/battery.
// Mesh names match the GLB objects visible in the Outliner.
const TONGUE_MESH_MAP = {
    vnose: 'Extended_Triple_Tongue_V-Nose',
    flatfront: 'Extended_Triple_Tongue_Flat_Front',
}


export default function ModularTrailerModel({ widthFt, lengthFt, heightFt }) {
    const config = useConfigurator()

    const hasCabinet = config.cabinets?.includes('vnosebase') || config.cabinets?.includes('flatfrontbase')

    const effectiveSideDoorsType = parseFloat(config.length) < 23.5 ? 'flatpanel' : config.sideDoorsType
    if (parseFloat(config.length) < 23.5 && config.sideDoorsType !== 'flatpanel') {
        console.warn('[ModularTrailerModel] Side door forced to flat panel — trailer length < 23.5 ft')
    }

    const { scene: base } = useGLTF(PATHS.base)
    const { scene: baseMeshes } = useGLTF(PATHS.baseMeshes)
    const { scene: frontStyle } = useGLTF(PATHS.frontStyle)
    const { scene: rearDoors } = useGLTF(PATHS.rearDoors)
    const { scene: sideDoors } = useGLTF(PATHS.sideDoors)
    const { scene: extFinish } = useGLTF(PATHS.extFinish)
    const { scene: tongue } = useGLTF(PATHS.tongue)
    const { scene: cabinetsGLB } = useGLTF(PATHS.cabinets)
    const { scene: awning } = useGLTF(PATHS.awning)
    const { scene: bathroom } = useGLTF(PATHS.bathroom)
    const { scene: spoiler } = useGLTF(PATHS.spoiler)
    const { scene: gullwingDoor } = useGLTF(PATHS.gullwingDoor)
    const { scene: escapeDoorScene } = useGLTF(PATHS.escapeDoor)
    const { scene: axleConfig } = useGLTF(PATHS.axleConfig)
    const { scene: axle } = useGLTF(PATHS.axle)
    const { scene: wheels } = useGLTF(PATHS.wheels)
    const { scene: addons } = useGLTF(PATHS.addons)
    const { scene: cargo } = useGLTF(PATHS.cargo)

    const store = useRef(new Map())
    const animRef = useRef({ widthFt, lengthFt, heightFt })
    const targetRef = useRef({ widthFt, lengthFt, heightFt })
    const dirtyRef = useRef(true)
    const activeScenesRef = useRef([])



    // Compute global bounds from base scenes
    useEffect(() => {
        if (store.current.has('_globalZCenter')) return
        let gMinZ = Infinity, gMaxZ = -Infinity, gMinX = Infinity, gMaxX = -Infinity
            ;[base, baseMeshes].forEach(scene =>
                scene.traverse(child => {
                    if (!child.isMesh || !child.geometry?.attributes.position) return
                    const pos = child.geometry.attributes.position
                    for (let i = 0; i < pos.count; i++) {
                        const x = pos.getX(i), z = pos.getZ(i)
                        if (z < gMinZ) gMinZ = z; if (z > gMaxZ) gMaxZ = z
                        if (x < gMinX) gMinX = x; if (x > gMaxX) gMaxX = x
                    }
                })
            )
        store.current.set('_globalZCenter', (gMinZ + gMaxZ) / 2)
        store.current.set('_globalXMin', gMinX)
        store.current.set('_globalXMax', gMaxX)
        dirtyRef.current = true
    }, [base, baseMeshes])

    useEffect(() => {
        targetRef.current = { widthFt, lengthFt, heightFt }
        dirtyRef.current = true
    }, [widthFt, lengthFt, heightFt])

    // All mesh-visibility switches in one effect — mirrors Blender's Switch node
    useEffect(() => {
        BlenderNodes.switchMesh(frontStyle, FRONT_STYLE_MESH_MAP[config.frontStyle])

        // ── Rear Doors: mirrors the Blender node graph ───────────────────────
        // Menu Switch → selects the correct mesh from REAR_DOOR_MESH_MAP
        // Rear Door boolean (Group Input) → gates the entire output on/off
        const rearDoorMesh = REAR_DOOR_MESH_MAP[config.rampType] ?? REAR_DOOR_MESH_MAP.heavyduty
        BlenderNodes.switchMesh(rearDoors, config.rearDoor ? rearDoorMesh : null)

        // ── Base Meshes: Escape Door condition ────────────────────────
        // Mirrors the Blender "Base" node group.
        // Group Input -> Base Interior goes into Super Toggle, gated by Escape Door menu index.
        const baseInterior = baseMeshes.getObjectByName('Base_Interior') || baseMeshes.getObjectByName('Base Interior')
        const leftWall = baseMeshes.getObjectByName('Left_side_wall_Vanilla') || baseMeshes.getObjectByName('Left side wall Vanilla')
        const rightWall = baseMeshes.getObjectByName('Right_side_wall_Vanilla') || baseMeshes.getObjectByName('Right side wall Vanilla')
        
        if (baseInterior && !baseInterior.userData._loggedAttrs) {
            baseInterior.userData._loggedAttrs = true
            console.log('[DEBUG] baseInterior attributes:', Object.keys(baseInterior.geometry.attributes))
        }
        if (leftWall && !leftWall.userData._loggedAttrs) {
            leftWall.userData._loggedAttrs = true
            console.log('[DEBUG] leftWall attributes:', Object.keys(leftWall.geometry.attributes))
        }
        
        if (baseInterior) baseInterior.visible = config.escapeDoor === 'none'
        if (leftWall) leftWall.visible = config.escapeDoor === 'none'
        if (rightWall) rightWall.visible = true

        // ── Side Doors & Generator Box: mirrors the Blender node graph ─────────
        // Door Style Switch → selects the mesh row from DOOR_MESH_MAP
        const doorVariant = DOOR_MESH_MAP[effectiveSideDoorsType] ?? DOOR_MESH_MAP.flatpanel

        // Left Side / Right Side boolean gates (And/Not/Not pattern in graph).
        const leftSide = config.leftSide   // Interior tab: DOOR SIDES → LEFT SIDE DOORS
        const rightSide = config.rightSide  // Interior tab: DOOR SIDES → RIGHT SIDE DOORS

        // Build active mesh lists per side → Join Geometry (sideDoors.glb)
        const activeDoorMeshes = [
            ...(leftSide ? [doorVariant.doorsL] : []),   // And(leftSide,  doorType)
            ...(rightSide ? [doorVariant.doorsR] : []),   // And(rightSide, doorType)
        ]

        // Single Door or Flat Panel: show Generator Box Plates per side (structural, not cabinet-dependent)
        if (effectiveSideDoorsType === 'singledoor' || effectiveSideDoorsType === 'flatpanel') {
            if (leftSide) activeDoorMeshes.push('Generator_Box_Plate_L')
            if (rightSide) activeDoorMeshes.push('Generator_Box_Plate_R')
        }

        // Generator Box add-on: show plates + ATP trim per side
        if (config.generatorBox) {
            if (leftSide) activeDoorMeshes.push('Generator_Box_Plate_L')
            if (rightSide) activeDoorMeshes.push('Generator_Box_Plate_R')
        }

        // Build active ATP trim lists per side → Join Geometry (extFinish.glb)
        const activeAtpMeshes = [
            ...(leftSide ? [doorVariant.atpL] : []),
            ...(rightSide ? [doorVariant.atpR] : []),
        ]

        // Single Door or Flat Panel: ATP plates mirror the generator box plate visibility
        if (effectiveSideDoorsType === 'singledoor' || effectiveSideDoorsType === 'flatpanel' || config.generatorBox) {
            if (leftSide) activeAtpMeshes.push('ATP_Plate_Generator_Box_L')
            if (rightSide) activeAtpMeshes.push('ATP_Plate_Generator_Box_R')
        }

        BlenderNodes.switchMeshes(sideDoors, activeDoorMeshes)
        // When ATP is OFF, suppress all extFinish ATP trim meshes globally
        BlenderNodes.switchMeshes(extFinish, config.axleAtp ? activeAtpMeshes : [])

        // ── Addons.glb: unified mesh list ──────────────────────────────────────────
        // All addon meshes are collected into ONE array and applied in a single
        // switchMeshes call. Calling switchMesh multiple times is wrong because
        // each call hides everything not in its list, overwriting the previous.
        const activeAddonMeshes = []

        // Generator Box — hidden when cabinet is present (cabinet occupies the same space)
        if (config.generatorBox && !hasCabinet) {
            activeAddonMeshes.push('Generator_Box')
        }

        // ── Front Style node graph ────────────────────────────────────────
        const frontStyleAddon = FRONT_STYLE_ADDON_MESH_MAP[config.frontStyle]
            ?? FRONT_STYLE_ADDON_MESH_MAP.vnose

        // Stairs: Super Switch (V-Nose Stair vs Flat Front Stair) gated by stairs boolean
        if (config.stairs) {
            activeAddonMeshes.push(frontStyleAddon.stairs)
        }

        // Battery Box: Super Switch (V-Nose vs Flat Front cabinet variant)
        if (config.batteryBox) {
            activeAddonMeshes.push(frontStyleAddon.battery)
        }

        // V-Nose E Track: Super Toggle — only relevant when frontStyle is vnose
        if (config.vNoseETrack && config.frontStyle === 'vnose') {
            activeAddonMeshes.push('V-Nose_E_Track')
        }

        // Angled Lights: Super Toggle — no front style variant, simple boolean
        if (config.angledLights) {
            activeAddonMeshes.push('Angled_Lights')
        }

        // Gullwing Escape Door lives in its own Packaging GLB (added to activeScenes below)
        const activeGullwingMeshes = []
        if (config.escapeDoor === 'gullwing') {
            activeGullwingMeshes.push('Gullwing_Escape_Door_2')
            
            const variantPrefix = config.spreadAxle ? '2X' : '3X'
            const style = config.axleAngled ? 'Angled' : 'Flat'
            activeGullwingMeshes.push(`${variantPrefix}_Axle_${style}_Side_For_GED`)
        }
        BlenderNodes.switchMeshes(gullwingDoor, activeGullwingMeshes)

        // Winch System
        if (config.winchSystem) {
            activeAddonMeshes.push('Winch_System')
        }

        // ── Assorted Addons (from Addons node graph) ───────────────────────
        if (config.jacks?.includes('5kelectrictongue')) {
            activeAddonMeshes.push('Electric_Jack')
        }

        // AC Unit (Climate Control)
        if (config.climateControl && config.climateControl !== 'none' && config.climateControl !== 'wirebrace') {
            activeAddonMeshes.push('AC_Unit')
        }

        // ── tongue.glb: always visible, variant switches with front style
        // Extended_Triple_Tongue_V-Nose (default) ↔ Extended_Triple_Tongue_Flat_Front
        BlenderNodes.switchMesh(tongue, TONGUE_MESH_MAP[config.frontStyle] ?? TONGUE_MESH_MAP.vnose)

        // ── addons.glb: Extended Triple Tongue addon — gated by toggle
        if (config.extendedTripleTongue) {
            activeAddonMeshes.push('Extended_Triple_Tongue')
        }

        if (config.radioPackageSpeaker) {
            activeAddonMeshes.push('Radio_Package_Speaker')
        }

        if (config.lights?.includes('racing')) {
            activeAddonMeshes.push('Racing_Lights')
        }

        // Ladder Racks: instanced via useMemo (Top_Supports mesh is the template, never shown directly)

        if (config.sidewallVents) {
            activeAddonMeshes.push('Aluminum_Sidewall_Vents')
        }

        if (config.recessedTireBox) {
            activeAddonMeshes.push('Recessed_Tire_Box')
        }

        if (config.interiorTireMount) {
            activeAddonMeshes.push('Interior_Tire_Mount')
        }

        BlenderNodes.switchMeshes(addons, activeAddonMeshes)

        // ── Cabinets: node graph logic ───────────────────────────────────────────
        // Mirrors the Blender node graph exactly:
        //   Front Style Switch → picks V-Nose or Flat Front variant
        //   Cabinet Switch → gates Main Cabinet
        //   Overhead Cabinet Switch → gates Overhead Cabinet
        //   Toolbox Switch → gates the Toolbox AND Toolbox Slot (requires Cabinet=true)
        //   Winch System Switch → gates Winch System (independent)
        const cabinetVariant = CABINET_MESH_MAP[config.frontStyle] ?? CABINET_MESH_MAP.vnose
        const activeCabinetMeshes = []

        // Boolean inputs (mapping the array states to the node graph booleans)
        const hasOverhead = config.cabinets.includes('vnoseoverhead') || config.cabinets.includes('flatfrontoverhead')
        const hasToolbox = config.toolBox && config.toolBox !== 'none'
        const hasWinch = config.winchSystem

        // 1. Main Cabinet
        if (hasCabinet) {
            activeCabinetMeshes.push(cabinetVariant.cabinet)
        }

        // 2. Overhead Cabinet
        if (hasOverhead) {
            activeCabinetMeshes.push(cabinetVariant.overhead)
        }

        // 3. Cabinet Toolbox Slot — always visible when cabinet is active (empty slot)
        if (hasCabinet) {
            activeCabinetMeshes.push(cabinetVariant.toolboxSlot)
        }

        // 4. Cabinet Toolbox insert — only when a toolbox option is selected
        if (hasCabinet && hasToolbox) {
            activeCabinetMeshes.push('Cabinet_Toolbox')
        }

        BlenderNodes.switchMeshes(cabinetsGLB, activeCabinetMeshes)

        // ── Bathroom GLB: Sink Area conditional visibility ─────────────────────
        // Sink Area requires all 3: bathroom selected + no generator box + v-nose (not flat front)
        const showSink = Boolean(config.bathroom && config.bathroom !== 'none')
            && !config.generatorBox
            && config.frontStyle !== 'flatfront'
            && !hasCabinet

        const activeBathroomMeshes = ['Bathroom']
        if (showSink) activeBathroomMeshes.push('Sink_Area')
        BlenderNodes.switchMeshes(bathroom, activeBathroomMeshes)

        // ── Cargo & Tie-Downs: Node Graph ──────────────────────────────────────
        // The E-Track and other tie downs are generated instances in Blender.
        // We select the baked GLB meshes directly (D-Rings / Airline tracking missing in GLB currently)
        const activeCargoMeshes = []
        // We'll hide the static E-Tracks and generate them dynamically instead to multiply the mesh
        BlenderNodes.switchMeshes(cargo, activeCargoMeshes)

        // Spread Axle ON = 2 tyres (tandem), OFF = 3 tyres (tri-axle)
        const variant = config.spreadAxle ? '2x' : '3x'

        // Tyre count driven by variant — wheel style is material only
        BlenderNodes.switchMesh(wheels, WHEELS_VARIANT_MAP[variant])
        const prefix = variant === '3x' ? '3X_' : '2X_'

        // Emulate the Geometry Node graph for Wheels — Blender "Wheels" node group
        // ── Side Panels section (no ATP gate — structural, always shown) ──────────
        const activeAxleMeshes = []

        // Base structural skirt — always visible regardless of ATP or angle
        activeAxleMeshes.push('Side_Panel_Bottom_Strip')

        // Cover panel — always shown, angled or flat based on toggle
        activeAxleMeshes.push(`${prefix}Axle_${config.axleAngled ? 'Angled' : 'Flat'}_Side`)

        // ── Finishes section (gated by ATP Super Toggle in Blender graph) ─────────
        if (config.axleAtp) {
            // Base ATP strip
            activeAxleMeshes.push('Side_Panel_ATP')
            // ATP directional trim — follows same angled/flat toggle
            activeAxleMeshes.push(`${prefix}ATP_${config.axleAngled ? 'Angled' : 'Flat'}_Side`)
        }

        BlenderNodes.switchMeshes(axle, activeAxleMeshes)
        BlenderNodes.switchMesh(axleConfig, AXLE_RATING_MESH_MAP[config.axleRating]?.[variant])
    }, [
        config.frontStyle, config.rampType, config.rearDoor, config.sideDoorsType, config.length,
        config.wheel, config.axleAngled, config.axleAtp, config.axleRating, config.spreadAxle,
        config.cabinets, config.toolBox,
        config.leftSide, config.rightSide,
        config.stairs, config.batteryBox, config.vNoseETrack, config.angledLights,
        config.escapeDoor, config.generatorBox, config.winchSystem, config.tieDowns,
        config.extendedTripleTongue, config.radioPackageSpeaker, config.rearSpoiler,
        config.climateControl, config.jacks, config.lights,
        config.ladderRacks, config.sidewallVents, config.recessedTireBox, config.interiorTireMount,
        config.bathroom,
        frontStyle, rearDoors, sideDoors, extFinish, wheels, axle, axleConfig, addons,
        cabinetsGLB, cargo, spoiler, tongue, bathroom
    ])

    // ── Emulate Blender "E-Track" Array Generation Node ────────────────────────
    const generatedETracks = useMemo(() => {
        // Find the base template meshes (we assume they are the original single-piece objects)
        let floorTemplate = null
        let wallTemplate = null
        cargo.traverse(child => {
            if (child.isMesh && child.name.includes('Floor_E-Track')) floorTemplate = child
            if (child.isMesh && child.name.includes('Wall_E-Track')) wallTemplate = child
        })

        // The true rear X coordinate of the trailer uses the same clamped delta logic from GeometryUtils
        const BASE_LENGTH_FT = 32
        const FEET_TO_M = 0.305
        const BASE_CLAMP_FT = 27
        const EXCESS_FACTOR = 1.000
        const targetOffset1 = Math.min(lengthFt, BASE_CLAMP_FT)
        const targetOffset2 = Math.max(lengthFt - BASE_CLAMP_FT, 0) * EXCESS_FACTOR
        const baseOffset1 = Math.min(BASE_LENGTH_FT, BASE_CLAMP_FT)
        const baseOffset2 = Math.max(BASE_LENGTH_FT - BASE_CLAMP_FT, 0) * EXCESS_FACTOR
        const deltaLength = ((targetOffset1 + targetOffset2) - (baseOffset1 + baseOffset2)) * FEET_TO_M
        const trueRearX = -(BASE_LENGTH_FT * FEET_TO_M + deltaLength)

        // Node: Switch
        const switchNode = hasCabinet ? 0 : 0
        // Node: Subtract (Trailer Length - Switch). The Trailer Length is passed as a negative X coordinate.
        const subtractNode = BlenderNodes.Math.Subtract(trueRearX, switchNode)
        // Node: Multiply -> Array Length
        const targetLength = BlenderNodes.Math.Multiply(subtractNode, -1.000)

        const stepSize = 0.076
        const count = Math.max(1, Math.ceil(Math.abs(targetLength) / stepSize))

        const points = new Float32Array(count * 3)
        // Assume trailer array generates along -X from the Switch offset
        const startX = switchNode
        for (let i = 0; i < count; i++) {
            points[i * 3] = startX - (i * stepSize)
            points[i * 3 + 1] = 0
            points[i * 3 + 2] = 0
        }

        const pointsGeometry = new THREE.BufferGeometry()
        pointsGeometry.setAttribute('position', new THREE.BufferAttribute(points, 3))

        console.log(`[E-Track Debug] targetLength: ${targetLength}, count: ${count}, startX: ${startX}`)
        if (floorTemplate) {
            console.log(`[E-Track Debug] floorTemplate position:`, floorTemplate.position.toArray())
            console.log(`[E-Track Debug] floorTemplate rotation:`, floorTemplate.rotation.toArray())
            const a = floorTemplate.geometry.attributes
            const present = ['_leftselection', '_rightselection', '_rearselection', '_topselection'].filter(k => !!a[k])
            console.log(`[E-Track Debug] floorTemplate attributes:`, present)
        }
        if (wallTemplate) {
            console.log(`[E-Track Debug] wallTemplate position:`, wallTemplate.position.toArray())
            console.log(`[E-Track Debug] wallTemplate rotation:`, wallTemplate.rotation.toArray())
            const a = wallTemplate.geometry.attributes
            const present = ['_leftselection', '_rightselection', '_rearselection', '_topselection'].filter(k => !!a[k])
            console.log(`[E-Track Debug] wallTemplate attributes:`, present)
        }

        const instances = []
        if (floorTemplate && config.tieDowns?.includes('flooretrack')) {
            const floorInstanced = BlenderNodes.instanceOnPoints(pointsGeometry, floorTemplate)
            floorInstanced.position.copy(floorTemplate.position)
            floorInstanced.rotation.copy(floorTemplate.rotation)
            floorInstanced.scale.copy(floorTemplate.scale)
            instances.push(<primitive key="floor-etrack" object={floorInstanced} />)
        }
        if (wallTemplate && config.tieDowns?.includes('walletrack')) {
            const wallInstanced = BlenderNodes.instanceOnPoints(pointsGeometry, wallTemplate)
            wallInstanced.position.copy(wallTemplate.position)
            wallInstanced.rotation.copy(wallTemplate.rotation)
            wallInstanced.scale.copy(wallTemplate.scale)
            instances.push(<primitive key="wall-etrack" object={wallInstanced} />)
        }

        return instances
    }, [cargo, lengthFt, hasCabinet, config.tieDowns])

    // ── Ladder Racks: Instance on Points (mirrors Blender Mesh Line → Instance on Points) ──
    // Top_Supports is a single cross-member instanced along the trailer length.
    // Y and Z come from the template's position (roof height); X spans front→rear.
    const generatedLadderRacks = useMemo(() => {
        if (!config.ladderRacks) return []

        let rackTemplate = null
        addons.traverse(child => {
            if (child.isMesh && child.name === 'Top_Supports') rackTemplate = child
        })
        if (!rackTemplate) return []

        // Trailer length calculation
        const BASE_LENGTH_FT = 32
        const BASE_CLAMP_FT = 27
        const EXCESS_FACTOR = 1.000
        const targetOffset1 = Math.min(lengthFt, BASE_CLAMP_FT)
        const targetOffset2 = Math.max(lengthFt - BASE_CLAMP_FT, 0) * EXCESS_FACTOR
        const baseOffset1 = Math.min(BASE_LENGTH_FT, BASE_CLAMP_FT)
        const baseOffset2 = Math.max(BASE_LENGTH_FT - BASE_CLAMP_FT, 0) * EXCESS_FACTOR
        const deltaLength = ((targetOffset1 + targetOffset2) - (baseOffset1 + baseOffset2)) * FEET_TO_M
        const trueRearX = -(BASE_LENGTH_FT * FEET_TO_M + deltaLength)

        // Physical span of the racks along the trailer (with a slight 0.3m / 1ft inset matching the Offset node)
        const offsetMeters = 0.3
        const totalSpan = Math.abs(trueRearX) - offsetMeters

        // Fixed 6ft gap between each rack
        const RACK_SPACING_M = 6 * FEET_TO_M
        const count = Math.max(2, Math.floor(totalSpan / RACK_SPACING_M) + 1)

        // We must divide the local points by the object's scale, because setting instanced.scale
        // scales the ENTIRE object including the point coordinates!
        const sx = rackTemplate.scale.x || 1
        const points = new Float32Array(count * 3)

        for (let i = 0; i < count; i++) {
            // Distribute along +X locally at fixed 6ft intervals.
            // The template has a 180-degree rotation which will perfectly flip this array backwards over the roof of the trailer!
            points[i * 3]     = (i * RACK_SPACING_M) / sx
            points[i * 3 + 1] = 0
            points[i * 3 + 2] = 0
        }

        const pointsGeometry = new THREE.BufferGeometry()
        pointsGeometry.setAttribute('position', new THREE.BufferAttribute(points, 3))

        // Create instances and apply the FULL transform of the original template
        const instanced = BlenderNodes.instanceOnPoints(pointsGeometry, rackTemplate)
        instanced.position.copy(rackTemplate.position)
        instanced.rotation.copy(rackTemplate.rotation)
        instanced.scale.copy(rackTemplate.scale)

        return [<primitive key="ladder-racks" object={instanced} />]
    }, [addons, lengthFt, config.ladderRacks])

    const activeScenes = useMemo(() => {
        const scenes = [
            base, baseMeshes,
            frontStyle, rearDoors, sideDoors, extFinish,
            tongue,
            wheels,
            axleConfig,
            axle,
            addons,
            cargo,
        ]
        if (config.cabinets?.length > 0) scenes.push(cabinetsGLB)
        if (config.awning?.length > 0 && lengthFt >= 29) scenes.push(awning)
        if (config.bathroom && config.bathroom !== 'none') scenes.push(bathroom)
        if (config.rearSpoiler) scenes.push(spoiler)
        if (config.escapeDoor === 'gullwing') scenes.push(gullwingDoor)
        if (config.escapeDoor === '54x48') scenes.push(escapeDoorScene)
        return scenes
    }, [
        config.cabinets, config.awning, config.bathroom, config.rearSpoiler, config.escapeDoor,
        lengthFt,
        base, baseMeshes, frontStyle, rearDoors, sideDoors, extFinish,
        tongue, wheels, axleConfig, axle, addons, cabinetsGLB, awning, bathroom, cargo, spoiler, gullwingDoor, escapeDoorScene
    ])

    activeScenesRef.current = activeScenes

    useEffect(() => {
        dirtyRef.current = true
    }, [activeScenes])

    useFrame(() => {
        if (!store.current.has('_globalZCenter')) return
        const curr = animRef.current, tgt = targetRef.current
        const nw = curr.widthFt + (tgt.widthFt - curr.widthFt) * LERP_SPEED
        const nl = curr.lengthFt + (tgt.lengthFt - curr.lengthFt) * LERP_SPEED
        const nh = curr.heightFt + (tgt.heightFt - curr.heightFt) * LERP_SPEED
        const moved =
            Math.abs(nw - curr.widthFt) > LERP_THRESHOLD ||
            Math.abs(nl - curr.lengthFt) > LERP_THRESHOLD ||
            Math.abs(nh - curr.heightFt) > LERP_THRESHOLD
        if (!moved && !dirtyRef.current) return
        dirtyRef.current = false
        animRef.current = { widthFt: nw, lengthFt: nl, heightFt: nh }
        const globalZCenter = store.current.get('_globalZCenter')
        const globalXMin = store.current.get('_globalXMin')
        const globalXMax = store.current.get('_globalXMax')

        activeScenesRef.current.forEach(scene => {
            scene.traverse(child => {
                if (!child.isMesh || !child.geometry) return

                // Build world-space matrix elements once per mesh (transform never changes)
                const invKey = `_inv_${child.uuid}`
                if (!store.current.has(invKey)) {
                    child.updateWorldMatrix(true, false)
                    store.current.set(invKey, child.matrixWorld.clone().invert().elements)
                }
                child.updateWorldMatrix(true, false)
                const we = child.matrixWorld.elements
                const ie = store.current.get(invKey)

                applyDimensionDeformations({
                    geometry: child.geometry, store: store.current,
                    uuid: child.uuid, meshName: child.name || child.uuid,
                    widthFt: nw, lengthFt: nl, heightFt: nh,
                    globalZCenter, globalXMin, globalXMax,
                    we, ie,
                })
            })
        })
    })

    return (
        <group>
            {activeScenes.map(scene => (
                <primitive key={scene.uuid} object={scene} />
            ))}
            {generatedETracks}
            {generatedLadderRacks}
        </group>
    )
}

Object.values(PATHS).forEach(path => useGLTF.preload(path))
