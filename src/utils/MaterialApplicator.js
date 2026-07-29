import * as THREE from 'three'
import materialData from '../../public/material_data.json'
import materialSwatches from '../../public/material-swatches.json'

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
    'matshelldecal',
    'metallicgrates',
    'metallicgratesdecal',
    'Metallic Grates_UV_Scale',
    'matwheelcover',
    'matrim',
    'matinteriorflooring',
    'matinteriorcealing',
    'matinteriorwalls',
    'matatp',
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

// Build a lookup map for swatches by normalized material name
const swatchesByNormName = new Map()
Object.values(materialSwatches).forEach(swatch => {
    if (swatch && typeof swatch === 'object' && swatch.material_name) {
        swatchesByNormName.set(normMatName(swatch.material_name), swatch)
    }
})

Object.values(materialData).forEach(componentSlots => {
    if (!componentSlots || typeof componentSlots !== 'object') return
    Object.values(componentSlots).forEach(def => {
        if (!def?.material_name) return
        
        let finalDef = { ...def }
        const normName = normMatName(def.material_name)
        
        if (normName.startsWith('mat')) {
            const baseName = normName.replace(/^mat_?/, '');
            let matchingSwatch = swatchesByNormName.get(baseName);
            if (normName === 'matstripes') {
                matchingSwatch = swatchesByNormName.get('reflecivestripes') || swatchesByNormName.get('reflectivestripes');
            } else if (!matchingSwatch) {
                for (const [sNormName, swatch] of swatchesByNormName.entries()) {
                    if (sNormName.includes(baseName)) {
                        matchingSwatch = swatch;
                        break;
                    }
                }
            }
            
            if (matchingSwatch) {
                if (matchingSwatch.base_color !== undefined) finalDef.base_color = matchingSwatch.base_color
                if (matchingSwatch.roughness !== undefined) finalDef.roughness = matchingSwatch.roughness
                if (matchingSwatch.metalness !== undefined) finalDef.metalness = matchingSwatch.metalness
                if (matchingSwatch.alpha !== undefined) finalDef.alpha = matchingSwatch.alpha
                if (matchingSwatch.emission !== undefined) finalDef.emission = matchingSwatch.emission
                if (matchingSwatch.flip_y !== undefined) finalDef.flip_y = matchingSwatch.flip_y
                // normal and normal_map intentionally omitted so they come from material_data.json
            }
        }

        if (!MATERIAL_DEFS.has(finalDef.material_name)) {
            MATERIAL_DEFS.set(finalDef.material_name, finalDef)
            MATERIAL_DEFS_NORM.set(normName, finalDef)
        }
    })
})

// Ensure any swatches that aren't mapped in materialData are still available
swatchesByNormName.forEach((swatch, normName) => {
    if (!MATERIAL_DEFS_NORM.has(normName)) {
        MATERIAL_DEFS.set(swatch.material_name, swatch)
        MATERIAL_DEFS_NORM.set(normName, swatch)
    }
})

// Collect texture paths only from non-special materials so textures owned by
// special effects (e.g. Simple_Noise owned by the MAT_Shell effect) are not
// loaded or touched here — their effects handle all settings for them.
const texturePathSet = new Set()
MATERIAL_DEFS.forEach((def, name) => {
    if (isSpecialName(name)) return
    const fields = [def.base_color, def.roughness, def.metalness, def.normal, def.normal_map, def.alpha]
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
    let originalDef = def;

    let normalizedMatName = normMatName(def.material_name || "");
    let isSpecialDecal = false;
    
    if (normalizedMatName.endsWith("decal")) {
        let frontNameNorm = normalizedMatName.slice(0, -5);
        if (MATERIAL_DEFS_NORM.has(frontNameNorm)) {
            def = MATERIAL_DEFS_NORM.get(frontNameNorm);
        }
        if (SPECIAL_MATERIALS.has(frontNameNorm)) {
            isSpecialDecal = true;
        }
    }

    if (!isSpecialDecal) {
        // --- base_color: texture path -> hex string -> fallback white ---
        if (isTexturePath(def.base_color)) {
            const tex = getTexture(textures, def.base_color)
            if (tex) {
                tex.colorSpace = THREE.SRGBColorSpace
                tex.wrapS = tex.wrapT = THREE.RepeatWrapping
                tex.flipY = def.flip_y === true
                if (normMatName(def.material_name) === 'roof') tex.repeat.set(20, 20)
                if (normMatName(def.material_name).includes('rim')) tex.repeat.set(50, 50)
                tex.needsUpdate = true
                next.map = tex
                next.color.set('#FFFFFF')
            } else {
                // path was given but texture failed to load — fall back to white
                next.color.set('#FFFFFF')
            }
        } else if (typeof def.base_color === 'string') {
            next.map = null
            next.color.set(def.base_color)
        } else {
            // neither a texture path nor a hex string was provided
            next.map = null
            next.color.set('#FFFFFF')
        }

        // --- roughness: texture path -> number -> fallback 0.0 ---
        if (isTexturePath(def.roughness)) {
            const tex = getTexture(textures, def.roughness)
            if (tex) {
                tex.colorSpace = THREE.NoColorSpace
                tex.wrapS = tex.wrapT = THREE.RepeatWrapping
                tex.flipY = def.flip_y === true
                if (normMatName(def.material_name) === 'roof') tex.repeat.set(20, 20)
                if (normMatName(def.material_name).includes('rim')) tex.repeat.set(50, 50)
                tex.needsUpdate = true
                next.roughnessMap = tex
                next.roughness = 1.0
            } else {
                next.roughnessMap = null
                next.roughness = 0.0
            }
        } else if (typeof def.roughness === 'number') {
            next.roughnessMap = null
            next.roughness = def.roughness
        } else {
            next.roughnessMap = null
            next.roughness = 0.0
        }

        // --- metalness: texture path -> number -> fallback 0.0 ---
        if (isTexturePath(def.metalness)) {
            const tex = getTexture(textures, def.metalness)
            if (tex) {
                tex.colorSpace = THREE.NoColorSpace
                tex.wrapS = tex.wrapT = THREE.RepeatWrapping
                tex.flipY = def.flip_y === true
                if (normMatName(def.material_name) === 'roof') tex.repeat.set(20, 20)
                if (normMatName(def.material_name).includes('rim')) tex.repeat.set(50, 50)
                tex.needsUpdate = true
                next.metalnessMap = tex
                next.metalness = 1.0
            } else {
                next.metalnessMap = null
                next.metalness = 0.0
            }
        } else if (typeof def.metalness === 'number') {
            next.metalnessMap = null
            next.metalness = def.metalness
        } else {
            next.metalnessMap = null
            next.metalness = 0.0
        }
    }

    // --- normal: texture path -> boolean toggle -> fallback (no normal map) ---
    let normalPath = isTexturePath(originalDef.normal) ? originalDef.normal : (originalDef.normal === true && isTexturePath(originalDef.normal_map) ? originalDef.normal_map : null)

    if (normalPath) {
        const tex = getTexture(textures, normalPath)
        if (tex) {
            tex.colorSpace = THREE.NoColorSpace
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping
            tex.flipY = originalDef.flip_y === true
            if (normMatName(originalDef.material_name) === 'roof') tex.repeat.set(20, 20)
            if (normMatName(originalDef.material_name).includes('rim')) tex.repeat.set(50, 50)
            tex.needsUpdate = true
            next.normalMap = tex
        } else {
            next.normalMap = null
        }
    } else if (typeof originalDef.normal === 'boolean') {
        // explicit boolean flag: true = keep whatever normal map is already on
        // the base material, false = strip it
        if (originalDef.normal === false) {
            next.normalMap = null
        }
    } else {
        // neither a texture path nor a boolean was provided — no normal map
        next.normalMap = null
    }

    // --- alpha: texture path -> number -> fallback 0.0 ---
    if (isTexturePath(originalDef.alpha)) {
        const tex = getTexture(textures, originalDef.alpha)
        if (tex) {
            tex.colorSpace = THREE.NoColorSpace
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping
            tex.flipY = originalDef.flip_y === true
            tex.needsUpdate = true
            next.alphaMap = tex
            
            // Decals should use alphaTest to avoid depth sorting issues with the panels they sit on
            if (normMatName(originalDef.material_name).endsWith('decal')) {
                next.alphaTest = 0.5
                next.transparent = false
            } else {
                next.transparent = true
            }
        } else {
            next.transparent = true
            next.opacity = 0.0
        }
    } else if (typeof originalDef.alpha === 'number') {
        if (originalDef.alpha < 1.0) {
            next.transparent = true
            next.opacity = originalDef.alpha
        } else {
            next.opacity = originalDef.alpha
        }
    } else {
        // neither a texture path nor a number was provided
        // NOTE: this makes the material fully transparent (opacity 0) per spec.
        // If you actually want "no alpha info = fully opaque", change this to 1.0.
        next.transparent = true
        next.opacity = 0.0
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
                 tex.flipY = def.flip_y === true
                 tex.needsUpdate = true
                 next.emissiveMap = tex
                 next.emissive.set('#FFFFFF')
             }
        }

        next.emissiveIntensity = typeof def.emission.strength === 'number' ? def.emission.strength : 0.0
    }

    next.needsUpdate = true
    return next
}

export function isSpecialMaterial(matName) {
    return isSpecialName(matName)
}