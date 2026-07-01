import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Environment, Center } from '@react-three/drei'
import * as THREE from 'three'
import { useConfigurator } from '../context/ConfiguratorContext'
import ModularTrailerModel from './ModularTrailerModel'
import ModelDimensions from './ModelDimensions'
import ARViewer from './ARViewer'
import QRModal from './QRModal'

// ── raw feet helpers (match Blender node Factor input) ────────────────────────

const WIDTH_FT = { '7ft': 7, '8.5ft': 8.5 }

function getLengthFt(id) {
  return parseInt(id, 10) // '36' → 36
}

const HEIGHT_FEET_MAP = {
  '7ft0': 7, '7ft6': 7.5, '8ft0': 8, '8ft6': 8.5,
  '9ft0': 9, '9ft6': 9.5, '10ft0': 10,
}
function getHeightFt(id) {
  return HEIGHT_FEET_MAP[id] ?? 7
}

// ── camera fit — model always stays in canvas on resize ───────────────────────

function CameraFit({ modelGroupRef, orbitControlsRef, configKey }) {
  const { camera, size } = useThree()
  const lastBboxRef = useRef(null)
  const cameraInitRef = useRef(false)
  const bboxNeedsRescanRef = useRef(true)
  const pendingRef = useRef(0)

  // On model resize: rescan bbox for the resize handler, but do NOT move the camera
  useEffect(() => {
    bboxNeedsRescanRef.current = true
    pendingRef.current = 5
  }, [configKey])

  useFrame(() => {
    if (!bboxNeedsRescanRef.current) return
    if (pendingRef.current > 0) { pendingRef.current--; return }
    if (!modelGroupRef.current) return

    let hasMeshes = false
    modelGroupRef.current.traverse((o) => { if (o.isMesh) hasMeshes = true })
    if (!hasMeshes) return

    const bbox = new THREE.Box3().setFromObject(modelGroupRef.current)
    const bboxSize = new THREE.Vector3()
    bbox.getSize(bboxSize)
    if (bboxSize.length() < 0.01) return

    const isFirstLoad = !cameraInitRef.current
    lastBboxRef.current = bbox.clone()
    bboxNeedsRescanRef.current = false

    // Model resized after initial load — bbox updated, camera stays put
    if (!isFirstLoad) return

    const center = new THREE.Vector3()
    bbox.getCenter(center)
    const maxDim = Math.max(bboxSize.x, bboxSize.y, bboxSize.z)

    const aspect = size.width / size.height
    const fovRad = (camera.fov * Math.PI) / 180
    const halfFovH = Math.atan(aspect * Math.tan(fovRad / 2))
    const halfFovV = fovRad / 2
    const distForWidth = (bboxSize.x / 2) / Math.tan(halfFovH)
    const distForHeight = (bboxSize.y / 2) / Math.tan(halfFovV)
    const fitDist = Math.max(distForWidth, distForHeight) * 1.1

    camera.position.set(center.x, center.y, center.z + fitDist)

    if (orbitControlsRef.current) {
      orbitControlsRef.current.target.copy(center)
      orbitControlsRef.current.minDistance = maxDim * 0.1
      orbitControlsRef.current.maxDistance = maxDim * 3
      orbitControlsRef.current.update()
    }

    cameraInitRef.current = true
  })

  // On canvas resize, always refit to the new canvas dimensions (both grow and shrink)
  useEffect(() => {
    if (!lastBboxRef.current || !camera.isPerspectiveCamera) return

    const bbox = lastBboxRef.current
    const bboxSize = new THREE.Vector3()
    bbox.getSize(bboxSize)

    const target = orbitControlsRef.current
      ? orbitControlsRef.current.target.clone()
      : (() => { const c = new THREE.Vector3(); bbox.getCenter(c); return c })()

    const dir = camera.position.clone().sub(target)
    if (dir.length() === 0) return

    const aspect = size.width / size.height
    const fovRad = (camera.fov * Math.PI) / 180
    const halfFovH = Math.atan(aspect * Math.tan(fovRad / 2))
    const halfFovV = fovRad / 2
    const distForWidth = (bboxSize.x / 2) / Math.tan(halfFovH)
    const distForHeight = (bboxSize.y / 2) / Math.tan(halfFovV)
    const fitDist = Math.max(distForWidth, distForHeight) * 1.1

    camera.position.copy(target.clone().add(dir.normalize().multiplyScalar(fitDist)))
    orbitControlsRef.current?.update()
  }, [size.width, size.height]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}

// ── viewer ────────────────────────────────────────────────────────────────────

export default function TrailerViewer() {
  const { width, length, interiorHeight, showDimensions, setShowDimensions } = useConfigurator()
  const [arUrl, setArUrl] = useState(null)
  const [arExporting, setArExporting] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [clickedName, setClickedName] = useState(null)
  const nameTimerRef = useRef(null)
  const modelGroupRef = useRef()
  const orbitControlsRef = useRef()

  // const handleMeshClick = (e) => {
  //   e.stopPropagation()
  //   const name = e.object.name || e.object.uuid
  //   if (nameTimerRef.current) clearTimeout(nameTimerRef.current)
  //   setClickedName(name)
  //   nameTimerRef.current = setTimeout(() => setClickedName(null), 2000)
  // }

  const widthFt = WIDTH_FT[width] ?? 7
  const lengthFt = getLengthFt(length)
  const heightFt = getHeightFt(interiorHeight)
  const configKey = `${widthFt}-${lengthFt}-${heightFt}`

  const handleViewInDriveway = () => setShowQR(true)

  const handleOpenAR = async () => {
    if (!modelGroupRef.current || arExporting) return
    setArExporting(true)
    try {
      const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js')
      const exporter = new GLTFExporter()
      exporter.parse(
        modelGroupRef.current,
        (result) => {
          const blob = new Blob([result], { type: 'model/gltf-binary' })
          setArUrl(URL.createObjectURL(blob))
          setShowQR(false)
          setArExporting(false)
        },
        (err) => {
          console.error('GLB export failed:', err)
          setArExporting(false)
        },
        { binary: true }
      )
    } catch (err) {
      console.error('AR export error:', err)
      setArExporting(false)
    }
  }

  const handleDownload = async () => {
    if (!modelGroupRef.current || downloading) return
    setDownloading(true)
    try {
      const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js')
      const exporter = new GLTFExporter()
      exporter.parse(
        modelGroupRef.current,
        (result) => {
          const blob = new Blob([result], { type: 'model/gltf-binary' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `trailer-${lengthFt}ft-${widthFt}ft.glb`
          a.click()
          URL.revokeObjectURL(url)
          setDownloading(false)
        },
        (err) => {
          console.error('GLB export failed:', err)
          setDownloading(false)
        },
        { binary: true }
      )
    } catch (err) {
      console.error('Download error:', err)
      setDownloading(false)
    }
  }

  const handleCloseQR = () => setShowQR(false)

  const handleCloseAR = () => {
    if (arUrl) URL.revokeObjectURL(arUrl)
    setArUrl(null)
  }

  return (
    <div className="relative flex-1 flex flex-col min-h-0">
      <div className="relative flex-1 min-h-0">
        <div className="absolute inset-0">
          <Suspense
            fallback={
              <div className="flex items-center justify-center w-full h-full">
                <span className="text-gray-400 text-sm tracking-widest uppercase">Loading model...</span>
              </div>
            }
          >
            <Canvas
              camera={{ fov: 50 }}
              style={{ width: '100%', height: '100%' }}
              gl={{ antialias: true }}
            >
              <ambientLight intensity={0.6} />
              <directionalLight position={[5, 5, 5]} intensity={1.2} castShadow />
              <directionalLight position={[-5, 3, -5]} intensity={0.4} />
              <Environment preset="city" />
              <Center>
                <group ref={modelGroupRef} >
                  <ModularTrailerModel
                    widthFt={widthFt}
                    lengthFt={lengthFt}
                    heightFt={heightFt}
                  />
                </group>
              </Center>
              {showDimensions && (
                <ModelDimensions groupRef={modelGroupRef} />
              )}
              <CameraFit
                modelGroupRef={modelGroupRef}
                orbitControlsRef={orbitControlsRef}
                configKey={configKey}
              />
              <OrbitControls
                ref={orbitControlsRef}
                enablePan={true}
                minPolarAngle={0.2}
                maxPolarAngle={Math.PI * 0.52}
              />
            </Canvas>
          </Suspense>

          {clickedName && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
              <div className="bg-black/70 text-white text-sm font-medium px-4 py-2 rounded-lg tracking-wide">
                {clickedName}
              </div>
            </div>
          )}
        </div>

        {/* View controls — overlaid on canvas, desktop only */}
        <div className="hidden lg:flex absolute bottom-6 left-0 right-0 items-center justify-center gap-3 z-10">
          <button aria-label="360 View" className="w-11 h-9 flex items-center justify-center bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg hover:border-[#DA634B] transition-colors">
            <img src="/eyes.png" alt="" />
          </button>
          <button aria-label="Scenic View" className="w-11 h-9 flex items-center justify-center bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg hover:border-[#DA634B] transition-colors">
            <img src="/view.png" alt="" />
          </button>
          <button
            aria-label="Toggle Dimensions"
            onClick={() => setShowDimensions(prev => !prev)}
            className={`w-11 h-9 flex items-center justify-center bg-[#2a2a2a] rounded-lg transition-colors border ${showDimensions ? 'border-[#DA634B]' : 'border-[#3a3a3a] hover:border-[#DA634B]'}`}
          >
            <img src="/Dimension.png" alt="" />
          </button>
          <button
            onClick={handleViewInDriveway}
            className="flex items-center gap-2 px-5 py-3 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg text-sm font-semibold tracking-widest uppercase text-gray-300 hover:border-[#DA634B] hover:text-white transition-all"
          >
            VIEW IN YOUR DRIVEWAY
          </button>
          <button
            onClick={handleDownload}
            disabled={downloading}
            aria-label="Download GLB"
            className="w-11 h-9 flex items-center justify-center bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg hover:border-[#DA634B] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloading ? (
              <svg className="animate-spin w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0 0l-4-4m4 4l4-4" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {showQR && (
        <QRModal
          onClose={handleCloseQR}
          onOpenAR={handleOpenAR}
          exporting={arExporting}
        />
      )}
      {arUrl && <ARViewer url={arUrl} onClose={handleCloseAR} />}
    </div>
  )
}




