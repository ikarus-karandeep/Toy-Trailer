import '@google/model-viewer'
import { Suspense, useRef, useState, useEffect, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { Stage, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import LZString from 'lz-string'
import { ConfiguratorProvider, useConfigurator } from '../context/ConfiguratorContext'
import ModularTrailerModel from '../components/ModularTrailerModel'
import ARViewer from '../components/ARViewer'
import { exportForAR } from '../utils/arExport'

const WIDTH_FT = { '7ft': 7, '8.5ft': 8.5 }
const HEIGHT_MAP = { '7ft0': 7, '7ft6': 7.5, '8ft0': 8, '8ft6': 8.5, '9ft0': 9, '9ft6': 9.5, '10ft0': 10 }

import { generateBoxProjectionUVs } from '../utils/TriplanarMaterial'
import { COLOR_OPTIONS } from '../constants/configData'

function ModelReadyTrigger({ onReady }) {
  useEffect(() => { onReady() }, [onReady])
  return null
}

function ARPageContent() {
  const config = useConfigurator()
  const { width, length, interiorHeight } = config
  const modelGroupRef = useRef()
  const [arUrl, setArUrl] = useState(null)
  const [isPreparing, setIsPreparing] = useState(true)
  const [arProgress, setArProgress] = useState(0)
  const hasTriggered = useRef(false)

  useEffect(() => {
    let interval;
    if (isPreparing) {
      setArProgress(0)
      interval = setInterval(() => {
        setArProgress(p => {
          if (p >= 90) return p;
          return p + Math.random() * 15;
        })
      }, 200)
    } else {
      setArProgress(100)
      setTimeout(() => setArProgress(0), 300)
    }
    return () => clearInterval(interval)
  }, [isPreparing])

  const widthFt = WIDTH_FT[width] ?? 7
  const lengthFt = parseInt(length, 10) || 32
  const heightFt = HEIGHT_MAP[interiorHeight] ?? 7
  const shellHex = COLOR_OPTIONS.find(c => c.id === config.selectedColor)?.color || '#ffffff'

  const handleViewInAR = useCallback(async () => {
    if (!modelGroupRef.current) return
    try {
      const result = await exportForAR(modelGroupRef.current)
      const blob = new Blob([result], { type: 'model/gltf-binary' })
      setArUrl(URL.createObjectURL(blob))
    } catch (err) {
      console.error('[ARPage] export error:', err)
      setIsPreparing(false)
    }
  }, [])

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

      {isPreparing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-[28px] bg-[#2a2a2a] border border-white/10 shadow-2xl px-6 pt-6 pb-8 flex flex-col items-center">
            <h2 className="text-white text-[18px] leading-tight font-extrabold mb-4 text-center">
              Preparing AR Model
            </h2>
            <div className="w-full h-2 bg-[#1a1a1a] rounded-full overflow-hidden relative">
              <div 
                className="absolute top-0 left-0 bottom-0 bg-[#DA634B] transition-all duration-300 ease-out" 
                style={{ width: `${arProgress}%` }}
              />
            </div>
            <p className="mt-3 text-white/50 text-[12px] font-medium tracking-wide uppercase">
              Please wait...
            </p>
          </div>
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
