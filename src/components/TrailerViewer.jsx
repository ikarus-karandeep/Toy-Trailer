import '@google/model-viewer'
import { Suspense, useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stage } from '@react-three/drei'
import * as THREE from 'three'
import { useConfigurator } from '../context/ConfiguratorContext'
import ModularTrailerModel from './ModularTrailerModel'
import ModelDimensions from './ModelDimensions'
import QRModal from './QRModal'
import ModelReportPanel from './ModelReportPanel'
import { isAndroidDevice } from '../utils/arPlatform'
import { generateModelReport } from '../utils/modelReport'

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

async function parseGLB(mesh) {
  const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js')

  const exportGroup = new THREE.Group()
  mesh.updateWorldMatrix(true, true)

  const skipped = []
  const included = []

  mesh.traverse(child => {
    if (!child.isMesh) return

    // Walk the ancestor chain to determine effective visibility
    let visible = true
    let invisibleAncestor = null
    let node = child
    while (node) {
      if (!node.visible) { visible = false; invisibleAncestor = node.name || node.type; break }
      node = node.parent
    }

    if (!visible) {
      skipped.push({ name: child.name, reason: `ancestor "${invisibleAncestor}" is hidden` })
      return
    }

    child.updateWorldMatrix(true, false)

    if (child.isInstancedMesh) {
      const cloned = new THREE.InstancedMesh(child.geometry.clone(), child.material, child.count)
      const m = new THREE.Matrix4()
      for (let i = 0; i < child.count; i++) {
        child.getMatrixAt(i, m)
        m.premultiply(child.matrixWorld)
        cloned.setMatrixAt(i, m)
      }
      cloned.instanceMatrix.needsUpdate = true
      cloned.name = child.name
      exportGroup.add(cloned)
      included.push({ name: child.name, type: 'InstancedMesh', count: child.count })
    } else {
      const clonedGeo = child.geometry.clone()
      clonedGeo.applyMatrix4(child.matrixWorld)
      const cloned = new THREE.Mesh(clonedGeo, child.material)
      cloned.name = child.name
      exportGroup.add(cloned)
      included.push({ name: child.name, type: 'Mesh' })
    }
  })

  console.group('[AR Export] parseGLB summary')
  console.log('Total meshes included:', included.length)
  console.log('Total meshes skipped:', skipped.length)
  console.log('Included:', included.map(m => m.name))
  console.log('Skipped (hidden):', skipped.map(m => `${m.name} — ${m.reason}`))
  console.groupEnd()

  if (included.length === 0) {
    console.error('[AR Export] exportGroup is EMPTY — no visible meshes found. Check modelGroupRef is populated.')
  }

  return new Promise((resolve, reject) => {
    new GLTFExporter().parse(exportGroup, resolve, reject, { binary: true })
  })
}

// ── camera fit — model always stays in canvas on resize ───────────────────────

function CameraFit({ modelGroupRef, orbitControlsRef, configKey }) {
  const { camera, size } = useThree()
  const lastBboxRef = useRef(null)
  const cameraInitRef = useRef(false)
  const bboxNeedsRescanRef = useRef(true)
  const pendingRef = useRef(0)

  // On model resize: rescan bbox and re-center camera on the new model
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

    if (isFirstLoad) {
      camera.position.set(center.x, center.y, center.z + fitDist)
      if (orbitControlsRef.current) {
        orbitControlsRef.current.target.copy(center)
        orbitControlsRef.current.minDistance = maxDim * 0.1
        orbitControlsRef.current.maxDistance = maxDim * 3
        orbitControlsRef.current.update()
      }
    } else if (orbitControlsRef.current) {
      // Shift camera and target by the same X delta — no zoom, just slides to new center
      const deltaX = center.x - orbitControlsRef.current.target.x
      camera.position.x += deltaX
      orbitControlsRef.current.target.x = center.x
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

function SceneReadyNotifier({ meshRef, onReady }) {
  const triggered = useRef(false)
  useEffect(() => {
    if (triggered.current) return
    // Poll every frame until the group has actual meshes — handles both
    // procedural (immediate) and async-loaded (delayed) model types.
    const check = () => {
      if (triggered.current) return
      if (!meshRef.current) { requestAnimationFrame(check); return }
      let hasMeshes = false
      meshRef.current.traverse(o => { if (o.isMesh) hasMeshes = true })
      if (hasMeshes) {
        triggered.current = true
        onReady(meshRef.current)
      } else {
        requestAnimationFrame(check)
      }
    }
    requestAnimationFrame(check)
  }, [meshRef, onReady])
  return null
}

const TrailerViewer = forwardRef(function TrailerViewer({ onModelReady, fullscreen, onToggleFullscreen }, ref) {
  const { width, length, interiorHeight, showDimensions, setShowDimensions } = useConfigurator()
  const [arUrl, setArUrl] = useState(null)
  const [arExporting, setArExporting] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [showARPrompt, setShowARPrompt] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [clickedName, setClickedName] = useState(null)
  const [modelReport, setModelReport] = useState(null)
  const nameTimerRef = useRef(null)
  const modelGroupRef = useRef()
  const orbitControlsRef = useRef()
  const arViewerRef = useRef()
  const modelReportRef = useRef(null)

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
    console.log('[AR Export] handleOpenAR called — modelGroupRef.current:', modelGroupRef.current)
    if (!modelGroupRef.current) { console.error('[AR Export] modelGroupRef.current is null — aborting'); return }
    if (arExporting) { console.warn('[AR Export] already exporting, skipping'); return }
    const childCount = modelGroupRef.current.children.length
    console.log('[AR Export] modelGroupRef children count:', childCount)
    modelGroupRef.current.traverse(o => {
      if (o.isMesh) console.log(`  mesh: ${o.name || '(unnamed)'}  visible=${o.visible}`)
    })
    setArExporting(true)
    try {
      const result = await parseGLB(modelGroupRef.current)
      console.log('[AR Export] GLB result type:', typeof result, 'byteLength:', result?.byteLength)
      const blob = new Blob([result], { type: 'model/gltf-binary' })
      const url = URL.createObjectURL(blob)
      console.log('[AR Export] blob URL created:', url)
      setArUrl(url)
      setShowQR(false)
    } catch (err) {
      console.error('[AR Export] export error:', err)
    } finally {
      setArExporting(false)
    }
  }

  useImperativeHandle(ref, () => ({
    openARViewer: handleOpenAR,
  }))

  // Auto-activate AR on the hidden model-viewer once the GLB blob URL is ready
  useEffect(() => {
    if (!arUrl) return
    const viewer = arViewerRef.current
    if (!viewer) return
    const handleLoad = () => {
      viewer.removeEventListener('load', handleLoad)
      if (viewer.canActivateAR) {
        if (isAndroidDevice()) {
          setShowARPrompt(true)
        } else {
          viewer.activateAR()
        }
      }
    }
    viewer.addEventListener('load', handleLoad)
    viewer.setAttribute('src', arUrl)
    return () => viewer.removeEventListener('load', handleLoad)
  }, [arUrl])

  const handleDownload = async () => {
    if (!modelGroupRef.current || downloading) return
    setDownloading(true)
    try {
      const result = await parseGLB(modelGroupRef.current)
      const blob = new Blob([result], { type: 'model/gltf-binary' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `trailer-${lengthFt}ft-${widthFt}ft.glb`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download error:', err)
    } finally {
      setDownloading(false)
    }
  }

  useEffect(() => { modelReportRef.current = modelReport }, [modelReport])

  useEffect(() => {
    window.gltfreport = async () => {
      if (modelReportRef.current) { setModelReport(null); return }
      if (!modelGroupRef.current) { console.warn('[gltfreport] Model not ready'); return }
      console.log('[gltfreport] Generating report...')
      try {
        const glbBuffer = await parseGLB(modelGroupRef.current)
        const report = await generateModelReport(glbBuffer, modelGroupRef.current, `trailer-${lengthFt}ft-${widthFt}ft.glb`)
        setModelReport(report)
        console.log('[gltfreport] Done')
      } catch (err) {
        console.error('[gltfreport] Error:', err)
      }
    }
    return () => { delete window.gltfreport }
  }, [])

  const handleCloseQR = () => setShowQR(false)

  const handleCloseAR = () => {
    if (arUrl) URL.revokeObjectURL(arUrl)
    setArUrl(null)
    setShowARPrompt(false)
  }

  const handleOpenFromPrompt = () => {
    const viewer = arViewerRef.current
    if (viewer?.canActivateAR) viewer.activateAR()
  }

  return (
    <div className="relative flex-1 flex flex-col min-h-0">
      <div className="relative flex-1 min-h-0">
        <div className="absolute inset-0">
          <Suspense
            fallback={
              <div className="flex items-center justify-center w-full h-full">
                <img src="/loader.gif" alt="Loading" className="w-24 h-24" />
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
                preset="rembrandt"
                shadows={{ type: 'contact', opacity: 0.2, blur: 3 }}
                environment="city"
                adjustCamera={false}
              >
                <group ref={modelGroupRef}>
                  <ModularTrailerModel
                    widthFt={widthFt}
                    lengthFt={lengthFt}
                    heightFt={heightFt}
                  />
                </group>
                {onModelReady && (
                  <SceneReadyNotifier meshRef={modelGroupRef} onReady={onModelReady} />
                )}
              </Stage>
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
          <button
            aria-label="Toggle Fullscreen"
            onClick={onToggleFullscreen}
            className={`w-11 h-9 flex items-center justify-center bg-[#2a2a2a] rounded-lg transition-colors border ${fullscreen ? 'border-[#DA634B]' : 'border-[#3a3a3a] hover:border-[#DA634B]'}`}
          >
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
      {showARPrompt && (
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
                onClick={() => setShowARPrompt(false)}
                className="h-12 rounded-full bg-white/10 text-white text-sm font-semibold hover:bg-white/15 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleOpenFromPrompt}
                className="h-12 rounded-full bg-[#5a5a5a] text-white text-sm font-semibold hover:bg-[#686868] transition-colors"
              >
                View in AR
              </button>
            </div>
          </div>
        </div>
      )}
      <model-viewer
        ref={arViewerRef}
        ar
        ar-modes={isAndroidDevice() ? 'webxr' : 'quick-look webxr'}
        reveal="auto"
        className="fixed top-0 left-0 w-px h-px opacity-0 pointer-events-none"
      />
      {modelReport && (
        <ModelReportPanel report={modelReport} onClose={() => setModelReport(null)} />
      )}
    </div>
  )
})

export default TrailerViewer
