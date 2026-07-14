import { useRef, useEffect, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { applyDimensionDeformations } from '../utils/GeometryUtils'
import { BlenderNodes } from '../utils/BlenderNodes'
import { useConfigurator } from '../context/ConfiguratorContext'
import { patchTriplanarMaterial } from '../utils/TriplanarMaterial'
import { MATERIAL_DEFS_NORM, STATIC_TEXTURE_PATHS, applyMaterialDef, isSpecialMaterial, normMatName } from '../utils/MaterialApplicator'

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
    vnose: 'V-Nose',
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
    '5200leafspring': { '2x': '2X_5200_lb_Leaf_Spring', '3x': '3X_5200_lb_Leaf_Spring' },
    '5200torsion': { '2x': '2X_5200_lb_Torsion', '3x': '3X_5200_lb_Torsion' },
    '7000dropspring': { '2x': '2X_7000_lb_Leaf_Spring', '3x': '3X_7000_lb_Leaf_Spring' },
    '7000torsion': { '2x': '2X_7000_lb_Torsion', '3x': '3X_7000_lb_Torsion' },
    '8000torsion16k': { '2x': '2X_8000_lb_Torsion', '3x': '3X_8000_lb_Torsion' },
    // Triple options always use the 3X mesh
    '10000lbtandem': { '2x': '2X_10,000_lb_Tandem', '3x': '3X_10,000_lb_Tandem' },
    // 'triple7000torsion': { '2x': '2X_7000_lb_Torsion', '3x': '3X_7000_lb_Torsion' },
}

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

    const shellTextures = useTexture(SHELL_TEXTURES)
    const simpleNoise   = useTexture('/Materials/Simple_Noise.png')
    const normalMap = useTexture('/Materials/Metallic_Grates_Normal.png')
    const staticTextures = useTexture(STATIC_TEXTURE_PATHS)

    const aluminumRimTextures = useTexture({
        baseColor: '/Materials/Aluminum_Rim_Base_color.jpg',
        metallic:  '/Materials/Aluminum_Rim_Metallic.jpg',
        normal:    '/Materials/Aluminum_Rim_Normal.jpg',
        roughness: '/Materials/Aluminum_Rim_Roughness.jpg',
    })

    const blackSteelRimTextures = useTexture({
        baseColor: '/Materials/Black Steel_Rim_Base_color.jpg',
        metallic:  '/Materials/Black Steel_Rim_Metallic.jpg',
        normal:    '/Materials/Black Steel_Rim_Normal.jpg',
        roughness: '/Materials/Black Steel_Rim_Roughness.jpg',
    })

    const store = useRef(new Map())
    const animRef = useRef({ widthFt, lengthFt, heightFt })
    const targetRef = useRef({ widthFt, lengthFt, heightFt })
    const dirtyRef = useRef(true)
    const activeScenesRef = useRef([])
    const wheelCoverOriginalMatsRef = useRef(new Map())
    // Incremented by the visibility useEffect after every switchMesh/switchMeshes call.
    // This triggers generatedETracks to recompute AFTER proxy visibility is set, so
    // child.visible is accurate when the proxy scan runs.
    const [visibilityVersion, setVisibilityVersion] = useState(0)

    // DEBUG: log mesh names + material names as Three.js sees them after GLB load
    useEffect(() => {
        const allScenes = { base, baseMeshes, frontStyle, rearDoors, sideDoors, extFinish, tongue, cabinetsGLB, awning, bathroom, spoiler, gullwingDoor, escapeDoorScene, axleConfig, axle, wheels, addons, cargo }
        Object.entries(allScenes).forEach(([sceneName, scene]) => {
            scene.traverse(child => {
                if (!child.isMesh) return
                const mats = Array.isArray(child.material)
                    ? child.material.map(m => m.name || '(unnamed)')
                    : [child.material?.name || '(unnamed)']
                console.log(`[${sceneName}] mesh: "${child.name}" | materials: [${mats.join(', ')}] | userData:`, JSON.parse(JSON.stringify(child.userData)))
            })
        })
    }, [])

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
                    if (mat?.name !== 'MAT_Shell') return

                    // undefined = not tagged in GLB → default to triplanar; only skip when explicitly false
                    const useTriplanar = child.userData?.useTriplanar !== false
                    console.log(`[Triplanar] ${child.name} → ${useTriplanar ? 'triplanar' : 'standard UV'}`)

                    if (useTriplanar) {
                        // Clone base material preserving GLB PBR properties, then patch shader
                        const base = mat.clone()
                        base.map         = texture
                        base.normalMap   = simpleNoise
                        base.normalScale = new THREE.Vector2(0.07, 0.07)
                        base.roughness   = 0.05
                        const patched = patchTriplanarMaterial(base, 0.06)
                        if (isArray) child.material[i] = patched
                        else child.material = patched
                    } else {
                        const next = mat.clone()
                        next.map         = texture
                        next.normalMap   = simpleNoise
                        next.normalScale = new THREE.Vector2(0.05, 0.05)
                        next.roughness   = 0.1
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

        console.log('[grates-debug] normalMap loaded:', normalMap, '| image:', normalMap?.image)

        const applyGrates = (child, mat, i, isArray) => {
            const base = mat.clone()
            base.normalMap   = normalMap
            base.normalScale = new THREE.Vector2(4.0, 4.0)
            base.metalness   = 1
            base.roughness   = 0.1
            const patched = patchTriplanarMaterial(base, 10)
            if (isArray) child.material[i] = patched
            else child.material = patched
        }

        const allScenes = [
            base, baseMeshes, frontStyle, rearDoors, sideDoors, extFinish,
            tongue, cabinetsGLB, awning, bathroom, spoiler, gullwingDoor,
            escapeDoorScene, axleConfig, axle, wheels, addons, cargo,
        ]

        // Apply only to meshes whose material name normalises to 'metallicgrates'
        allScenes.forEach(scene => {
            scene.traverse(child => {
                if (!child.isMesh) return
                const isArray = Array.isArray(child.material)
                const mats = isArray ? child.material : [child.material]
                mats.forEach((mat, i) => {
                    if (!mat) return
                    const normalized = mat.name?.replace(/[\s_]+/g, '').toLowerCase()
                    if (normalized === 'metallicgrates') {
                        applyGrates(child, mat, i, isArray)
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
        const textures = config.wheel === 'aluminumradial' ? aluminumRimTextures : blackSteelRimTextures
        const { baseColor, metallic, normal, roughness } = textures
        baseColor.colorSpace = THREE.SRGBColorSpace
        metallic.colorSpace  = THREE.NoColorSpace
        normal.colorSpace    = THREE.NoColorSpace
        roughness.colorSpace = THREE.NoColorSpace
        ;[baseColor, metallic, normal, roughness].forEach(t => { t.flipY = false })
        ;[baseColor, metallic, normal, roughness].forEach(t => {
            t.wrapS = THREE.RepeatWrapping
            t.wrapT = THREE.RepeatWrapping
            t.repeat.set(50, 50)
            t.needsUpdate = true
        })

        ;[wheels, axleConfig].forEach(scene => {
            scene.traverse(child => {
                if (!child.isMesh) return
                const isArray = Array.isArray(child.material)
                const mats = isArray ? child.material : [child.material]
                mats.forEach((mat, i) => {
                    if (!mat) return
                    const normalized = mat.name?.replace(/[\s_]+/g, '').toLowerCase()
                    if (!normalized?.includes('rim')) return
                    const next = mat.clone()
                    next.map          = baseColor
                    next.metalnessMap = metallic
                    next.metalness    = 1.0
                    next.normalMap    = normal
                    next.normalScale  = new THREE.Vector2(1.0, 1.0)
                    next.roughnessMap = roughness
                    next.roughness    = 1.0
                    next.side         = THREE.DoubleSide
                    next.needsUpdate  = true
                    if (isArray) child.material[i] = next
                    else child.material = next
                })
            })
        })
    }, [config.wheel, aluminumRimTextures, blackSteelRimTextures, wheels, axleConfig])

    // ── Apply all standard materials driven by material_data.json ────────────
    // Only MAT_Shell, Metallic Grates, MAT_WheelCover, MAT_Rim remain special.
    useEffect(() => {
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
                    if (!mat || isSpecialMaterial(mat.name)) return
                    const def = MATERIAL_DEFS_NORM.get(normMatName(mat.name))
                    if (!def) return
                    let next = applyMaterialDef(mat, def, staticTextures)
                    
                    if (normMatName(mat.name) === 'reflectivestripes') {
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
        staticTextures,
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

        // Signal that mesh visibility has been updated. generatedETracks depends on
        // visibilityVersion so it will recompute on the next render with correct .visible values.
        setVisibilityVersion(v => v + 1)
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
        cabinetsGLB, cargo, spoiler, tongue, bathroom, gullwingDoor
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

    // ── Emulate Blender "E-Track" Array Generation Node ────────────────────────
    const generatedETracks = useMemo(() => {
        console.log('[E-Track] ── useMemo recomputing ──────────────────────')
        console.log('[E-Track] config.escapeDoor:', config.escapeDoor)
        console.log('[E-Track] config.tieDowns:', config.tieDowns)

        // Find the base template meshes (we assume they are the original single-piece objects)
        let floorTemplate = null
        const wallTemplates = []   // collect ALL wall templates (one per side of trailer)
        cargo.traverse(child => {
            if (!child.isMesh) return
            const isProxy = child.name.toLowerCase().includes('proxy')
            console.log(`[E-Track] cargo mesh: "${child.name}" | isProxy=${isProxy}`)
            if (child.name.includes('Floor_E-Track') && !isProxy) floorTemplate = child
            if (child.name.includes('Wall_E-Track')  && !isProxy) wallTemplates.push(child)
        })
        console.log('[E-Track] floorTemplate:', floorTemplate?.name ?? 'NOT FOUND')
        console.log(`[E-Track] wallTemplates found: ${wallTemplates.length}`, wallTemplates.map(t => t.name))

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
        console.log(`[E-Track] trueRearX=${trueRearX.toFixed(3)} targetLength=${targetLength.toFixed(3)} stepSize=${stepSize} count=${count}`)

        const points = new Float32Array(count * 3)
        // Assume trailer array generates along -X from the Switch offset
        const startX = switchNode
        console.log(`[E-Track] Points range: X ${startX.toFixed(3)} → ${(startX - (count - 1) * stepSize).toFixed(3)}`)
        for (let i = 0; i < count; i++) {
            points[i * 3] = startX - (i * stepSize)
            points[i * 3 + 1] = 0
            points[i * 3 + 2] = 0
        }

        const pointsGeometry = new THREE.BufferGeometry()
        pointsGeometry.setAttribute('position', new THREE.BufferAttribute(points, 3))

        // ── Compute proxy gaps: X range + Z range per active proxy ──────────────────
        // We store each proxy's world-space {xMin, xMax, zMin, zMax} separately so
        // that each wall template can independently test whether the proxy is on its
        // side of the trailer (via Z overlap), and only clip that side.
        const proxyGaps = []
        let proxyCount = 0

        // activeScenes is now a direct dep (not a ref) so this memo re-runs whenever
        // the set of visible models changes — proxy gaps are always up to date.
        const scenesToScan = activeScenes
        console.log(`[E-Track] Scanning ${scenesToScan.length} active scene(s) for active proxy meshes...`)

        // ── DEBUG: dump ALL proxy-named meshes regardless of active state ──────────
        scenesToScan.forEach(scene => {
            scene.traverse(child => {
                if (!child.isMesh || !child.geometry) return
                if (!child.name.toLowerCase().includes('proxy')) return
                child.updateWorldMatrix(true, false)
                child.geometry.computeBoundingBox()
                const box = child.geometry.boundingBox.clone().applyMatrix4(child.matrixWorld)
                const wPos = new THREE.Vector3().setFromMatrixPosition(child.matrixWorld)
                console.log(
                    `[E-Track] 📦 ALL-PROXY-SCAN "${child.name}"`,
                    `| proxyActive=${child.userData?.proxyActive}`,
                    `| visible=${child.visible}`,
                    `| worldPos=(${wPos.x.toFixed(3)}, ${wPos.y.toFixed(3)}, ${wPos.z.toFixed(3)})`,
                    `| worldBBox X[${box.min.x.toFixed(3)}, ${box.max.x.toFixed(3)}]`,
                    `| worldBBox Z[${box.min.z.toFixed(3)}, ${box.max.z.toFixed(3)}]`
                )
            })
        })
        console.log('[E-Track] ── END ALL-PROXY-SCAN ──────────────────────────────────')

        scenesToScan.forEach(scene => {
            scene.traverse(child => {
                if (!child.isMesh || !child.geometry) return
                if (!child.name.toLowerCase().includes('proxy')) return
                // Proxies are render-hidden; use proxyActive flag set by BlenderNodes
                if (!child.userData?.proxyActive) {
                    console.log(`[E-Track] ⏭️  Skipping proxy "${child.name}" — proxyActive=${child.userData?.proxyActive}`)
                    return
                }

                child.updateWorldMatrix(true, false)
                child.geometry.computeBoundingBox()
                const box = child.geometry.boundingBox.clone().applyMatrix4(child.matrixWorld)
                const wPos = new THREE.Vector3().setFromMatrixPosition(child.matrixWorld)

                console.log(
                    `[E-Track] ✅ ACTIVE-PROXY "${child.name}"`,
                    `| worldPos=(${wPos.x.toFixed(3)}, ${wPos.y.toFixed(3)}, ${wPos.z.toFixed(3)})`,
                    `| worldBBox X[${box.min.x.toFixed(3)}, ${box.max.x.toFixed(3)}]`,
                    `| worldBBox Y[${box.min.y.toFixed(3)}, ${box.max.y.toFixed(3)}]`,
                    `| worldBBox Z[${box.min.z.toFixed(3)}, ${box.max.z.toFixed(3)}]`
                )

                // Store each proxy gap with its full X AND Z world bounds.
                // Z bounds are used to match the proxy to the correct wall side.
                proxyGaps.push({
                    xMin: box.min.x, xMax: box.max.x,
                    zMin: box.min.z, zMax: box.max.z,
                    name: child.name,
                })
                proxyCount++
            })
        })

        if (proxyGaps.length > 0) {
            console.log(`[E-Track] ✅ ${proxyGaps.length} active proxy gap(s) collected:`)
            proxyGaps.forEach((g, i) => console.log(`[E-Track]   [${i}] "${g.name}" X[${g.xMin.toFixed(3)}, ${g.xMax.toFixed(3)}] Z[${g.zMin.toFixed(3)}, ${g.zMax.toFixed(3)}]`))
        } else {
            console.log('[E-Track] No active proxy meshes found — no E-Track clipping applied')
        }

        const instances = []

        // Floor E-Track: full run, unaffected by proxy
        if (floorTemplate && config.tieDowns?.includes('flooretrack')) {
            const floorInstanced = BlenderNodes.instanceOnPoints(pointsGeometry, floorTemplate)
            floorInstanced.position.copy(floorTemplate.position)
            floorInstanced.rotation.copy(floorTemplate.rotation)
            floorInstanced.scale.copy(floorTemplate.scale)
            instances.push(<primitive key="floor-etrack" object={floorInstanced} />)
        }

        // Wall E-Track: per-wall generation with Z-aware proxy side detection.
        // If a wall has any active proxy on its side, hide that wall E-Track entirely.
        // The opposite wall still renders normally.
        if (wallTemplates.length > 0 && config.tieDowns?.includes('walletrack')) {
            wallTemplates.forEach((wallTemplate, wallIdx) => {
                wallTemplate.updateWorldMatrix(true, false)
                const wm = wallTemplate.matrixWorld

                // World position of this wall template's origin
                const templateWorldPos = new THREE.Vector3().setFromMatrixPosition(wm)

                // Compute bounding box to find the true center of the geometry in world space
                wallTemplate.geometry.computeBoundingBox()
                const wallBox = wallTemplate.geometry.boundingBox.clone().applyMatrix4(wm)
                const trueWallWorldZ = (wallBox.min.z + wallBox.max.z) / 2

                // World-space X scale and direction (local X → world X mapping)
                const worldScaleX = Math.sqrt(
                    wm.elements[0] * wm.elements[0] +
                    wm.elements[1] * wm.elements[1] +
                    wm.elements[2] * wm.elements[2]
                )
                const localXDirWorld = wm.elements[0] / (worldScaleX || 1)

                console.log(`[E-Track] Wall[${wallIdx}] "${wallTemplate.name}" world pos: (${templateWorldPos.x.toFixed(3)}, ${templateWorldPos.y.toFixed(3)}, ${templateWorldPos.z.toFixed(3)})`)
                console.log(`[E-Track] Wall[${wallIdx}] true world Z (bbox center): ${trueWallWorldZ.toFixed(3)}`)
                console.log(`[E-Track] Wall[${wallIdx}] worldScaleX=${worldScaleX.toFixed(4)}, localXDirWorld=${localXDirWorld.toFixed(3)}`)

                // ── Filter proxy gaps to only those on THIS wall's side (Z match) ──
                const wallWorldZ = trueWallWorldZ
                console.warn(`[E-Track-DEBUG] Total wallTemplates found: ${wallTemplates.length}`)
                const wallProxyGaps = proxyGaps.filter(gap => {
                    // If only one wall template, always apply (can't discriminate sides)
                    if (wallTemplates.length === 1) {
                        console.warn(`[E-Track-DEBUG] Wall[${wallIdx}] single-template mode — applying gap "${gap.name}" unconditionally! MESH ISSUE: The GLB has combined left/right walls into a single mesh. We cannot hide E-Track on one side without hiding it on the other unless the mesh is split into two separate templates.`)
                        return true
                    }
                    // Multi-template: use Z-center sign to identify which wall the proxy is on.
                    const proxyCenterZ = (gap.zMin + gap.zMax) / 2
                    // Same sign → same side. Also handle near-zero wall templates (abs < 0.05)
                    // by falling back to a loose tolerance check.
                    const wallIsNearZero = Math.abs(wallWorldZ) < 0.05
                    let sameSide
                    if (wallIsNearZero) {
                        // Template at Z≈0: accept any proxy (center wall template)
                        sameSide = true
                    } else {
                        // Positive wall Z → positive proxy center → same side
                        sameSide = Math.sign(wallWorldZ) === Math.sign(proxyCenterZ)
                    }
                    console.warn(
                        `[E-Track-DEBUG] Wall[${wallIdx}] testing gap "${gap.name}"\n` +
                        `  proxyZCenter = ${proxyCenterZ.toFixed(3)}, wallZ = ${wallWorldZ.toFixed(3)}\n` +
                        `  wallIsNearZero = ${wallIsNearZero}\n` +
                        `  → ${sameSide ? '✅ SAME SIDE (Hiding E-Track here)' : '❌ OPPOSITE SIDE (Keeping E-Track here)'}`
                    )
                    return sameSide
                })

                console.log(`[E-Track] Wall[${wallIdx}] applicable proxy gaps: ${wallProxyGaps.length}`)

                let wallGeom = pointsGeometry  // default: full run

                if (wallProxyGaps.length > 0) {
                    // All comparisons in WORLD SPACE.
                    // The instanced object is placed at wallTemplate.position (LOCAL).
                    // Each point px is a LOCAL offset along the template's parent X axis.
                    // To get world X of each instance:
                    //   worldX_of_instance = templateWorldPos.x + px * worldScaleX * localXDirWorld
                    //
                    // We compare that world X against the proxy world X bounds directly.

                    // Log the conversion params once before the loop
                    console.log(`[E-Track] Wall[${wallIdx}] Conversion: worldX = ${templateWorldPos.x.toFixed(3)} + px * ${(worldScaleX * localXDirWorld).toFixed(4)}`)
                    wallProxyGaps.forEach((g, gi) => {
                        console.log(`[E-Track] Wall[${wallIdx}] Gap[${gi}] "${g.name}" world X[${g.xMin.toFixed(3)}, ${g.xMax.toFixed(3)}]`)
                    })
                    console.log(`[E-Track] Wall[${wallIdx}] E-Track local X range: ${startX.toFixed(3)} ? ${(startX - (count-1)*stepSize).toFixed(3)}`)
                    // Convert startX to world X to verify range
                    const startWorldX = templateWorldPos.x + startX * worldScaleX * localXDirWorld
                    const endWorldX = templateWorldPos.x + (startX - (count-1)*stepSize) * worldScaleX * localXDirWorld
                    console.log(`[E-Track] Wall[${wallIdx}] E-Track WORLD X range: ${Math.min(startWorldX, endWorldX).toFixed(3)} ? ${Math.max(startWorldX, endWorldX).toFixed(3)}`)

                    const xFactor = worldScaleX * localXDirWorld

                    // Build filtered points: skip positions whose world X falls inside any proxy gap
                    const filtered = []
                    let skipped = 0
                    for (let i = 0; i < count; i++) {
                        const px = startX - (i * stepSize)
                        const worldX = templateWorldPos.x + px * xFactor

                        let inGap = false
                        for (const gap of wallProxyGaps) {
                            if (worldX >= gap.xMin && worldX <= gap.xMax) {
                                inGap = true
                                if (skipped < 5) console.log(`[E-Track] Wall[${wallIdx}] ?? Skipping px=${px.toFixed(3)} worldX=${worldX.toFixed(3)} (gap "${gap.name}" worldX[${gap.xMin.toFixed(3)}, ${gap.xMax.toFixed(3)}])`)
                                break
                            }
                        }

                        if (inGap) { skipped++; continue }
                        filtered.push(px, 0, 0)
                    }
                    console.log(`[E-Track] Wall[${wallIdx}] points: ${count} total ? ${filtered.length / 3} kept, ${skipped} skipped`)

                    const wallPts = new Float32Array(filtered)
                    wallGeom = new THREE.BufferGeometry()
                    wallGeom.setAttribute('position', new THREE.BufferAttribute(wallPts, 3))
                } else {
                    console.log(`[E-Track] Wall[${wallIdx}] no gaps applicable � full run`)
                }
                const wallInstanced = BlenderNodes.instanceOnPoints(wallGeom, wallTemplate)
                wallInstanced.position.copy(wallTemplate.position)
                wallInstanced.rotation.copy(wallTemplate.rotation)
                wallInstanced.scale.copy(wallTemplate.scale)
                console.log(`[E-Track] Wall[${wallIdx}] created wallInstanced with ${wallInstanced.count} instances, position=(${wallInstanced.position.x.toFixed(3)}, ${wallInstanced.position.y.toFixed(3)}, ${wallInstanced.position.z.toFixed(3)})`)
                // Include visibilityVersion in the key to force full THREE.js remount when
                // proxy visibility changes — this ensures the old instanced mesh is removed
                // from the scene and the new filtered one is added (not just prop-swapped).
                instances.push(<primitive key={`wall-etrack-${wallIdx}-v${visibilityVersion}`} object={wallInstanced} />)
            })
        }

        return instances
    }, [cargo, activeScenes, visibilityVersion, lengthFt, hasCabinet, config.tieDowns])

    // ── Ladder Racks: Instance on Points (mirrors Blender Mesh Line → Instance on Points) ──
    // Top_Supports is a single cross-member instanced along the trailer length.
    // Y and Z come from the template's position (roof height); X spans front→rear.
    const generatedLadderRacks = useMemo(() => {
        if (!config.ladderRacks) return []

        let rackTemplate = null
        addons.traverse(child => {
            if (child.isMesh && child.name === 'Top_Supports' && !child.name.toLowerCase().includes('proxy')) rackTemplate = child
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

    // activeScenes is now defined before generatedETracks (see above)

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

                child.updateWorldMatrix(true, false)
                const we = child.matrixWorld.elements
                const ie = child.matrixWorld.clone().invert().elements

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
        <>
            <group>
                {activeScenes.map(scene => (
                    <primitive key={scene.uuid} object={scene} />
                ))}
                {generatedETracks}
                {generatedLadderRacks}
            </group>
        </>
    )
}

Object.values(PATHS).forEach(path => useGLTF.preload(path))
Object.values(SHELL_TEXTURES).forEach(path => useTexture.preload(path))
Object.values(STATIC_TEXTURE_PATHS).forEach(path => useTexture.preload(path))
useTexture.preload('/Materials/Metallic_Grates_Normal.png')
useTexture.preload('/Materials/Simple_Noise.png')



