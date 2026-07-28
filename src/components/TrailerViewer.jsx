import '@google/model-viewer'
import { Suspense, useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { CameraControls, Stage, useEnvironment, ContactShadows, useGLTF, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { useConfigurator } from '../context/ConfiguratorContext'
import ModularTrailerModel from './ModularTrailerModel'
import { patchTriplanarMaterial } from '../utils/TriplanarMaterial'
import ModelDimensions from './ModelDimensions'
import QRModal from './QRModal'
import ModelReportPanel from './ModelReportPanel'
import { isAndroidDevice } from '../utils/arPlatform'
import { generateModelReport } from '../utils/modelReport'
// Helper to compute stable bounding box that ignores exterior accessories (like awnings)
// and exceptionally low meshes (like gooseneck jacks) from ground-level calculations.
function computeTrailerBounds(modelGroup) {
  const box = new THREE.Box3();
  const groundBox = new THREE.Box3();
  
  modelGroup.traverse((node) => {
    if (node.isMesh && node.visible) {
      const name = (node.name || '').toLowerCase();
      
      if (!node.geometry.boundingBox) node.geometry.computeBoundingBox();
      const nodeBox = node.geometry.boundingBox.clone();
      nodeBox.applyMatrix4(node.matrixWorld);
      
      if (!name.includes('awning')) {
        if (box.isEmpty()) box.copy(nodeBox);
        else box.union(nodeBox);
      }
      
      if (!name.includes('awning') && !name.includes('gooseneck')) {
        if (groundBox.isEmpty()) groundBox.copy(nodeBox);
        else groundBox.union(nodeBox);
      }
    }
  });
  
  if (box.isEmpty()) box.setFromObject(modelGroup);
  if (!groundBox.isEmpty()) box.min.y = groundBox.min.y;
  
  return box;
}

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
  // Add 15 inches (1.25 ft) offset to interior height to account for trailer structure
  return (HEIGHT_FEET_MAP[id] ?? 7) + 1.25
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

  

  if (included.length === 0) {
    console.error('[AR Export] exportGroup is EMPTY — no visible meshes found. Check modelGroupRef is populated.')
  }

  return new Promise((resolve, reject) => {
    new GLTFExporter().parse(exportGroup, resolve, reject, { binary: true })
  })
}

// ── camera fit — model always stays in canvas on resize ───────────────────────

function CameraFit({ modelGroupRef, cameraControlsRef, configKey, viewMode, groundYRef }) {
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
      cameraControlsRef.current.maxDistance = maxDim * 1.15
      if (groundYRef) groundYRef.current = bbox.min.y
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
      cameraControlsRef.current.maxDistance = maxDim * 1.15
      if (groundYRef) groundYRef.current = bbox.min.y
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


// ── ground clamp — prevents panning camera or target below model floor ─────────
// camera-controls' minY only clamps camera position; the pan target can still
// move below ground. This runs after every frame and smoothly corrects both.
//
// WHY LERP instead of hard setLookAt:
// A hard snap every frame creates a fighting loop — user pans down, clamp
// teleports up, controls re-apply the pan delta, repeat → visible jitter.
// Lerping toward the corrected position absorbs pan momentum gracefully.

function GroundClamp({ cameraControlsRef, viewMode, groundYRef }) {
  const pos = useRef(new THREE.Vector3())
  const target = useRef(new THREE.Vector3())
  const boundary = useRef(new THREE.Box3())
  const frameCount = useRef(0)

  useFrame(() => {
    if (viewMode === 'INTERIOR' || !cameraControlsRef.current) return

    const cc = cameraControlsRef.current
    const floor = groundYRef.current
    const minCamY = floor + 0.05

    // ── Layer 1: native target boundary (handled inside camera-controls) ────────
    // setBoundary clamps _targetEnd inside cc's own update loop before the frame
    // renders. Zero fighting, zero oscillation — the target simply can't go below
    // floor+0.3, so panning stops cleanly at that height.
    boundary.current.min.set(-Infinity, floor + 0.3, -Infinity)
    boundary.current.max.set(Infinity,  Infinity,     Infinity)
    cc.setBoundary(boundary.current)
    cc.minY = minCamY

    // ── Layer 2: safety-net for camera position (idle only) ──────────────────
    // setBoundary constrains the orbit target, not the camera position itself.
    // If a steep polar angle places the camera below floor, catch it here —
    // but only during idle (no active panning) to avoid fighting.
    cc.getPosition(pos.current)
    cc.getTarget(target.current)

    const EPSILON = 0.005
    const camViolation = pos.current.y < minCamY - EPSILON

    frameCount.current++
    // if (frameCount.current % 30 === 0) {
    //   console.log(
    //     '[GroundClamp]',
    //     `floor=${floor.toFixed(3)}  boundary.minY=${(floor + 0.3).toFixed(3)}`,
    //     `| camY=${pos.current.y.toFixed(4)}  targY=${target.current.y.toFixed(4)}`,
    //     `| camV=${camViolation}  cc.active=${cc.active}`
    //   )
    // }

    // Only apply position safety-net when not actively panning
    if (!camViolation || cc.active) return

    const correctedCamY = THREE.MathUtils.lerp(pos.current.y, minCamY, 0.1)

  
    cc.setLookAt(
      pos.current.x, correctedCamY, pos.current.z,
      target.current.x, target.current.y, target.current.z,
      false
    )
  })

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
        // Save existing angle/distance constraints so we can restore them on exit
        minPolarAngle: cameraControlsRef.current.minPolarAngle,
        maxPolarAngle: cameraControlsRef.current.maxPolarAngle,
        minAzimuthAngle: cameraControlsRef.current.minAzimuthAngle,
        maxAzimuthAngle: cameraControlsRef.current.maxAzimuthAngle,
        minDistance: cameraControlsRef.current.minDistance,
        maxDistance: cameraControlsRef.current.maxDistance,
        minY: cameraControlsRef.current.minY,
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

      // Calculate bounding box excluding exterior accessories (like awnings) 
      // and gooseneck jacks that artificially expand the bounds.
      const box = computeTrailerBounds(modelGroupRef.current);

      const center = box.getCenter(new THREE.Vector3())
      const size = box.getSize(new THREE.Vector3())

      const isLongX = size.x >= size.z
      const eyeY = box.min.y + size.y * 0.55

      if (isLongX) {
        targetPosition = new THREE.Vector3(center.x - size.x * 0.15, eyeY, center.z)
      } else {
        targetPosition = new THREE.Vector3(center.x, eyeY, center.z - size.z * 0.15)
      }

      // ── Orbit Pivot ──────────────────────────────────────────────
      // Place the orbit target at the center of the trailer. This allows 
      // you to zoom in (dolly) towards the center of the room, though it means 
      // dragging will now orbit around the center rather than turning your head in place.
      targetLookAt = center.clone()

      targetFov = 75

      const interiorLength = isLongX ? size.x : size.z

      // ── Distance limits ──────────────────────────────────────────────────────
      // Very tight: user can zoom in/out within a small range around the pivot
      cameraControlsRef.current.minDistance = 0.01
      cameraControlsRef.current.maxDistance = interiorLength * 0.5
      cameraControlsRef.current.minY = -Infinity

      // ── Polar angle clamp ────────────────────────────────────────────────────
      // Prevent the camera from tilting through the floor or ceiling.
      // Math.PI * 0.15  ≈ 27° from zenith  (can't look straight up past ceiling)
      // Math.PI * 0.85  ≈ 27° from nadir   (can't look straight down through floor)
      cameraControlsRef.current.minPolarAngle = Math.PI * 0.15
      cameraControlsRef.current.maxPolarAngle = Math.PI * 0.85

      // ── Azimuth clamp — no restriction ──────────────────────────────────────
      // Full 360° horizontal look-around is fine inside the model.
      cameraControlsRef.current.minAzimuthAngle = -Infinity
      cameraControlsRef.current.maxAzimuthAngle = Infinity
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

        // Restore all saved constraints
        cameraControlsRef.current.minPolarAngle   = savedExteriorRef.current.minPolarAngle
        cameraControlsRef.current.maxPolarAngle   = savedExteriorRef.current.maxPolarAngle
        cameraControlsRef.current.minAzimuthAngle = savedExteriorRef.current.minAzimuthAngle
        cameraControlsRef.current.maxAzimuthAngle = savedExteriorRef.current.maxAzimuthAngle
        // Always clear minY on return to exterior — GroundClamp owns floor logic
        cameraControlsRef.current.minY            = -Infinity

        // Restore zoom limits for exterior
        const box = computeTrailerBounds(modelGroupRef.current);
        const size = box.getSize(new THREE.Vector3())
        const maxDim = Math.max(size.x, size.y, size.z)
        cameraControlsRef.current.minDistance = maxDim * 0.1
        cameraControlsRef.current.maxDistance = maxDim * 1.15
      } else {
        const box = computeTrailerBounds(modelGroupRef.current);
        const center = box.getCenter(new THREE.Vector3())
        const size = box.getSize(new THREE.Vector3())
        const maxDim = Math.max(size.x, size.y, size.z)
        const distance = maxDim * 1.8
        targetPosition = new THREE.Vector3(center.x + distance * 0.5, center.y + distance * 0.6, center.z + distance)
        targetLookAt = center.clone()
        targetFov = 35

        // Restore zoom limits for exterior
        cameraControlsRef.current.minDistance = maxDim * 0.1
        cameraControlsRef.current.maxDistance = maxDim * 1.15

        // Restore default angle constraints
        cameraControlsRef.current.minPolarAngle   = 0
        cameraControlsRef.current.maxPolarAngle   = Math.PI / 2
        cameraControlsRef.current.minAzimuthAngle = -Infinity
        cameraControlsRef.current.maxAzimuthAngle = Infinity
        // minY intentionally NOT set — GroundClamp handles floor boundary
        // smoothly via lerp. A hard minY here creates a snap "wall" that
        // fights the lerp correction and causes jitter.
        cameraControlsRef.current.minY            = -Infinity
      }
    }

    let cancelled = false

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

    // Changing material sides (DoubleSide <-> FrontSide) forces Three.js to recompile shaders.
    // This blocks the main thread for several hundred milliseconds on the first switch.
    // If we start the time-based camera animation before the blocking render, the delta time
    // will jump past the 0.2s duration, causing the camera to instantly snap to the target.
    // We defer the animation by a couple of frames to let the heavy render complete first.
    requestAnimationFrame(() => {
      if (cancelled) return
      requestAnimationFrame(() => {
        if (cancelled || !cameraControlsRef.current) return

        cameraControlsRef.current.smoothTime = 0.2
        cameraControlsRef.current.setLookAt(
          targetPosition.x, targetPosition.y, targetPosition.z,
          targetLookAt.x, targetLookAt.y, targetLookAt.z,
          true
        ).then(() => {
          if (!cancelled) setIsTransitioning(false)
        })

        const animateFov = () => {
          if (cancelled) return
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
      })
    })

    return () => {
      cancelled = true
    }
  }, [viewMode]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}

// ── shadow setup ───────────────────────────────────────────────────────────────

// Marks every model mesh as a shadow caster/receiver every frame.
// Must run unconditionally (no early-exit) because triplanar onBeforeCompile
// patches reset the internal shadow program state on material recompile.
function ShadowCasterSetup({ modelRef }) {
  useFrame(() => {
    if (!modelRef.current) return
    modelRef.current.traverse((o) => {
      if (o.isMesh) {
        // Prevent glass/transmissive objects from casting solid black shadows
        if (o.material && o.material.transmission > 0) {
          o.castShadow = false
        } else {
          o.castShadow = true
        }
        o.receiveShadow = true
      }
    })
  })
  return null
}

// Positions a directional light above the model and dynamically fits its
// ortho-frustum to the model's bounding box every frame, so the shadow map
// always fully captures the trailer regardless of its current size.
// Also manages a dedicated shadow-receiver plane placed at the model floor.
function ShadowLightSetup({ modelRef }) {
  const lightRef = useRef()
  const floorRef = useRef()
  const frameCount = useRef(0)
  const lastMinY = useRef(null)
  const boundsRef = useRef(new THREE.Box3())
  const centerRef = useRef(new THREE.Vector3())
  const sizeRef = useRef(new THREE.Vector3())

  useFrame(({ gl }) => {
    frameCount.current++
    const light = lightRef.current
    if (!light || !modelRef.current) return

    // one-time diagnostic
    

    let hasMeshes = false
    modelRef.current.traverse(o => { if (o.isMesh) hasMeshes = true })
    if (!hasMeshes) return

    const bbox = computeTrailerBounds(modelRef.current)
    boundsRef.current.copy(bbox)
    const center = centerRef.current
    const size = sizeRef.current
    bbox.getCenter(center)
    bbox.getSize(size)

   
    // position floor plane at model bottom each time it changes
    if (floorRef.current && lastMinY.current !== bbox.min.y) {
      lastMinY.current = bbox.min.y
      floorRef.current.position.set(center.x, bbox.min.y - 0.001, center.z)
      
    }

    // Keep the shadow light centered so the front and rear halves of the
    // trailer receive the same shadow coverage from every viewing angle.
    const lightHeight = bbox.max.y + Math.max(size.x, size.z) * 1.5
    light.position.set(center.x, lightHeight, center.z)
    light.target.position.copy(center)
    light.target.updateMatrixWorld()

    // fit ortho frustum to model footprint + padding
    const pad = Math.max(size.x, size.z) * 0.6
    light.shadow.camera.left   = -(size.x / 2 + pad)
    light.shadow.camera.right  =   size.x / 2 + pad
    light.shadow.camera.top    =   size.z / 2 + pad
    light.shadow.camera.bottom = -(size.z / 2 + pad)
    light.shadow.camera.near   = 0.1
    light.shadow.camera.far    = lightHeight + Math.abs(bbox.min.y) + 5
    light.shadow.camera.updateProjectionMatrix()
    light.shadow.needsUpdate = true

    if (frameCount.current === 1) {
      // console.log('[Shadow] light pos:', light.position, '| target:', center)
      // console.log('[Shadow] frustum L/R/T/B:',
      //   light.shadow.camera.left.toFixed(2), light.shadow.camera.right.toFixed(2),
      //   light.shadow.camera.top.toFixed(2), light.shadow.camera.bottom.toFixed(2)
      // )
      
    }
  })

  return (
    <>
      <directionalLight
        ref={lightRef}
        castShadow
        intensity={1.2}
        position={[15, 25, 10]}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0005}
      />
      {/* Dedicated shadow-receiver floor plane — ShadowMaterial is transparent
          everywhere except where the directional light's shadow map projects.
          Positioned at model floor level by the useFrame above. */}
      <mesh
  ref={floorRef}
  receiveShadow
  renderOrder={2}
  rotation={[-Math.PI / 2, 0, 0]}
  position={[0, -0.001, 0]}
>
  <planeGeometry args={[80, 80]} />
  <shadowMaterial transparent opacity={0.45} depthWrite={false} />
</mesh>
    </>
  )
}



function DynamicContactShadow({ modelRef }) {
  const shadowRef = useRef()
  const boundsRef = useRef(new THREE.Box3())
  const centerRef = useRef(new THREE.Vector3())
  const sizeRef = useRef(new THREE.Vector3())
  
  useFrame(() => {
    if (!shadowRef.current || !modelRef?.current) return
    let hasMeshes = false
    modelRef.current.traverse(o => { if (o.isMesh) hasMeshes = true })
    if (!hasMeshes) return

    const bbox = computeTrailerBounds(modelRef.current)
    boundsRef.current.copy(bbox)
    const center = centerRef.current
    const size = sizeRef.current
    bbox.getCenter(center)
    bbox.getSize(size)
    const shadowSpan = Math.max(size.x, size.z)
    
    // Position contact shadow slightly above the ground plane
    shadowRef.current.position.set(center.x, bbox.min.y - 0.001, center.z)
    shadowRef.current.scale.setScalar(Math.max(20, shadowSpan * 1.35))
  })

  return (
    <ContactShadows
      ref={shadowRef}
      frames={Infinity}
      opacity={0.75}
      scale={40}
      blur={2}
      far={16}
      resolution={1024}
      color="#000000"
    />
  )
}

function CameraLayerSetup() {
  const { camera } = useThree()
  useEffect(() => {
    camera.layers.enable(1)
  }, [camera])
  return null
}

// ── ground model ───────────────────────────────────────────────────────────────

function GroundModel({ modelRef }) {
  const { scene } = useGLTF('/models/Ground.glb')
  const [colorMap, opacityMap] = useTexture([
    '/Ground Color.jpg',
    '/Ground Opacity.jpg'
  ])
  const groundRef = useRef()
  const boundsRef = useRef(new THREE.Box3())
  const centerRef = useRef(new THREE.Vector3())
  const sizeRef = useRef(new THREE.Vector3())
  const baseFootprintRef = useRef(null) // ground mesh's native XZ footprint, captured once

  useEffect(() => {
    if (!baseFootprintRef.current) {
      const baseBounds = new THREE.Box3().setFromObject(scene)
      const baseSize = new THREE.Vector3()
      baseBounds.getSize(baseSize)
      baseFootprintRef.current = Math.max(baseSize.x, baseSize.z) || 1
    }

    if (colorMap) {
      colorMap.colorSpace = THREE.SRGBColorSpace
      colorMap.flipY = false
      colorMap.wrapS = THREE.RepeatWrapping
      colorMap.wrapT = THREE.RepeatWrapping
      colorMap.repeat.set(10, 10)
      colorMap.anisotropy = 16
      colorMap.needsUpdate = true
    }
    if (opacityMap) {
      opacityMap.colorSpace = THREE.NoColorSpace
      opacityMap.flipY = false
      opacityMap.wrapS = THREE.RepeatWrapping
      opacityMap.wrapT = THREE.RepeatWrapping
      opacityMap.needsUpdate = true
    }

    const baseMaterial = new THREE.MeshBasicMaterial({
      map: colorMap,
      alphaMap: opacityMap,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    const patchedMaterial = patchTriplanarMaterial(baseMaterial, 10 / baseFootprintRef.current)
    patchedMaterial.needsUpdate = true

    scene.traverse((child) => {
      if (child.isMesh) {
        child.material = patchedMaterial   // shared instance across all ground meshes
        child.receiveShadow = false
        child.renderOrder = 0   // draws first
      }
    })
  }, [scene, colorMap, opacityMap])

  useFrame(() => {
    if (!groundRef.current || !modelRef?.current) return
    let hasMeshes = false
    modelRef.current.traverse(o => { if (o.isMesh) hasMeshes = true })
    if (!hasMeshes) return

    const bbox = computeTrailerBounds(modelRef.current)
    boundsRef.current.copy(bbox)
    const center = centerRef.current
    const size = sizeRef.current
    bbox.getCenter(center)
    bbox.getSize(size)

    // Position ground slightly below the shadow material plane (which is at bbox.min.y - 0.001)
    groundRef.current.position.set(center.x, bbox.min.y - 0.002, center.z)

    // Scale the ground footprint so it always extends comfortably past the
    // trailer's current XZ footprint, whatever configuration is active.
    // Because the triplanar patch samples using world position, scaling the
    // mesh changes tiling density correctly rather than stretching the UVs.
    if (baseFootprintRef.current) {
      const margin = 1.08 // keep ground just larger than the trailer footprint
      const desired = Math.max(size.x, size.z) * margin
      const scale = desired / baseFootprintRef.current
      groundRef.current.scale.set(scale, 1, scale)
    }
  })

  return <primitive ref={groundRef} object={scene} />
}

useGLTF.preload('/models/Ground.glb')

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

function ShaderPrecompiler({ modelGroupRef }) {
  const { gl, scene, camera } = useThree()
  const hasPrecompiled = useRef(false)

  useFrame(() => {
    if (hasPrecompiled.current || !modelGroupRef.current) return
    let hasMeshes = false
    modelGroupRef.current.traverse(o => { if (o.isMesh) hasMeshes = true })
    if (!hasMeshes) return

    hasPrecompiled.current = true

    // Delay a bit to let the initial scene render
    setTimeout(() => {
      const originalSides = new Map()
      modelGroupRef.current.traverse(node => {
        if (node.isMesh && node.material) {
          originalSides.set(node.uuid, node.material.side)
          node.material.side = THREE.DoubleSide
          node.material.needsUpdate = true
        }
      })

      gl.compile(scene, camera)

      modelGroupRef.current.traverse(node => {
        if (node.isMesh && node.material && originalSides.has(node.uuid)) {
          node.material.side = originalSides.get(node.uuid)
          node.material.needsUpdate = true
        }
      })
    }, 500)
  })

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
  const [environment, setEnvironment] = useState('/trailer_hdri.hdr')
  const [showEnvironment, setShowEnvironment] = useState(false)
  const [showGround, setShowGround] = useState(true)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const nameTimerRef = useRef(null)
  const modelGroupRef = useRef()
  const cameraControlsRef = useRef()
  const arViewerRef = useRef()
  const modelReportRef = useRef(null)
  const groundYRef = useRef(0)

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
    
    modelGroupRef.current.traverse(o => {
      if (o.isMesh) console.log(`  mesh: ${o.name || '(unnamed)'}  visible=${o.visible}`)
    })
    setArExporting(true)
    try {
      const result = await parseGLB(modelGroupRef.current)
      
      const blob = new Blob([result], { type: 'model/gltf-binary' })
      const url = URL.createObjectURL(blob)
      
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
      // console.log('[gltfreport] Generating report...')
      try {
        const glbBuffer = await parseGLB(modelGroupRef.current)
        const report = await generateModelReport(glbBuffer, modelGroupRef.current, `trailer-${lengthFt}ft-${widthFt}ft.glb`)
        setModelReport(report)
        // console.log('[gltfreport] Done')
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
                environment={null}
                shadows={false}
                center={{ disable: isHdr }}
                adjustCamera={false}
              >
                <ambientLight intensity={isHdr ? 0.6 : 0.3} />
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

              {/* Separate Environment with Y-scale to bring ceiling reflections into view */}
              <ScaledEnvironment environment={environment} scaleY={1.5} offsetZ={0.14} intensity={0.5} />

              {/* Dynamic shadow system that follows the trailer's actual size */}
              <ShadowCasterSetup modelRef={modelGroupRef} />
              <ShadowLightSetup modelRef={modelGroupRef} />

              {/* Ground model loaded from public/models/Ground.glb */}
              {showGround && <GroundModel modelRef={modelGroupRef} />}
              
              {/* Soft drop shadow instead of harsh directional shadow */}
              <DynamicContactShadow modelRef={modelGroupRef} />

              {showDimensions && (
                <ModelDimensions groupRef={modelGroupRef} />
              )}
              <CameraFit
                modelGroupRef={modelGroupRef}
                cameraControlsRef={cameraControlsRef}
                configKey={configKey}
                viewMode={viewMode}
                groundYRef={groundYRef}
              />
              <GroundClamp
                cameraControlsRef={cameraControlsRef}
                viewMode={viewMode}
                groundYRef={groundYRef}
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
                maxPolarAngle={Math.PI / 2}
                dollySpeed={1}
                draggingSmoothTime={0.4}
              />
              <CameraLayerSetup />
              <ShaderPrecompiler modelGroupRef={modelGroupRef} />
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
          {/* <button 
            aria-label="Scenic View" 
            onClick={() => setEnvironment(prev => prev === 'city' ? '/trailer_hdri.exr' : '/trailer_hdri.exr')}
            className={`w-11 h-9 flex items-center justify-center bg-[#2a2a2a] rounded-lg transition-colors border ${isHdr ? 'border-[#DA634B]' : 'border-[#3a3a3a] hover:border-[#DA634B]'}`}
          >
            <img src="/view.png" alt="" />
          </button> */}
          {/* <button
            aria-label="Toggle Environment"
            onClick={() => setShowEnvironment(prev => !prev)}
            className={`w-11 h-9 flex items-center justify-center bg-[#2a2a2a] rounded-lg transition-colors border ${showEnvironment ? 'border-[#DA634B]' : 'border-[#3a3a3a] hover:border-[#DA634B]'}`}
          >
            <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2 20h20M4 20c0-4.418 3.582-8 8-8s8 3.582 8 8M12 4a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
          </button> */}
          <button
            aria-label="Toggle Dimensions"
            onClick={() => setShowDimensions(prev => !prev)}
            className={`w-11 h-9 flex items-center justify-center bg-[#2a2a2a] rounded-lg transition-colors border ${showDimensions ? 'border-[#DA634B]' : 'border-[#3a3a3a] hover:border-[#DA634B]'}`}
          >
            <img src="/Dimension.png" alt="" />
          </button>
          {/* <button
            aria-label="Toggle Ground"
            onClick={() => setShowGround(prev => !prev)}
            className={`w-11 h-9 flex items-center justify-center bg-[#2a2a2a] rounded-lg transition-colors border ${showGround ? 'border-[#DA634B]' : 'border-[#3a3a3a] hover:border-[#DA634B]'}`}
          >
            <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" strokeWidth="1.9" viewBox="0 0 24 24">
              {showGround ? (
                <>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 19h16" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 15l3-6 3 4 2-3 4 5" />
                </>
              ) : (
                <>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 19h16" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 15l3-6 3 4 2-3 4 5" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 5l14 14" />
                </>
              )}
            </svg>
          </button> */}
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
        shadow-intensity="1"
        className="fixed top-0 left-0 w-px h-px opacity-0 pointer-events-none"
      />
      {modelReport && (
        <ModelReportPanel report={modelReport} onClose={() => setModelReport(null)} />
      )}
    </div>
  )
})

/**
 * Renders the HDRI onto an inverted sphere with compressed Y-axis,
 * then generates a PMREM environment map from the result.
 * scaleY < 1 squishes vertically → ceiling becomes visible in reflections.
 */
function ScaledEnvironment({ environment, scaleY = 1.5, offsetY = 0.14, intensity = 1.0 }) {
  const { gl, scene } = useThree()
  const isHdr = environment?.endsWith('.hdr') || environment?.endsWith('.exr')
  const texture = useEnvironment(isHdr ? { files: environment } : { preset: environment })

  useEffect(() => {
    if (!texture) return

    const envScene = new THREE.Scene()
    const geo = new THREE.SphereGeometry(100, 64, 64)
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        envMap: { value: texture },
        scaleY: { value: scaleY },
        offsetY: { value: offsetY },   // ← new
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D envMap;
        uniform float scaleY;
        uniform float offsetY;
        varying vec3 vWorldPos;
        #define PI 3.14159265359
        void main() {
          vec3 dir = normalize(vWorldPos);
          // Match Blender Mapping node (Point): output = input*scale + location
          dir.y = dir.y * scaleY + offsetY;
          dir = normalize(dir);
          float u = atan(dir.z, dir.x) / (2.0 * PI) + 0.5;
          float v = asin(clamp(dir.y, -1.0, 1.0)) / PI + 0.5;
          gl_FragColor = texture2D(envMap, vec2(u, v));
        }
      `,
      side: THREE.BackSide,
    })
    envScene.add(new THREE.Mesh(geo, mat))

    const pmrem = new THREE.PMREMGenerator(gl)
    const envMap = pmrem.fromScene(envScene, 0, 0.1, 1000).texture
    scene.environment = envMap
    scene.environmentIntensity = intensity

    geo.dispose()
    mat.dispose()
    pmrem.dispose()

    return () => {
      envMap.dispose()
      scene.environment = null
    }
  }, [texture, scaleY, offsetY, gl, scene])   // ← add offsetY to deps

  return null
}

export default TrailerViewer

