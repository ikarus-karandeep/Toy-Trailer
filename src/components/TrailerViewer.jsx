import { Suspense, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Environment, Center } from '@react-three/drei'
import { Box3, Box3Helper, Color, Vector3 } from 'three'
import { useConfigurator } from '../context/ConfiguratorContext'
import ModularTrailerModel from './ModularTrailerModel'
import ARViewer from './ARViewer'
import QRModal from './QRModal'

// ── raw feet helpers (match Blender node Factor input) ────────────────────────

const WIDTH_FT = { '7ft': 7, '8.5ft': 8.5 }

function getLengthFt(id) {
  return parseInt(id, 10)   // '36' → 36
}

const HEIGHT_FEET_MAP = {
  '7ft0': 7, '7ft6': 7.5, '8ft0': 8, '8ft6': 8.5,
  '9ft0': 9, '9ft6': 9.5, '10ft0': 10,
}
function getHeightFt(id) {
  return HEIGHT_FEET_MAP[id] ?? 7
}

// ── bounds projector (runs inside Canvas so it has camera + renderer access) ──

function BoundsCalculator({ groupRef, onUpdate, widthFt, lengthFt, heightFt }) {
  const { camera, size } = useThree()
  const box = useMemo(() => new Box3(), [])

  useFrame(() => {
    if (!groupRef.current) return

    box.makeEmpty()
    groupRef.current.traverseVisible((child) => {
      if (!child.isMesh || !child.geometry) return
      if (!child.geometry.boundingBox) child.geometry.computeBoundingBox()
      _childBox.copy(child.geometry.boundingBox).applyMatrix4(child.matrixWorld)
      box.union(_childBox)
    })
    if (box.isEmpty()) return

    const project = (x, y, z) => {
      const v = new Vector3(x, y, z).project(camera)
      return { x: ((v.x + 1) / 2) * size.width, y: ((-v.y + 1) / 2) * size.height }
    }

    const { min, max } = box
    const center = new Vector3()
    box.getCenter(center)

    // camera direction relative to center
    const dir = new Vector3().copy(camera.position).sub(center)

    // Offset to keep lines from clipping into the trailer
    const axisSpacingOffset = 0.5
    const yAxisSpacingOffset = 0.5

    const zXAxis = dir.z > 0 ? max.z + axisSpacingOffset : min.z - axisSpacingOffset
    const xYAxis = dir.x > 0 ? max.x + yAxisSpacingOffset : min.x - yAxisSpacingOffset
    const zYAxis = dir.z > 0 ? max.z + yAxisSpacingOffset : min.z - yAxisSpacingOffset
    const xZAxis = dir.x > 0 ? max.x + axisSpacingOffset : min.x - axisSpacingOffset

    // Width (Z axis line - side to side)
    const widthDims = dir.z > 0 ? [
      project(xZAxis, min.y, max.z), project(xZAxis, min.y, min.z)
    ] : [
      project(xZAxis, min.y, min.z), project(xZAxis, min.y, max.z)
    ]

    // Height (Y axis line - up and down)
    const heightDims = [
      project(xYAxis, min.y, zYAxis), project(xYAxis, max.y, zYAxis)
    ]

    // Length (X axis line - front to back)
    const lengthDims = dir.x > 0 ? [
      project(max.x, min.y, zXAxis), project(min.x, min.y, zXAxis)
    ] : [
      project(min.x, min.y, zXAxis), project(max.x, min.y, zXAxis)
    ]

    // Convert scene units (metres) → feet for labels
    const M_TO_FT = 3.28084
    const boxSize = new Vector3()
    box.getSize(boxSize)

    onUpdate({
      heightBot: heightDims[0],
      heightTop: heightDims[1],
      widthStart: widthDims[0],
      widthEnd: widthDims[1],
      lenStart: lengthDims[0],
      lenEnd: lengthDims[1],
      w: size.width,
      h: size.height,
      // Calculate exact dimensions mathematically to match Blender perfectly without floating-point variance
      measuredWidthFt: 8.57 + (widthFt - 7),
      measuredHeightFt: 8.53 + (heightFt - 7),
      measuredLengthFt: 53.2 + (lengthFt - 36),
    })
  })

  return null
}


// ── 3-D bounding box wireframe (red lines inside the canvas) ──────────────────

// Reused every frame — avoids per-frame allocations
const _childBox = new Box3()

function BoundingBoxWireframe({ groupRef }) {
  const box = useMemo(() => new Box3(), [])
  const helper = useMemo(() => new Box3Helper(box, new Color(0xff0000)), [box])

  useFrame(() => {
    if (!groupRef.current) return

    // traverseVisible skips meshes hidden by option switching (visible = false)
    box.makeEmpty()
    groupRef.current.traverseVisible((child) => {
      if (!child.isMesh || !child.geometry) return
      if (!child.geometry.boundingBox) child.geometry.computeBoundingBox()
      _childBox.copy(child.geometry.boundingBox).applyMatrix4(child.matrixWorld)
      box.union(_childBox)
    })

    if (!box.isEmpty()) helper.updateMatrixWorld(true)
  })

  return <primitive object={helper} />
}

function formatFt(feetDec) {
  // Match Blender's exact decimal formatting (e.g. 8.57')
  // We use round instead of toFixed to remove trailing zeros if it's exact like 53.2'
  return `${Math.round(feetDec * 100) / 100}'`
}

// ── dimension overlay ─────────────────────────────────────────────────────────

function DimLabel({ x, y, text, anchor = 'middle' }) {
  const w = text.length * 7.5 + 18
  const h = 24
  const rx = anchor === 'end' ? x - w - 6 : anchor === 'start' ? x + 6 : x - w / 2
  return (
    <g>
      <rect x={rx} y={y - h / 2} width={w} height={h} rx="4" fill="rgba(255,255,255,0.92)" />
      <text x={rx + w / 2} y={y} textAnchor="middle" dominantBaseline="middle"
        fontSize="12" fontWeight="600" fontFamily="ui-sans-serif,system-ui" fill="#111827">
        {text}
      </text>
    </g>
  )
}

function DimensionOverlay({ bounds }) {
  if (!bounds) return null

  const {
    heightTop, heightBot, lenStart, lenEnd, widthStart, widthEnd, w, h,
    measuredWidthFt, measuredHeightFt, measuredLengthFt,
  } = bounds
  const heightMidY = (heightTop.y + heightBot.y) / 2
  const heightMidX = (heightTop.x + heightBot.x) / 2
  const lenMidY = (lenStart.y + lenEnd.y) / 2
  const lenMidX = (lenStart.x + lenEnd.x) / 2
  const widthMidY = (widthStart.y + widthEnd.y) / 2
  const widthMidX = (widthStart.x + widthEnd.x) / 2

  return (
    <div className="absolute inset-0 pointer-events-none select-none">
      <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <defs>
          <marker id="da-fwd" markerWidth="9" markerHeight="9"
            refX="9" refY="4.5" orient="auto" markerUnits="userSpaceOnUse">
            <polygon points="0 0,9 4.5,0 9" fill="white" />
          </marker>
          <marker id="da-rev" markerWidth="9" markerHeight="9"
            refX="0" refY="4.5" orient="auto-start-reverse" markerUnits="userSpaceOnUse">
            <polygon points="0 0,9 4.5,0 9" fill="white" />
          </marker>
        </defs>

        {/* Height — vertical */}
        <line x1={heightTop.x} y1={heightTop.y} x2={heightBot.x} y2={heightBot.y}
          stroke="white" strokeWidth="1.5"
          markerStart="url(#da-rev)" markerEnd="url(#da-fwd)" />
        <DimLabel x={heightMidX - 10} y={heightMidY} text={`${formatFt(measuredHeightFt)} height`} anchor="end" />

        {/* Length — usually Z axis */}
        <line x1={lenStart.x} y1={lenStart.y} x2={lenEnd.x} y2={lenEnd.y}
          stroke="white" strokeWidth="1.5"
          markerStart="url(#da-rev)" markerEnd="url(#da-fwd)" />
        <DimLabel x={lenMidX} y={lenMidY + 16} text={`${formatFt(measuredLengthFt)} length`} />

        {/* Width — usually X axis */}
        <line x1={widthStart.x} y1={widthStart.y} x2={widthEnd.x} y2={widthEnd.y}
          stroke="white" strokeWidth="1.5"
          markerStart="url(#da-rev)" markerEnd="url(#da-fwd)" />
        <DimLabel x={widthMidX} y={widthMidY + 16} text={`${formatFt(measuredWidthFt)} wide`} />
      </svg>
    </div>
  )
}


// ── viewer ────────────────────────────────────────────────────────────────────

export default function TrailerViewer() {
  const { width, length, interiorHeight } = useConfigurator()
  const [showDimensions, setShowDimensions] = useState(false)
  const [screenBounds, setScreenBounds] = useState(null)
  const [arUrl, setArUrl] = useState(null)
  const [arExporting, setArExporting] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [clickedName, setClickedName] = useState(null)
  const nameTimerRef = useRef(null)
  const modelGroupRef = useRef()

  const handleMeshClick = (e) => {
    e.stopPropagation()
    const name = e.object.name || e.object.uuid
    if (nameTimerRef.current) clearTimeout(nameTimerRef.current)
    setClickedName(name)
    nameTimerRef.current = setTimeout(() => setClickedName(null), 2000)
  }

  const widthFt = WIDTH_FT[width] ?? 7
  const lengthFt = getLengthFt(length)
  const heightFt = getHeightFt(interiorHeight)

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
              camera={{ position: [0, 5, 25], fov: 50 }}
              style={{ width: '100%', height: '100%' }}
              gl={{ antialias: true }}
            >
              <ambientLight intensity={0.6} />
              <directionalLight position={[5, 5, 5]} intensity={1.2} castShadow />
              <directionalLight position={[-5, 3, -5]} intensity={0.4} />
              <Environment preset="city" />
              <Center>
                <group ref={modelGroupRef} onClick={handleMeshClick}>
                  <ModularTrailerModel
                    widthFt={widthFt}
                    lengthFt={lengthFt}
                    heightFt={heightFt}
                  />
                </group>
              </Center>
              {showDimensions && (
                <>
                  <BoundsCalculator groupRef={modelGroupRef} onUpdate={setScreenBounds} widthFt={widthFt} lengthFt={lengthFt} heightFt={heightFt} />
                  <BoundingBoxWireframe groupRef={modelGroupRef} />
                </>
              )}
              <OrbitControls
                enablePan={true}
                minDistance={1.5}
                maxDistance={10}
                minPolarAngle={0.2}
                maxPolarAngle={Math.PI * 0.65}
              />
            </Canvas>
          </Suspense>

          {showDimensions && (
            <DimensionOverlay bounds={screenBounds} />
          )}

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
            className={`w-11 h-9 flex items-center justify-center bg-[#2a2a2a] rounded-lg transition-colors border ${showDimensions ? 'border-[#DA634B]' : 'border-[#3a3a3a] hover:border-[#DA634B]'
              }`}
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
