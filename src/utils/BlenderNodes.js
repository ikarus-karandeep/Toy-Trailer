import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * BlenderNodes.js
 * A modular utility class that mimics common Geometry Nodes operations in Three.js.
 * Use these functions to translate generic node setups manually without writing 
 * repetitive Three.js boilerplate.
 */
export class BlenderNodes {
    
    // -----------------------------------------
    // GEOMETRY NODES
    // -----------------------------------------

    /**
     * Node: Join Geometry
     * Joins multiple BufferGeometries into one.
     * @param {THREE.BufferGeometry[]} geometries - Array of geometries to join.
     */
    static joinGeometry(geometries) {
        // Filter out null/undefined geometries
        const validGeoms = geometries.filter(g => g !== null);
        if (validGeoms.length === 0) return new THREE.BufferGeometry();
        if (validGeoms.length === 1) return validGeoms[0];
        
        return BufferGeometryUtils.mergeGeometries(validGeoms, false);
    }

    /**
     * Node: Transform Geometry
     * Applies translation, rotation, and scale to a geometry.
     * @param {THREE.BufferGeometry} geometry 
     * @param {THREE.Vector3} translation 
     * @param {THREE.Euler} rotation 
     * @param {THREE.Vector3} scale 
     */
    static transformGeometry(geometry, translation = new THREE.Vector3(), rotation = new THREE.Euler(), scale = new THREE.Vector3(1,1,1)) {
        const cloned = geometry.clone();
        const matrix = new THREE.Matrix4();
        const quaternion = new THREE.Quaternion().setFromEuler(rotation);
        
        matrix.compose(translation, quaternion, scale);
        cloned.applyMatrix4(matrix);
        return cloned;
    }

    /**
     * Node: Instance on Points
     * Takes points (vertices) and places an instance of a mesh at every point.
     * @param {THREE.BufferGeometry} pointsGeometry 
     * @param {THREE.Mesh} instanceMesh 
     * @param {number|function} scaleMult - Flat multiplier or callback mapping per point
     */
    static instanceOnPoints(pointsGeometry, instanceMesh, scaleMult = 1.0) {
        const positions = pointsGeometry.attributes.position;
        if (!positions) return new THREE.InstancedMesh(instanceMesh.geometry, instanceMesh.material, 0);

        const count = positions.count;
        
        // Create an instanced mesh for maximum performance
        const instanced = new THREE.InstancedMesh(
            instanceMesh.geometry,
            instanceMesh.material,
            count
        );
        
        const dummy = new THREE.Object3D();
        for (let i = 0; i < count; i++) {
            dummy.position.set(positions.getX(i), positions.getY(i), positions.getZ(i));
            
            const scaleVal = typeof scaleMult === 'function' ? scaleMult(i) : scaleMult;
            dummy.scale.set(scaleVal, scaleVal, scaleVal);
            
            dummy.updateMatrix();
            instanced.setMatrixAt(i, dummy.matrix);
        }
        
        instanced.instanceMatrix.needsUpdate = true;
        return instanced;
    }

    // -----------------------------------------
    // SWITCH NODE
    // -----------------------------------------

    /**
     * Internal helper: show/hide an object and its proxy sibling (if any).
     *
     * Proxy resolution — tries 3 strategies in order:
     *   1. Exact:      scene.getObjectByName(target.name + ' proxy')
     *   2. Parent:     scene.getObjectByName(target.parent.name + ' proxy')
     *                  scene.getObjectByName(target.parent.name + '_Proxy')
     *   3. Sibling:    any direct child of target.parent whose name contains 'proxy'
     *
     * This handles the common Blender pattern where the proxy is named after the
     * parent group (e.g. "Gullwing Escape Door Proxy") rather than the active
     * variant child (e.g. "Gullwing_Escape_Door_2").
     *
     * @param {THREE.Object3D} scene
     * @param {THREE.Object3D} target - the object to show/hide
     * @param {boolean} visible
     */
    static _applyWithProxy(scene, target, visible) {
        target.traverse(child => { 
            if (child.name.toLowerCase().includes('proxy')) {
                child.userData.proxyActive = visible;
                child.visible = false;
            } else {
                child.visible = visible;
            }
        })

        let proxy = null
        let resolvedBy = ''

        // Normalize string for comparison: lowercase and remove all spaces, underscores, and hyphens
        const normalize = (s) => s.toLowerCase().replace(/[\s_\-]/g, '')
        const normTarget = normalize(target.name)

        // Find the BEST matching proxy by searching all meshes in the scene (or target's parent)
        // that contain the normalized target name AND 'proxy'
        const possibleProxies = []
        
        // Search siblings and children (and even the whole scene if necessary, but parent is safer)
        const searchRoot = target.parent || scene
        searchRoot.traverse(child => {
            if (child === target) return
            const normChild = normalize(child.name)
            if (normChild.includes('proxy') && normChild.includes(normTarget)) {
                possibleProxies.push(child)
            }
        })

        if (possibleProxies.length > 0) {
            // Prefer exact prefix matches, e.g., "36x78doorpanellproxy" starts with "36x78doorpanell"
            proxy = possibleProxies.find(p => normalize(p.name).startsWith(normTarget)) || possibleProxies[0]
            resolvedBy = `normalized match ("${proxy.name}")`
        }

        // Fallback: stripped trailing numbers (Three.js GLTFLoader adds _2, _3 etc for duplicate names)
        if (!proxy) {
            const strippedTarget = normTarget.replace(/\d+$/, '')
            if (strippedTarget !== normTarget) {
                const strippedProxies = []
                searchRoot.traverse(child => {
                    if (child === target) return
                    const normChild = normalize(child.name)
                    if (normChild.includes('proxy') && normChild.includes(strippedTarget)) {
                        strippedProxies.push(child)
                    }
                })
                if (strippedProxies.length > 0) {
                    proxy = strippedProxies.find(p => normalize(p.name).startsWith(strippedTarget)) || strippedProxies[0]
                    resolvedBy = `stripped target match ("${proxy.name}")`
                }
            }
        }

        // Fallback: parent-name-based → "<parentName> proxy"
        if (!proxy && target.parent) {
            const normParent = normalize(target.parent.name)
            const parentProxies = []
            searchRoot.traverse(child => {
                if (child === target || child === target.parent) return
                const normChild = normalize(child.name)
                if (normChild.includes('proxy') && normChild.includes(normParent)) {
                    parentProxies.push(child)
                }
            })
            if (parentProxies.length > 0) {
                proxy = parentProxies[0]
                resolvedBy = `normalized parent-match ("${proxy.name}")`
            }
        }

        if (proxy) {
            // console.log(`[BlenderNodes] Proxy resolved via ${resolvedBy} for "${target.name}" → active=${visible} (render hidden)`)
            proxy.traverse(child => {
                child.userData.proxyActive = visible
                child.visible = false
            })
        } else {
            // console.log(`[BlenderNodes] No proxy found for: "${target.name}" (tried exact, parent-name, sibling)`)
        }
    }

    /**
     * Node: Switch (mesh visibility)
     * Traverses a scene and shows only the mesh whose name matches targetName.
     * All other meshes in the scene are hidden.
     * If a proxy object named "<targetName> proxy" exists it is shown/hidden together
     * with the original.
     * Returns true if a match was found.
     * @param {THREE.Object3D} scene
     * @param {string} targetName
     */
    static switchMesh(scene, targetName) {
        // Hide all meshes (including any proxies) first
        scene.traverse(child => {
            if (child.isMesh) {
                if (child.name.toLowerCase().includes('proxy')) {
                    child.userData.proxyActive = false
                }
                child.visible = false
            }
        })
        // console.log(`[BlenderNodes] switchMesh → target="${targetName}"`)
        if (!targetName) {
            // console.log(`[BlenderNodes] switchMesh → no targetName, hiding all`)
            return false
        }
        // Target may be a Group (multi-primitive mesh) or a plain Mesh — find by name and show all descendants
        const target = scene.getObjectByName(targetName)
        if (target) {
            // console.log(`[BlenderNodes] switchMesh → found "${targetName}", showing`)
            BlenderNodes._applyWithProxy(scene, target, true)
            return true
        }
        console.warn(`[BlenderNodes] switchMesh → "${targetName}" NOT FOUND in scene`)
        return false
    }

    /**
     * Node: Switch (multi-mesh visibility)
     * Shows all meshes whose names are included in targetNames array.
     * For each matched mesh, if a proxy sibling named "<name> proxy" exists it is
     * shown/hidden together with the original.
     */
    static switchMeshes(scene, targetNames) {
        if (!targetNames || !Array.isArray(targetNames)) return 0;
        // Hide all meshes (including any proxies) first
        scene.traverse(child => {
            if (child.isMesh) {
                if (child.name.toLowerCase().includes('proxy')) {
                    child.userData.proxyActive = false
                }
                child.visible = false
            }
        })
        // console.log(`[BlenderNodes] switchMeshes → active list: [${targetNames.join(', ')}]`)
        let matched = 0
        for (const name of targetNames) {
            const target = scene.getObjectByName(name)
            if (target) {
                // console.log(`[BlenderNodes] switchMeshes → showing "${name}"`)
                BlenderNodes._applyWithProxy(scene, target, true)
                matched++
            } else {
                console.warn(`[BlenderNodes] switchMeshes → "${name}" NOT FOUND in scene`)
            }
        }
        console.log(`[BlenderNodes] switchMeshes → matched ${matched}/${targetNames.length} | list: [${targetNames.join(', ')}]`)
        return matched
    }

    // -----------------------------------------
    // MATH NODES
    // -----------------------------------------
    
    static Math = {
        Add: (a, b) => a + b,
        Subtract: (a, b) => a - b,
        Multiply: (a, b) => a * b,
        Divide: (a, b) => (b !== 0 ? a / b : 0),
        MapRange: (value, inMin, inMax, outMin, outMax) => {
            return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
        }
    };
}
