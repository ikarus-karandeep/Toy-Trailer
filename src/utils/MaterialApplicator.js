import * as THREE from 'three'
import materialData from '../../public/material_data.json'

function isTexturePath(value) {
    return typeof value === 'string' && value.startsWith('//')
}

function blenderPathToWeb(blenderPath) {
    const filename = blenderPath.split(/[/\\]/).at(-1)
    return `/Materials/${filename}`
}

function pathToKey(webPath) {
    return webPath.replace(/[^a-zA-Z0-9]/g, '_').replace(/^_+/, '')
}

// Normalize a material name: strip spaces/underscores, lowercase.
// Both the JSON names and Three.js GLB names are normalized this way before
// any comparison, so "Number_Plate", "Number Plate", and "number plate" all match.
export function normMatName(name) {
    return name?.replace(/[\s_]+/g, '').toLowerCase() ?? ''
}

// Materials that need custom logic (triplanar, config-driven, ATP toggle, etc.)
// — skip them in the generic useEffect so their own effects take full control.
// Keys MUST be the already-normalized form (no spaces, no underscores, lowercase).
const SPECIAL_MATERIALS = new Set([
    'matshell',
    'metallicgrates',
    'matwheelcover',
    'matrim',
])

function isSpecialName(name) {
    return SPECIAL_MATERIALS.has(normMatName(name))
}

// Deduplicated material definitions — two maps for different lookup styles.
// MATERIAL_DEFS      keyed by exact material_name from JSON
// MATERIAL_DEFS_NORM keyed by normMatName(material_name) — tolerates
//                    space vs underscore differences between JSON and GLB
export const MATERIAL_DEFS = new Map()
export const MATERIAL_DEFS_NORM = new Map()
Object.values(materialData).forEach(componentSlots => {
    if (!componentSlots || typeof componentSlots !== 'object') return
    Object.values(componentSlots).forEach(def => {
        if (!def?.material_name) return
        if (!MATERIAL_DEFS.has(def.material_name)) {
            MATERIAL_DEFS.set(def.material_name, def)
            MATERIAL_DEFS_NORM.set(normMatName(def.material_name), def)
        }
    })
})

// Collect texture paths only from non-special materials so textures owned by
// special effects (e.g. Simple_Noise owned by the MAT_Shell effect) are not
// loaded or touched here — their effects handle all settings for them.
const texturePathSet = new Set()
MATERIAL_DEFS.forEach((def, name) => {
    if (isSpecialName(name)) return
    const fields = [def.base_color, def.roughness, def.metalness, def.normal]
    fields.forEach(v => { if (isTexturePath(v)) texturePathSet.add(blenderPathToWeb(v)) })
})

export const STATIC_TEXTURE_PATHS = {}
texturePathSet.forEach(p => { STATIC_TEXTURE_PATHS[pathToKey(p)] = p })

function getTexture(textures, blenderPath) {
    const webPath = blenderPathToWeb(blenderPath)
    return textures[pathToKey(webPath)] ?? null
}

// Apply a single material definition to a cloned Three.js material.
// Returns the updated clone (caller must assign it back to child.material).
export function applyMaterialDef(mat, def, textures) {
    let next = mat.clone()

    if (isTexturePath(def.base_color)) {
        const tex = getTexture(textures, def.base_color)
        if (tex) {
            tex.colorSpace = THREE.SRGBColorSpace
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping
            if (def.flip_y === false) tex.flipY = false
            tex.needsUpdate = true
            next.map = tex
        }
    } else if (typeof def.base_color === 'string') {
        next.color.set(def.base_color)
    }

    if (isTexturePath(def.roughness)) {
        const tex = getTexture(textures, def.roughness)
        if (tex) {
            tex.colorSpace = THREE.NoColorSpace
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping
            tex.needsUpdate = true
            next.roughnessMap = tex
            next.roughness = 1.0
        }
    } else if (typeof def.roughness === 'number') {
        next.roughness = def.roughness
    }

    if (isTexturePath(def.metalness)) {
        const tex = getTexture(textures, def.metalness)
        if (tex) {
            tex.colorSpace = THREE.NoColorSpace
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping
            tex.needsUpdate = true
            next.metalnessMap = tex
            next.metalness = 1.0
        }
    } else if (typeof def.metalness === 'number') {
        next.metalness = def.metalness
    }

    if (isTexturePath(def.normal)) {
        const tex = getTexture(textures, def.normal)
        if (tex) {
            tex.colorSpace = THREE.NoColorSpace
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping
            tex.needsUpdate = true
            next.normalMap = tex
        }
    }

    if (def.alpha !== undefined && def.alpha < 1.0) {
        next.transparent = true
        next.opacity = def.alpha
    }

    if (def.material_name && def.material_name.toLowerCase().includes('transmission')) {
        if (!next.isMeshPhysicalMaterial) {
            const phys = new THREE.MeshPhysicalMaterial({
                color: next.color,
                map: next.map,
                roughness: next.roughness,
                roughnessMap: next.roughnessMap,
                metalness: next.metalness,
                metalnessMap: next.metalnessMap,
                normalMap: next.normalMap,
                normalScale: next.normalScale,
                emissive: next.emissive,
                emissiveMap: next.emissiveMap,
                emissiveIntensity: next.emissiveIntensity,
                transparent: next.transparent,
                opacity: next.opacity,
                alphaMap: next.alphaMap,
                side: THREE.FrontSide, // FrontSide prevents backface self-refraction artifacts
                name: next.name
            })
            phys.userData = next.userData
            next = phys
        }
        next.transmission = 1.0
        next.transparent = true
        next.opacity = 1.0
        next.thickness = 0 
        next.depthWrite = true // Let's use default depth writing for proper sorting
        next.ior = 1.5
    }

    if (def.emission) {
        if (typeof def.emission.color === 'string' && !isTexturePath(def.emission.color)) {
            next.emissive.set(def.emission.color)
        } else if (isTexturePath(def.emission.color)) {
             const tex = getTexture(textures, def.emission.color)
             if (tex) {
                 tex.colorSpace = THREE.SRGBColorSpace
                 tex.wrapS = tex.wrapT = THREE.RepeatWrapping
                 tex.needsUpdate = true
                 next.emissiveMap = tex
                 next.emissive.set('#FFFFFF')
             }
        }
        next.emissiveIntensity = def.emission.strength !== undefined ? def.emission.strength : 0
    }

    next.needsUpdate = true
    return next
}

export function isSpecialMaterial(matName) {
    return isSpecialName(matName)
}
