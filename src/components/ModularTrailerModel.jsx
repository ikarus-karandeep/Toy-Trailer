import { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { applyDimensionDeformations } from '../utils/GeometryUtils'
import { BlenderNodes } from '../utils/BlenderNodes'
import { useConfigurator } from '../context/ConfiguratorContext'

const LERP_SPEED = 0.08
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
        cabinet:     'V-Nose_Cabinet',
        overhead:    'V-Nose_Overhead_Cabinet',
        toolboxSlot: 'V-Nose_Cabinet_Toolbox_Slot',
    },
    flatfront: {
        cabinet:     'Flat_Front_Cabinet',
        overhead:    'Flat_Front_Overhead_Cabinet',
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
// Triple rating options drive the 3X variant; all others use 2X
const AXLE_MESH_MAP = {
    atpangledside: { '2x': '2X_ATP_Angled_Side', '3x': '3X_ATP_Angled_Side' },
    atpflatside: { '2x': '2X_ATP_Flat_Side', '3x': '3X_ATP_Flat_Side' },
    baseatp: { '2x': 'Side_Panel_ATP', '3x': 'Side_Panel_ATP' },
    panelangledside: { '2x': '2X_Axle_Angled_Side', '3x': '3X_Axle_Angled_Side' },
    panelflatside: { '2x': '2X_Axle_Flat_Side', '3x': '3X_Axle_Flat_Side' },
}

// ── Side Doors & Generator Box: Door Style Switch node ────────────────────────
// Mirrors the Blender "Side Doors and Generator Box" node group.
// Each entry maps sideDoorsType → per-side mesh names for:
//   • sideDoors.glb  (door panel body, L and R)
//   • extFinish.glb  (ATP exterior finish trim, L and R)
// Generator Box body lives in addons.glb and is gated separately by the
// "Generator Box Condition" node (see useEffect below).
const DOOR_MESH_MAP = {
    //  Door Style Switch output 0: No Door / Flat Panel (default)
    flatpanel:    {
        doorsL: 'Flat_Door_Panel_L',       doorsR: 'Flat_Door_Panel_R',
        atpL:   'ATP_Flat_Door_Panel_L',   atpR:   'ATP_Flat_Door_Panel_R',
    },
    //  Door Style Switch output 1: Single Door
    singledoor:   {
        doorsL: 'Single_Door_L',           doorsR: 'Single_Door_R',
        atpL:   'ATP_For_Single_Door_L',   atpR:   'ATP_For_Single_Door_R',
    },
    //  Door Style Switch output 2: Double Door
    doubledoor:   {
        doorsL: 'Double_Door_L',           doorsR: 'Double_Door_R',
        atpL:   'ATP_For_DoubleDoor_L',    atpR:   'ATP_For_DoubleDoor_R',
    },
    //  Door Style Switch output 3: Generator Box
    generatorbox: {
        doorsL: 'Generator_Box_Plate_L',         doorsR: 'Generator_Box_Plate_R',
        atpL:   'ATP_Plate_Generator_Box_L',     atpR:   'ATP_Plate_Generator_Box_R',
    },
}

// ── Rear Doors: Menu Switch node ──────────────────────────────────────────────
// Mirrors the Blender "Rear Doors" node group.
// Group Input: Barn Door, Heavy Duty Door, Rear Door (boolean gate)
// Menu Switch: selects which mesh to show based on rampType.
// Object Info (Original/Relative) → world-transform handled by the deform system.
const REAR_DOOR_MESH_MAP = {
    barndoors:  'Barn_Door',
    heavyduty:  'Heavy_Duty_Ramp',
    superduty:  'Super_Duty_Ramp',   // update name if mesh differs in GLB
}

// ── Front Style addons: Super Switch per addon type ────────────────────────
// Mirrors the Blender "Front Style" node group.
// Super Switch selects the front-style-specific mesh variant for each addon.
// Angled Lights + V-Nose E Track have no variant (boolean gate only).
const FRONT_STYLE_ADDON_MESH_MAP = {
    vnose: {
        stairs:  'Stair_(V-Nose)',
        battery: 'Battery_storage_(V-Nose_Cabinet)',
    },
    flatfront: {
        stairs:  'Stair_(Flat_Front)',
        battery: 'Battery_storage_(Flat_Cabinet)',
    },
}


export default function ModularTrailerModel({ widthFt, lengthFt, heightFt }) {
    const config = useConfigurator()

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
    const { scene: spoiler } = useGLTF(PATHS.spoiler)  // eslint-disable-line no-unused-vars
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

        // ── Base Meshes: Gullwing Escape Door condition ────────────────────────
        // Mirrors the Blender "Base" node group.
        // Group Input -> Not -> Super Switch: hides the vanilla inner walls when
        // the Gullwing Escape Door is enabled (its mesh lives in addons.glb).
        const leftWall = baseMeshes.getObjectByName('Left_side_wall_Vanilla')
        const rightWall = baseMeshes.getObjectByName('Right_side_wall_Vanilla')
        if (leftWall) leftWall.visible = !config.gullwingEscapeDoor
        if (rightWall) rightWall.visible = !config.gullwingEscapeDoor

        // ── Side Doors & Generator Box: mirrors the Blender node graph ─────────
        // Door Style Switch → selects the mesh row from DOOR_MESH_MAP
        const doorVariant = DOOR_MESH_MAP[config.sideDoorsType] ?? DOOR_MESH_MAP.flatpanel

        // Left Side / Right Side boolean gates (And/Not/Not pattern in graph).
        const leftSide  = config.leftSide   // Interior tab: DOOR SIDES → LEFT SIDE DOORS
        const rightSide = config.rightSide  // Interior tab: DOOR SIDES → RIGHT SIDE DOORS

        // Build active mesh lists per side → Join Geometry (sideDoors.glb)
        const activeDoorMeshes = [
            ...(leftSide  ? [doorVariant.doorsL] : []),   // And(leftSide,  doorType)
            ...(rightSide ? [doorVariant.doorsR] : []),   // And(rightSide, doorType)
        ]

        // Build active ATP trim lists per side → Join Geometry (extFinish.glb)
        const activeAtpMeshes = [
            ...(leftSide  ? [doorVariant.atpL] : []),
            ...(rightSide ? [doorVariant.atpR] : []),
        ]

        BlenderNodes.switchMeshes(sideDoors, activeDoorMeshes)
        BlenderNodes.switchMeshes(extFinish, activeAtpMeshes)

        // ── Addons.glb: unified mesh list ──────────────────────────────────────────
        // All addon meshes are collected into ONE array and applied in a single
        // switchMeshes call. Calling switchMesh multiple times is wrong because
        // each call hides everything not in its list, overwriting the previous.
        const activeAddonMeshes = []

        // Generator Box Condition (Side Doors graph)
        if (config.sideDoorsType === 'generatorbox') {
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

        // Gullwing Escape Door: Super Switch
        // NOT(gullwing) is handled on the Base Interior side in baseMeshes.glb;
        // the 3D door mesh lives in addons.glb.
        if (config.gullwingEscapeDoor) {
            activeAddonMeshes.push('Gullwing_Escape_Door')
        }

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

        if (config.extendedTripleTongue) {
            activeAddonMeshes.push('Extended_Triple_Tongue')
        }

        if (config.radioPackageSpeaker) {
            activeAddonMeshes.push('Radio_Package_Speaker')
        }
        
        if (config.lights?.includes('racing')) {
            activeAddonMeshes.push('Racing_Lights')
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
        const hasCabinet = config.cabinets.includes('vnosebase') || config.cabinets.includes('flatfrontbase')
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

        // 3. Cabinet Toolbox & Slot
        // The Boolean Switch in the graph requires BOTH Cabinet AND Cabinet Toolbox to be true
        if (hasCabinet && hasToolbox) {
            activeCabinetMeshes.push(cabinetVariant.toolboxSlot)
            activeCabinetMeshes.push('Cabinet_Toolbox')
        }

        BlenderNodes.switchMeshes(cabinetsGLB, activeCabinetMeshes)

        // ── Cargo & Tie-Downs: Node Graph ──────────────────────────────────────
        // The E-Track and other tie downs are generated instances in Blender.
        // We select the baked GLB meshes directly (D-Rings / Airline tracking missing in GLB currently)
        const activeCargoMeshes = []
        if (config.tieDowns?.includes('etrack')) {
            activeCargoMeshes.push('Floor_E-Track', 'Wall_E-Track')
        }
        BlenderNodes.switchMeshes(cargo, activeCargoMeshes)

        // Spread Axle ON = 2 tyres (tandem), OFF = 3 tyres (tri-axle)
        const variant = config.spreadAxle ? '2x' : '3x'

        // Tyre count driven by variant — wheel style is material only
        BlenderNodes.switchMesh(wheels, WHEELS_VARIANT_MAP[variant])
        const prefix = variant === '3x' ? '3X_' : '2X_'

        // Emulate the Geometry Node graph for Wheels (Joins structural panels + finishes)
        const activeAxleMeshes = []

        // 1. Structural Panel (Straight or Angled)
        const isAngled = config.axle.includes('angled')
        activeAxleMeshes.push(`${prefix}Axle_${isAngled ? 'Angled' : 'Flat'}_Side`)

        // 2. Exterior Finish (ATP Trim)
        if (config.axle.includes('atp')) {
            if (config.axle === 'baseatp') {
                activeAxleMeshes.push('Side_Panel_ATP')
            } else {
                activeAxleMeshes.push(`${prefix}ATP_${isAngled ? 'Angled' : 'Flat'}_Side`)
            }
        }

        BlenderNodes.switchMeshes(axle, activeAxleMeshes)
        BlenderNodes.switchMesh(axleConfig, AXLE_RATING_MESH_MAP[config.axleRating]?.[variant])
    }, [
        config.frontStyle, config.rampType, config.rearDoor, config.sideDoorsType,
        config.wheel, config.axle, config.axleRating, config.spreadAxle,
        config.cabinets, config.toolBox,
        config.leftSide, config.rightSide,
        config.stairs, config.batteryBox, config.vNoseETrack, config.angledLights,
        config.gullwingEscapeDoor, config.winchSystem, config.tieDowns,
        config.extendedTripleTongue, config.radioPackageSpeaker, config.rearSpoiler,
        config.climateControl, config.jacks, config.lights,
        frontStyle, rearDoors, sideDoors, extFinish, wheels, axle, axleConfig, addons,
        cabinetsGLB, cargo, spoiler
    ])
    // BlenderNodes.transformGeometry — tongue positioned at trailer front face
    const positionedTongue = useMemo(() => {
        let templateMesh = null
        tongue.traverse(child => { if (child.isMesh && !templateMesh) templateMesh = child })
        if (!templateMesh) return null
        const frontX = -(lengthFt * FEET_TO_M) / 2
        const transformed = BlenderNodes.transformGeometry(
            templateMesh.geometry.clone(),
            new THREE.Vector3(frontX, 0, 0),
        )
        return new THREE.Mesh(transformed, templateMesh.material)
    }, [tongue, lengthFt])

    const activeScenes = useMemo(() => {
        const scenes = [
            base, baseMeshes,
            frontStyle, rearDoors, sideDoors, extFinish,
            wheels,
            axleConfig,
            axle,
            addons,
            cargo,
        ]
        if (config.cabinets?.length > 0) scenes.push(cabinetsGLB)
        if (config.awning && config.awning !== 'none') scenes.push(awning)
        if (config.bathroom && config.bathroom !== 'none') scenes.push(bathroom)
        if (config.rearSpoiler) scenes.push(spoiler)
        return scenes
    }, [
        config.cabinets, config.awning, config.bathroom, config.rearSpoiler,
        base, baseMeshes, frontStyle, rearDoors, sideDoors, extFinish,
        wheels, axleConfig, axle, addons, cabinetsGLB, awning, bathroom, cargo, spoiler
    ])

    activeScenesRef.current = activeScenes

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
        // Log axle config attribute check once
        const axleScenes = { axle, axleConfig, wheels }
        Object.entries(axleScenes).forEach(([label, scene]) => {
            const logKey = `_axle_logged_${scene.uuid}`
            if (store.current.has(logKey)) return
            store.current.set(logKey, true)
            console.group(`[axle-attrs] ${label}`)
            scene.traverse(c => {
                if (!c.isMesh || !c.geometry) return
                const a = c.geometry.attributes
                const present = ['_leftselection','_rightselection','_rearselection','_topselection'].filter(k => !!a[k])
                console.log(`  "${c.name || c.uuid}" → ${present.length ? present.join(', ') : 'NO selection attrs'}`)
            })
            console.groupEnd()
        })

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
            {positionedTongue && <primitive object={positionedTongue} />}
        </group>
    )
}

Object.values(PATHS).forEach(path => useGLTF.preload(path))
