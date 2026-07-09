import '@google/model-viewer'
import { Suspense, useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { CameraControls, Stage } from '@react-three/drei'
import * as THREE from 'three'
import { useConfigurator } from '../context/ConfiguratorContext'
import ModularTrailerModel from './ModularTrailerModel'
import ModelDimensions from './ModelDimensions'
import QRModal from './QRModal'
import ModelReportPanel from './ModelReportPanel'
import { isAndroidDevice } from '../utils/arPlatform'
import { generateModelReport } from '../utils/modelReport'
import { HDRIBox } from './HDRIBox'

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

function CameraFit({ modelGroupRef, cameraControlsRef, configKey, viewMode }) {
  const { camera, size } = useThree()
  const cameraInitRef = useRef(false)
  const lastBboxRef = useRef(null)
  // Tracks the model center from the previous frame during a size-change lerp
  const lastCenterRef = useRef(new THREE.Vector3())
  // True while the model is still lerping to a new size
  const isTrackingRef = useRef(false)
  // Mirror of viewMode prop so useFrame can read it without stale closure
  const viewModeRef = useRef(viewMode)
  useEffect(() => { viewModeRef.current = viewMode }, [viewMode])

  useEffect(() => {
    // Don't touch the camera while inside the model — CameraController owns it
    if (viewModeRef.current === 'INTERIOR') return
    if (!modelGroupRef.current || !cameraControlsRef.current) return
    let hasMeshes = false
    modelGroupRef.current.traverse((o) => { if (o.isMesh) hasMeshes = true })
    if (!hasMeshes) return

    if (!cameraInitRef.current) {
      // First load: fit camera immediately — model geometry is already at rest
      const bbox = new THREE.Box3().setFromObject(modelGroupRef.current)
      const bboxSize = new THREE.Vector3()
      bbox.getSize(bboxSize)
      const maxDim = Math.max(bboxSize.x, bboxSize.y, bboxSize.z)
      cameraControlsRef.current.minDistance = maxDim * 0.1
      cameraControlsRef.current.maxDistance = maxDim * 9999
      cameraControlsRef.current.fitToBox(modelGroupRef.current, false, { paddingLeft: 1, paddingRight: 1, paddingBottom: 1, paddingTop: 1 })
      cameraInitRef.current = true
      const initCenter = new THREE.Vector3()
      bbox.getCenter(initCenter)
      lastCenterRef.current.copy(initCenter)
      lastBboxRef.current = bbox.clone()
      return
    }

    // Size changed: cancel any residual drag inertia immediately, then let
    // useFrame smoothly track the model center as it lerps each frame.
    const currentPos = new THREE.Vector3()
    const currentTarget = new THREE.Vector3()
    cameraControlsRef.current.getPosition(currentPos)
    cameraControlsRef.current.getTarget(currentTarget)
    cameraControlsRef.current.setLookAt(
      currentPos.x, currentPos.y, currentPos.z,
      currentTarget.x, currentTarget.y, currentTarget.z,
      false  // synchronous snap — clears queued inertia
    )

    // Seed lastCenter with the current (pre-lerp) model center
    const seedBbox = new THREE.Box3().setFromObject(modelGroupRef.current)
    seedBbox.getCenter(lastCenterRef.current)

    isTrackingRef.current = true
  }, [configKey])  // eslint-disable-line react-hooks/exhaustive-deps

  // Every frame while isTrackingRef is true: measure how much the model
  // center moved this frame and pan the camera by the same delta.
  // No animation easing needed — running every frame IS the smooth movement.
  useFrame(() => {
    if (!isTrackingRef.current) return
    // Stop tracking if user switched to INTERIOR while lerp was in progress
    if (viewModeRef.current === 'INTERIOR') { isTrackingRef.current = false; return }
    if (!modelGroupRef.current || !cameraControlsRef.current) return

    const bbox = new THREE.Box3().setFromObject(modelGroupRef.current)
    const newCenter = new THREE.Vector3()
    bbox.getCenter(newCenter)

    const dx = newCenter.x - lastCenterRef.current.x
    const dy = newCenter.y - lastCenterRef.current.y
    const dz = newCenter.z - lastCenterRef.current.z
    const moved = Math.abs(dx) + Math.abs(dy) + Math.abs(dz)

    if (moved > 0.0001) {
      // Model is still lerping — pan camera by the same delta this frame
      const currentTarget = new THREE.Vector3()
      cameraControlsRef.current.getTarget(currentTarget)
      const currentPos = new THREE.Vector3()
      cameraControlsRef.current.getPosition(currentPos)

      cameraControlsRef.current.setLookAt(
        currentPos.x + dx, currentPos.y + dy, currentPos.z + dz,
        currentTarget.x + dx, currentTarget.y + dy, currentTarget.z + dz,
        false  // no easing — we apply it every frame, so it's already smooth
      )
    } else {
      // Lerp complete — update distance limits and stop tracking
      const bboxSize = new THREE.Vector3()
      bbox.getSize(bboxSize)
      const maxDim = Math.max(bboxSize.x, bboxSize.y, bboxSize.z)
      cameraControlsRef.current.minDistance = maxDim * 0.1
      cameraControlsRef.current.maxDistance = maxDim * 9999
      lastBboxRef.current = bbox.clone()
      isTrackingRef.current = false
    }

    lastCenterRef.current.copy(newCenter)
  })

  useEffect(() => {
    if (!lastBboxRef.current || !camera.isPerspectiveCamera || !cameraControlsRef.current) return
    // CameraControls automatically adjusts aspect ratio.
  }, [size.width, size.height]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}


// ── interior / exterior camera controller ─────────────────────────────────────

function CameraController({ viewMode, modelGroupRef, cameraControlsRef, setIsTransitioning }) {
  const { camera } = useThree()
  const hasInitializedRef = useRef(false)
  const savedExteriorRef = useRef(null)

  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true
      return
    }
    if (!cameraControlsRef.current || !modelGroupRef.current) return

    let hasMeshes = false
    modelGroupRef.current.traverse(o => { if (o.isMesh) hasMeshes = true })
    if (!hasMeshes) return

    let targetPosition, targetLookAt, targetFov

    if (viewMode === 'INTERIOR') {
      const currentPos = new THREE.Vector3()
      const currentTarget = new THREE.Vector3()
      cameraControlsRef.current.getPosition(currentPos)
      cameraControlsRef.current.getTarget(currentTarget)

      savedExteriorRef.current = {
        position: currentPos,
        target: currentTarget,
        fov: camera.fov,
      }

      // Material swapping
      modelGroupRef.current.traverse((node) => {
        if (node.isMesh && node.material) {
          if (node.material.userData.originalSide === undefined) {
            node.material.userData.originalSide = node.material.side;
          }
          node.material.side = THREE.DoubleSide;
        }
      });

      const box = new THREE.Box3().setFromObject(modelGroupRef.current)
      const center = box.getCenter(new THREE.Vector3())
      const size = box.getSize(new THREE.Vector3())
      
      const isLongX = size.x >= size.z
      const eyeY = box.min.y + size.y * 0.55

      if (isLongX) {
        targetPosition = new THREE.Vector3(center.x - size.x * 0.25, eyeY, center.z)
        targetLookAt = new THREE.Vector3(center.x, eyeY, center.z)
      } else {
        targetPosition = new THREE.Vector3(center.x, eyeY, center.z - size.z * 0.25)
        targetLookAt = new THREE.Vector3(center.x, eyeY, center.z)
      }
      targetFov = 75

      const interiorLength = isLongX ? size.x : size.z
      cameraControlsRef.current.minDistance = interiorLength * 0.05
      cameraControlsRef.current.maxDistance = interiorLength * 0.7
    } else {
      // Restore exterior materials
      modelGroupRef.current.traverse((node) => {
        if (node.isMesh && node.material && node.material.userData.originalSide !== undefined) {
          node.material.side = node.material.userData.originalSide;
        }
      });

      if (savedExteriorRef.current) {
        const { position, target, fov } = savedExteriorRef.current
        targetPosition = position
        targetLookAt = target
        targetFov = fov
        
        // Restore zoom limits for exterior
        const box = new THREE.Box3().setFromObject(modelGroupRef.current)
        const size = box.getSize(new THREE.Vector3())
        const maxDim = Math.max(size.x, size.y, size.z)
        cameraControlsRef.current.minDistance = maxDim * 0.1
        cameraControlsRef.current.maxDistance = maxDim * 9999
      } else {
        const box = new THREE.Box3().setFromObject(modelGroupRef.current)
        const center = box.getCenter(new THREE.Vector3())
        const size = box.getSize(new THREE.Vector3())
        const maxDim = Math.max(size.x, size.y, size.z)
        const distance = maxDim * 1.8
        targetPosition = new THREE.Vector3(center.x + distance * 0.5, center.y + distance * 0.6, center.z + distance)
        targetLookAt = center.clone()
        targetFov = 35
        
        // Restore zoom limits for exterior
        cameraControlsRef.current.minDistance = maxDim * 0.1
        cameraControlsRef.current.maxDistance = maxDim * 9999
      }
    }

    setIsTransitioning(true)

    // Cancel any in-progress drag inertia by snapping controls to their
    // current position synchronously (no animation), then immediately
    // animate to the new target. Without this step, accumulated rotation
    // deltas from manual orbiting would replay during the transition.
    const snapPos = new THREE.Vector3()
    const snapTarget = new THREE.Vector3()
    cameraControlsRef.current.getPosition(snapPos)
    cameraControlsRef.current.getTarget(snapTarget)
    cameraControlsRef.current.setLookAt(
      snapPos.x, snapPos.y, snapPos.z,
      snapTarget.x, snapTarget.y, snapTarget.z,
      false  // no animation — cancels any queued inertia
    )

    cameraControlsRef.current.smoothTime = 0.4
    cameraControlsRef.current.setLookAt(
      targetPosition.x, targetPosition.y, targetPosition.z,
      targetLookAt.x, targetLookAt.y, targetLookAt.z,
      true
    ).then(() => {
      setIsTransitioning(false)
    })

    const animateFov = () => {
      if (Math.abs(camera.fov - targetFov) > 0.3) {
        camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 0.08)
        camera.updateProjectionMatrix()
        requestAnimationFrame(animateFov)
      } else {
        camera.fov = targetFov
        camera.updateProjectionMatrix()
      }
    }
    animateFov()
  }, [viewMode]) // eslint-disable-line react-hooks/exhaustive-deps

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
  const { width, length, interiorHeight, showDimensions, setShowDimensions, viewMode } = useConfigurator()
  const [arUrl, setArUrl] = useState(null)
  const [arExporting, setArExporting] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [showARPrompt, setShowARPrompt] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [clickedName, setClickedName] = useState(null)
  const [modelReport, setModelReport] = useState(null)
  const [environment, setEnvironment] = useState('/trailer_hdri.exr')
  const [showEnvironment, setShowEnvironment] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const nameTimerRef = useRef(null)
  const modelGroupRef = useRef()
  const cameraControlsRef = useRef()
  const arViewerRef = useRef()
  const modelReportRef = useRef(null)

  // const handleMeshClick = (e) => {
  //   e.stopPropagation()
  //   const name = e.object.name || e.object.uuid
  //   if (nameTimerRef.current) clearTimeout(nameTimerRef.current)
  //   setClickedName(name)
  //   nameTimerRef.current = setTimeout(() => setClickedName(null), 2000)
  // }

  const widthFt = WIDTH_FT[width] ?? 8.5
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

  const isHdr = environment.endsWith('.hdr') || environment.endsWith('.exr')
  const stageEnvironment = isHdr
    ? {
        files: environment,
        background: false,
      }
    : {
        preset: environment,
        background: false,
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
              camera={{ fov: 35 }}
              style={{ width: '100%', height: '100%' }}
              gl={{
                antialias: true,
                // outputColorSpace: THREE.SRGBColorSpace,
                // toneMapping: THREE.ACESFilmicToneMapping,
                // toneMappingExposure: 1.0,
              }}
            >
              <Stage
                intensity={0.6}
                environment={stageEnvironment}
                shadows={isHdr ? false : { type: 'contact', opacity: 0.2, blur: 3 }}
                center={{ disable: isHdr }}
                adjustCamera={false}
              >
                {/* <ambientLight intensity={isHdr ? 0.4 : 0.1} /> */}
                <group ref={modelGroupRef}>
                  <ModularTrailerModel
                    widthFt={widthFt}
                    lengthFt={lengthFt}
                    heightFt={heightFt}
                    environment={environment}
                  />
                </group>
                {onModelReady && (
                  <SceneReadyNotifier meshRef={modelGroupRef} onReady={onModelReady} />
                )}
              </Stage>
              {showEnvironment && <HDRIBox environment={environment} modelPath="/Projection Mesh.glb" height={2.062} scale={1.0} envRotation={0} envOffset={[0, 0]} position={[0, 0, 0]} />}
              {showDimensions && (
                <ModelDimensions groupRef={modelGroupRef} />
              )}
              <CameraFit
                modelGroupRef={modelGroupRef}
                cameraControlsRef={cameraControlsRef}
                configKey={configKey}
                viewMode={viewMode}
              />
              <CameraController
                viewMode={viewMode}
                modelGroupRef={modelGroupRef}
                cameraControlsRef={cameraControlsRef}
                setIsTransitioning={setIsTransitioning}
              />
              <CameraControls
                ref={cameraControlsRef}
                enabled={!isTransitioning}
                minPolarAngle={0.2}
                maxPolarAngle={Math.PI * 0.52}
                dollySpeed={1}
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
          <button 
            aria-label="Scenic View" 
            onClick={() => setEnvironment(prev => prev === 'city' ? '/trailer_hdri.exr' : '/trailer_hdri.exr')}
            className={`w-11 h-9 flex items-center justify-center bg-[#2a2a2a] rounded-lg transition-colors border ${isHdr ? 'border-[#DA634B]' : 'border-[#3a3a3a] hover:border-[#DA634B]'}`}
          >
            <img src="/view.png" alt="" />
          </button>
          <button
            aria-label="Toggle Environment"
            onClick={() => setShowEnvironment(prev => !prev)}
            className={`w-11 h-9 flex items-center justify-center bg-[#2a2a2a] rounded-lg transition-colors border ${showEnvironment ? 'border-[#DA634B]' : 'border-[#3a3a3a] hover:border-[#DA634B]'}`}
          >
            <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2 20h20M4 20c0-4.418 3.582-8 8-8s8 3.582 8 8M12 4a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
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
          {/* <button
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
          </button> */}
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
