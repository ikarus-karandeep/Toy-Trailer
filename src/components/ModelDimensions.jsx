import { useRef, useState, useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { Line2 } from 'three/examples/jsm/lines/Line2.js'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'

const M_TO_FT = 3.28084
const OFFSET = 0.5
const CAM_THRESHOLD = 0.05
const ANIM_SPEED = 1.5  // completes in ~0.67s

const _childBox = new THREE.Box3()
const _box = new THREE.Box3()
const _center = new THREE.Vector3()
const _size = new THREE.Vector3()
const _dir = new THREE.Vector3()

function easeOut(t) {
  return 1 - Math.pow(1 - t, 3)
}

function formatFt(ft) {
  return `${Math.round(ft * 100) / 100}'`
}

function computeDims(group, camera) {
  _box.makeEmpty()
  group.traverseVisible((child) => {
    if (!child.isMesh || !child.geometry) return
    if (!child.geometry.boundingBox) child.geometry.computeBoundingBox()
    _childBox.copy(child.geometry.boundingBox).applyMatrix4(child.matrixWorld)
    _box.union(_childBox)
  })
  if (_box.isEmpty()) return null

  _box.getCenter(_center)
  _box.getSize(_size)
  _dir.copy(camera.position).sub(_center)

  const { min, max } = _box
  const zXAxis = _dir.z > 0 ? max.z + OFFSET : min.z - OFFSET
  const xYAxis = _dir.x > 0 ? max.x + OFFSET : min.x - OFFSET
  const zYAxis = _dir.z > 0 ? max.z + OFFSET : min.z - OFFSET
  const xZAxis = _dir.x > 0 ? max.x + OFFSET : min.x - OFFSET
  const bottomY = min.y

  return {
    length: {
      start: [min.x, bottomY, zXAxis],
      end:   [max.x, bottomY, zXAxis],
      ft: _size.x * M_TO_FT, label: 'length', axis: 'x',
    },
    height: {
      start: [xYAxis, min.y, zYAxis],
      end:   [xYAxis, max.y, zYAxis],
      ft: _size.y * M_TO_FT, label: 'height', axis: 'y',
    },
    width: {
      start: [xZAxis, bottomY, min.z],
      end:   [xZAxis, bottomY, max.z],
      ft: _size.z * M_TO_FT, label: 'wide', axis: 'z',
    },
  }
}

const CONE_ROTATIONS = {
  x: { start: [0, 0,  Math.PI / 2], end: [0, 0, -Math.PI / 2] },
  y: { start: [Math.PI, 0, 0],       end: [0, 0, 0] },
  z: { start: [-Math.PI / 2, 0, 0], end: [Math.PI / 2, 0, 0] },
}

function ArrowCone({ position, axis, tip, innerRef }) {
  const defaultRef = useRef()
  const meshRef = innerRef || defaultRef

  useFrame(({ camera, size }) => {
    if (!meshRef.current) return
    const dist = camera.position.distanceTo(meshRef.current.position)
    const fov = (camera.fov * Math.PI) / 180
    const wupp = (2 * dist * Math.tan(fov / 2)) / size.height
    meshRef.current.scale.setScalar(8 * wupp)
  })

  return (
    <mesh ref={meshRef} position={position} rotation={CONE_ROTATIONS[axis][tip]}>
      <coneGeometry args={[0.5, 2, 8]} />
      <meshBasicMaterial color="white" />
    </mesh>
  )
}

function DimAxis({ dimKey, axis, dimsRef }) {
  const { size } = useThree()
  const progressRef = useRef(0)
  const labelRef = useRef(null)
  const labelTextNodeRef = useRef(null)
  const labelTypeRef = useRef(null)
  const geoRef = useRef(null)
  const matRef = useRef(null)
  const startConeRef = useRef(null)
  const endConeRef = useRef(null)
  const htmlGroupRef = useRef(null)

  // Create Line2 once on mount — managed entirely imperatively to avoid
  // conflict between React prop updates and frame-by-frame animation.
  const lineObj = useMemo(() => {
    const geo = new LineGeometry()
    geo.setPositions([0, 0, 0, 0, 0, 0])
    const mat = new LineMaterial({ color: 'white', linewidth: 2, worldUnits: false })
    const l = new Line2(geo, mat)
    l.computeLineDistances()
    geoRef.current = geo
    matRef.current = mat
    return l
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => {
    geoRef.current?.dispose()
    matRef.current?.dispose()
  }, [])

  useEffect(() => {
    if (matRef.current) matRef.current.resolution.set(size.width, size.height)
  }, [size.width, size.height])

  useFrame((_, delta) => {
    const d = dimsRef.current?.[dimKey]
    if (!d) return
    const { start, end, ft, label } = d

    if (labelTypeRef.current !== label) {
      labelTypeRef.current = label
      if (labelTextNodeRef.current) labelTextNodeRef.current.textContent = ' ' + label
    }

    if (progressRef.current < 1) {
      progressRef.current = Math.min(1, progressRef.current + delta * ANIM_SPEED)
      const p = easeOut(progressRef.current)

      const curEnd = [
        start[0] + (end[0] - start[0]) * p,
        start[1] + (end[1] - start[1]) * p,
        start[2] + (end[2] - start[2]) * p,
      ]

      geoRef.current.setPositions([
        start[0], start[1], start[2],
        ...curEnd
      ])
      lineObj.computeLineDistances()

      if (labelRef.current) labelRef.current.textContent = formatFt(ft * p)

      if (startConeRef.current) startConeRef.current.position.set(...start)
      if (endConeRef.current) endConeRef.current.position.set(...curEnd)
      if (htmlGroupRef.current) {
        htmlGroupRef.current.position.set(
          (start[0] + curEnd[0]) / 2,
          (start[1] + curEnd[1]) / 2,
          (start[2] + curEnd[2]) / 2
        )
      }
    } else {
      geoRef.current.setPositions([
        start[0], start[1], start[2],
        ...end
      ])
      lineObj.computeLineDistances()

      if (labelRef.current) labelRef.current.textContent = formatFt(ft)
      
      if (startConeRef.current) startConeRef.current.position.set(...start)
      if (endConeRef.current) endConeRef.current.position.set(...end)
      if (htmlGroupRef.current) {
        htmlGroupRef.current.position.set(
          (start[0] + end[0]) / 2,
          (start[1] + end[1]) / 2,
          (start[2] + end[2]) / 2
        )
      }
    }
  })

  return (
    <>
      <primitive object={lineObj} />
      <ArrowCone position={[0,0,0]} axis={axis} tip="start" innerRef={startConeRef} />
      <ArrowCone position={[0,0,0]} axis={axis} tip="end" innerRef={endConeRef} />
      <group ref={htmlGroupRef} position={[0,0,0]}>
        <Html zIndexRange={[100, 0]} center>
          <div className="px-2 py-0.5 bg-white/90 rounded text-xs font-semibold text-gray-900 whitespace-nowrap pointer-events-none select-none">
            <span ref={labelRef}>{formatFt(0)}</span><span ref={labelTextNodeRef}></span>
          </div>
        </Html>
      </group>
    </>
  )
}

export default function ModelDimensions({ groupRef }) {
  const dimsRef = useRef(null)
  const [hasDims, setHasDims] = useState(false)
  const lastCamRef = useRef(new THREE.Vector3(Infinity, 0, 0))
  const lastSizeRef = useRef(new THREE.Vector3())

  useFrame(({ camera }) => {
    if (!groupRef.current) return
    const d = computeDims(groupRef.current, camera)
    
    if (!d) {
        if (hasDims) setHasDims(false)
        return
    }

    const camMoved = camera.position.distanceTo(lastCamRef.current) >= CAM_THRESHOLD
    const modelResized = !lastSizeRef.current.equals(_size)
    
    if (camMoved || modelResized) {
      lastCamRef.current.copy(camera.position)
      lastSizeRef.current.copy(_size)
      dimsRef.current = d
    }
    
    if (!hasDims) setHasDims(true)
  })

  if (!hasDims) return null

  return (
    <>
      <DimAxis key="length" dimKey="length" axis="x" dimsRef={dimsRef} />
      <DimAxis key="height" dimKey="height" axis="y" dimsRef={dimsRef} />
      <DimAxis key="width"  dimKey="width"  axis="z" dimsRef={dimsRef} />
    </>
  )
}
