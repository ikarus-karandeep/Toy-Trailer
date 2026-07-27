import { useRef, useEffect, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { applyDimensionDeformations } from '../utils/GeometryUtils'
import { BlenderNodes } from '../utils/BlenderNodes'
import { useConfigurator } from '../context/ConfiguratorContext'
import { patchTriplanarMaterial } from '../utils/TriplanarMaterial'
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
    '2x': ['16-2_Standard_Wheels_6-Lug_1', '16-2_Standard_Wheels_6-Lug_2'],
    '3x': ['16-3_Standard_Wheels_6-Lug_1', '16-3_Standard_Wheels_6-Lug_2'],
}

// Maps frontStyle config value → exact Blender mesh name inside Front Style.glb
const FRONT_STYLE_MESH_MAP = {
    vnose24: 'V-Nose',
    flatfront: 'Flat_Front',
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
    '3500lb-dropspring': { '2x': '2X_3500_lb_Leaf_Spring', '3x': '3X_3500_lb_Leaf_Spring' },
    '3500lb-torsion': { '2x': '2X_3500_lb_Torsion', '3x': '3X_3500_lb_Torsion' },
    '6000lb-dropspring': { '2x': '2X_6000_lb_Leaf_Spring', '3x': '3X_6000_lb_Leaf_Spring' },
    '6000lb-torsion': { '2x': '2X_6000_lb_Torsion', '3x': '3X_6000_lb_Torsion' },
    '7000lb-dropspring': { '2x': '2x_7000_lb_Drop_Spring', '3x': '3x_7000_lb_Drop_Spring' },
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
}


export default function ModularTrailerModel({ widthFt, lengthFt, heightFt, environment }) {
    const config = useConfigurator()
    const hasCabinet = config.cabinets?.includes('frontbase36') 

    let effectiveDriverDoor = config.driverSideDoor || 'none'
    let effectivePassengerDoor = config.passengerSideDoor || 'none'

    if (parseFloat(config.length) < 23.5) {
        if (effectiveDriverDoor !== 'none' && effectiveDriverDoor !== '36x72') effectiveDriverDoor = '36x72'
        if (effectivePassengerDoor !== 'none' && effectivePassengerDoor !== '36x72') effectivePassengerDoor = '36x72'
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

    const shellTextures = useTexture(SHELL_TEXTURES)
    const simpleNoise   = useTexture('/Materials/Simple_Noise.png')
    const normalMap = useTexture('/Materials/Metallic_Grates_Normal.png')
    const staticTextures = useTexture(STATIC_TEXTURE_PATHS)

    const store = useRef(new Map())
    const animRef = useRef({
        widthFt: 8.5,
        lengthFt: parseInt(config.length || '32'),
        heightFt: heightFt,
        awningFt: config.awning && config.awning.length > 0 ? parseInt(config.awning[0].match(/\d+/)?.[0] || '18') : 18
    })
    const targetRef = useRef({ 
        widthFt, 
        lengthFt, 
        heightFt, 
        awningFt: config.awning && config.awning.length > 0 ? parseInt(config.awning[0].match(/\d+/)?.[0] || '18') : 18
    })
    const dirtyRef = useRef(true)
    const activeScenesRef = useRef([])
    const wheelCoverOriginalMatsRef = useRef(new Map())
    // Incremented by the visibility useEffect after every switchMesh/switchMeshes call.
    // child.visible is accurate when the proxy scan runs.
    const [visibilityVersion, setVisibilityVersion] = useState(0)
    const eTrackGroupRef = useRef(new THREE.Group())

    // DEBUG: log mesh names + material names as Three.js sees them after GLB load
    // and explicitly hide any proxy meshes so they don't render.
    useEffect(() => {
        const allScenes = { base, baseMeshes, frontStyle, rearDoors, sideDoors, extFinish, tongue, cabinetsGLB, awning, bathroom, spoiler, gullwingDoor, escapeDoorScene, axleConfig, axle, wheels, addons, cargo }
        Object.entries(allScenes).forEach(([sceneName, scene]) => {
            if (!scene) return;
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
            })
        })
    }, [base, baseMeshes, frontStyle, rearDoors, sideDoors, extFinish, tongue, cabinetsGLB, awning, bathroom, spoiler, gullwingDoor, escapeDoorScene, axleConfig, axle, wheels, addons, cargo])

    const applyUvScalingForScene = (scene) => {
        scene.traverse(child => {
            if (!child.isMesh || !child.geometry?.attributes.uv) return

            const mats = Array.isArray(child.material) ? child.material : [child.material]
            const needsUvScale = mats.some(mat => {
                const normalized = mat?.name?.replace(/[\s_]+/g, '').toLowerCase() || ''
                return normalized.includes('uvscale')
            })

            if (!needsUvScale) return
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
            const baseScale = 10.0 
            
            const scaleX = distX / 2.02
            const scaleY = distY / 1.92 

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
            escapeDoorScene, axleConfig, axle, wheels, addons, cargo,
        ]

        allScenes.forEach(applyUvScalingForScene)
    }, [
        base, baseMeshes, frontStyle, rearDoors, sideDoors, extFinish,
        tongue, cabinetsGLB, awning, bathroom, spoiler, gullwingDoor,
        escapeDoorScene, axleConfig, axle, wheels, addons, cargo,
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
            escapeDoorScene, axleConfig, axle, wheels, addons, cargo,
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
                    

                    if (useTriplanar && !isDecal) {
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
                    } else {
                        const next = mat.clone()
                        if (isDecal) {
                            next.color.set(shellHex)
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
        config.selectedColor, shellTextures, simpleNoise,
        base, baseMeshes, frontStyle, rearDoors, sideDoors, extFinish,
        tongue, cabinetsGLB, awning, bathroom, spoiler, gullwingDoor,
        escapeDoorScene, axleConfig, axle, wheels, addons, cargo,
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
                }
                
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
            escapeDoorScene, axleConfig, axle, wheels, addons, cargo,
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
                    
                    if (normalized === 'metallicgrates') {
                        applyGrates(child, mat, i, isArray, isDecal, false)
                    } else if (normalized === 'metallicgratesuvscale') {
                        applyGrates(child, mat, i, isArray, isDecal, true)
                    }
                })
            })
        })
    }, [
        normalMap,
        base, baseMeshes, frontStyle, rearDoors, sideDoors, extFinish,
        tongue, cabinetsGLB, awning, bathroom, spoiler, gullwingDoor,
        escapeDoorScene, axleConfig, axle, wheels, addons, cargo,
    ])

    // ── Apply Metallic Guard to MAT_WheelCover (ATP on) or MAT_Shell look (ATP off) ──
    useEffect(() => {
        const texture = shellTextures[config.selectedColor]

        const allScenes = [
            base, baseMeshes, frontStyle, rearDoors, sideDoors, extFinish,
            tongue, cabinetsGLB, awning, bathroom, spoiler, gullwingDoor,
            escapeDoorScene, axleConfig, axle, wheels, addons, cargo,
        ]

        allScenes.forEach(scene => {
            scene.traverse(child => {
                if (!child.isMesh) return
                const isArray = Array.isArray(child.material)
                const mats = isArray ? child.material : [child.material]

                mats.forEach((mat, i) => {
                    if (!mat) return
                    const normalized = mat.name?.replace(/[\s_]+/g, '').toLowerCase()
                    if (normalized !== 'matwheelcover') return

                    const key = `${child.uuid}-${i}`

                    // Always store the GLB original on first encounter
                    if (!wheelCoverOriginalMatsRef.current.has(key)) {
                        wheelCoverOriginalMatsRef.current.set(key, mat)
                    }
                    const original = wheelCoverOriginalMatsRef.current.get(key)

                    if (config.axleAtp) {
                        normalMap.flipY = false
                        normalMap.repeat.set(20, 20)
                        const next = original.clone()
                        next.normalMap   = normalMap
                        next.normalScale = new THREE.Vector2(1.0, 1.0)
                        next.metalness   = 1
                        next.roughness   = 0.1
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
        config.axleAtp, config.selectedColor, shellTextures, simpleNoise, normalMap,
        base, baseMeshes, frontStyle, rearDoors, sideDoors, extFinish,
        tongue, cabinetsGLB, awning, bathroom, spoiler, gullwingDoor,
        escapeDoorScene, axleConfig, axle, wheels, addons, cargo,
    ])

    // ── Apply Rim material to MAT_Rim based on wheel selection ───────────────
    useEffect(() => {
        let rimMatName = 'blacksteelwheelrim'
        if (config.wheelType === 'spideraluminum') rimMatName = 'aluminiumradialrim'
        else if (config.wheelType === 'standardsilver') rimMatName = 'standardsilverrim'

        const def = MATERIAL_DEFS_NORM.get(rimMatName)
        // console.log('[DEBUG RIMS] wheelType:', config.wheelType, '| rimMatName:', rimMatName)
        // console.log('[DEBUG RIMS] def found:', !!def, def)
        
        if (!def) return

        let rimMeshesFound = 0;
        ;[wheels, axleConfig].forEach((scene, sceneIdx) => {
            scene.traverse(child => {
                if (!child.isMesh) return
                const isArray = Array.isArray(child.material)
                const mats = isArray ? child.material : [child.material]
                mats.forEach((mat, i) => {
                    if (!mat) return
                    const normalized = mat.name?.replace(/[\s_]+/g, '').toLowerCase()
                    if (!normalized?.includes('rim')) return
                    
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
    }, [config.wheelType, wheels, axleConfig, staticTextures])

    // ── Apply all standard materials driven by material_data.json ────────────
    // Only MAT_Shell, Metallic Grates, MAT_WheelCover, MAT_Rim remain special.
    useEffect(() => {
        const allScenes = [
            base, baseMeshes, frontStyle, rearDoors, sideDoors, extFinish,
            tongue, cabinetsGLB, awning, bathroom, spoiler, gullwingDoor,
            escapeDoorScene, axleConfig, axle, wheels, addons, cargo,
        ]
        allScenes.forEach(scene => {
            const isGooseneckScene = (scene === frontStyle) && config.frontStyle && config.frontStyle.toLowerCase().includes('gooseneck');
            
            scene.traverse(child => {
                if (!child.isMesh) return
                const isArray = Array.isArray(child.material)
                const mats = isArray ? child.material : [child.material]
                mats.forEach((mat, i) => {
                    if (!mat || isSpecialMaterial(mat.name)) return
                    const def = MATERIAL_DEFS_NORM.get(normMatName(mat.name))
                    if (!def) return
                    let next = applyMaterialDef(mat, def, staticTextures)
                    
                    const isGooseneckMesh = isGooseneckScene || child.name.toLowerCase().includes('gooseneck');
                    
                    if (normMatName(mat.name) === 'reflectivestripes' && !isGooseneckMesh) {
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
        config.frontStyle, staticTextures,
        base, baseMeshes, frontStyle, rearDoors, sideDoors, extFinish,
        tongue, cabinetsGLB, awning, bathroom, spoiler, gullwingDoor,
        escapeDoorScene, axleConfig, axle, wheels, addons, cargo,
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
        BlenderNodes.switchMesh(rearDoors, config.rearDoor ? rearDoorMesh : null)

        // ── Base Meshes: Escape Door condition ────────────────────────
        // Mirrors the Blender "Base" node group.
        // Group Input -> Base Interior goes into Super Toggle, gated by Escape Door menu index.
        const baseInterior = baseMeshes.getObjectByName('Base_Interior') || baseMeshes.getObjectByName('Base Interior')
        const leftWall = baseMeshes.getObjectByName('Left_Wall') || baseMeshes.getObjectByName('Left side wall Vanilla')
        const rightWall = baseMeshes.getObjectByName('Right_Wall') || baseMeshes.getObjectByName('Right side wall Vanilla')
        
        if (baseInterior) baseInterior.visible = config.escapeDoor === 'none'
        if (leftWall) leftWall.visible = config.escapeDoor === 'none'
        if (rightWall) rightWall.visible = true

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
        const activeAtpMeshes = []
        if (driverVariant && driverVariant.atpL) activeAtpMeshes.push(driverVariant.atpL)
        if (passengerVariant && passengerVariant.atpR) activeAtpMeshes.push(passengerVariant.atpR)
        
        const uniqueAtpMeshes = [...new Set(activeAtpMeshes)]

        // ATP plates mirror the generator box plate visibility
        uniqueAtpMeshes.push('ATP_Plate_Generator_Box_L')
        uniqueAtpMeshes.push('ATP_Plate_Generator_Box_R')

        if (config.width === '8.5ftgn') {
            uniqueAtpMeshes.push('ATP_Gooseneck')
        }

        BlenderNodes.switchMeshes(sideDoors, activeDoorMeshes)
        // When ATP is OFF, suppress all extFinish ATP trim meshes globally
        BlenderNodes.switchMeshes(extFinish, config.axleAtp ? uniqueAtpMeshes : [])

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
            
            const variantPrefix = config.axleCount === 'triple' ? '3X' : '2X'
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

        if (config.interiorTireMount || config.spareTire) {
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
        const hasOverhead = config.cabinets?.includes('frontoverhead16') 
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

        // Axle Count determines the number of tyres (tandem vs triple)
        const axleCountStr = config.axleCount === 'triple' ? '3' : '2';
        const tireSizeStr = config.tireSize || '15';
        const lugStr = (config.lugType || '5lug').replace('lug', '');
        
        // Target normalized name: e.g. "162standardwheels5lug"
        const targetWheelNorm = `${tireSizeStr}${axleCountStr}standardwheels${lugStr}lug`;
        
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

        // Cover panel — always shown, angled or flat based on toggle, unless spread axle is on
        if (!config.spreadAxle) {
            activeAxleMeshes.push(`${prefix}Axle_${config.axleAngled ? 'Angled' : 'Flat'}_Side`)
        }

        // ── Finishes section (gated by ATP Super Toggle in Blender graph) ─────────
        if (config.axleAtp) {
            // Base ATP strip
            activeAxleMeshes.push('Side_Panel_ATP')
            // ATP directional trim — follows same angled/flat toggle
            if (config.spreadAxle) {
                activeAxleMeshes.push(`ATP_Corvette_Fender_${config.axleAngled ? 'Angled' : 'Flat'}_Side`)
            } else {
                activeAxleMeshes.push(`${prefix}ATP_${config.axleAngled ? 'Angled' : 'Flat'}_Side`)
            }
        }

        if (config.spreadAxle) {
            activeAxleMeshes.push(`Corvette_Fender_${config.axleAngled ? 'Angled' : 'Flat'}_Side`)
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
        const showAwning = config.awning?.length > 0;
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
        config.wheel, config.axleCount, config.axleAngled, config.axleAtp, config.axleRating, config.spreadAxle,
        config.tireSize, config.lugType,
        config.cabinets, config.toolBox,
        config.driverSideDoor, config.passengerSideDoor,
        config.stairs, config.batteryBox, config.vNoseETrack, config.angledLights,
        config.escapeDoor, config.generatorBox, config.winchSystem, config.tieDowns,
        config.extendedTripleTongue, config.radioPackageSpeaker, config.exteriorAccessories,
        config.climateControl, config.jacks, config.lights,
        config.ladderRacks, config.sidewallVents, config.recessedTireBox, config.interiorTireMount, config.spareTire,
        config.bathroom, config.awning,
        frontStyle, rearDoors, sideDoors, extFinish, wheels, axle, axleConfig, addons,
        cabinetsGLB, cargo, spoiler, tongue, bathroom, gullwingDoor, awning
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
        ]
        if (config.cabinets?.length > 0) scenes.push(cabinetsGLB)
        if (config.awning?.length > 0) scenes.push(awning)
        if (config.bathroom && config.bathroom !== 'none') scenes.push(bathroom)
        if (config.exteriorAccessories === 'rearwingspoiler' || config.exteriorAccessories === 'rearwings') scenes.push(spoiler)
        if (config.escapeDoor === 'gullwing') scenes.push(gullwingDoor)
        if (config.escapeDoor === '54x48') scenes.push(escapeDoorScene)
        return scenes
    }, [
        config.cabinets, config.awning, config.bathroom, config.exteriorAccessories, config.escapeDoor,
        lengthFt,
        base, baseMeshes, frontStyle, rearDoors, sideDoors, extFinish,
        tongue, wheels, axleConfig, axle, addons, cabinetsGLB, awning, bathroom, cargo, spoiler, gullwingDoor, escapeDoorScene
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
    }, [activeScenes, config.tieDowns, hasCabinet, visibilityVersion, config.narrowTrackAxle])

    useFrame(() => {
        if (!store.current.has('_globalZCenter')) return
        const curr = animRef.current, tgt = targetRef.current
        const nw = curr.widthFt + (tgt.widthFt - curr.widthFt) * LERP_SPEED
        const nl = curr.lengthFt + (tgt.lengthFt - curr.lengthFt) * LERP_SPEED
        const nh = curr.heightFt + (tgt.heightFt - curr.heightFt) * LERP_SPEED
        
        const awningMatch = config.awning?.[0]?.match(/\d+/)
        const targetAwningFt = awningMatch ? parseInt(awningMatch[0]) : 18
        const na = curr.awningFt + (targetAwningFt - curr.awningFt) * LERP_SPEED

        const moved =
            Math.abs(nw - curr.widthFt) > LERP_THRESHOLD ||
            Math.abs(nl - curr.lengthFt) > LERP_THRESHOLD ||
            Math.abs(nh - curr.heightFt) > LERP_THRESHOLD ||
            Math.abs(na - curr.awningFt) > LERP_THRESHOLD
            
        if (!moved && !dirtyRef.current) {
            return
        }
        dirtyRef.current = false
        animRef.current = { widthFt: nw, lengthFt: nl, heightFt: nh, awningFt: na }
        const globalZCenter = store.current.get('_globalZCenter')
        const globalXMin = store.current.get('_globalXMin')
        const globalXMax = store.current.get('_globalXMax')

        activeScenesRef.current.forEach(scene => {
            scene.traverse(child => {
                if (!child.isMesh || !child.geometry) return

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
                    widthFt: nw, lengthFt: nl, heightFt: nh, awningFt: na,
                    globalZCenter, globalXMin, globalXMax,
                    we, ie, narrowTrackOffset
                })
            })

            applyUvScalingForScene(scene)
        })

        // ── Dynamically Generate E-Track ────────────────────────
        eTrackGroupRef.current.clear()
        
        // Find the base template meshes (we assume they are the original single-piece objects)
        const floorTemplates = []
        const wallTemplates = []   // collect ALL wall templates (one per side of trailer)
        if (cargo) {
            cargo.traverse(child => {
                if (!child.isMesh) return
                const isProxy = child.name.toLowerCase().includes('proxy')
            
                if (child.name.includes('Floor_E-Track') && !isProxy) floorTemplates.push(child)
                if (child.name.includes('Wall_E-Track')  && !isProxy) {
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
                        
                        wallTemplates.push(leftChild, rightChild);
                    } else {
                        wallTemplates.push(child);
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
                eTrackGroupRef.current.add(floorInstanced)
            })
        }

        // Wall E-Track: per-wall generation with Z-aware proxy side detection.
        if (wallTemplates.length > 0 && config.tieDowns?.includes('wall')) {
            wallTemplates.forEach((wallTemplate, wallIdx) => {
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
                    if (wallTemplates.length === 1) return true
                    const proxyCenterZ = (gap.zMin + gap.zMax) / 2
                    const wallIsNearZero = Math.abs(wallWorldZ) < 0.05
                    const match = wallIsNearZero ? true : (Math.sign(wallWorldZ) === Math.sign(proxyCenterZ))
                    return match
                })
                
                // console.log(`[DEBUG ETRACK] Wall ${wallIdx}: worldZ=${wallWorldZ.toFixed(2)}. Found ${wallProxyGaps.length} gaps for this wall (out of ${proxyGaps.length} total).`, proxyGaps.map(g => ({ name: g.name, z: ((g.zMin+g.zMax)/2).toFixed(2) })));

                let wallGeom = pointsGeometry

                wallTemplate.geometry.computeBoundingBox()
                const tb = wallTemplate.geometry.boundingBox

                if (wallProxyGaps.length > 0) {
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
                    }

                    const wallPts = new Float32Array(filtered)
                    wallGeom = new THREE.BufferGeometry()
                    wallGeom.setAttribute('position', new THREE.BufferAttribute(wallPts, 3))
                }
                const wallInstanced = BlenderNodes.instanceOnPoints(wallGeom, wallTemplate)
                wallInstanced.position.copy(wallTemplate.position)
                wallInstanced.rotation.copy(wallTemplate.rotation)
                wallInstanced.scale.copy(wallTemplate.scale)
                
                eTrackGroupRef.current.add(wallInstanced)
            })
        }
        
        // Clean up unneeded geometries to prevent memory leaks over time since this runs every frame during resize
        pointsGeometry.dispose()

    })

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




