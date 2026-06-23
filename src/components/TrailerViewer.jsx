import { Suspense, useRef, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF, Environment, Center } from '@react-three/drei'
import { applyDimensionDeformations } from '../utils/GeometryUtils'
import { useConfigurator } from '../context/ConfiguratorContext'

// ── raw feet helpers (match Blender node Factor input) ────────────────────────

const WIDTH_FT = { '7ft': 7, '8.5ft': 8.5 }

function getLengthFt(id) {
  return parseInt(id, 10)   // '26' → 26
}

const HEIGHT_FEET_MAP = {
  '7ft0': 7, '7ft6': 7.5, '8ft0': 8, '8ft6': 8.5,
  '9ft0': 9, '9ft6': 9.5, '10ft0': 10,
}
function getHeightFt(id) {
  return HEIGHT_FEET_MAP[id] ?? 7
}

// ── 3D model ──────────────────────────────────────────────────────────────────

function TrailerModel({ widthFt, lengthFt, heightFt }) {
  const { scene: baseScene }   = useGLTF('/models/Base.glb')
  const { scene: meshesScene } = useGLTF('/models/Base Meshes.glb')
  const store     = useRef(new Map())
  const loggedRef = useRef(false)

  useEffect(() => {
    if (!loggedRef.current) {
      loggedRef.current = true
      ;[baseScene, meshesScene].forEach((scene, si) => {
        scene.traverse((child) => {
          if (!child.isMesh || !child.geometry) return
          console.log(`[model ${si}] mesh "${child.name}" attributes:`, Object.keys(child.geometry.attributes))
        })
      })
    }
  }, [baseScene, meshesScene])

  useEffect(() => {
    // Compute global Z center once from original vertex positions across all meshes.
    // Per-mesh zCenter is wrong for wall panels (entire panel on one side) — inner
    // and outer faces end up on opposite sides of the local midpoint, so they get
    // pushed in opposite directions and the wall explodes in thickness.
    if (!store.current.has('_globalZCenter')) {
      let gMinZ = Infinity, gMaxZ = -Infinity
      let gMinX = Infinity, gMaxX = -Infinity
      ;[baseScene, meshesScene].forEach((scene) => {
        scene.traverse((child) => {
          if (!child.isMesh || !child.geometry?.attributes.position) return
          const pos = child.geometry.attributes.position
          for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i)
            const z = pos.getZ(i)
            if (z < gMinZ) gMinZ = z
            if (z > gMaxZ) gMaxZ = z
            if (x < gMinX) gMinX = x
            if (x > gMaxX) gMaxX = x
          }
        })
      })
      const gc = (gMinZ + gMaxZ) / 2
      store.current.set('_globalZCenter', gc)
      store.current.set('_globalXMin', gMinX)
      store.current.set('_globalXMax', gMaxX)
      console.log(`[TrailerModel] global Z center: ${gc.toFixed(4)}m | X span: ${gMinX.toFixed(3)}–${gMaxX.toFixed(3)}`)
    }
    const globalZCenter = store.current.get('_globalZCenter')
    const globalXMin    = store.current.get('_globalXMin')
    const globalXMax    = store.current.get('_globalXMax')

    console.group(`[TrailerModel] deform pass | width:${widthFt}ft length:${lengthFt}ft height:${heightFt}ft | globalZCenter:${globalZCenter.toFixed(4)}`)
    ;[baseScene, meshesScene].forEach((scene, si) => {
      scene.traverse((child) => {
        if (!child.isMesh || !child.geometry) return
        console.log(`  [mesh ${si}] "${child.name || child.uuid}" attrs:`, Object.keys(child.geometry.attributes))
        applyDimensionDeformations({
          geometry: child.geometry,
          store: store.current,
          uuid: child.uuid,
          meshName: child.name || child.uuid,
          widthFt,
          lengthFt,
          heightFt,
          globalZCenter,
          globalXMin,
          globalXMax,
        })
      })
    })
    console.groupEnd()
  }, [baseScene, meshesScene, widthFt, lengthFt, heightFt])

  return (
    <>
      <primitive object={baseScene} />
      <primitive object={meshesScene} />
    </>
  )
}

useGLTF.preload('/models/Base.glb')
useGLTF.preload('/models/Base Meshes.glb')


// ── viewer ────────────────────────────────────────────────────────────────────

export default function TrailerViewer() {
  const { width, length, interiorHeight } = useConfigurator()

  const widthFt  = WIDTH_FT[width]          ?? 7
  const lengthFt = getLengthFt(length)
  const heightFt = getHeightFt(interiorHeight)

  return (
    <div className="relative flex-1 flex flex-col min-h-0 pb-0 lg:pb-[72px]">
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
              camera={{ position: [0, 5, 25], fov: 50 }}
              style={{ width: '100%', height: '100%' }}
              gl={{ antialias: true }}
            >
              <ambientLight intensity={0.6} />
              <directionalLight position={[5, 5, 5]} intensity={1.2} castShadow />
              <directionalLight position={[-5, 3, -5]} intensity={0.4} />
              <Environment preset="city" />
              <Center>
                <TrailerModel
                  widthFt={widthFt}
                  lengthFt={lengthFt}
                  heightFt={heightFt}
                />
              </Center>
              <OrbitControls
                enablePan={true}
                minDistance={1.5}
                maxDistance={10}
                minPolarAngle={0.2}
                maxPolarAngle={Math.PI / 2}
              />
            </Canvas>
          </Suspense>
        </div>

      </div>

      {/* View controls — desktop only */}
      <div className="hidden lg:flex items-center justify-center mb-6 gap-3 py-5 lg:pr-[500px] xl:pr-[551px]">
        <button aria-label="360 View" className="w-11 h-9 flex items-center py-5 justify-center bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg hover:border-[#DA634B] transition-colors">
          <img src="/eyes.png" alt="" />
        </button>
        <button aria-label="Scenic View" className="w-11 h-9 flex items-center py-5 justify-center bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg hover:border-[#DA634B] transition-colors">
          <img src="/view.png" alt="" />
        </button>
        <button aria-label="Customize" className="w-11 h-9 flex items-center py-5 justify-center bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg hover:border-[#DA634B] transition-colors">
          <img src="/Dimension.png" alt="" />
        </button>
        <button className="flex items-center gap-2 px-5 py-3 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg text-sm font-semibold tracking-widest uppercase text-gray-300 hover:border-[#DA634B] hover:text-white transition-all">
          VIEW IN YOUR DRIVEWAY
        </button>
      </div>
    </div>
  )
}
