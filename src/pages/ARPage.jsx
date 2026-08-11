import '@google/model-viewer'
import { Suspense, useRef, useState, useEffect, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { Stage, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import LZString from 'lz-string'
import { ConfiguratorProvider, useConfigurator } from '../context/ConfiguratorContext'
import ModularTrailerModel from '../components/ModularTrailerModel'
import ARViewer from '../components/ARViewer'

const WIDTH_FT = { '7ft': 7, '8.5ft': 8.5 }
const HEIGHT_MAP = { '7ft0': 7, '7ft6': 7.5, '8ft0': 8, '8ft6': 8.5, '9ft0': 9, '9ft6': 9.5, '10ft0': 10 }

import { generateBoxProjectionUVs } from '../utils/TriplanarMaterial'
import { COLOR_OPTIONS } from '../constants/configData'

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
        
        // 2. Strip grayscale noise map from normalMap slot as it breaks iOS Quick Look USDZ rendering
        if (m.normalMap) {
            let isNoise = false;
            if (m.normalMap.source && m.normalMap.source.data && m.normalMap.source.data.src && m.normalMap.source.data.src.includes('Simple_Noise')) {
                isNoise = true;
            }
            if (isNoise) m.normalMap = null;
        }

        // 3. Quick Look struggles with transmission, convert to transparent standard
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

    let sanitizedMaterial = Array.isArray(child.material) 
        ? child.material.map(sanitizeMaterial) 
        : sanitizeMaterial(child.material);

    let triplanarScale = null
    if (child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material]
        const tpMat = mats.find(m => m && m.customProgramCacheKey && m.customProgramCacheKey().includes('triplanar_'))
        if (tpMat) {
            const match = tpMat.customProgramCacheKey().match(/triplanar_([^_]+)/)
            if (match && match[1]) triplanarScale = parseFloat(match[1])
        }
    }

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
            // Three.js texture matrix transforms (u, v)
            const newU = matrix.elements[0] * u + matrix.elements[3] * v + matrix.elements[6]
            const newV = matrix.elements[1] * u + matrix.elements[4] * v + matrix.elements[7]
            uv.setXY(i, newU, newV)
        }
        uv.needsUpdate = true
        // Reset material transform to prevent GLTFExporter from adding KHR_texture_transform
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
      // 1. Process shared geometry and material ONCE to save memory and prevent iOS Safari crashes
      const sharedGeo = child.geometry.clone()
      sharedGeo.deleteAttribute('color') // Strip vertex colors to prevent grey tinting
      
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

      // 2. Create lightweight mesh nodes for each instance
      const m = new THREE.Matrix4()
      for (let i = 0; i < child.count; i++) {
        child.getMatrixAt(i, m)
        m.premultiply(child.matrixWorld)
        
        const singleMesh = new THREE.Mesh(sharedGeo, mat)
        singleMesh.name = `${child.name}_${i}`
        
        // Decompose matrix into position/rotation/scale for GLTFExporter
        m.decompose(singleMesh.position, singleMesh.quaternion, singleMesh.scale)
        singleMesh.updateMatrixWorld(true)
        
        exportGroup.add(singleMesh)
      }
    } else {
      const geo = child.geometry.clone()
      geo.deleteAttribute('color') // Strip vertex colors to prevent grey tinting
      geo.applyMatrix4(child.matrixWorld)
      const cloned = new THREE.Mesh(geo, Array.isArray(sanitizedMaterial) ? sanitizedMaterial.map(m => m.clone()) : sanitizedMaterial.clone())
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

function ModelReadyTrigger({ onReady }) {
  useEffect(() => { onReady() }, [onReady])
  return null
}

function ARPageContent() {
  const config = useConfigurator()
  const { width, length, interiorHeight } = config
  const modelGroupRef = useRef()
  const [arUrl, setArUrl] = useState(null)
  const [exporting, setExporting] = useState(false)
  const hasTriggered = useRef(false)

  const widthFt = WIDTH_FT[width] ?? 7
  const lengthFt = parseInt(length, 10) || 32
  const heightFt = HEIGHT_MAP[interiorHeight] ?? 7
  const shellHex = COLOR_OPTIONS.find(c => c.id === config.selectedColor)?.color || '#ffffff'

  const handleViewInAR = useCallback(async () => {
    if (!modelGroupRef.current || exporting) return
    setExporting(true)
    try {
      const result = await exportGLB(modelGroupRef.current, shellHex)
      const blob = new Blob([result], { type: 'model/gltf-binary' })
      setArUrl(URL.createObjectURL(blob))
    } catch (err) {
      console.error('[ARPage] export error:', err)
      setExporting(false)
    }
  }, [exporting])

  const handleModelReady = useCallback(() => {
    if (hasTriggered.current) return
    hasTriggered.current = true
    setTimeout(() => {
        handleViewInAR()
    }, 1500)
  }, [handleViewInAR])

  if (arUrl) {
    return (
      <ARViewer
        url={arUrl}
        onClose={() => {
          URL.revokeObjectURL(arUrl)
          setArUrl(null)
          setExporting(false)
          hasTriggered.current = false
        }}
      />
    )
  }

  return (
    <div className="fixed inset-0 bg-black">
      <Suspense
        fallback={
          <div className="flex items-center justify-center w-full h-full">
            <span className="text-gray-400 text-sm tracking-widest uppercase">Loading Model...</span>
          </div>
        }
      >
        <Canvas
          shadows
          camera={{ fov: 50 }}
          style={{ width: '100%', height: '100%' }}
          gl={{ antialias: true }}
        >
          <Stage
            intensity={0.5}
            // preset="rembrandt"
            shadows={{ type: 'contact', opacity: 0.2, blur: 3 }}
            // environment="city"
            adjustCamera
          >
            <group ref={modelGroupRef}>
              <ModularTrailerModel widthFt={widthFt} lengthFt={lengthFt} heightFt={heightFt} />
            </group>
          </Stage>
          <OrbitControls enablePan minPolarAngle={0.2} maxPolarAngle={Math.PI * 0.52} />
        </Canvas>
        <ModelReadyTrigger onReady={handleModelReady} />
      </Suspense>

      {exporting && (
        <div className="absolute bottom-10 left-0 right-0 flex justify-center">
          <span className="text-white text-sm font-semibold tracking-widest uppercase opacity-70">
            Preparing AR...
          </span>
        </div>
      )}
    </div>
  )
}

export default function ARPage() {
  let initialConfig = {}
  try {
    const hash = window.location.hash
    const queryStart = hash.indexOf('?')
    if (queryStart >= 0) {
      const raw = hash.slice(queryStart + 1)
      const match = raw.match(/(?:^|&)c=([^&]*)/)
      if (match) {
        const decoded = LZString.decompressFromEncodedURIComponent(decodeURIComponent(match[1]))
        if (decoded) initialConfig = JSON.parse(decoded)
      }
    }
  } catch {
    console.warn('[ARPage] Failed to parse config from URL — using defaults')
  }

  return (
    <ConfiguratorProvider initialConfig={initialConfig}>
      <ARPageContent />
    </ConfiguratorProvider>
  )
}
