import { useRef, useEffect, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { applyDimensionDeformations, applyConcessionDoorDeformations, applyWindowDeformations } from '../utils/GeometryUtils'
import { BlenderNodes } from '../utils/BlenderNodes'
import { useConfigurator } from '../context/ConfiguratorContext'
import { patchTriplanarMaterial, generateBoxProjectionUVs } from '../utils/TriplanarMaterial'
import { MATERIAL_DEFS_NORM, STATIC_TEXTURE_PATHS, applyMaterialDef, isSpecialMaterial, normMatName } from '../utils/MaterialApplicator'
import { COLOR_OPTIONS } from '../constants/configData'

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
    bathroom: '/models/Packaging/Bathroom.glb',
    spoiler: '/models/Packaging/Rear Spoiler.glb',
    gullwingDoor: '/models/Packaging/Gullwing Door.glb',
    escapeDoor: '/models/Packaging/Escape Door.glb',
    concessionDoor: '/models/Packaging/Concession Door.glb',
    axleConfig: '/models/Structure/Axle Configs.glb',
    axle: '/models/Structure/Axle.glb',
    wheels: '/models/Structure/Wheels.glb',
    addons: '/models/Addons.glb',
    sink: '/models/Packaging/Sink.glb',
    windows: '/models/Packaging/Windows.glb',
}

// Tyre count is driven by the axle variant (2x = 2 Tyres, 3x = 3 Tyres)
// NOTE: wheel style (blacksteel vs aluminumradial) is a material difference only —
//       both styles share the same mesh geometry in Wheels.glb.
const WHEELS_VARIANT_MAP = {
    '2x': ['16-2_Standard_Wheels_6-Lug_1', '16-2_Standard_Wheels_6-Lug_2'],
    '3x': ['16-3_Standard_Wheels_6-Lug_1', '16-3_Standard_Wheels_6-Lug_2'],
}

// Maps frontStyle config value → exact Blender mesh name inside Front Style.glb
const FRONT_STYLE_MESH_MAP = {
    vnose24: 'V-Nose',
    flatfront: 'Flat_Front',
    slantvnose: 'Slant_V-Nose',
    extendedvnose: 'Extended_V-Nose',
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
    slantvnose: {
        cabinet: 'Slant_V-Nose_Cabinet',
        overhead: 'Slant_V-Nose_Overhead_Cabinet',
        toolboxSlot: 'Slant_V-Nose_Cabinet_Toolbox_Slot',
    },
    extendedvnose: {
        cabinet: 'Extended_V-Nose_Cabinet',
        overhead: 'Extended_V-Nose_Overhead_Cabinet',
        toolboxSlot: 'Extended_V-Nose_Cabinet_Toolbox_Slot',
    },
    gooseneck: {
        cabinet: 'Gooseneck_Cabinet',
        overhead: 'Gooseneck_Overhead_Cabinet',
        toolboxSlot: 'Gooseneck_Cabinet_Toolbox_Slot',
    }
}

// Maps axleRating + variant → mesh name inside Axle Configs.glb
const AXLE_RATING_MESH_MAP = {
    '3500lb-dropspring': { '2x': '2X_3500_lb_Leaf_Spring', '3x': '3X_3500_lb_Leaf_Spring' },
    '3500lb-torsion': { '2x': '2X_3500_lb_Torsion', '3x': '3X_3500_lb_Torsion' },
    '6000lb-dropspring': { '2x': '2X_6000_lb_Leaf_Spring', '3x': '3X_6000_lb_Leaf_Spring' },
    '6000lb-torsion': { '2x': '2X_6000_lb_Torsion', '3x': '3X_6000_lb_Torsion' },
    '7000lb-dropspring': { '2x': '2x_7000_lb_Leaf_Spring', '3x': '3x_7000_lb_Leaf_Spring' },
    '7000lb-torsion': { '2x': '2X_7000_lb_Torsion', '3x': '3X_7000_lb_Torsion' },
}

// "Generator Box Condition" node (see useEffect below).
const DOOR_MESH_MAP = {
    'none': {
        doorsL: 'Flat_Panel_L', doorsR: 'Flat_Panel_R',
        atpL: 'ATP_Flat_Panel_L', atpR: 'ATP_Flat_Panel_R',
    },
    '36x72': {
        doorsL: '36x72_Door_Panel_L', doorsR: '36x72_Door_Panel_R',
        atpL: 'ATP_36x72_Door_Panel_L', atpR: 'ATP_36x72_Door_Panel_R',
    },
    '36x78': {
        doorsL: '36x78_Door_Panel_L', doorsR: '36x78_Door_Panel_R',
        atpL: 'ATP_36x78_Door_Panel_L', atpR: 'ATP_36x78_Door_Panel_R',
    },
    '48x78': {
        doorsL: '48x78_Door_Panel_L', doorsR: '48x78_Door_Panel_R',
        atpL: 'ATP_48x78_Door_Panel_L', atpR: 'ATP_48x78_Door_Panel_R',
    },
    generatorbox: {
        doorsL: 'Generator_Box_Plate_L', doorsR: 'Generator_Box_Plate_R',
    },
    flatpanel: {
        doorsL: 'Flat_Panel_L', doorsR: 'Flat_Panel_R',
        atpL: 'ATP_Flat_Panel_L', atpR: 'ATP_Flat_Panel_R',
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
    superduty: 'Super_Duty_Ramp', 
    rampdropjacks: 'Heavy_Duty_Ramp_w_Flap' // Guessing the exact name based on typical exporter behavior
}

// ── Front Style addons: Super Switch per addon type ────────────────────────
// Mirrors the Blender "Front Style" node group.
// Super Switch selects the front-style-specific mesh variant for each addon.
// Angled Lights + V-Nose E Track have no variant (boolean gate only).
const FRONT_STYLE_ADDON_MESH_MAP = {
    vnose: {
        stairs: 'Stair_(V-Nose)',
        battery: 'ATP_Battery_Box(Flat_Front,_V-Nose,_Slant_V-Nose)',
    },
    vnose24: {
        stairs: 'Stair_(V-Nose)',
        battery: 'ATP_Battery_Box(Flat_Front,_V-Nose,_Slant_V-Nose)',
    },
    flatfront: {
        stairs: 'Stair_(Flat_Front)',
        battery: 'ATP_Battery_Box(Flat_Front,_V-Nose,_Slant_V-Nose)',
    },
    slantvnose: {
        stairs: 'Stair_(V-Nose)',
        battery: 'ATP_Battery_Box(Flat_Front,_V-Nose,_Slant_V-Nose)',
    },
    extendedvnose: {
        stairs: 'Stair_(V-Nose)',
        battery: 'ATP_Battery_Box(Extended_V-Nose)',
    },
    gooseneck: {
        stairs: 'Stair_(V-Nose)',
        battery: 'ATP_Battery_Box(Flat_Front,_V-Nose,_Slant_V-Nose)',
    },
}

// ── Shell color textures: config selectedColor → BaseColor file ──────────────
const SHELL_TEXTURES = {
    pink:       '/Materials/Pink_Shell_BaseColor.jpg',
    pewter:     '/Materials/Pewter_Shell_BaseColor.jpg',
    emerald:    '/Materials/Emerald Green_Shell_BaseColor.jpg',
    brandywine: '/Materials/Brandy Wine_Shell_BaseColor.jpg',
    sierra:     '/Materials/Sierra Desert_Shell_BaseColor.jpg',
    orange:     '/Materials/Orange_Shell_BaseColor.jpg',
    purple:     '/Materials/Purple_Shell_BaseColor.jpg',
    yellow:     '/Materials/Yellow_Shell_BaseColor.jpg',
    black:      '/Materials/Blackl_BaseColor.jpg',
    white:      '/Materials/White_BaseColor.jpg',
    electricblue:      '/Materials/Electric Blue_BaseColor.jpg',
    charcolgrey:      '/Materials/Charcoal Grey_BaseColor.jpg',
    silver:      '/Materials/Sillver_BaseColor.jpg',
    red:      '/Materials/Red_BaseColor.jpg',
    indigoblue:      '/Materials/Indigo Blue_BaseColor.jpg',
   electricgreen:      '/Materials/Electric Green_BaseColor.jpg',

}

// ── Extended Triple Tongue: 2 mesh variants (one per front style) ───────────
// Mirrors the Blender tongue node — same Super Switch pattern as stairs/battery.
// Mesh names match the GLB objects visible in the Outliner.
const TONGUE_MESH_MAP = {
    vnose: 'Extended_Triple_Tongue_V-Nose',
    flatfront: 'Extended_Triple_Tongue_Flat_Front',
    extendedvnose: 'Extended_Triple_Tongue(Extended_V-Nose)',
}


export default function ModularTrailerModel({ widthFt, lengthFt, heightFt, environment }) {
    const config = useConfigurator()
    const isFirstRender = useRef(true);
    const prevVisibleInteriorNodes = useRef(new Set());
    // console.log('[DEBUG RENDER] ModularTrailerModel rendering. sinkPackage is:', config.sinkPackage);

    const hasSinkForLShape = config.sinkPackage && config.sinkPackage !== 'none';
    const hasBaseCabinetForLShape = config.cabinets && config.cabinets.some(c => ['wallrun36', 'frontbase36'].includes(c));
    const hideLShape = hasSinkForLShape || hasBaseCabinetForLShape;
    const lShapeActive = config.lShapeCounter && !hideLShape;

    let hasCabinet = config.cabinets?.includes('frontbase36') 
    if (config.sinkPackage === 'sink' || lShapeActive || config.genDoor) {
        hasCabinet = false;
    }

    let effectiveDriverDoor = config.driverSideDoor || 'none'
    let effectivePassengerDoor = config.passengerSideDoor || 'none'

    if (parseFloat(config.length) < 24) {
        effectiveDriverDoor = 'none'
        effectivePassengerDoor = 'none'
    } else if (parseFloat(config.length) < 23.5) {
        if (effectiveDriverDoor !== 'none' && effectiveDriverDoor !== '36x72') effectiveDriverDoor = '36x72'
        if (effectivePassengerDoor !== 'none' && effectivePassengerDoor !== '36x72') effectivePassengerDoor = '36x72'
    }

    const isShortTrailer = parseFloat(config.length) < 24;
    const isShortTrailerForBathroom = parseFloat(config.length) < 28;
    const effectiveBathroom = isShortTrailerForBathroom ? 'none' : (config.bathroom || 'none');

    const isBlackout = config.exteriorFinish === 'blackout';
    const isCabinetBlackout = config.blackoutCabinetDoors;
    const getBlackoutMapped = (normName) => {
        if (isCabinetBlackout && (normName === 'matcabinets' || normName === 'whiteceremiccabinet')) return 'blackceremiccabinet';
        if (!isBlackout) return normName;
        if (normName === 'matshell' || normName === 'matshelldecal') return normName;
        if (normName.includes('atp') && !normName.includes('black')) return 'atpblack';
        if (normName === 'matstripes' || normName.includes('stripes') && !normName.includes('black')) return 'blackstripes';
        if (normName.includes('rim') && !normName.includes('black')) return 'blacksteelwheelrim';
        if (normName.includes('grates') && !normName.includes('black') && !normName.includes('decal')) return 'blackedmetallicgrates';
        return normName;
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
    const { scene: concessionDoorScene } = useGLTF(PATHS.concessionDoor)
    const { scene: axleConfig } = useGLTF(PATHS.axleConfig)
    const { scene: axle } = useGLTF(PATHS.axle)
    const { scene: wheels } = useGLTF(PATHS.wheels)
    const { scene: addons } = useGLTF(PATHS.addons)
    const { scene: cargo } = useGLTF(PATHS.cargo)
    const { scene: sinkScene } = useGLTF(PATHS.sink)
    const { scene: windowsScene } = useGLTF(PATHS.windows)

    const shellTextures = useTexture(SHELL_TEXTURES)
    const simpleNoise   = useTexture('/Materials/Simple_Noise.png')
    const normalMap = useTexture('/Materials/Metallic_Grates_Normal.png')
    normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping
    normalMap.colorSpace = THREE.NoColorSpace
    normalMap.needsUpdate = true
    const staticTextures = useTexture(STATIC_TEXTURE_PATHS)

    const store = useRef(new Map())
    const animRef = useRef({
        widthFt: 8.5,
        lengthFt: parseInt(config.length || '32'),
        heightFt: heightFt,
        awningFt: config.awning && config.awning.length > 0 ? parseInt(config.awning[0].match(/\d+/)?.[0] || '18') : 18,
        concessionWidthIn: parseInt(config.concessionWidth) || 72,
        concessionHeightIn: parseInt(config.concessionHeight) || 36
    })
    const targetRef = useRef({ 
        widthFt, 
        lengthFt, 
        heightFt, 
        awningFt: config.awning && config.awning.length > 0 ? parseInt(config.awning[0].match(/\d+/)?.[0] || '18') : 18
    })
    const dirtyRef = useRef(true)
    const activeScenesRef = useRef([])
    
    // Force a re-render after initial mount to bypass WebGL first-frame texture upload bugs
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        setIsMounted(true);
    }, []);
    const wheelCoverOriginalMatsRef = useRef(new Map())
    // Incremented by the visibility useEffect after every switchMesh/switchMeshes call.
    // child.visible is accurate when the proxy scan runs.
    const [visibilityVersion, setVisibilityVersion] = useState(0)
    const eTrackGroupRef = useRef(new THREE.Group())

    // DEBUG: log mesh names + material names as Three.js sees them after GLB load
    // and explicitly hide any proxy meshes so they don't render.
    useEffect(() => {
        const allScenes = { base, baseMeshes, frontStyle, rearDoors, sideDoors, extFinish, tongue, cabinetsGLB, awning, bathroom, spoiler, gullwingDoor, escapeDoorScene, concessionDoorScene, axleConfig, axle, wheels, addons, cargo, sinkScene }
        Object.entries(allScenes).forEach(([sceneName, scene]) => {
            if (!scene) return;
            
            // Fix Blender hierarchy for Addons (AC unit parenting vents)
            if (sceneName === 'addons') {
                const meshesToUnparent = [
                    'Non-Powered_Roof_Vent', 
                    'AC_Unit', 
                    'Mini_Split_AC', 
                    'Aluminum_Sidewall_Vents',
                    '110V_GFI_Receptacle_(20_AMP)',
                    '110V GFI Receptacle (20 AMP)',
                    '110V_Interior_Receptacle_(15_AMP)',
                    '110V Interior Receptacle (15 AMP)'
                ]
                meshesToUnparent.forEach(name => {
                    const mesh = scene.getObjectByName(name)
                    if (mesh && mesh.parent && mesh.parent !== scene) {
                        scene.attach(mesh)
                    }
                })
            }

            scene.traverse(child => {
                if (!child.isMesh) return
                
                // Hide proxy meshes
                if (child.name.toLowerCase().includes('proxy')) {
                    child.visible = false;
                }

                const mats = Array.isArray(child.material)
                    ? child.material.map(m => m.name || '(unnamed)')
                    : [child.material?.name || '(unnamed)']
                if (sceneName === 'wheels') {
                    // console.log(`[DEBUG ${sceneName}] mesh: "${child.name}" | materials: [${mats.join(', ')}] | userData:`, JSON.parse(JSON.stringify(child.userData)))
                }
                if (sceneName === 'rearDoors') {
                    // console.log(`[DEBUG rearDoors mesh available] "${child.name}"`);
                }
            })
        })
    }, [base, baseMeshes, frontStyle, rearDoors, sideDoors, extFinish, tongue, cabinetsGLB, awning, bathroom, spoiler, gullwingDoor, escapeDoorScene, concessionDoorScene, axleConfig, axle, wheels, addons, cargo])

    const applyUvScalingForScene = (scene) => {
        scene.traverse(child => {
            if (!child.isMesh || !child.geometry?.attributes.uv) return

            let customBaseScale = null
            let currentNode = child
            while (currentNode) {
                if (['Heavy_Duty_Ramp', 'Super_Duty_Ramp', 'Heavy_Duty_Ramp_w_Flap'].some(n => currentNode.name.includes(n))) {
                    customBaseScale = 30.0
                    break
                }
                if (currentNode.name.includes('Recessed_Tire_Box')) {
                    customBaseScale = 80.0
                    break
                }
                if (currentNode.name.toLowerCase().includes('vented_door_only')) {
                    customBaseScale = 50.0
                    break
                }
                currentNode = currentNode.parent
            }
            
            let isScaledMesh = customBaseScale !== null
            
            const mats = Array.isArray(child.material) ? child.material : [child.material]
            const needsUvScale = mats.some(mat => {
                const normalized = mat?.name?.replace(/[\s_]+/g, '').toLowerCase() || ''
                return normalized.includes('uvscale') || normalized.includes('rubberflooring') || normalized.includes('atp') || normalized.includes('nudo')
            })

            if (!needsUvScale && !isScaledMesh) return
            const geo = child.geometry
            const uv = geo.attributes.uv

            if (!geo.userData.uvScaleOriginals) {
                geo.userData.uvScaleOriginals = uv.array.slice()
            }
            const originalUvs = geo.userData.uvScaleOriginals

            geo.computeBoundingBox()
            const box = geo.boundingBox
            if (!box) return

            const sizeX = box.max.x - box.min.x
            const sizeY = box.max.y - box.min.y
            const sizeZ = box.max.z - box.min.z

            // Dynamically pick the two largest dimensions to prevent extreme stretching 
            // if the mesh is oriented along the X axis instead of the Z axis.
            const sizes = [sizeX, sizeY, sizeZ].sort((a, b) => b - a)
            const distX = sizes[0]
            const distY = sizes[1]
            
            // This is the base scale from your Blender material's Mapping node
            // Tweak this number if the texture is globally too small or large
            let baseScale = 10.0 
            if (isScaledMesh) {
                baseScale = customBaseScale
                // console.log(`[DEBUG UV SCALE] Matched Scaled Mesh: ${child.name}, Setting baseScale: ${baseScale}`);
            }
            
            const scaleX = distX / 2.02
            const scaleY = distY / 1.92 
            
            if (isScaledMesh) {
                // console.log(`[DEBUG UV SCALE] ${child.name} - scaleX: ${scaleX}, scaleY: ${scaleY}, distX: ${distX}, distY: ${distY}`);
            }

            for (let i = 0; i < uv.count; i++) {
                // X distance divided by 2.02
                // Y distance divided by 1.92
                uv.setXY(i, originalUvs[i * 2] * scaleX * baseScale, originalUvs[i * 2 + 1] * scaleY * baseScale)
            }

            uv.needsUpdate = true
        })
    }

    // -- Apply UV Scaling for materials containing 'uvscale' ------------------
    // Matches the Blender geometry node logic: (Bounding Box Diagonal Distance) / 2.203 -> Scale Y
    useEffect(() => {
        const allScenes = [
            base, baseMeshes, frontStyle, rearDoors, sideDoors, extFinish,
            tongue, cabinetsGLB, awning, bathroom, spoiler, gullwingDoor,
            escapeDoorScene, concessionDoorScene, sinkScene, windowsScene, axleConfig, axle, wheels, addons, cargo,
        ]

        allScenes.forEach(applyUvScalingForScene)
    }, [
        base, baseMeshes, frontStyle, rearDoors, sideDoors, extFinish,
        tongue, cabinetsGLB, awning, bathroom, spoiler, gullwingDoor,
        escapeDoorScene, concessionDoorScene, sinkScene, windowsScene, axleConfig, axle, wheels, addons, cargo,
    ])
    // Hide ground/shadow catcher plane when HDR is active to prevent z-fighting
    useEffect(() => {
        const allScenes = [base, baseMeshes, addons]
        const isHdr = environment?.endsWith('.hdr') || environment?.endsWith('.exr')
        allScenes.forEach((scene) => {
            scene.traverse((child) => {
                if (child.isMesh) {
                    const name = child.name.toLowerCase()
                    if (name.includes('plane') || name.includes('ground') || name.includes('shadowcatcher')) {
                        child.visible = !isHdr
                    }
                }
            })
        })
    }, [environment, base, baseMeshes, addons])

    // ── Apply shell color texture + Simple_Noise bump to every MAT_Shell slot ─
    // Checks mesh.userData.useTriplanar per mesh:
    //   true  → patchTriplanarMaterial (world-space, no UV stretch on deformed geometry)
    //   false → standard UV mapping (mat.map / mat.bumpMap set directly)
    // Simple_Noise.jpg is applied as a bumpMap (mirrors Blender Bump node:
    //   Strength=1.0, Distance=0.001, Color Space=Non-Color)
    useEffect(() => {
        const texture = shellTextures[config.selectedColor]
        if (!texture) return
        texture.colorSpace = THREE.SRGBColorSpace
        texture.flipY = false
        texture.wrapS = THREE.RepeatWrapping
        texture.wrapT = THREE.RepeatWrapping
        texture.needsUpdate = true

        // Configure Simple_Noise as a bump map (non-color, repeating)
        simpleNoise.colorSpace = THREE.NoColorSpace
        simpleNoise.flipY = false
        simpleNoise.wrapS = THREE.RepeatWrapping
        simpleNoise.wrapT = THREE.RepeatWrapping
        simpleNoise.repeat.set(3.0, 3.0)
        simpleNoise.needsUpdate = true

        const shellHex = COLOR_OPTIONS.find(c => c.id === config.selectedColor)?.color || '#7B7D81'

        const allScenes = [
            base, baseMeshes, frontStyle, rearDoors, sideDoors, extFinish,
            tongue, cabinetsGLB, awning, bathroom, spoiler, gullwingDoor,
            escapeDoorScene, concessionDoorScene, sinkScene, windowsScene, axleConfig, axle, wheels, addons, cargo,
        ]
        allScenes.forEach((scene, sceneIdx) => {
            scene.traverse(child => {
                if (!child.isMesh) return
                const isArray = Array.isArray(child.material)
                const mats = isArray ? child.material : [child.material]

                mats.forEach((mat, i) => {
                    let normalized = normMatName(mat?.name)
                    const isDecal = normalized.endsWith('decal')
                    if (isDecal) normalized = normalized.slice(0, -5)
                    if (normalized !== 'matshell') return

                    // default to triplanar for all shell materials to ensure consistency
                    const useTriplanar = true
                    

                    if (useTriplanar && !isDecal && !isBlackout) {
                        // Clone base material preserving GLB PBR properties, then patch shader
                        const base = mat.clone()
                        base.map         = texture
                        base.color       = new THREE.Color(0xffffff)
                        base.metalness   = 0.0
                        base.normalMap   = simpleNoise
                        base.normalScale = new THREE.Vector2(0.07, 0.07)
                        base.roughness   = 0.05
                        const patched = patchTriplanarMaterial(base, 0.06)
                        if (isArray) child.material[i] = patched
                        else child.material = patched
                    } else if (!isDecal && isBlackout) {
                        let next = mat.clone()
                        const origDef = MATERIAL_DEFS_NORM.get('blackshell')
                        if (origDef) {
                            next = applyMaterialDef(next, origDef, staticTextures)
                        }
                        if (isArray) child.material[i] = next
                        else child.material = next
                    } else {
                        let next = mat.clone()
                        if (isDecal) {
                            const origDef = MATERIAL_DEFS_NORM.get(normalized + 'decal')
                            if (origDef) {
                                next = applyMaterialDef(next, origDef, staticTextures)
                            }
                            next.color.set(isBlackout ? '#1a1a1a' : shellHex)
                        } else {
                            next.map         = texture
                            next.color       = new THREE.Color(0xffffff)
                            next.metalness   = 0.0
                            next.normalMap   = simpleNoise
                            next.normalScale = new THREE.Vector2(0.07, 0.07)
                            next.roughness   = 0.05
                        }
                        if (isArray) child.material[i] = next
                        else child.material = next
                    }
                })
            })
        })
    }, [
        config.selectedColor, shellTextures, simpleNoise, isBlackout,
        base, baseMeshes, frontStyle, rearDoors, sideDoors, extFinish,
        tongue, cabinetsGLB, awning, bathroom, spoiler, gullwingDoor,
        escapeDoorScene, concessionDoorScene, sinkScene, windowsScene, axleConfig, axle, wheels, addons, cargo,
    ])

    // ── Apply Metallic Grates normal map ─────────────────────────────────────
    useEffect(() => {
        normalMap.colorSpace = THREE.NoColorSpace
        normalMap.flipY = false
        normalMap.wrapS = THREE.RepeatWrapping
        normalMap.wrapT = THREE.RepeatWrapping
        normalMap.needsUpdate = true  // reupload texture with new wrap/colorSpace to GPU

        

        const applyGrates = (child, mat, i, isArray, isDecal, isUvScale) => {
            const base = mat.clone()
            if (!isDecal) {
                base.normalMap   = normalMap
                base.normalScale = new THREE.Vector2(4.0, 4.0)
                base.metalness   = 1
                base.roughness   = 0.1
                
                let finalMat = base;
                // Only apply triplanar if it's NOT the uvscale material
                if (!isUvScale) {
                    finalMat = patchTriplanarMaterial(base, 10)
                } else {
                    const scaledNormal = normalMap.clone()
                    scaledNormal.repeat.set(280, 280)
                    scaledNormal.needsUpdate = true
                    finalMat.normalMap = scaledNormal
                }
                
                finalMat.needsUpdate = true
                if (isArray) child.material[i] = finalMat
                else child.material = finalMat
            } else {
                base.metalness   = 1
                base.roughness   = 0.1
                if (isArray) child.material[i] = base
                else child.material = base
            }
        }

        const allScenes = [
            base, baseMeshes, frontStyle, rearDoors, sideDoors, extFinish,
            tongue, cabinetsGLB, awning, bathroom, spoiler, gullwingDoor,
            escapeDoorScene, concessionDoorScene, sinkScene, windowsScene, axleConfig, axle, wheels, addons, cargo,
        ]

        // Apply to meshes whose material name normalises to 'metallicgrates' or 'metallicgratesuvscale'
        allScenes.forEach(scene => {
            scene.traverse(child => {
                if (!child.isMesh) return
                const isArray = Array.isArray(child.material)
                const mats = isArray ? child.material : [child.material]
                mats.forEach((mat, i) => {
                    if (!mat) return
                    let normalized = mat.name?.replace(/[\s_]+/g, '').toLowerCase()
                    const isDecal = normalized.endsWith('decal')
                    if (isDecal) normalized = normalized.slice(0, -5)
                    
                    if (normalized === 'metallicgrates' || normalized === 'metallicgratesuvscale' || normalized === 'matatp' || normalized === 'matatpuvscale') {
                        const isUvScale = normalized === 'metallicgratesuvscale' || normalized === 'matatpuvscale';
                        
                        // Fix material mutation bug: cache the original GLB material
                        if (!child.userData.origMatsAtp) child.userData.origMatsAtp = {};
                        if (!child.userData.origMatsAtp[i]) {
                            child.userData.origMatsAtp[i] = mat.clone();
                        }
                        let originalMat = child.userData.origMatsAtp[i].clone();

                        if (isDecal) {
                            const origDef = MATERIAL_DEFS_NORM.get(normalized + 'decal');
                            if (origDef) {
                                originalMat = applyMaterialDef(originalMat.clone(), origDef, staticTextures);
                            }
                        }
                        
                        let overrideDef = null;
                        // Avoid applying exterior protection materials to the interior floor or ceiling
                        const nameLower = child.name.toLowerCase();
                        const isInterior = nameLower.includes('interior') || nameLower.includes('floor') || nameLower.includes('cealing');
                        
                        if (!isInterior && !isDecal) {
                            if (isBlackout) {
                                overrideDef = MATERIAL_DEFS_NORM.get('atpblack');
                            } else if (config.protectionType === 'anodized') {
                                overrideDef = MATERIAL_DEFS_NORM.get('atpanodized');
                            } else if (config.protectionType === 'coloredmetal') {
                                overrideDef = MATERIAL_DEFS_NORM.get('atpcoloredmetal');
                            } else if (normalized.includes('atp')) {
                                overrideDef = MATERIAL_DEFS_NORM.get('atpsilver');
                            }
                        }

                        if (overrideDef) {
                            try {
                                let newMat = applyMaterialDef(originalMat, overrideDef, staticTextures);
                                if (newMat) {
                                    // For Colored Metal, map the base color to match the trailer shell color
                                    if (config.protectionType === 'coloredmetal') {
                                        const shellColor = (config.selectedColor || 'white').toLowerCase();
                                        const matchedTexture = shellTextures[shellColor];
                                        
                                        if (matchedTexture) {
                                            newMat.map = matchedTexture;
                                            newMat.color.setHex(0xffffff); // Ensure base color doesn't tint the texture
                                        }
                                    }

                                    if (!isDecal) {
                                        if (!isUvScale) {
                                            newMat = patchTriplanarMaterial(newMat, 10);
                                        } else {
                                            const scaleFactor = normalized === 'matatpuvscale' ? 2 : 280;
                                            if (newMat.map) {
                                                const scaledMap = newMat.map.clone();
                                                scaledMap.repeat.set(scaleFactor, scaleFactor);
                                                scaledMap.needsUpdate = true;
                                                newMat.map = scaledMap;
                                            }
                                            if (newMat.normalMap) {
                                                const scaledNormal = newMat.normalMap.clone();
                                                scaledNormal.repeat.set(scaleFactor, scaleFactor);
                                                scaledNormal.needsUpdate = true;
                                                newMat.normalMap = scaledNormal;
                                            }
                                        }
                                    }
                                    newMat.needsUpdate = true;
                                    if (isArray) child.material[i] = newMat;
                                    else child.material = newMat;
                                }
                            } catch (err) {
                                // console.error(`[DEBUG CRASH] Error applying override to ${child.name}:`, err);
                            }
                        } else {
                            // Removed incorrect color overrides for Side_Panel_ATP
                            
                            applyGrates(child, originalMat, i, isArray, isDecal, isUvScale);

                            // Sync decal colors with the selected protection type
                            if (isDecal && !isInterior) {
                                const targetMat = isArray ? child.material[i] : child.material;
                                if (config.protectionType === 'coloredmetal') {
                                    const shellHex = COLOR_OPTIONS.find(c => c.id === config.selectedColor)?.color || '#ffffff';
                                    targetMat.color.set(shellHex);
                                    targetMat.metalness = 0.1;
                                    targetMat.roughness = 0.5;
                                } else if (config.protectionType === 'anodized') {
                                    targetMat.color.set('#d0d0d0');
                                    targetMat.metalness = 0.8;
                                    targetMat.roughness = 0.3;
                                }
                                targetMat.needsUpdate = true;
                            }
                        }
                    }
                })
            })
        })
    }, [
        isMounted,
        config.protectionType,
        config.selectedColor,
        shellTextures,
        staticTextures,
        normalMap,
        isBlackout,
        base, baseMeshes, frontStyle, rearDoors, sideDoors, extFinish,
        tongue, cabinetsGLB, awning, bathroom, spoiler, gullwingDoor,
        escapeDoorScene, concessionDoorScene, sinkScene, windowsScene, axleConfig, axle, wheels, addons, cargo,
    ])

    // ── Apply Metallic Guard to MAT_WheelCover (ATP on) or MAT_Shell look (ATP off) ──
    useEffect(() => {
        const texture = shellTextures[config.selectedColor]

        const allScenes = [
            base, baseMeshes, frontStyle, rearDoors, sideDoors, extFinish,
            tongue, cabinetsGLB, awning, bathroom, spoiler, gullwingDoor,
            escapeDoorScene, concessionDoorScene, sinkScene, windowsScene, axleConfig, axle, wheels, addons, cargo,
        ]

        allScenes.forEach(scene => {
            scene.traverse(child => {
                if (!child.isMesh) return
                const isArray = Array.isArray(child.material)
                const mats = isArray ? child.material : [child.material]

                mats.forEach((mat, i) => {
                    if (!mat) return
                    const normalized = mat.name?.replace(/[\s_]+/g, '').toLowerCase()
                    if (normalized !== 'matwheelcover' && normalized !== 'matwheelcoveruvscale') return

                    // Always store the GLB original on first encounter
                    if (!child.userData.origMatsWheelCover) child.userData.origMatsWheelCover = {};
                    if (!child.userData.origMatsWheelCover[i]) {
                        child.userData.origMatsWheelCover[i] = mat.clone();
                    }
                    const original = child.userData.origMatsWheelCover[i];

                    if (config.axleAtp) {
                        let next = original.clone()
                        
                        // Increase scale for corvette fender
                        const isCorvette = child.name.toLowerCase().includes('corvette');
                        const repeatScale = isCorvette ? 5 : 20;

                        if (isBlackout) {
                            const overrideDef = MATERIAL_DEFS_NORM.get('atpblack');
                            if (overrideDef) {
                                next = applyMaterialDef(next, overrideDef, staticTextures);
                                if (next.normalMap) {
                                    const scaledNormal = next.normalMap.clone();
                                    scaledNormal.repeat.set(repeatScale, repeatScale);
                                    scaledNormal.needsUpdate = true;
                                    next.normalMap = scaledNormal;
                                }
                            }
                        } else {
                            normalMap.flipY = false
                            normalMap.repeat.set(repeatScale, repeatScale)
                            next.normalMap   = normalMap
                            next.normalScale = new THREE.Vector2(1.0, 1.0)
                            next.metalness   = 1
                            next.roughness   = 0.1
                        }
                        next.needsUpdate = true
                        if (isArray) child.material[i] = next
                        else child.material = next
                    } else {
                        if (!texture) return
                        const next = original.clone()
                        next.map         = texture
                        next.normalMap   = simpleNoise
                        next.normalScale = new THREE.Vector2(0.05, 0.05)
                        next.roughness   = 0.1
                        next.needsUpdate = true
                        if (isArray) child.material[i] = next
                        else child.material = next
                    }
                })
            })
        })
    }, [
        config.axleAtp, config.selectedColor, shellTextures, simpleNoise, normalMap, isBlackout,
        base, baseMeshes, frontStyle, rearDoors, sideDoors, extFinish,
        tongue, cabinetsGLB, awning, bathroom, spoiler, gullwingDoor,
        escapeDoorScene, concessionDoorScene, sinkScene, windowsScene, axleConfig, axle, wheels, addons, cargo,
    ])

    // ── Apply Rim material to MAT_Rim based on wheel selection ───────────────
    useEffect(() => {
        let rimMatName = config.wheelType === 'spideraluminum' ? 'aluminiumradialrim'
                       : config.wheelType === 'blacksteel' ? 'blacksteelwheelrim' 
                       : 'standardsilverrim'
        
        if (isBlackout) rimMatName = 'blacksteelwheelrim';

        const def = MATERIAL_DEFS_NORM.get(rimMatName)
        // console.log('[DEBUG RIMS] wheelType:', config.wheelType, '| rimMatName:', rimMatName)
        // console.log('[DEBUG RIMS] def found:', !!def, def)
        
        if (!def) return

        let rimMeshesFound = 0;
        ;[wheels, axleConfig, addons].forEach((scene, sceneIdx) => {
            scene.traverse(child => {
                if (!child.isMesh) return
                const isArray = Array.isArray(child.material)
                const mats = isArray ? child.material : [child.material]
                mats.forEach((mat, i) => {
                    if (!mat) return
                    const normalized = mat.name?.replace(/[\s_]+/g, '').toLowerCase()
                    if (normalized !== 'matrim') return
                    
                    rimMeshesFound++;
                    // console.log(`[DEBUG RIMS] Mesh: ${child.name} | Original mat: ${mat.name}`);
                    
                    let next = applyMaterialDef(mat, def, staticTextures)
                    next.side = THREE.DoubleSide
                    next.needsUpdate = true

                    // console.log(`[DEBUG RIMS] New map applied?`, !!next.map, `| Color:`, next.color.getHexString());

                    if (isArray) child.material[i] = next
                    else child.material = next
                })
            })
        })
        // console.log(`[DEBUG RIMS] Total rim meshes updated:`, rimMeshesFound);
    }, [config.wheelType, wheels, axleConfig, addons, staticTextures, isBlackout])

    // ── Apply Floor Overlay material to MAT_Interior_Flooring ───────────────
    useEffect(() => {
        let floorMatName = 'matinteriorflooring' // Default fallback to original JSON definition
        if (config.floorOverlay === 'atp') floorMatName = 'atpinteriorflooring'
        else if (config.floorOverlay === 'rtp') floorMatName = 'rtpinteriorflooring'
        else if (config.floorOverlay === 'coin') floorMatName = 'coininteriorflooring'
        else if (config.floorOverlay === 'tile') floorMatName = 'tileinteriorflooring'

        const def = MATERIAL_DEFS_NORM.get(floorMatName)
        if (!def) return

        const allScenes = [
            base, baseMeshes, frontStyle, rearDoors, sideDoors, extFinish,
            tongue, cabinetsGLB, awning, bathroom, spoiler, gullwingDoor,
            escapeDoorScene, concessionDoorScene, sinkScene, windowsScene, axleConfig, axle, wheels, addons, cargo,
        ]

        allScenes.forEach((scene) => {
            if (!scene) return
            scene.traverse(child => {
                if (!child.isMesh) return
                const isArray = Array.isArray(child.material)
                const mats = isArray ? child.material : [child.material]
                mats.forEach((mat, i) => {
                    if (!mat) return
                    const normalized = mat.name?.replace(/[\s_]+/g, '').toLowerCase()
                    if (normalized !== 'matinteriorflooring') return
                    
                    let next = applyMaterialDef(mat, def, staticTextures)
                    
                    const nameLower = child.name.toLowerCase()
                    
                    let scale = 5
                    if (config.floorOverlay === 'coin') scale = 15
                    else if (config.floorOverlay === 'tile') scale = 2
                    
                    next = patchTriplanarMaterial(next, scale)
                    
                    next.needsUpdate = true

                    if (isArray) child.material[i] = next
                    else child.material = next
                })
            })
        })
    }, [config.floorOverlay, base, baseMeshes, frontStyle, rearDoors, sideDoors, extFinish, tongue, cabinetsGLB, awning, bathroom, spoiler, gullwingDoor, escapeDoorScene, concessionDoorScene, sinkScene, windowsScene, axleConfig, axle, wheels, addons, cargo, staticTextures])

    // ── Apply Ceiling material to MAT_Interior_Cealing ───────────────
    useEffect(() => {
        let ceilMatName = 'matinteriorcealing' // Default fallback to original JSON definition
        if (config.ceiling === 'white_metal_ceiling') ceilMatName = 'whitemetalinteriorcealing'
        else if (config.ceiling === 'atp_ceiling') ceilMatName = 'atpinteriorcealing'
        else if (config.ceiling === 'thermaply') ceilMatName = 'thermalplywoodinteriorcealing'

        const def = MATERIAL_DEFS_NORM.get(ceilMatName)
        if (!def) return

        const allScenes = [
            base, baseMeshes, frontStyle, rearDoors, sideDoors, extFinish,
            tongue, cabinetsGLB, awning, bathroom, spoiler, gullwingDoor,
            escapeDoorScene, concessionDoorScene, sinkScene, windowsScene, axleConfig, axle, wheels, addons, cargo,
        ]

        allScenes.forEach((scene) => {
            if (!scene) return
            scene.traverse(child => {
                if (!child.isMesh) return
                const isArray = Array.isArray(child.material)
                const mats = isArray ? child.material : [child.material]
                mats.forEach((mat, i) => {
                    if (!mat) return
                    const normalized = mat.name?.replace(/[\s_]+/g, '').toLowerCase()
                    if (normalized !== 'matinteriorcealing') return
                    
                    let next = applyMaterialDef(mat, def, staticTextures)
                    
                    const nameLower = child.name.toLowerCase()
                    const scaleValue = ceilMatName === 'atpinteriorcealing' ? 5 : 1
                    next = patchTriplanarMaterial(next, scaleValue, true)
                    
                    next.needsUpdate = true

                    if (isArray) child.material[i] = next
                    else child.material = next
                })
            })
        })
    }, [config.ceiling, base, baseMeshes, frontStyle, rearDoors, sideDoors, extFinish, tongue, cabinetsGLB, awning, bathroom, spoiler, gullwingDoor, escapeDoorScene, concessionDoorScene, sinkScene, windowsScene, axleConfig, axle, wheels, addons, cargo, staticTextures])

    // ── Apply Wall material to MAT_Interior_Walls ───────────────
    useEffect(() => {
        let wallMatName = 'matinteriorwalls' // Default fallback to original JSON definition
        if (config.walls === 'white_metal_walls') wallMatName = 'whitemetalinteriorwalls'
        else if (config.walls === '34plywood') wallMatName = 'thermalplywoodinteriorwalls' // Using Thermal Plywood for 3/4 plywood option
        else if (config.walls === '38plywood') wallMatName = 'plywoodinteriorwalls' // Explicit mapping for 3/8 plywood

        const def = MATERIAL_DEFS_NORM.get(wallMatName)
        if (!def) return

        const allScenes = [
            base, baseMeshes, frontStyle, rearDoors, sideDoors, extFinish,
            tongue, cabinetsGLB, awning, bathroom, spoiler, gullwingDoor,
            escapeDoorScene, concessionDoorScene, sinkScene, windowsScene, axleConfig, axle, wheels, addons, cargo,
        ]

        allScenes.forEach((scene) => {
            if (!scene) return
            scene.traverse(child => {
                if (!child.isMesh) return
                const isArray = Array.isArray(child.material)
                const mats = isArray ? child.material : [child.material]
                mats.forEach((mat, i) => {
                    if (!mat) return
                    const normalized = mat.name?.replace(/[\s_]+/g, '').toLowerCase()
                    if (normalized !== 'matinteriorwalls') return
                    
                    let next = applyMaterialDef(mat, def, staticTextures)
                    
                    const nameLower = child.name.toLowerCase()
                    next = patchTriplanarMaterial(next)
                    
                    next.needsUpdate = true

                    if (isArray) child.material[i] = next
                    else child.material = next
                })
            })
        })
    }, [config.walls, base, baseMeshes, frontStyle, rearDoors, sideDoors, extFinish, tongue, cabinetsGLB, awning, bathroom, spoiler, gullwingDoor, escapeDoorScene, concessionDoorScene, sinkScene, windowsScene, axleConfig, axle, wheels, addons, cargo, staticTextures])

    // ── Apply all standard materials driven by material_data.json ────────────
    // Only MAT_Shell, Metallic Grates, MAT_WheelCover, MAT_Rim remain special.
    useEffect(() => {
        const allScenes = [
            base, baseMeshes, frontStyle, rearDoors, sideDoors, extFinish,
            tongue, cabinetsGLB, awning, bathroom, spoiler, gullwingDoor,
            escapeDoorScene, concessionDoorScene, sinkScene, windowsScene, axleConfig, axle, wheels, addons, cargo,
        ]
        allScenes.forEach(scene => {
            const isGooseneckScene = (scene === frontStyle) && config.frontStyle && config.frontStyle.toLowerCase().includes('gooseneck');
            
            scene.traverse(child => {
                if (!child.isMesh) return
                const isArray = Array.isArray(child.material)
                const mats = isArray ? child.material : [child.material]
                mats.forEach((mat, i) => {
                    if (!mat || isSpecialMaterial(mat.name)) return
                    if (!child.userData.origMatsGen) child.userData.origMatsGen = {};
                    if (!child.userData.origMatsGen[i]) {
                        child.userData.origMatsGen[i] = mat.clone();
                    }
                    const originalMat = child.userData.origMatsGen[i];

                    let mappedName = getBlackoutMapped(normMatName(originalMat.name));
                    
                    // User wanted MAT_Cabinets to retain its raw GLB material
                    if (mappedName === 'matcabinets') {
                        if (isArray) child.material[i] = originalMat
                        else child.material = originalMat
                        return;
                    }
                    
                    const def = MATERIAL_DEFS_NORM.get(mappedName)
                    
                    if (!def) {
                        if (isArray) child.material[i] = originalMat
                        else child.material = originalMat
                        return
                    }
                    
                    let next = applyMaterialDef(originalMat, def, staticTextures)
                    
                    // Scale the cabinet wood texture so the grain isn't stretched
                    if (mappedName === 'cabinetwood' && next.map) {
                        next.map = next.map.clone();
                        next.map.repeat.set(25, 25);
                        next.map.wrapS = THREE.RepeatWrapping;
                        next.map.wrapT = THREE.RepeatWrapping;
                        next.map.needsUpdate = true;
                    }
                    
                    const isGooseneckMesh = isGooseneckScene || child.name.toLowerCase().includes('gooseneck');
                    
                    if (normMatName(mat.name) === 'matstripes' && !isGooseneckMesh) {
                        // Custom patch for stripes: preserves vertical UV to fit the trim perfectly,
                        // and uses world X/Z for horizontal wrap to prevent stretching on resize.
                        next.onBeforeCompile = (shader) => {
                            shader.uniforms.uScale = { value: 1.5 } // 1.5 is the sweet spot between 0.5 (too big) and 3.0 (too small)
                            shader.vertexShader = shader.vertexShader.replace(
                                '#include <common>',
                                `#include <common>\nvarying vec3 vWorldPos;\nvarying vec3 vWorldNormal;`
                            ).replace(
                                '#include <beginnormal_vertex>',
                                `#include <beginnormal_vertex>\nvWorldNormal = normalize(mat3(modelMatrix) * objectNormal);`
                            ).replace(
                                '#include <begin_vertex>',
                                `#include <begin_vertex>\nvWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
                            )
                            shader.fragmentShader = shader.fragmentShader.replace(
                                '#include <common>',
                                `#include <common>\nvarying vec3 vWorldPos;\nvarying vec3 vWorldNormal;\nuniform float uScale;`
                            ).replace(
                                '#include <map_fragment>',
                                `#ifdef USE_MAP
                                vec3 an = abs(vWorldNormal);
                                float worldU = (an.z > an.x) ? vWorldPos.x : vWorldPos.z;
                                vec2 stripeUv = vec2(worldU * uScale, vMapUv.y);
                                vec4 sampledDiffuseColor = texture2D(map, stripeUv);
                                #ifdef DECODE_VIDEO_TEXTURE
                                sampledDiffuseColor = vec4(mix(pow(sampledDiffuseColor.rgb * 0.9478672986 + vec3(0.0521327014), vec3(2.4)), sampledDiffuseColor.rgb * 0.0773993808, vec3(lessThanEqual(sampledDiffuseColor.rgb, vec3(0.04045)))), sampledDiffuseColor.w);
                                #endif
                                diffuseColor *= sampledDiffuseColor;
                                #endif`
                            )
                        }
                        next.needsUpdate = true
                    }

                    if (isArray) child.material[i] = next
                    else child.material = next
                })
            })
        })
    }, [
        config.frontStyle, staticTextures, isBlackout, config.blackoutCabinetDoors,
        base, baseMeshes, frontStyle, rearDoors, sideDoors, extFinish,
        tongue, cabinetsGLB, awning, bathroom, spoiler, gullwingDoor,
        escapeDoorScene, concessionDoorScene, sinkScene, windowsScene, axleConfig, axle, wheels, addons, cargo,
    ])

    // Compute global bounds from base scenes
    useEffect(() => {
        if (store.current.has('_globalZCenter')) return
        let gMinZ = Infinity, gMaxZ = -Infinity, gMinX = Infinity, gMaxX = -Infinity
            ;[base, baseMeshes].forEach(scene =>
                scene.traverse(child => {
                    if (!child.isMesh || !child.geometry?.attributes.position) return
                    const pos = child.geometry.attributes.position
                    const original = child.geometry.userData.originalPosition || pos.array
                    for (let i = 0; i < pos.count; i++) {
                        const x = original[i * 3], z = original[i * 3 + 2]
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
        let gnMeshes = [];
        frontStyle.traverse(c => {
            if (c.isMesh && c.name.toLowerCase().includes('gooseneck')) {
                gnMeshes.push(c.name);
            }
        });

        if (config.width === '8.5ftgn') {
            BlenderNodes.switchMeshes(frontStyle, gnMeshes);
            // console.log(`[DEBUG GOOSENECK] Switched to gooseneck meshes:`, gnMeshes);
        } else {
            let targetFrontMesh = FRONT_STYLE_MESH_MAP[config.frontStyle];
            BlenderNodes.switchMesh(frontStyle, targetFrontMesh);
        }

        // ── Rear Doors: mirrors the Blender node graph ───────────────────────
        // Menu Switch → selects the correct mesh from REAR_DOOR_MESH_MAP
        // Rear Door boolean (Group Input) → gates the entire output on/off
        const rearDoorMesh = REAR_DOOR_MESH_MAP[config.rampType] ?? REAR_DOOR_MESH_MAP.barndoors
        
        const activeRearDoorMeshes = []
        if (config.rearDoor && rearDoorMesh) {
            activeRearDoorMeshes.push(rearDoorMesh)
        }
        
        // Add ATP Barn Door (size-driven) if atpRamp is true and double rear doors is selected
        if (config.atpRamp && config.rampType === 'doublereardoors') {
            const atpBarnSize = config.protectionSize || '24'
            activeRearDoorMeshes.push(`ATP Barn Door ${atpBarnSize}in`)
            activeRearDoorMeshes.push(`ATP_Barn_Door_${atpBarnSize}in`)
        }
        
        BlenderNodes.switchMeshes(rearDoors, activeRearDoorMeshes)

        // ── Base Meshes: Escape Door condition ────────────────────────
        // Mirrors the Blender "Base" node group.
        // Group Input -> Base Interior goes into Super Toggle, gated by Escape Door menu index.
        const baseInterior = baseMeshes.getObjectByName('Base_Interior') || baseMeshes.getObjectByName('Base Interior')
        const baseInteriorL = baseMeshes.getObjectByName('Base_Interior_L') || baseMeshes.getObjectByName('Base Interior L')
        const baseInteriorR = baseMeshes.getObjectByName('Base_Interior_R') || baseMeshes.getObjectByName('Base Interior R')
        const leftWall = baseMeshes.getObjectByName('Left_Wall') || baseMeshes.getObjectByName('Left side wall Vanilla')
        const rightWall = baseMeshes.getObjectByName('Right_Wall') || baseMeshes.getObjectByName('Right side wall Vanilla')
        
        const hideBaseInterior = config.escapeDoor === 'gullwing' || (config.concessionDoor && config.concessionDoor !== 'none');
        if (baseInterior) baseInterior.visible = !hideBaseInterior;
        if (baseInteriorL) baseInteriorL.visible = config.escapeDoor !== 'gullwing' && config.concessionDoor !== 'driver';
        if (baseInteriorR) baseInteriorR.visible = config.concessionDoor !== 'passenger';
        if (leftWall) leftWall.visible = config.escapeDoor !== 'gullwing' && config.concessionDoor !== 'driver';
        if (rightWall) rightWall.visible = config.concessionDoor !== 'passenger';

        // ── Concession Door ───────────────────────────────────────────────
        const activeConcessionDoorMeshes = [];
        if (config.concessionDoor === 'driver') {
            activeConcessionDoorMeshes.push('Concession Door L', 'Concession_Door_L');
            activeConcessionDoorMeshes.push('Base Interior(Concession Door) L', 'Base_Interior(Concession_Door)_L');
            if (config.glassScreen) {
                activeConcessionDoorMeshes.push('Glass Screen L', 'Glass_Screen_L');
            }
        } else if (config.concessionDoor === 'passenger') {
            activeConcessionDoorMeshes.push('Concession Door R', 'Concession_Door_R');
            activeConcessionDoorMeshes.push('Base Interior(Concession Door) R', 'Base_Interior(Concession_Door)_R');
            if (config.glassScreen) {
                activeConcessionDoorMeshes.push('Glass Screen R', 'Glass_Screen_R');
            }
        }
        if (concessionDoorScene) {
            BlenderNodes.switchMeshes(concessionDoorScene, activeConcessionDoorMeshes);
        }

        // ── Side Doors & Generator Box: mirrors the Blender node graph ─────────
        const driverVariant = DOOR_MESH_MAP[effectiveDriverDoor]
        const passengerVariant = DOOR_MESH_MAP[effectivePassengerDoor]

        // Build active mesh lists per side → Join Geometry (sideDoors.glb)
        const activeDoorMeshes = []
        if (driverVariant) activeDoorMeshes.push(driverVariant.doorsL)
        if (passengerVariant) activeDoorMeshes.push(passengerVariant.doorsR)

        // Show Generator Box Plates per side (structural, not cabinet-dependent)
        activeDoorMeshes.push('Generator_Box_Plate_L')
        activeDoorMeshes.push('Generator_Box_Plate_R')

        // Build active ATP trim lists per side → Join Geometry (extFinish.glb)
        // The full ATP trim is composed of TWO meshes per side:
        //   1. ATP_Flat_Panel_L/R_{size}in  — the flat wall sections (non-door area)
        //   2. ATP_{DoorSize}_Door_Panel_L/R_{size}in — the section covering the door cutout
        // Both must be shown together to cover the full trailer.
        const sizeSuffix = config.protectionSize ? `_${config.protectionSize}in` : '_24in';
        const uniqueAtpMeshes = []

        if (driverVariant) {
            // Always add the flat panel for the driver side (covers non-door section)
            uniqueAtpMeshes.push(`ATP_Flat_Panel_L${sizeSuffix}`)
            // If there's a door, also add the door-cutout ATP panel
            if (driverVariant.atpL && driverVariant.atpL !== 'ATP_Flat_Panel_L') {
                uniqueAtpMeshes.push(`${driverVariant.atpL}${sizeSuffix}`)
            }
        }
        if (passengerVariant) {
            // Always add the flat panel for the passenger side (covers non-door section)
            uniqueAtpMeshes.push(`ATP_Flat_Panel_R${sizeSuffix}`)
            // If there's a door, also add the door-cutout ATP panel
            if (passengerVariant.atpR && passengerVariant.atpR !== 'ATP_Flat_Panel_R') {
                uniqueAtpMeshes.push(`${passengerVariant.atpR}${sizeSuffix}`)
            }
        }

        // ATP plates mirror the generator box plate visibility
        uniqueAtpMeshes.push(`ATP_Plate_Generator_Box_L${sizeSuffix}`)
        uniqueAtpMeshes.push(`ATP_Plate_Generator_Box_R${sizeSuffix}`)

        if (config.width === '8.5ftgn') {
            uniqueAtpMeshes.push(`ATP_Gooseneck${sizeSuffix}`)
        }

        // Log all meshes in extFinish to see exact names
        const extNames = [];
        extFinish.traverse(c => { if (c.isMesh) extNames.push(c.name); });
        // console.log('[DEBUG ATP] Available meshes in extFinish:', extNames);
        // console.log('[DEBUG ATP] uniqueAtpMeshes:', uniqueAtpMeshes, '| axleAtp:', config.axleAtp);

        BlenderNodes.switchMeshes(sideDoors, activeDoorMeshes)
        // When ATP is OFF, suppress all extFinish ATP trim meshes globally
        BlenderNodes.switchMeshes(extFinish, config.axleAtp ? uniqueAtpMeshes : [])

        // ── Windows ───────────────────────────────────────────────
        const activeWindowsMeshes = [];
        // console.log('[DEBUG WINDOWS] config.windows:', config.windows);
        // console.log('[DEBUG WINDOWS] config.windowSizes:', config.windowSizes);
        if (!isShortTrailer && config.windows) {
            if (config.windows.vertical > 0 && config.windowSizes?.vertical) {
                activeWindowsMeshes.push('15×30_Vertical_Slider');
            }
            if (config.windows.horizontal > 0 && config.windowSizes?.horizontal) {
                activeWindowsMeshes.push('50×30_Horizontal_Slider');
            }
            if (config.windows.egress > 0 && config.windowSizes?.egress) {
                activeWindowsMeshes.push('30×30_Egress');
            }
        }
        if (windowsScene) {
            BlenderNodes.switchMeshes(windowsScene, activeWindowsMeshes);
        }

        // ── Addons.glb: unified mesh list ──────────────────────────────────────────
        // All addon meshes are collected into ONE array and applied in a single
        // switchMeshes call. Calling switchMesh multiple times is wrong because
        // each call hides everything not in its list, overwriting the previous.
        const activeAddonMeshes = []

        const allAddonMeshNames = []
        if (addons) {
            addons.traverse(c => { if (c.isMesh) allAddonMeshNames.push(c.name) })
        }

        // Generator Box options mapped to Tongue Mounted Generator Box
        // console.log('[DEBUG GENERATOR] config.generatorBox:', config.generatorBox);
        if (config.generatorBox && config.generatorBox !== 'none' && config.frontStyle === 'flatfront') {
            allAddonMeshNames.forEach(n => {
                const lower = n.toLowerCase();
                
                // "tounge mounted mesh will always come" for all 4 options
                if (lower.includes('tongue_mounted_generator')) activeAddonMeshes.push(n);
                
                if (config.generatorBox === 'lidonly' && lower.includes('lid_only')) {
                    activeAddonMeshes.push(n);
                } else if (config.generatorBox === 'venteddoor' && lower.includes('vented_door_only')) {
                    activeAddonMeshes.push(n);
                } else if (config.generatorBox === 'venteddoorslides' && (lower.includes('vented_door_only') || lower.includes('slides+tray'))) {
                    activeAddonMeshes.push(n);
                } else if (config.generatorBox === 'insulated' && lower.includes('slides+tray')) {
                    activeAddonMeshes.push(n);
                }
            });
        }

        // ── Front Style node graph ────────────────────────────────────────
        const effectiveAddonFrontStyle = (config.width === '8.5ftgn' || (config.frontStyle && config.frontStyle.toLowerCase().includes('gooseneck'))) ? 'gooseneck' : config.frontStyle;
        const frontStyleAddon = FRONT_STYLE_ADDON_MESH_MAP[effectiveAddonFrontStyle]
            ?? FRONT_STYLE_ADDON_MESH_MAP.vnose

        // Stairs: Super Switch (V-Nose Stair vs Flat Front Stair) gated by stairs boolean
        // Hidden for gooseneck and extended v-nose (no compatible stair variant)
        const isGooseneckStairs = effectiveAddonFrontStyle === 'gooseneck';
        const isExtendedVNose = config.frontStyle === 'extendedvnose';
        if (config.stairs && !isGooseneckStairs && !isExtendedVNose) {
            activeAddonMeshes.push(frontStyleAddon.stairs)
        }

        // Battery Box: Super Switch (V-Nose vs Flat Front cabinet variant)
        if (config.batteryBox) {
            const batMesh = frontStyleAddon.battery
            // console.log('[DEBUG BATTERY] config.batteryBox is ON. Front style:', config.frontStyle);
            // console.log('[DEBUG BATTERY] Mapped batMesh name:', batMesh);
            if (batMesh) {
                const name1 = batMesh;
                const name2 = batMesh.replace(/_/g, ' ');
                const name3 = batMesh.replace(/ /g, '_');
                // console.log('[DEBUG BATTERY] Pushing names to activeAddonMeshes:', name1, name2, name3);
                activeAddonMeshes.push(name1)
                activeAddonMeshes.push(name2)
                activeAddonMeshes.push(name3)
            }
            // Dump all battery related meshes in addons to see exact strings
            const allBatteryMeshes = []
            addons.traverse(c => {
                if (c.isMesh && c.name.toLowerCase().includes('battery')) {
                    allBatteryMeshes.push(c.name)
                }
            })
            // console.log('[DEBUG BATTERY] All battery meshes in addons.glb:', allBatteryMeshes)
        }

        // V-Nose E Track: Super Toggle — only relevant when frontStyle is vnose
        if (config.vNoseETrack && config.frontStyle !== 'flatfront') {
            activeAddonMeshes.push('V-Nose_E_Track')
        }

        // Angled Lights: Super Toggle — no front style variant, simple boolean
        if (config.angledLights) {
            activeAddonMeshes.push('Angled_Lights')
        }

        // Gullwing Escape Door lives in its own Packaging GLB (added to activeScenes below)
        const activeGullwingMeshes = []
        if (config.escapeDoor === 'gullwing') {
            const sideType = config.axleAngled ? 'Angled_Side' : 'Flat_Side'
            let panelPrefix = config.axleCount === 'triple' ? '3X_Axle' : '2X_Axle'

            if (config.spreadAxle) {
                panelPrefix = 'Corvette_Fender'
            }

            const expectedPanel = `${panelPrefix}_${sideType}_For_GED`

            // ATP names use underscores (matching actual GLB mesh names):
            //   Corvette → "ATP_Corvette_Fender_Angled_Side_GED_24in"  (no "For_" prefix, no "For_" before GED)
            //   Axle     → "ATP_For_2X_Axle_Angled_Side_For_GED_24in"
            // NOTE: Some GLB meshes have spaces instead of underscores (e.g. "Corvette Fender").
            // Use normGlb() to collapse both to '_' before comparing.
            const normGlb = s => s.replace(/[\s_]+/g, '_')
            const atpSize = config.protectionSize || '24'
            let expectedATP
            if (config.spreadAxle) {
                expectedATP = `ATP_Corvette_Fender_${sideType}_GED_${atpSize}in`
            } else {
                expectedATP = `ATP_For_${panelPrefix}_${sideType}_For_GED_${atpSize}in`
            }

            // console.log('[GULLWING ATP DEBUG] Config:', {
            //     escapeDoor: config.escapeDoor,
            //     protectionType: config.protectionType,
            //     protectionSize: config.protectionSize,
            //     protectionSizeType: typeof config.protectionSize,
            //     axleAngled: config.axleAngled,
            //     axleCount: config.axleCount,
            //     spreadAxle: config.spreadAxle,
            // })
            // console.log('[GULLWING ATP DEBUG] atpSize value:', atpSize, '| type:', typeof atpSize)
            // console.log('[GULLWING ATP DEBUG] Expected panel prefix:', expectedPanel)
            // console.log('[GULLWING ATP DEBUG] Expected ATP name:', JSON.stringify(expectedATP))
            // Quick sanity check: does the expected name match the known 12in mesh name?
            const knownName12 = `ATP_For_2X_Axle_${config.axleAngled ? 'Angled_Side' : 'Flat_Side'}_For_GED_12in`
            // console.log('[GULLWING ATP DEBUG] Hardcoded 12in name:', JSON.stringify(knownName12))
            // console.log('[GULLWING ATP DEBUG] expectedATP startsWith knownName12?', expectedATP === knownName12)


            // Dump all mesh names in the GLB for comparison
            const allGullwingNames = []
            gullwingDoor.traverse(c => { if (c.isMesh) allGullwingNames.push(c.name) })
            // console.log('[GULLWING ATP DEBUG] All mesh names in GLB:', allGullwingNames)

            gullwingDoor.traverse(child => {
                if (!child.isMesh) return;
                const name = child.name;
                
                // 1. Main door meshes (could be split by material, e.g. _2, _3)
                if (name.startsWith('Gullwing_Escape_Door') && !name.toLowerCase().includes('proxy')) {
                    activeGullwingMeshes.push(name);
                } else if (name.toLowerCase().includes('proxy')) {
                    // Always include the proxy so that BlenderNodes.switchMeshes will 
                    // process it and set child.userData.proxyActive = true
                    activeGullwingMeshes.push(name);
                }
                
                // 2. Side Panel (handles suffixes like _1, _2)
                if (normGlb(name).startsWith(normGlb(expectedPanel))) {
                    // console.log('[GULLWING ATP DEBUG] ✅ Panel matched:', name)
                    activeGullwingMeshes.push(name);
                }
                
                // 3. ATP (if enabled) — normalize spaces/underscores to handle GLB inconsistencies
                if (normGlb(name).startsWith(normGlb(expectedATP))) {
                    // console.log('[GULLWING ATP DEBUG] ✅ ATP matched:', name)
                    activeGullwingMeshes.push(name);
                } else if (name.toLowerCase().includes('atp')) {
                    // console.log('[GULLWING ATP DEBUG] ⚠️ ATP mesh in GLB (not matched):', name)
                }
            });

            // console.log('[GULLWING ATP DEBUG] Final activeGullwingMeshes:', activeGullwingMeshes)
        }
        BlenderNodes.switchMeshes(gullwingDoor, activeGullwingMeshes)

        // Winch System
        if (config.winchSystem) {
            activeAddonMeshes.push('Winch_System')
        }

        // ── Assorted Addons (from Addons node graph) ───────────────────────
        // Fold Down Stabilizer Jacks (Pair) — gated by 'folddown' jack selection
        if (config.jacks?.includes('folddown')) {
            activeAddonMeshes.push('Fold_Down_Stablizer_Jacks(Pair)')
        }

        // Fold Down Stabilizer Jacks (non-pair) — gated by 'folddownjacks' jack selection
        if (config.jacks?.includes('folddownjacks')) {
            activeAddonMeshes.push('Fold_Down_Stablizer_Jacks')
        }

        // 5K Scissor Jack w/ Handle (Pair) — gated by '5kscissor' jack selection
        if (config.jacks?.includes('5kscissor')) {
            activeAddonMeshes.push('5K_Scissor_Jacks_w_Handle(Pair)')
        }

        // 5K Scissor Jacks (non-pair) — gated by '5kscissorjacks' jack selection
        if (config.jacks?.includes('5kscissorjacks')) {
            activeAddonMeshes.push('5K_Scissor_Jacks')
        }


        if (config.width !== '8.5ftgn') {
            if (config.jacks?.includes('5000relectric')) {
                if (config.frontStyle === 'extendedvnose') {
                    activeAddonMeshes.push('Electric_Jack(Extended_V-Nose)')
                } else {
                    activeAddonMeshes.push('Electric_Jack')
                }
            } else {
                // Default manual jack for Extended V-Nose (since it's not built into the extended tongue mesh)
                if (config.frontStyle === 'extendedvnose') {
                    activeAddonMeshes.push('Sidewind(Extended_V-Nose)')
                }
            }
        }

        // AC Unit / Mini Split AC (Climate Control)
        if (config.climateControl === '135kbtu' || config.climateControl === '15kbtu') {
            activeAddonMeshes.push('AC_Unit')
        } else if (config.climateControl === '12kminisplit' || config.climateControl === '18kminisplit' || config.climateControl === '24kminisplit') {
            activeAddonMeshes.push('Mini_Split_AC')
        }

        // ── tongue.glb: always visible, variant switches with front style
        // Extended_Triple_Tongue_V-Nose (default) ↔ Extended_Triple_Tongue_Flat_Front
        if (config.width === '8.5ftgn') {
            BlenderNodes.switchMesh(tongue, null)
        } else {
            BlenderNodes.switchMesh(tongue, TONGUE_MESH_MAP[config.frontStyle] ?? TONGUE_MESH_MAP.vnose)
        }

        // ── addons.glb: Extended Triple Tongue addon — gated by toggle
        if (config.extendedTripleTongue) {
            activeAddonMeshes.push('Extended_Triple_Tongue')
        }

        if (config.radioPackageSpeaker) {
            activeAddonMeshes.push('Radio_Package_Speaker')
        }

        // L-Shape Counter / Hidden Generator Box
        if (lShapeActive) {
            activeAddonMeshes.push('L Shape Counter Hidden Generator Box')
            activeAddonMeshes.push('L_Shape_Counter_Hidden_Generator_Box')
        }

        // Generator Door 36"x36" (Standard Generator Box mesh)
        // Only shown when L-Shape Counter/Hidden Generator Box is NOT active and front style is flat front
        if (config.genDoor && !lShapeActive && config.frontStyle === 'flatfront') {
            activeAddonMeshes.push('Standard Generator Box')
            activeAddonMeshes.push('Standard_Generator_Box')
        }

        if (config.lights?.includes('racing')) {
            activeAddonMeshes.push('Racing_Lights')
        }

        // ── Interior Lighting (LIGHTS section) ──────────────────────────────
        // Debug: dump all mesh names in addons GLB so we can verify exact names
        const lightRelatedMeshes = allAddonMeshNames.filter(n => 
            /dome|panel|rope|light/i.test(n)
        )
        const genRelatedMeshes = allAddonMeshNames.filter(n =>
            /generator|lid|vented|slides|tray/i.test(n)
        )
        // console.log('[DEBUG GENERATOR MESHES] Found in Addons.glb:', genRelatedMeshes)
        // console.log('[DEBUG LIGHTS] Light-related meshes:', lightRelatedMeshes)
        // console.log('[DEBUG LIGHTS] config.interiorLights:', config.interiorLights)
        // console.log('[DEBUG LIGHTS] config.ledRope:', config.ledRope)

        // 12V LED Dome Light
        if (config.interiorLights?.['12vleddome'] > 0) {
            activeAddonMeshes.push('Dome_Light')
            activeAddonMeshes.push('Dome Light')
            // console.log('[DEBUG LIGHTS] Adding Dome Light to activeAddonMeshes')
        }
        // 12V 24" Flat Panel LED
        if (config.interiorLights?.['12vflatpanel'] > 0) {
            activeAddonMeshes.push('Flat_Panel_Light')
            activeAddonMeshes.push('Flat Panel Light')
            // console.log('[DEBUG LIGHTS] Adding Flat Panel Light to activeAddonMeshes')
        }
        // LED Rope Lighting
        if (config.ledRope) {
            activeAddonMeshes.push('LED_Rope_Light')
            
            const LED_ROPE_EXTENSION_MAP = {
                vnose24: 'LED_Rope_Light_Extension(V-Nose)',
                flatfront: 'LED_Rope_Light_Extension(Flat_Front)',
                slantvnose: 'LED_Rope_Light_Extension(Slant_V-Nose)',
                extendedvnose: 'LED_Rope_Light_Extension(Extended_V-Nose)',
                gooseneck: 'LED_Rope_Light_Extension(Gooseneck)',
            }
            
            let extMesh = LED_ROPE_EXTENSION_MAP[config.frontStyle]
            if (config.width === '8.5ftgn') {
                extMesh = LED_ROPE_EXTENSION_MAP.gooseneck
            } else if (!extMesh) {
                extMesh = LED_ROPE_EXTENSION_MAP.vnose24
            }
            
            if (extMesh) {
                activeAddonMeshes.push(extMesh)
            }
        }

        // Ladder Racks: instanced via useMemo (Top_Supports mesh is the template, never shown directly)

        // console.log(`[DEBUG Ventilation] Current config.ventilation:`, config.ventilation)
        if (config.sidewallVents || config.ventilation === '2waysidewall') {
            // console.log(`[DEBUG Ventilation] Adding Aluminum_Sidewall_Vents`)
            activeAddonMeshes.push('Aluminum_Sidewall_Vents')
        }

        if (
            config.ventilation === 'nonpoweredvent' || 
            config.ventilation === 'smokenonpowered' ||
            (config.ventilation && config.ventilation.includes('nonpowered'))
        ) {
            activeAddonMeshes.push('Non-Powered_Roof_Vent') // Legacy fallback
            activeAddonMeshes.push('Non-Powered Roof Vent') // The exact name in the GLB
        }
        if (config.recessedTireBox) {
            activeAddonMeshes.push('Recessed_Tire_Box')
        }

        if (config.interiorTireMount || config.spareTire) {
            activeAddonMeshes.push('Interior_Tire_Mount')
        }

        if (config.spareTire) {
            const lugNumber = (config.lugType || '5lug').replace('lug', '');
            const lugSuffix = `${lugNumber}-Lug`;

            if (config.wheelType === 'spideraluminum') {
                activeAddonMeshes.push(`Spider_Spare_Tire_${lugSuffix}`)
                activeAddonMeshes.push(`Spider Spare Tire ${lugSuffix}`)
            } else {
                activeAddonMeshes.push(`Standard_Spare_Tire_${lugSuffix}`)
                activeAddonMeshes.push(`Standard Spare Tire ${lugSuffix}`)
            }
        }

        // Receptacles
        if (config.receptacles) {
            if (config.receptacles['110vgfi'] > 0) {
                activeAddonMeshes.push('110V_GFI_Receptacle_(20_AMP)')
                activeAddonMeshes.push('110V GFI Receptacle (20 AMP)')
            }
            if (config.receptacles['110vinterior'] > 0) {
                activeAddonMeshes.push('110V_Interior_Receptacle_(15_AMP)')
                activeAddonMeshes.push('110V Interior Receptacle (15 AMP)')
            }
        }
        
        const activeSinkMeshes = [];
        if (config.sinkPackage === 'sink') {
            const SINK_FRONT_STYLE_MAP = {
                vnose24: 'V-Nose_Sink',
                flatfront: 'Flat_Front_Sink',
                slantvnose: 'Slant_V-Nose_Sink',
                extendedvnose: 'Extended_V-Nose_Sink_',
                gooseneck: 'Gooseneck_Sink_'
            };
            const sinkMeshName = SINK_FRONT_STYLE_MAP[config.frontStyle] || 'V-Nose_Sink';
            // console.log('[DEBUG SINK] sinkPackage is selected:', config.sinkPackage);
            // console.log('[DEBUG SINK] config.frontStyle:', config.frontStyle);
            // console.log('[DEBUG SINK] mapped sinkMeshName:', sinkMeshName);
            activeSinkMeshes.push(sinkMeshName);
            
            // Also log if we can find this mesh across all scenes
            const allScenes = { base, baseMeshes, frontStyle, rearDoors, sideDoors, extFinish, tongue, cabinetsGLB, awning, bathroom, spoiler, gullwingDoor, escapeDoorScene, axleConfig, axle, wheels, addons, cargo, sinkScene }
            Object.entries(allScenes).forEach(([sceneName, scene]) => {
                if (scene) {
                    scene.traverse(child => {
                        const nameLower = child.name.toLowerCase();
                        if (nameLower.includes('sink') || nameLower.includes('water')) {
                            console.log(`[DEBUG SINK FINDER] Found potential sink/water mesh in ${sceneName}:`, child.name);
                        }
                    });
                }
            });
        }
        
        if (sinkScene) {
            BlenderNodes.switchMeshes(sinkScene, activeSinkMeshes);
        }

        if (addons) {
            const vent = addons.getObjectByName('Non-Powered Roof Vent')
            if (vent) {
                // console.log("[DEBUG] Non-Powered Roof Vent parent is:", vent.parent?.name)
            }
        }
        
        // console.warn(`[DEBUG 3D] Final active addons meshes being sent to switchMeshes:`, activeAddonMeshes)
        BlenderNodes.switchMeshes(addons, activeAddonMeshes)

        // ── Cabinets: node graph logic ───────────────────────────────────────────
        // Mirrors the Blender node graph exactly:
        //   Front Style Switch → picks V-Nose or Flat Front variant
        //   Cabinet Switch → gates Main Cabinet
        //   Overhead Cabinet Switch → gates Overhead Cabinet
        //   Toolbox Switch → gates the Toolbox AND Toolbox Slot (requires Cabinet=true)
        //   Winch System Switch → gates Winch System (independent)
        const effectiveCabinetFrontStyle = (config.width === '8.5ftgn' || (config.frontStyle && config.frontStyle.toLowerCase().includes('gooseneck'))) ? 'gooseneck' : config.frontStyle;
        const cabinetVariant = CABINET_MESH_MAP[effectiveCabinetFrontStyle] ?? CABINET_MESH_MAP.vnose
        const activeCabinetMeshes = []

        // Boolean inputs (mapping the array states to the node graph booleans)
        const hasOverhead = config.cabinets?.includes('frontoverhead16') 
        const hasToolbox = config.toolBox && config.toolBox !== 'none'
        const hasWinch = config.winchSystem

        let hasWallRun = config.cabinets?.includes('wallrun36')
        if (config.sinkPackage === 'sink' || isShortTrailer || effectiveDriverDoor !== 'none') hasWallRun = false;
        let hasWallRunOverhead = config.cabinets?.includes('wallrun16')
        if (isShortTrailer || effectiveDriverDoor !== 'none') hasWallRunOverhead = false;
        const hasWheelWallCabinet = config.cabinets?.includes('wheelwallcabinet')

        // 1. Main Cabinet (front base) — hidden when lShapeCounter or genDoor is on
        if (hasCabinet) {
            activeCabinetMeshes.push(cabinetVariant.cabinet)
        }

        // 2. Overhead Cabinet
        if (hasOverhead) {
            activeCabinetMeshes.push(cabinetVariant.overhead)
        }

        // 3. Cabinet Toolbox Slot vs Toolbox insert (requires front base cabinet)
        if (hasCabinet) {
            if (hasToolbox) {
                activeCabinetMeshes.push('Toolbox')
                // Legacy fallback for old GLBs
                activeCabinetMeshes.push('Cabinet_Toolbox')
            } else {
                activeCabinetMeshes.push('Slot')
                // Legacy fallback for old GLBs
                activeCabinetMeshes.push(cabinetVariant.toolboxSlot)
            }
        }

        // 5. Wall Run Cabinet (Wall Run 36"H)
        if (hasWallRun) {
            activeCabinetMeshes.push('Wall_Run_Cabinet', 'Wall Run Cabinet');
        }

        // 5b. Overhead Wall Run Cabinet (Wall Run 16"H)
        if (hasWallRunOverhead) {
            activeCabinetMeshes.push('Overhead_Wall_Run_Cabinet', 'Overhead Wall Run Cabinet');
        }

        // 5c. Wheel Wall Cabinet
        if (hasWheelWallCabinet) {
            activeCabinetMeshes.push('Wheel_Wall_Cabinet', 'Wheel Wall Cabinet');
        }

        // 6. Floor to Ceiling Cabinet
        const hasFullHeight = config.cabinets?.includes('fullheight') && !isShortTrailer;
        const hasBathroom = effectiveBathroom !== 'none';
        
        // Hide Floor to Ceiling Cabinet if bathroom is present
        if (hasFullHeight && !hasBathroom) {
            activeCabinetMeshes.push('Floor_to_Ceiling_Cabinet', 'Floor to Ceiling Cabinet');
        }
        
        const allCabinetNames = [];
        cabinetsGLB.traverse(c => { if (c.isMesh) allCabinetNames.push(c.name) });
        // console.log('[DEBUG CABINETS] All cabinet meshes in GLB:', allCabinetNames);
        // console.log('[DEBUG CABINETS] activeCabinetMeshes:', activeCabinetMeshes);

        BlenderNodes.switchMeshes(cabinetsGLB, activeCabinetMeshes)

        // ── Bathroom GLB: Sink Area conditional visibility ─────────────────────
        // Sink Area requires all 3: bathroom selected + no generator box + v-nose (not flat front)
        const showSink = Boolean(effectiveBathroom !== 'none')
            && (!config.generatorBox || config.generatorBox === 'none')
            && config.frontStyle !== 'flatfront'
            && !hasCabinet

        const activeBathroomMeshes = []
        let targetSubstring = '';
        if (effectiveBathroom === 'half') targetSubstring = 'half';
        else if (effectiveBathroom === '34x34') targetSubstring = '34x34';
        else if (effectiveBathroom === '36x36') targetSubstring = '36x36';
        else if (effectiveBathroom === 'full') targetSubstring = '34x34'; // legacy fallback

        if (bathroom && targetSubstring) {
            bathroom.traverse(child => {
                if (child.isMesh && child.name.toLowerCase().includes(targetSubstring)) {
                    activeBathroomMeshes.push(child.name);
                }
            });
        }
        
        if (activeBathroomMeshes.length === 0 && effectiveBathroom !== 'none') {
            activeBathroomMeshes.push('Bathroom'); // Last resort fallback
        }

        if (showSink) activeBathroomMeshes.push('Sink_Area', 'Sink Area')
        
        BlenderNodes.switchMeshes(bathroom, activeBathroomMeshes)

        // ── Cargo & Tie-Downs: Node Graph ──────────────────────────────────────
        // The E-Track and other tie downs are generated instances in Blender.
        // We select the baked GLB meshes directly (D-Rings / Airline tracking missing in GLB currently)
        // ── DEBUG LOGS FOR DRINGS ──
  
        
        const allCargoNames = [];
        cargo.traverse(child => {
            if (child.isMesh) allCargoNames.push(child.name);
        });
        // console.log('3. ALL meshes inside cargo:', allCargoNames);
        // console.log('=========================');

        const activeCargoMeshes = []
        if (config.tieDowns?.includes('drings')) {
            cargo.traverse(child => {
                if (child.isMesh) {
                    const nameLower = child.name.toLowerCase();
                    if (nameLower.includes('d-ring') || nameLower.includes('d_ring') || nameLower.includes('d ring') || nameLower.includes('dring')) {
                        activeCargoMeshes.push(child.name)
                    }
                }
            })
        }
        // We'll hide the static E-Tracks and generate them dynamically instead to multiply the mesh
        BlenderNodes.switchMeshes(cargo, activeCargoMeshes)

        // Axle Count determines the number of tyres (tandem vs triple)
        const axleCountStr = config.axleCount === 'triple' ? '3' : '2';
        const tireSizeStr = config.tireSize || '15';
        const lugStr = (config.lugType || '5lug').replace('lug', '');
        
        let wheelStyleName = 'standardwheels';
        if (config.wheelType === 'spideraluminum') {
            wheelStyleName = 'spiderwheels';
        }
        
        // Target normalized name: e.g. "162standardwheels5lug" or "162spiderwheels5lug"
        const targetWheelNorm = `${tireSizeStr}${axleCountStr}${wheelStyleName}${lugStr}lug`;
        
        const activeWheelMeshes = [];
        wheels.traverse(child => {
            if (child.isMesh) {
                const normName = child.name.toLowerCase().replace(/[\s_\-]/g, '');
                if (normName.includes(targetWheelNorm)) {
                    activeWheelMeshes.push(child.name);
                }
            }
        });

        BlenderNodes.switchMeshes(wheels, activeWheelMeshes);

        const variant = config.axleCount === 'triple' ? '3x' : '2x';
        const prefix = variant === '3x' ? '3X_' : '2X_';

        // Emulate the Geometry Node graph for Wheels — Blender "Wheels" node group
        // ── Side Panels section (no ATP gate — structural, always shown) ──────────
        const activeAxleMeshes = []

        // Base structural skirt — always visible regardless of ATP or angle
        activeAxleMeshes.push('Side_Panel_Bottom_Strip')

        const hideStandardAxleTrim = config.escapeDoor === 'gullwing';

        // Cover panel — always shown, angled or flat based on toggle, unless spread axle is on
        if (!config.spreadAxle && !hideStandardAxleTrim) {
            activeAxleMeshes.push(`${prefix}Axle_${config.axleAngled ? 'Angled' : 'Flat'}_Side`)
        }

        // ── Finishes section (gated by ATP Super Toggle in Blender graph) ─────────
        if (config.axleAtp) {
            // Base ATP strip — now size-driven (12in or 24in)
            const atpSize = config.protectionSize || '24'
            activeAxleMeshes.push(`Side Panel ATP ${atpSize}in`)
            activeAxleMeshes.push(`Side_Panel_ATP_${atpSize}in`)
            // ATP directional trim — follows same angled/flat toggle
            if (!hideStandardAxleTrim) {
                if (config.spreadAxle) {
                    const sideName = config.axleAngled ? 'Angled' : 'Flat'
                    activeAxleMeshes.push(`ATP_Corvette_Fender_${sideName}_Side_${atpSize}in`)
                    activeAxleMeshes.push(`ATP Corvette Fender ${sideName} Side ${atpSize}in`)
                } else {
                    const sideName = config.axleAngled ? 'Angled' : 'Flat'
                    activeAxleMeshes.push(`${prefix}ATP_${sideName}_Side_${atpSize}in`)
                    activeAxleMeshes.push(`${prefix}ATP ${sideName} Side ${atpSize}in`)
                }
            }
        }

        if (config.spreadAxle && !hideStandardAxleTrim) {
            const sideName = config.axleAngled ? 'Angled' : 'Flat'
            activeAxleMeshes.push(`Corvette_Fender_${sideName}_Side`)
            activeAxleMeshes.push(`Corvette Fender ${sideName} Side`)
        }

        BlenderNodes.switchMeshes(axle, activeAxleMeshes)
        BlenderNodes.switchMesh(axleConfig, AXLE_RATING_MESH_MAP[config.axleRating]?.[variant])

        // ── Spoiler ──────────────────────────────────────────────────────────
        // First hide everything
        spoiler.traverse(child => {
            if (child.isMesh) {
                child.visible = false
            }
        })

        // Now dynamically show based on substring match
        spoiler.traverse(child => {
            if (!child.isMesh) return
            const nameLower = child.name.toLowerCase()

            // Racing lights logic
            const isRacing = nameLower.includes('racing')
            if (config.lights?.includes('racing') && isRacing) {
                child.visible = true
            }

            // Angled spoiler logic
            const isAngled = nameLower.includes('angled')
            if (config.exteriorAccessories === 'rearwingspoiler' && isAngled) {
                child.visible = true
            }

        // Normal spoiler logic - if it's NOT racing and NOT angled, it MUST be the normal wing!
        if (config.exteriorAccessories === 'rearwings' && !isRacing && !isAngled) {
            child.visible = true
        }
    })

    // ── Awning ───────────────────────────────────────────────────────────
    if (awning) {
        const showAwning = !isShortTrailer && config.awning?.length > 0;
        awning.traverse(child => {
            if (!child.isMesh) return;
            if (child.name.toLowerCase().includes('proxy')) {
                child.visible = true;
                return;
            }
            child.visible = showAwning;
        })
    }

    // Signal that mesh visibility has been updated. generatedETracks depends on
        // visibilityVersion so it will recompute on the next render with correct .visible values.
        setVisibilityVersion(v => v + 1)
    }, [
        config.width, config.frontStyle, config.rampType, config.rearDoor, config.sideDoorsType, config.length,
        config.wheelType, config.axleCount, config.axleAngled, config.axleAtp, config.axleRating, config.spreadAxle,
        config.tireSize, config.lugType,
        config.cabinets, config.toolBox,
        config.driverSideDoor, config.passengerSideDoor,
        config.stairs, config.batteryBox, config.vNoseETrack, config.angledLights,
        config.escapeDoor, config.concessionDoor, config.glassScreen, config.generatorBox, config.lShapeCounter, config.genSlides, config.genDoor, config.winchSystem, config.tieDowns,
        config.windows, config.windowSizes,
        config.extendedTripleTongue, config.radioPackageSpeaker, config.exteriorAccessories,
        config.climateControl, config.jacks, config.lights, config.ventilation, config.receptacles,
        config.ladderRacks, config.sidewallVents, config.recessedTireBox, config.interiorTireMount, config.spareTire,
        config.bathroom, config.awning, config.rampType, config.rearDoor, config.atpRamp, config.sinkPackage,
        config.protectionSize,
        config.interiorLights, config.ledRope,
        frontStyle, rearDoors, sideDoors, extFinish, wheels, axle, axleConfig, addons,
        cabinetsGLB, cargo, spoiler, tongue, bathroom, gullwingDoor, awning, sinkScene, concessionDoorScene, windowsScene
    ])

    // ── activeScenes must be computed BEFORE generatedETracks so the proxy scan
    // uses the CURRENT render's scene list (not the stale ref from last render).
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
            sinkScene
        ]
        if (config.cabinets?.length > 0) scenes.push(cabinetsGLB)
        if (!isShortTrailer && config.awning?.length > 0) scenes.push(awning)
        if (effectiveBathroom !== 'none') scenes.push(bathroom)
        if (config.exteriorAccessories === 'rearwingspoiler' || config.exteriorAccessories === 'rearwings') scenes.push(spoiler)
        if (config.escapeDoor === 'gullwing') scenes.push(gullwingDoor)
        if (config.escapeDoor === '54x48') scenes.push(escapeDoorScene)
        if (config.concessionDoor && config.concessionDoor !== 'none') scenes.push(concessionDoorScene)
        if (!isShortTrailer && config.windows && (config.windows.vertical > 0 || config.windows.horizontal > 0 || config.windows.egress > 0)) scenes.push(windowsScene)
        return scenes
    }, [
        config.cabinets, config.awning, config.bathroom, config.exteriorAccessories, config.escapeDoor, config.concessionDoor, config.windows,
        lengthFt,
        base, baseMeshes, frontStyle, rearDoors, sideDoors, extFinish,
        tongue, wheels, axleConfig, axle, addons, cabinetsGLB, awning, bathroom, cargo, spoiler, gullwingDoor, escapeDoorScene, concessionDoorScene, sinkScene, windowsScene
    ])

    activeScenesRef.current = activeScenes

    const ladderRacksGroup = useMemo(() => {
        if (!config.ladderRacks) return null

        let rackTemplate = null
        addons.traverse(child => {
            if (child.isMesh && child.name === 'Top_Supports' && !child.name.toLowerCase().includes('proxy')) rackTemplate = child
        })
        if (!rackTemplate) return null

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

        return <primitive object={instanced} />
    }, [addons, lengthFt, config.ladderRacks])

    useEffect(() => {
        dirtyRef.current = true
    }, [activeScenes, config.tieDowns, hasCabinet, visibilityVersion, config.narrowTrackAxle, config.windows, config.windowSizes])

    useFrame(() => {
        if (!store.current.has('_globalZCenter')) return
        const curr = animRef.current, tgt = targetRef.current
        const nw = curr.widthFt + (tgt.widthFt - curr.widthFt) * LERP_SPEED
        const nl = curr.lengthFt + (tgt.lengthFt - curr.lengthFt) * LERP_SPEED
        const nh = curr.heightFt + (tgt.heightFt - curr.heightFt) * LERP_SPEED
        
        const awningMatch = config.awning?.[0]?.match(/\d+/)
        const targetAwningFt = awningMatch ? parseInt(awningMatch[0]) : 18
        const na = curr.awningFt + (targetAwningFt - curr.awningFt) * LERP_SPEED

        const targetConcessionWidthIn = parseInt(config.concessionWidth) || 72;
        const targetConcessionHeightIn = parseInt(config.concessionHeight) || 36;
        const ncw = curr.concessionWidthIn + (targetConcessionWidthIn - curr.concessionWidthIn) * LERP_SPEED;
        const nch = curr.concessionHeightIn + (targetConcessionHeightIn - curr.concessionHeightIn) * LERP_SPEED;

        const moved =
            Math.abs(nw - curr.widthFt) > LERP_THRESHOLD ||
            Math.abs(nl - curr.lengthFt) > LERP_THRESHOLD ||
            Math.abs(nh - curr.heightFt) > LERP_THRESHOLD ||
            Math.abs(na - curr.awningFt) > LERP_THRESHOLD ||
            Math.abs(ncw - curr.concessionWidthIn) > LERP_THRESHOLD ||
            Math.abs(nch - curr.concessionHeightIn) > LERP_THRESHOLD
            
        if (!moved && !dirtyRef.current) {
            return
        }


            
        dirtyRef.current = false
        animRef.current = { widthFt: nw, lengthFt: nl, heightFt: nh, awningFt: na, concessionWidthIn: ncw, concessionHeightIn: nch }
        const globalZCenter = store.current.get('_globalZCenter')
        const globalXMin = store.current.get('_globalXMin')
        const globalXMax = store.current.get('_globalXMax')

        if (windowsScene) {
            const sides = {};
            const IN_TO_M = 0.0254;

            windowsScene.traverse(child => {
                if (child.isMesh && child.visible) {
                    if (child.userData.origX === undefined) {
                        child.userData.origX = child.position.x;
                        child.userData.origZ = child.position.z;
                    }
                    
                    let type = null;
                    if (child.name.includes('15×30_Vertical_Slider')) type = 'vertical';
                    else if (child.name.includes('50×30_Horizontal_Slider')) type = 'horizontal';
                    else if (child.name.includes('30×30_Egress')) type = 'egress';

                    if (type) {
                        const sideKey = child.userData.origZ > 0 ? 'right' : 'left';
                        if (!sides[sideKey]) sides[sideKey] = {};

                        if (!sides[sideKey][type]) {
                            sides[sideKey][type] = { type, origX: child.userData.origX, children: [] };
                        }
                        sides[sideKey][type].children.push(child);
                    }
                }
            });
            
            Object.values(sides).forEach(groups => {
                const activeGroups = Object.values(groups);
                if (activeGroups.length === 0) return;

                activeGroups.sort((a, b) => a.origX - b.origX);
                
                const CONSTANT_GAP_M = 8 * IN_TO_M; // 8 inches constant gap between window edges
                
                activeGroups.forEach(group => {
                    let wBase = 0, sizeStr = '';
                    if (group.type === 'vertical') {
                        wBase = 15; sizeStr = config.windowSizes?.vertical;
                    } else if (group.type === 'horizontal') {
                        wBase = 50; sizeStr = config.windowSizes?.horizontal;
                    } else if (group.type === 'egress') {
                        wBase = 30; sizeStr = config.windowSizes?.egress;
                    }
                    
                    let maxTrueWidth = 0;
                    let avgCenterOffset = 0;
                    let count = 0;
                    
                    group.children.forEach(child => {
                        if (child.geometry) {
                            if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
                            const bbox = child.geometry.boundingBox;
                            const w = bbox.max.x - bbox.min.x;
                            const center = (bbox.max.x + bbox.min.x) / 2;
                            if (w > maxTrueWidth) maxTrueWidth = w;
                            avgCenterOffset += center;
                            count++;
                        }
                    });
                    
                    group.centerOffset = count > 0 ? avgCenterOffset / count : 0;
                    
                    if (sizeStr) {
                        group.widthM = parseInt(sizeStr.split('x')[0]) * IN_TO_M;
                    } else {
                        group.widthM = wBase * IN_TO_M;
                    }
                    
                    group.trueOrigCenterX = group.origX + group.centerOffset;
                });

                activeGroups.sort((a, b) => a.trueOrigCenterX - b.trueOrigCenterX);

                activeGroups[0].targetCenterX = activeGroups[0].trueOrigCenterX;
                for (let i = 1; i < activeGroups.length; i++) {
                    const prev = activeGroups[i-1];
                    const curr = activeGroups[i];
                    
                    const requiredDistance = (prev.widthM + curr.widthM) / 2 + CONSTANT_GAP_M;
                    curr.targetCenterX = prev.targetCenterX + requiredDistance;
                }
                
                const origCenter = (activeGroups[0].trueOrigCenterX + activeGroups[activeGroups.length - 1].trueOrigCenterX) / 2;
                const newCenter = (activeGroups[0].targetCenterX + activeGroups[activeGroups.length - 1].targetCenterX) / 2;
                const centerShift = newCenter - origCenter;
                
                console.log(`[DEBUG WINDOWS] -- Layout for Side --`);
                activeGroups.forEach(g => {
                    g.targetCenterX -= centerShift;
                    // The shift required is the difference between target center and original center
                    const shift = g.targetCenterX - g.trueOrigCenterX;
                    console.log(`[DEBUG WINDOWS] Type: ${g.type}, Width: ${g.widthM.toFixed(3)}m, origCenter: ${g.trueOrigCenterX.toFixed(3)}, targetCenter: ${g.targetCenterX.toFixed(3)}, shift: ${shift.toFixed(3)}`);
                    g.children.forEach(child => {
                        child.position.x = child.userData.origX + shift;
                    });
                });
            });
        }

        const processedGeometries = new Set()

        activeScenesRef.current.forEach(scene => {
            scene.traverse(child => {
                if (!child.isMesh || !child.geometry) return

                // Prevent applying deformations multiple times on shared geometries in a single frame
                if (processedGeometries.has(child.geometry.uuid)) return
                processedGeometries.add(child.geometry.uuid)

                child.updateWorldMatrix(true, false)
                const we = child.matrixWorld.elements
                const ie = child.matrixWorld.clone().invert().elements

                let narrowTrackOffset = 0
                if (config.narrowTrackAxle && (scene === wheels || scene === axleConfig)) {
                    narrowTrackOffset = 0.1 // Shift inward by ~2.4 inches per side
                }

                applyDimensionDeformations({
                    geometry: child.geometry, store: store.current,
                    uuid: child.uuid, meshName: child.name || child.uuid,
                    widthFt: nw, lengthFt: nl, heightFt: nh, awningFt: scene === awning ? na : 18,
                    globalZCenter, globalXMin, globalXMax,
                    we, ie, narrowTrackOffset
                })
                
                if (scene === concessionDoorScene) {
                   // console.log(`[DEBUG CONCESSION] Applying deformations to ${child.name}. ncw: ${ncw}, nch: ${nch}`);
                    applyConcessionDoorDeformations({
                        geometry: child.geometry,
                        widthIn: ncw,
                        heightIn: nch
                    })
                }

                if (scene === windowsScene) {
                    child.scale.set(1, 1, 1);
                    
                    if (child.name.includes('15×30_Vertical_Slider') && config.windowSizes?.vertical) {
                        const [w, h] = config.windowSizes.vertical.split('x').map(Number);
                        applyWindowDeformations({
                            geometry: child.geometry,
                            widthIn: w,
                            heightIn: h,
                            baseWidthIn: 15,
                            baseHeightIn: 30
                        })
                    } else if (child.name.includes('50×30_Horizontal_Slider') && config.windowSizes?.horizontal) {
                        const [w, h] = config.windowSizes.horizontal.split('x').map(Number);
                        applyWindowDeformations({
                            geometry: child.geometry,
                            widthIn: w,
                            heightIn: h,
                            baseWidthIn: 50,
                            baseHeightIn: 30
                        })
                    } else if (child.name.includes('30×30_Egress') && config.windowSizes?.egress) {
                        const [w, h] = config.windowSizes.egress.split('x').map(Number);
                        applyWindowDeformations({
                            geometry: child.geometry,
                            widthIn: w,
                            heightIn: h,
                            baseWidthIn: 30,
                            baseHeightIn: 30
                        })
                    }
                }
            })

            applyUvScalingForScene(scene)
        })

        // ── Dynamically Generate E-Track ────────────────────────
        eTrackGroupRef.current.clear()
        
        // Find the base template meshes (we assume they are the original single-piece objects)
        const floorTemplates = []
        const wallTemplates = []   // collect ALL wall templates (one per side of trailer)
        const smallTemplates = []
        if (cargo) {
            cargo.traverse(child => {
                if (!child.isMesh) return
                const isProxy = child.name.toLowerCase().includes('proxy')
            
                if (child.name.includes('Floor_E-Track') && !isProxy) floorTemplates.push(child)
                if (child.name.includes('Wall_E-Track') && !isProxy) {
                    const targetArray = child.name.includes('Small') ? smallTemplates : wallTemplates;
                    child.geometry.computeBoundingBox();
                    const box = child.geometry.boundingBox;
                    if (box.min.z < -1 && box.max.z > 1) {
                        // The template spans both walls. Split it into independent left and right templates.
                        const rightChild = child.clone();
                        rightChild.geometry = child.geometry.clone();
                        const rightPos = rightChild.geometry.attributes.position;
                        for (let i = 0; i < rightPos.count; i++) {
                            if (rightPos.getZ(i) < 0) rightPos.setXYZ(i, NaN, NaN, NaN);
                        }
                        rightChild.geometry.computeBoundingBox();
                        
                        const leftChild = child.clone();
                        leftChild.geometry = child.geometry.clone();
                        const leftPos = leftChild.geometry.attributes.position;
                        for (let i = 0; i < leftPos.count; i++) {
                            if (leftPos.getZ(i) > 0) leftPos.setXYZ(i, NaN, NaN, NaN);
                        }
                        leftChild.geometry.computeBoundingBox();
                        
                        targetArray.push(leftChild, rightChild);
                    } else {
                        targetArray.push(child);
                    }
                }
            })
        }

        // The true rear X coordinate of the trailer uses the same clamped delta logic from GeometryUtils
        // We use the CURRENT lerped length (`nl`), NOT the target length!
        const BASE_LENGTH_FT = 32
        const FEET_TO_M = 0.305
        const BASE_CLAMP_FT = 27
        const EXCESS_FACTOR = 1.000
        const targetOffset1 = Math.min(nl, BASE_CLAMP_FT)
        const targetOffset2 = Math.max(nl - BASE_CLAMP_FT, 0) * EXCESS_FACTOR
        const baseOffset1 = Math.min(BASE_LENGTH_FT, BASE_CLAMP_FT)
        const baseOffset2 = Math.max(BASE_LENGTH_FT - BASE_CLAMP_FT, 0) * EXCESS_FACTOR
        const deltaLengthETrack = ((targetOffset1 + targetOffset2) - (baseOffset1 + baseOffset2)) * FEET_TO_M
        const trueRearX = -(BASE_LENGTH_FT * FEET_TO_M + deltaLengthETrack)

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

        const smallCount = Math.min(count, Math.max(1, Math.ceil((4 * FEET_TO_M) / stepSize)))
        const smallPoints = new Float32Array(smallCount * 3)
        for (let i = 0; i < smallCount; i++) {
            smallPoints[i * 3] = startX - (i * stepSize)
            smallPoints[i * 3 + 1] = 0
            smallPoints[i * 3 + 2] = 0
        }
        const smallPointsGeometry = new THREE.BufferGeometry()
        smallPointsGeometry.setAttribute('position', new THREE.BufferAttribute(smallPoints, 3))

        // ── Globally enforce D-Rings visibility across all scenes ──
        const showDRings = config.tieDowns?.includes('drings')
        activeScenesRef.current.forEach(scene => {
            scene.traverse(child => {
                if (child.isMesh) {
                    const nameLower = child.name.toLowerCase();
                    if (nameLower.includes('d-ring') || nameLower.includes('d_ring') || nameLower.includes('d ring') || nameLower.includes('dring')) {
                        child.visible = showDRings
                    }
                }
            })
        })

        // ── Compute proxy gaps ──────────────────
        const proxyGaps = []
        activeScenesRef.current.forEach(scene => {
            scene.traverse(child => {
                if (!child.isMesh || !child.geometry) return
                if (!child.name.toLowerCase().includes('proxy')) return
                if (!child.userData?.proxyActive) return

                child.updateWorldMatrix(true, false)
                
                // Compute bounding box manually to ignore stray vertices at local (0,0,0)
                const pos = child.geometry.attributes.position;
                const box = new THREE.Box3();
                const v = new THREE.Vector3();
                let validVertices = 0;
                
                for (let i = 0; i < pos.count; i++) {
                    v.set(pos.getX(i), pos.getY(i), pos.getZ(i));
                    v.applyMatrix4(child.matrixWorld);
                    
                    // Ignore stray vertices that sit exactly at world (0,0,0) - the front bottom center
                    // which stretch the proxy box and cut out unintended sections of E-Track
                    if (Math.abs(v.x) < 0.05 && Math.abs(v.y) < 0.05 && Math.abs(v.z) < 0.05) {
                        continue;
                    }
                    
                    box.expandByPoint(v);
                    validVertices++;
                }
                
                // Fallback to standard bounding box if all vertices were at origin (unlikely)
                if (validVertices === 0) {
                    child.geometry.computeBoundingBox();
                    box.copy(child.geometry.boundingBox).applyMatrix4(child.matrixWorld);
                }

                // console.log(`[PROXY DEBUG] Proxy "${child.name}" - BoundingBox X: [${box.min.x.toFixed(2)}, ${box.max.x.toFixed(2)}], Z: [${box.min.z.toFixed(2)}, ${box.max.z.toFixed(2)}]`);

                proxyGaps.push({
                    xMin: box.min.x, xMax: box.max.x,
                    yMin: box.min.y, yMax: box.max.y,
                    zMin: box.min.z, zMax: box.max.z,
                    name: child.name,
                    mesh: child,
                })
            })
        })

        // Floor E-Track: per-floor generation with proxy cutouts (so E-track doesn't go across door thresholds)
        if (floorTemplates.length > 0 && config.tieDowns?.includes('floor')) {
            floorTemplates.forEach(floorTemplate => {
                floorTemplate.updateWorldMatrix(true, false)
                const wm = floorTemplate.matrixWorld
                
                const templateWorldPos = new THREE.Vector3().setFromMatrixPosition(wm)
                const worldScaleX = Math.sqrt(wm.elements[0]*wm.elements[0] + wm.elements[1]*wm.elements[1] + wm.elements[2]*wm.elements[2])
                const localXDirWorld = wm.elements[0] / (worldScaleX || 1)

                let floorGeom = pointsGeometry
                floorTemplate.geometry.computeBoundingBox()
                const tb = floorTemplate.geometry.boundingBox
                const floorBox = tb.clone().applyMatrix4(wm)
                
                // Floor doesn't need Z-filtering because the proxy is usually just above it, 
                // but we DO need to make sure we don't cut floor E-track if the proxy is high up on the wall.
                if (proxyGaps.length > 0) {
                    const xFactor = worldScaleX * localXDirWorld

                    const filtered = []
                    for (let i = 0; i < count; i++) {
                        const px = startX - (i * stepSize)
                        const worldX = templateWorldPos.x + px * xFactor

                        const extentA = worldX + tb.min.x * xFactor
                        const extentB = worldX + tb.max.x * xFactor
                        const instMin = Math.min(extentA, extentB)
                        const instMax = Math.max(extentA, extentB)

                        let inGap = false
                        for (const gap of proxyGaps) {
                            const xOverlap = instMax >= gap.xMin && instMin <= gap.xMax;
                            const yOverlap = floorBox.max.y >= gap.yMin && floorBox.min.y <= gap.yMax;
                            const zOverlap = floorBox.max.z >= gap.zMin && floorBox.min.z <= gap.zMax;
                            
                            if (xOverlap && yOverlap && zOverlap) {
                                inGap = true;
                                break;
                            }
                        }

                        if (inGap) continue
                        filtered.push(px, 0, 0)
                    }

                    const floorPts = new Float32Array(filtered)
                    floorGeom = new THREE.BufferGeometry()
                    floorGeom.setAttribute('position', new THREE.BufferAttribute(floorPts, 3))
                }

                const floorInstanced = BlenderNodes.instanceOnPoints(floorGeom, floorTemplate)
                floorInstanced.position.copy(floorTemplate.position)
                floorInstanced.rotation.copy(floorTemplate.rotation)
                floorInstanced.scale.copy(floorTemplate.scale)
                // Apply clip transparency (alphaTest) to avoid OIT sorting issues on instanced mesh
                const floorMats = Array.isArray(floorInstanced.material) ? floorInstanced.material : [floorInstanced.material]
                floorMats.forEach(m => { 
                    if (m) { 
                        ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'alphaMap', 'emissiveMap', 'aoMap'].forEach(mapName => {
                            if (m[mapName]) {
                                m[mapName].magFilter = THREE.NearestMipmapNearestFilter;
                                m[mapName].minFilter = THREE.LinearMipmapLinearFilter;
                                m[mapName].needsUpdate = true;
                            }
                        });
                        m.transparent = false; 
                        m.needsUpdate = true; 
                    } 
                })
                eTrackGroupRef.current.add(floorInstanced)
            })
        }

        // Wall & Small E-Track: per-wall generation with Z-aware proxy side detection.
        const templatesToProcess = [];
        if (wallTemplates.length > 0 && config.tieDowns?.includes('wall')) {
            templatesToProcess.push(...wallTemplates);
        }
        if (smallTemplates.length > 0 && config.tieDowns?.includes('small')) {
            templatesToProcess.push(...smallTemplates);
        }
        
        if (templatesToProcess.length > 0) {
            templatesToProcess.forEach((wallTemplate, wallIdx) => {
                wallTemplate.updateWorldMatrix(true, false)
                const wm = wallTemplate.matrixWorld
                
                const templateWorldPos = new THREE.Vector3().setFromMatrixPosition(wm)
                const worldScaleX = Math.sqrt(wm.elements[0]*wm.elements[0] + wm.elements[1]*wm.elements[1] + wm.elements[2]*wm.elements[2])
                const localXDirWorld = wm.elements[0] / (worldScaleX || 1)

                wallTemplate.geometry.computeBoundingBox()
                const wallBox = wallTemplate.geometry.boundingBox.clone().applyMatrix4(wm)
                const trueWallWorldZ = (wallBox.min.z + wallBox.max.z) / 2
                
                const wallWorldZ = trueWallWorldZ
                const wallProxyGaps = proxyGaps.filter(gap => {
                    if (templatesToProcess.length === 1) return true
                    const proxyCenterZ = (gap.zMin + gap.zMax) / 2
                    const wallIsNearZero = Math.abs(wallWorldZ) < 0.05
                    const match = wallIsNearZero ? true : (Math.sign(wallWorldZ) === Math.sign(proxyCenterZ))
                    return match
                })
                
                // console.log(`[DEBUG ETRACK] Wall ${wallIdx}: worldZ=${wallWorldZ.toFixed(2)}. Found ${wallProxyGaps.length} gaps for this wall (out of ${proxyGaps.length} total).`, proxyGaps.map(g => ({ name: g.name, z: ((g.zMin+g.zMax)/2).toFixed(2) })));

                const isSmallTemplate = wallTemplate.name.includes('Small')
                const targetPlacedCount = isSmallTemplate ? smallCount : count
                let wallGeom = isSmallTemplate ? smallPointsGeometry : pointsGeometry

                wallTemplate.geometry.computeBoundingBox()
                const tb = wallTemplate.geometry.boundingBox

                if (wallProxyGaps.length > 0) {
                    const xFactor = worldScaleX * localXDirWorld

                    const filtered = []
                    let placedCount = 0;
                    for (let i = 0; i < count; i++) {
                        if (placedCount >= targetPlacedCount) break;

                        const px = startX - (i * stepSize)
                        const worldX = templateWorldPos.x + px * xFactor

                        const extentA = worldX + tb.min.x * xFactor
                        const extentB = worldX + tb.max.x * xFactor
                        const instMin = Math.min(extentA, extentB)
                        const instMax = Math.max(extentA, extentB)

                        let inGap = false
                        for (const gap of wallProxyGaps) {
                            const xOverlap = instMax >= gap.xMin && instMin <= gap.xMax;
                            const yOverlap = wallBox.max.y >= gap.yMin && wallBox.min.y <= gap.yMax;
                            const zOverlap = wallBox.max.z >= gap.zMin && wallBox.min.z <= gap.zMax;
                            
                            if (xOverlap && yOverlap && zOverlap) {
                                inGap = true;
                                break;
                            }
                        }

                        if (inGap) continue
                        filtered.push(px, 0, 0)
                        placedCount++;
                    }

                    const wallPts = new Float32Array(filtered)
                    wallGeom = new THREE.BufferGeometry()
                    wallGeom.setAttribute('position', new THREE.BufferAttribute(wallPts, 3))
                }
                const wallInstanced = BlenderNodes.instanceOnPoints(wallGeom, wallTemplate)
                wallInstanced.position.copy(wallTemplate.position)
                wallInstanced.rotation.copy(wallTemplate.rotation)
                wallInstanced.scale.copy(wallTemplate.scale)
                // Apply clip transparency (alphaTest) to avoid OIT sorting issues on instanced mesh
                const wallMats = Array.isArray(wallInstanced.material) ? wallInstanced.material : [wallInstanced.material]
                wallMats.forEach(m => { 
                    if (m) { 
                        ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'alphaMap', 'emissiveMap', 'aoMap'].forEach(mapName => {
                            if (m[mapName]) {
                                m[mapName].magFilter = THREE.NearestMipmapNearestFilter;
                                m[mapName].minFilter = THREE.LinearMipmapLinearFilter;
                                m[mapName].needsUpdate = true;
                            }
                        });
                        m.transparent = false; 
                        m.needsUpdate = true; 
                    } 
                })
                eTrackGroupRef.current.add(wallInstanced)
            })
        }
        
        // Clean up unneeded geometries to prevent memory leaks over time since this runs every frame during resize
        pointsGeometry.dispose()
        smallPointsGeometry.dispose()
        
        // DEBUG: Check ATP_Flat_Panel_L_24in once
        if (extFinish && !window.hasLoggedATP) {
            window.hasLoggedATP = true;
            const sidePanel = extFinish.getObjectByName('ATP_Flat_Panel_L_24in')
            if (sidePanel) {
                const box = new THREE.Box3().setFromObject(sidePanel);
                // console.log('[DEBUG RENDER] ATP_Flat_Panel_L_24in visible:', sidePanel.visible, 'box min:', box.min, 'box max:', box.max, 'parent visible:', sidePanel.parent?.visible, 'material:', sidePanel.material);
                
                // Traverse up to find if any parent is hidden
                let p = sidePanel.parent;
                while (p) {
                    if (!p.visible) {
                        // console.log('[DEBUG RENDER] HIDDEN PARENT FOUND:', p.name);
                    }
                    p = p.parent;
                }
            } else {
                // console.log('[DEBUG RENDER] ATP_Flat_Panel_L_24in NOT FOUND in extFinish during render loop!');
            }
        }

    })

    const prevVisibleExteriorNodes = useRef(new Set());
    const prevVisibleNodes = useRef(new Set());

    useEffect(() => {
        const currentVisibleInteriorNodes = new Set();
        const currentVisibleExteriorNodes = new Set();
        const currentVisibleNodes = new Set();
        let shouldSwitchToInterior = false;
        let shouldSwitchToExterior = false;

        activeScenes.forEach(scene => {
            scene.traverse(child => {
                if (child.visible) {
                    currentVisibleNodes.add(child.uuid);

                    // Debug: Log newly visible nodes and their userData
                    // if (!prevVisibleNodes.current.has(child.uuid) && child.userData && Object.keys(child.userData).length > 0) {
                    //     console.log(`[DEBUG NEW VISIBLE NODE] name: "${child.name}", type: ${child.type}, userData:`, child.userData);
                    // }

                    if (child.userData) {
                        let propValue = undefined;
                        for (const key in child.userData) {
                            if (key.toLowerCase() === 'isinterior') {
                                propValue = child.userData[key];
                                break;
                            }
                        }

                        if (propValue !== undefined) {
                            const isInterior = propValue === true || propValue === 1 || propValue === 'true' || propValue === '1';
                            const isExterior = propValue === false || propValue === 0 || propValue === 'false' || propValue === '0';

                            if (isInterior) {
                                currentVisibleInteriorNodes.add(child.uuid);
                                if (!prevVisibleInteriorNodes.current.has(child.uuid)) {
                                    shouldSwitchToInterior = true;
                                    // console.log(`[DEBUG INTERIOR] -> Switch to INTERIOR triggered by: ${child.name}`);
                                }
                            } else if (isExterior) {
                                currentVisibleExteriorNodes.add(child.uuid);
                                if (!prevVisibleExteriorNodes.current.has(child.uuid)) {
                                    shouldSwitchToExterior = true;
                                    // console.log(`[DEBUG INTERIOR] -> Switch to EXTERIOR triggered by: ${child.name}`);
                                }
                            }
                        }
                    }
                }
            });
        });

        if (!isFirstRender.current) {
            if (shouldSwitchToInterior) {
                if (config.viewMode !== 'INTERIOR') {
                    config.setViewMode('INTERIOR');
                }
            } else if (shouldSwitchToExterior) {
                if (config.viewMode === 'INTERIOR') {
                    config.setViewMode('EXTERIOR');
                }
            }
        }

        prevVisibleInteriorNodes.current = currentVisibleInteriorNodes;
        prevVisibleExteriorNodes.current = currentVisibleExteriorNodes;
        prevVisibleNodes.current = currentVisibleNodes;
        isFirstRender.current = false;
    });

    return (
        <>
            <group>
                {activeScenes.map(scene => (
                    <primitive key={scene.uuid} object={scene} />
                ))}
                {ladderRacksGroup}
                <primitive object={eTrackGroupRef.current} />
            </group>
        </>
    )
}

Object.values(PATHS).forEach(path => useGLTF.preload(path))
Object.values(SHELL_TEXTURES).forEach(path => useTexture.preload(path))
Object.values(STATIC_TEXTURE_PATHS).forEach(path => useTexture.preload(path))
useTexture.preload('/Materials/Metallic_Grates_Normal.png')
useTexture.preload('/Materials/Simple_Noise.png')




