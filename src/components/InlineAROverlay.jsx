import '@google/model-viewer'
import { useRef, useEffect, useCallback, useState } from 'react'
import * as THREE from 'three'
import { isAndroidDevice } from '../utils/arPlatform'

import { generateBoxProjectionUVs } from '../utils/TriplanarMaterial'
import { COLOR_OPTIONS } from '../constants/configData'
import { useConfigurator } from '../context/ConfiguratorContext'

async function exportGLB(mesh, shellHex) {
  const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js')
  const exportGroup = new THREE.Group()
  mesh.updateWorldMatrix(true, true)
  
  mesh.traverse(child => {
    if (!child.isMesh) return
    let visible = true
    let node = child
    while (node) { if (!node.visible) { visible = false; break } node = node.parent }
    if (!visible) return
    child.updateWorldMatrix(true, false)

    const extractTinyTextureColor = (map) => {
        if (!map || !map.image || map.image.width > 16 || map.image.height > 16) return null;
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 1;
            canvas.height = 1;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(map.image, 0, 0, 1, 1);
            const data = ctx.getImageData(0, 0, 1, 1).data;
            if (data[3] === 0) return null; // Transparent
            return new THREE.Color(data[0] / 255, data[1] / 255, data[2] / 255).convertSRGBToLinear();
        } catch (e) {
            return null;
        }
    };
    const sanitizeMaterial = (mat) => {
        if (!mat) return mat;
        let m = mat.clone();
        m.onBeforeCompile = () => {};
        
        const isDecalMat = m.name && (m.name.toLowerCase().includes('decal') || m.name.toLowerCase() === 'decals');
        if (isDecalMat && m.alphaMap && !m.map) {
            const img = m.alphaMap.image;
            if (img) {
                const nextPowerOfTwo = (v) => { v--; v |= v >> 1; v |= v >> 2; v |= v >> 4; v |= v >> 8; v |= v >> 16; return v + 1; };
                const potWidth = nextPowerOfTwo(img.width || 512);
                const potHeight = nextPowerOfTwo(img.height || 512);
                const canvas = document.createElement('canvas');
                canvas.width = potWidth;
                canvas.height = potHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, potWidth, potHeight);
                const imgData = ctx.getImageData(0, 0, potWidth, potHeight);
                const data = imgData.data;
                const c = m.color;
                const r = c.r * 255, g = c.g * 255, b = c.b * 255;
                for (let i = 0; i < data.length; i += 4) {
                    const alpha = data[i]; // grayscale alpha
                    // Standard mask: alpha > 128 is the logo, alpha < 128 is the background
                    if (alpha > 128) {
                        data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = alpha; // Logo is Opaque
                    } else {
                        data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 0; // Background is Transparent
                    }
                }
                ctx.putImageData(imgData, 0, 0);
                
                const mergedTex = new THREE.CanvasTexture(canvas);
                mergedTex.colorSpace = THREE.SRGBColorSpace;
                mergedTex.flipY = false;
                mergedTex.wrapS = m.alphaMap.wrapS;
                mergedTex.wrapT = m.alphaMap.wrapT;
                
                const newMat = new THREE.MeshStandardMaterial({
                    name: m.name,
                    map: mergedTex,
                    normalMap: m.normalMap || null,
                    color: m.color,
                    metalness: m.metalness || 0.1,
                    roughness: m.roughness || 0.5,
                    transparent: false,
                    alphaTest: 0.5,
                    side: THREE.DoubleSide
                });
                newMat.userData = { ...(m.userData || {}), isDecal: true };
                m = newMat;
            }
        }
        
        if (m.normalMap) {
            let isNoise = false;
            if (m.normalMap.source && m.normalMap.source.data && m.normalMap.source.data.src && typeof m.normalMap.source.data.src === 'string' && m.normalMap.source.data.src.includes('Simple_Noise')) {
                isNoise = true;
            }
            if (isNoise) m.normalMap = null;
        }

        if (m.isMeshPhysicalMaterial && m.transmission > 0) {
            const std = new THREE.MeshStandardMaterial({
                color: m.color,
                map: m.map,
                transparent: true,
                opacity: 0.4,
                roughness: 0.1,
                metalness: 0.5,
                name: m.name
            });
            m = std;
        }
        return m;
    };

    const isArray = Array.isArray(child.material)
    const sanitizedMaterial = isArray ? child.material.map(sanitizeMaterial) : sanitizeMaterial(child.material)

    const getTriplanarScale = (mat) => {
        if (!mat) return null;
        if (Array.isArray(mat)) {
            for (let m of mat) if (m?.userData?.triplanarScale) return m.userData.triplanarScale;
        } else if (mat.userData?.triplanarScale) {
            return mat.userData.triplanarScale;
        }
        return null;
    }
    const triplanarScale = getTriplanarScale(sanitizedMaterial);

    const bakeUVTransform = (geometry, material) => {
        if (!geometry.attributes.uv || !material) return
        const map = material.map || material.normalMap || material.roughnessMap || material.metalnessMap || material.emissiveMap || material.alphaMap
        if (!map) return
        if (map.repeat.x === 1 && map.repeat.y === 1 && map.offset.x === 0 && map.offset.y === 0 && map.rotation === 0) return
        
        map.updateMatrix()
        const matrix = map.matrix
        const uv = geometry.attributes.uv
        for (let i = 0; i < uv.count; i++) {
            let u = uv.getX(i)
            let v = uv.getY(i)
            const newU = matrix.elements[0] * u + matrix.elements[3] * v + matrix.elements[6]
            const newV = matrix.elements[1] * u + matrix.elements[4] * v + matrix.elements[7]
            uv.setXY(i, newU, newV)
        }
        uv.needsUpdate = true
        const resetMap = (m) => {
            if (m) {
                m.repeat.set(1, 1)
                m.offset.set(0, 0)
                m.rotation = 0
                m.updateMatrix()
            }
        }
        resetMap(material.map)
        resetMap(material.normalMap)
        resetMap(material.roughnessMap)
        resetMap(material.metalnessMap)
        resetMap(material.emissiveMap)
        resetMap(material.alphaMap)
    }

    if (child.isInstancedMesh) {
      const sharedGeo = child.geometry.clone()
      sharedGeo.deleteAttribute('color')
      
      const mat = Array.isArray(sanitizedMaterial) 
        ? sanitizedMaterial.map(m => m ? m.clone() : m) 
        : (sanitizedMaterial ? sanitizedMaterial.clone() : undefined)

      if (triplanarScale !== null) {
          const tempMesh = new THREE.Mesh(sharedGeo, mat)
          tempMesh.applyMatrix4(child.matrixWorld)
          generateBoxProjectionUVs(tempMesh, 1.0 / triplanarScale, true)
      } else {
          if (Array.isArray(mat)) {
              bakeUVTransform(sharedGeo, mat[0])
          } else {
              bakeUVTransform(sharedGeo, mat)
          }
      }

      const m = new THREE.Matrix4()
      for (let i = 0; i < child.count; i++) {
        child.getMatrixAt(i, m)
        m.premultiply(child.matrixWorld)
        
        const singleMesh = new THREE.Mesh(sharedGeo, mat)
        singleMesh.name = `${child.name}_${i}`
        
        m.decompose(singleMesh.position, singleMesh.quaternion, singleMesh.scale)
        singleMesh.updateMatrixWorld(true)
        
        exportGroup.add(singleMesh)
      }
    } else {
      const geo = child.geometry.clone()
      geo.deleteAttribute('color')
      geo.applyMatrix4(child.matrixWorld)
      
      const matForClone = Array.isArray(sanitizedMaterial) 
        ? sanitizedMaterial.map(m => m ? m.clone() : m) 
        : (sanitizedMaterial ? sanitizedMaterial.clone() : undefined);
      
      const cloned = new THREE.Mesh(geo, matForClone)
      cloned.name = child.name
      
      if (triplanarScale !== null) {
          generateBoxProjectionUVs(cloned, 1.0 / triplanarScale, true)
      } else {
          if (Array.isArray(cloned.material)) {
              bakeUVTransform(cloned.geometry, cloned.material[0])
          } else {
              bakeUVTransform(cloned.geometry, cloned.material)
          }
      }
      exportGroup.add(cloned)
    }
  })
  
  return new Promise((resolve, reject) =>
    new GLTFExporter().parse(exportGroup, resolve, reject, { binary: true })
  )
}

export default function InlineAROverlay({ modelMesh }) {
  const modelViewerRef = useRef()
  const triggered = useRef(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isReady, setIsReady] = useState(false)

  const config = useConfigurator()
  const shellHex = COLOR_OPTIONS.find(c => c.id === config.selectedColor)?.color || '#ffffff'

  const handleExport = useCallback(async (mesh) => {
    try {
      const result = await exportGLB(mesh, shellHex)
      const blob = new Blob([result], { type: 'model/gltf-binary' })
      const blobUrl = URL.createObjectURL(blob)

      const viewer = modelViewerRef.current
      if (!viewer) return

      const handleLoad = () => {
        viewer.removeEventListener('load', handleLoad)
        if (viewer.canActivateAR) {
          setIsReady(true)
          if (isAndroidDevice()) {
            setShowPrompt(true)
          } else {
            viewer.activateAR()
          }
        }
      }
      viewer.addEventListener('load', handleLoad)
      viewer.setAttribute('src', blobUrl)
    } catch (err) {
      console.error('[InlineAR] export error:', err)
    }
  }, [])

  // Trigger export once when the main viewer's model mesh becomes available
  useEffect(() => {
    if (!modelMesh || triggered.current) return
    triggered.current = true
    handleExport(modelMesh)
  }, [modelMesh, handleExport])

  const handleOpenAR = () => {
    const viewer = modelViewerRef.current
    if (viewer?.canActivateAR) viewer.activateAR()
  }

  return (
    <>
      <model-viewer
        ref={modelViewerRef}
        ar
        ar-modes={isAndroidDevice() ? 'webxr' : 'quick-look webxr'}
        reveal="auto"
        className="fixed top-0 left-0 w-px h-px opacity-0 pointer-events-none"
      />

      {isReady && showPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-[28px] bg-[#2a2a2a] border border-white/10 shadow-2xl px-5 pt-6 pb-5">
            <h2 className="text-white text-[22px] leading-tight font-extrabold">
              View in AR?
            </h2>
            <p className="mt-3 text-white/70 text-[14px] leading-relaxed">
              You can view this object in 3D and place it in your surroundings using augmented reality.
            </p>
            <div className="mt-7 grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowPrompt(false)}
                className="h-12 rounded-full bg-white/10 text-white text-sm font-semibold hover:bg-white/15 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleOpenAR}
                className="h-12 rounded-full bg-[#5a5a5a] text-white text-sm font-semibold hover:bg-[#686868] transition-colors"
              >
                View in AR
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
