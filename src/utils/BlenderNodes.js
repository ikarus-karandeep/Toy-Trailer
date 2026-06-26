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
     * Node: Switch (mesh visibility)
     * Traverses a scene and shows only the mesh whose name matches targetName.
     * All other meshes in the scene are hidden.
     * Returns true if a match was found.
     * @param {THREE.Object3D} scene
     * @param {string} targetName
     */
    static switchMesh(scene, targetName) {
        let matched = false
        scene.traverse(child => {
            if (!child.isMesh) return
            const hit = child.name === targetName
            child.visible = hit
            if (hit) matched = true
        })
        return matched
    }

    /**
     * Node: Switch (multi-mesh visibility)
     * Shows all meshes whose names are included in targetNames array.
     */
    static switchMeshes(scene, targetNames) {
        let matched = 0;
        if (!targetNames || !Array.isArray(targetNames)) return 0;
        scene.traverse(child => {
            if (!child.isMesh) return;
            const hit = targetNames.includes(child.name);
            child.visible = hit;
            if (hit) matched++;
        });
        return matched;
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
