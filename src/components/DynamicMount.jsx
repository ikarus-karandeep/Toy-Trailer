import React, { useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

/**
 * DynamicMount is a highly reusable component that takes a source mesh (e.g. from a GLB scene),
 * clones it safely (preventing global animation deformation), centers its bounding box,
 * and mounts it perfectly onto a target socket Object3D within the trailer coordinate space.
 * It also includes an active material synchronizer to ensure textures applied globally
 * are inherited by this clone seamlessly.
 *
 * @param {Object} props
 * @param {THREE.Object3D} props.sourceMesh - The original mesh to clone (e.g., from wheels.glb)
 * @param {THREE.Object3D} props.socket - The target object in the scene to mount this clone to
 * @param {THREE.Object3D} props.relativeTo - The root scene (e.g., addons) used for local coordinate extraction
 * @param {boolean} [props.applyRotation=false] - If true, matches the socket's rotation
 * @param {boolean} [props.applyScale=false] - If true, matches the socket's scale
 */
const DynamicMount = forwardRef(({ 
    socket, 
    sourceMesh, 
    relativeTo, 
    applyRotation = false, 
    applyScale = false,
    mirrorZ = false
}, ref) => {
    // Refs for real-time material synchronization
    const materialRefs = useRef({ cloned: null, original: null });

    const updatePosition = () => {
        const { cloned } = materialRefs.current;
        if (!cloned || !socket || !cloned.parent) return;

        // updateWorldMatrix(updateParents=true, updateChildren=false)
        // traverses UP the ancestor chain first, ensuring the wheels scene's
        // matrixWorld is correct before we read the socket's world position.
        socket.updateWorldMatrix(true, false);
        cloned.parent.updateWorldMatrix(true, false);
        
        // Extract only world position from socket, convert to cloned.parent local space
        const worldPos = new THREE.Vector3();
        socket.getWorldPosition(worldPos);

        cloned.parent.worldToLocal(worldPos);
        cloned.position.copy(worldPos);

        // Mirror Z for right-side mounts (hub facing outward on both sides)
        if (mirrorZ) {
            cloned.scale.set(1, 1, -1);
        }

        // Only apply rotation/scale if explicitly requested
        if (applyRotation) {
            const tempQuat = new THREE.Quaternion();
            socket.getWorldQuaternion(tempQuat);
            cloned.rotation.setFromQuaternion(tempQuat);
        }
        if (applyScale) {
            const tempScale = new THREE.Vector3();
            socket.getWorldScale(tempScale);
            cloned.scale.copy(tempScale);
        }
    };

    useImperativeHandle(ref, () => ({
        updatePosition
    }));

    const clonedInstance = useMemo(() => {
        if (!sourceMesh || !socket || !relativeTo) return null;

        // Clone the entire group
        const cloned = sourceMesh.clone();

        // Force visibility and restore original pristine geometry if deformed
        cloned.traverse(child => {
            child.visible = true; 
            if (child.isMesh) {
                // Force clone to share the exact same material array reference as the original
                const originalMesh = sourceMesh.getObjectByName(child.name) || sourceMesh;
                if (originalMesh.isMesh) {
                    child.material = originalMesh.material;
                }

                // Clone geometry to safely mutate its center without breaking the original
                child.geometry = child.geometry.clone();
                if (child.geometry.userData.originalPosition) {
                    // Wipe out any trailer deformations (stretching) from global animations
                    child.geometry.attributes.position.array.set(child.geometry.userData.originalPosition);
                    child.geometry.attributes.position.needsUpdate = true;
                    child.geometry.boundingBox = null;
                    child.geometry.boundingSphere = null;
                }
            }
        });

        // Auto-center the geometry so the socket position IS the visual center.
        // Only apply if the mesh center is significantly off from world origin.
        const bbox = new THREE.Box3().setFromObject(cloned);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        
        // Only center if the object is far from origin (e.g. spare tire from addons scene).
        // Wheel Inst meshes are already centered in their local space from Blender.
        const distFromOrigin = center.length();
        if (distFromOrigin > 0.1) {
            cloned.traverse(child => {
                if (child.isMesh) {
                    child.geometry.translate(-center.x, -center.y, -center.z);
                }
            });
        }

        // Copy custom properties (like weights) from the socket to the cloned mesh
        if (socket.userData) {
            cloned.userData = { ...cloned.userData, ...socket.userData };
        }

        // ── Pre-position at socket to prevent 1-frame flash at origin ────────────
        // The clone isn't in the scene yet so cloned.parent is null.
        // The outer <group> wrapper has identity matrix, so world pos ≈ local pos.
        // We set it here so the very first rendered frame is already correct.
        socket.updateWorldMatrix(true, false);
        const initPos = new THREE.Vector3();
        socket.getWorldPosition(initPos);
        cloned.position.copy(initPos);
        if (mirrorZ) cloned.scale.set(1, 1, -1);
        // ────────────────────────────────────────────────────────────────────────

        // Save refs for the material sync loop and dynamic transform loop
        materialRefs.current.cloned = cloned;
        materialRefs.current.original = sourceMesh;

        return cloned;
    }, [sourceMesh, socket, relativeTo, applyRotation, applyScale, mirrorZ]);

    useFrame(() => {
        const { cloned, original } = materialRefs.current;
        if (!cloned || !original) return;

        // 1. Dynamic Transform Sync
        // We still call this here for safety, but the parent (ModularTrailerModel) 
        // will also call it manually via ref to prevent 1-frame lag.
        if (socket && cloned.parent) {
            updatePosition();
        }

        // 2. Real-time Material Sync
        cloned.traverse(child => {
            if (child.isMesh) {
                const origMesh = original.getObjectByName(child.name) || original;
                if (origMesh.isMesh) {
                    if (Array.isArray(origMesh.material)) {
                        let changed = false;
                        for (let i = 0; i < origMesh.material.length; i++) {
                            if (child.material[i] !== origMesh.material[i]) {
                                child.material[i] = origMesh.material[i];
                                changed = true;
                            }
                        }
                        if (changed) {
                            child.material = [...child.material]; 
                        }
                    } else if (child.material !== origMesh.material) {
                        child.material = origMesh.material;
                    }
                }
            }
        });
    });

    if (!clonedInstance) return null;

    return <primitive object={clonedInstance} />;
});

export default DynamicMount;
