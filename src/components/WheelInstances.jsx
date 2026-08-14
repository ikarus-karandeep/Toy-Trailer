import React, { useMemo, forwardRef, useImperativeHandle } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const _worldPos = new THREE.Vector3();
const _sockM = new THREE.Matrix4();
const _instM = new THREE.Matrix4();
const _flipYRot = new THREE.Matrix4().makeRotationY(Math.PI);
const _baseM = new THREE.Matrix4();

const WheelInstances = forwardRef(({ instMesh, sockets, relativeTo, allowDeformation = false, disableAutoCenter = false }, ref) => {
    if (!instMesh || !sockets || sockets.length === 0 || !relativeTo) return null;

    // 1. Collect mesh parts and compute their base transformation
    const meshParts = useMemo(() => {
        const parts = [];

        // Recreate the exact base transformation of the Inst group
        _baseM.compose(
            new THREE.Vector3(0, 0, 0), // Position is replaced by the socket
            instMesh.quaternion,        // Keep original local rotation
            instMesh.scale              // Keep original local scale
        );

        // Pre-process the mesh exactly like DynamicMount to find its true pristine center
        const cloneForProcessing = instMesh.clone();
        cloneForProcessing.traverse(child => {
            if (child.isMesh) {
                child.geometry = child.geometry.clone();
                // Wipe out any trailer deformations (stretching) before computing bounding box, UNLESS deformation is allowed
                if (!allowDeformation && child.geometry.userData.originalPosition) {
                    child.geometry.attributes.position.array.set(child.geometry.userData.originalPosition);
                    child.geometry.attributes.position.needsUpdate = true;
                    child.geometry.boundingBox = null;
                    child.geometry.boundingSphere = null;
                }
            }
        });

        // Now compute the bounding box of the pristine, undeformed mesh
        const bbox = new THREE.Box3().setFromObject(cloneForProcessing);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        const distFromOrigin = center.length();

        // Now traverse the processed clone to generate the instanced parts
        cloneForProcessing.traverse(child => {
            if (!child.isMesh) return;
            child.updateMatrix();

            // relMatrix = base (rotation/scale) * child's local offset
            const relMatrix = _baseM.clone().multiply(child.matrix);
            
            const geometry = child.geometry;
            // Center the pristine geometry around local origin so the socket is the visual center.
            // Disable this if the mesh's origin is already perfectly placed (e.g. Jacks).
            if (!disableAutoCenter && distFromOrigin > 0.1) {
                geometry.translate(-center.x, -center.y, -center.z);
            }
            
            geometry.computeBoundingBox();
            
            // Save the true bounding box before we wipe it
            geometry.userData.trueBoundingBox = geometry.boundingBox.clone();
            
            // Wipe out the bounding box so <Stage> completely ignores the base geometry,
            // preventing the trailer from floating due to the base geometry offset.
            geometry.boundingBox.makeEmpty();
            if (geometry.boundingSphere) {
                geometry.boundingSphere.radius = 0;
            }

            // We MUST clone the materials so Three.js can compile them specifically for InstancedMesh.
            // Sharing a material between a regular Mesh and an InstancedMesh causes the initial black render bug.
            // DO NOT use DoubleSide here as it can invert normals on instances and break tangent space, causing weird glow.
            const srcChild = instMesh.getObjectByName(child.name);
            const material = Array.isArray(srcChild.material)
                ? srcChild.material.map(m => m.clone())
                : srcChild.material.clone();

            parts.push({ geometry, material, relMatrix, srcMesh: srcChild });
        });

        return parts;
    }, [instMesh]);

    // 2. Create one InstancedMesh per mesh part
    const instancedMeshes = useMemo(() => {
        return meshParts.map(({ geometry, material, relMatrix, srcMesh }) => {
            const iMesh = new THREE.InstancedMesh(geometry, material, sockets.length);
            iMesh.castShadow = true;
            iMesh.receiveShadow = false;
            iMesh.frustumCulled = false;
            iMesh.name = `${srcMesh.name}_Instanced`;
            return { iMesh, relMatrix, srcMesh };
        });
    }, [meshParts, sockets.length]);

    // 5. Proxy mesh ref for Stage bounds
    const proxyMeshRef = React.useRef();

    // 3. Matrix update logic
    const updateMatrices = () => {
        relativeTo.updateWorldMatrix(true, false);
        const trueBounds = new THREE.Box3();

        sockets.forEach((socket, i) => {
            socket.updateWorldMatrix(true, false);
            socket.getWorldPosition(_worldPos);
            
            relativeTo.worldToLocal(_worldPos);

            _sockM.makeTranslation(_worldPos.x, _worldPos.y, _worldPos.z);
            if (socket.name.includes('_R')) {
                // Rotate 180 degrees around Y to flip the tire outwards instead of using negative scale.
                // Negative scale on InstancedMesh breaks winding order (culling) and normal vectors.
                _sockM.multiply(_flipYRot); 
            }

            instancedMeshes.forEach(({ iMesh, relMatrix }) => {
                _instM.copy(_sockM).multiply(relMatrix);
                iMesh.setMatrixAt(i, _instM);

                // Expand true bounds using the preserved original bounding box
                if (iMesh.geometry.userData.trueBoundingBox) {
                    const tempBox = iMesh.geometry.userData.trueBoundingBox.clone();
                    tempBox.applyMatrix4(_instM);
                    trueBounds.union(tempBox);
                }
            });
        });

        instancedMeshes.forEach(({ iMesh }) => {
            iMesh.instanceMatrix.needsUpdate = true;
        });

        // Update the invisible proxy mesh to perfectly match the true bounds of all tires
        if (proxyMeshRef.current && !trueBounds.isEmpty()) {
            const center = new THREE.Vector3();
            const size = new THREE.Vector3();
            trueBounds.getCenter(center);
            trueBounds.getSize(size);
            
            // Avoid scaling to 0 which can cause matrix inversion warnings
            if (size.x === 0) size.x = 0.001;
            if (size.y === 0) size.y = 0.001;
            if (size.z === 0) size.z = 0.001;

            proxyMeshRef.current.position.copy(center);
            proxyMeshRef.current.scale.copy(size);
            proxyMeshRef.current.updateMatrixWorld(true);

            // console.log(`[WheelInstances] ProxyMesh Updated. Center:`, center, `Size:`, size, `Min Y:`, trueBounds.min.y);
        }

        // --- EXPLICITLY SYNC VERTICES HERE ---
        // By doing this synchronously inside updateMatrices() instead of useFrame,
        // we guarantee zero lag because the parent component calls this immediately AFTER deforming.
        instancedMeshes.forEach(({ iMesh, srcMesh }) => {
            if (allowDeformation && srcMesh.geometry.attributes.position && iMesh.geometry.attributes.position) {
                const srcPos = srcMesh.geometry.attributes.position.array;
                const dstPos = iMesh.geometry.attributes.position.array;
                let changed = false;
                for (let i = 0; i < srcPos.length; i++) {
                    if (dstPos[i] !== srcPos[i]) {
                        dstPos[i] = srcPos[i];
                        changed = true;
                    }
                }
                if (changed) {
                    iMesh.geometry.attributes.position.needsUpdate = true;
                }
            }
        });
    };

    useImperativeHandle(ref, () => ({
        updateMatrices
    }));

    // Pre-calculate before first render
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useMemo(updateMatrices, [instancedMeshes, sockets, relativeTo]);

    // 4. Per-frame sync
    useFrame(() => {
        instancedMeshes.forEach(({ iMesh, srcMesh }) => {

            const src = Array.isArray(srcMesh.material) ? srcMesh.material : [srcMesh.material];
            const dest = Array.isArray(iMesh.material) ? iMesh.material : [iMesh.material];
            
            src.forEach((srcMat, idx) => {
                const dstMat = dest[idx];
                if (!dstMat || dstMat === srcMat) return;
                
                let updated = false;
                const props = ['map', 'envMap', 'envMapIntensity', 'color', 'roughness', 'metalness', 'normalMap', 'normalScale', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissive', 'emissiveIntensity'];
                
                props.forEach(prop => {
                    if (srcMat[prop] !== undefined) {
                        if (srcMat[prop] && srcMat[prop].equals && dstMat[prop]) {
                            if (!dstMat[prop].equals(srcMat[prop])) {
                                dstMat[prop].copy(srcMat[prop]);
                                updated = true;
                            }
                        } else if (dstMat[prop] !== srcMat[prop]) {
                            dstMat[prop] = srcMat[prop];
                            updated = true;
                        }
                    }
                });
                
                if (updated) dstMat.needsUpdate = true;
            });
        });
    });

    return (
        <>
            {/* Real visual InstancedMeshes */}
            {instancedMeshes.map(({ iMesh }, idx) => (
                <primitive key={idx} object={iMesh} />
            ))}
            
            {/* Invisible Proxy Mesh for Bounding Box / <Stage> calculations.
                Older versions of Three.js Box3.setFromObject ignore InstancedMesh matrices.
                This single box dynamically encompasses all tires so Stage sees the true floor height. */}
            <mesh ref={proxyMeshRef} visible={false} name="Wheel_Proxy">
                <boxGeometry args={[1, 1, 1]} />
                <meshBasicMaterial />
            </mesh>
        </>
    );
});

export default WheelInstances;
