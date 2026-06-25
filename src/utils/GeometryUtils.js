/**
 * geometryUtils.js
 * Reusable geometry deformation utilities for Blender Geometry Node setups
 */

// ─── Core: store original vertex positions ────────────────────────────────────

/**
 * Caches original vertex positions for a mesh (call once on first run)
 * @param {Map} store - shared Map/ref object to store originals
 * @param {string} uuid - mesh uuid
 * @param {Float32Array} positionArray - geometry.attributes.position.array
 */
export function cacheOriginalPositions(store, uuid, positionArray) {
  if (!store.has(uuid)) {
    store.set(uuid, positionArray.slice())
  }
}

/**
 * Returns cached original positions for a mesh
 * @param {Map} store
 * @param {string} uuid
 * @returns {Float32Array|null}
 */
export function getOriginalPositions(store, uuid) {
  return store.get(uuid) ?? null
}


// ─── Move Node: apply delta offset along an axis with an optional selection ───

/**
 * Mirrors a Blender "Move" node: shifts vertices along an axis,
 * weighted by a selection attribute and a factor.
 *
 * @param {Object} params
 * @param {Float32Array}         params.original         - cached original position array
 * @param {THREE.BufferAttribute} params.position        - live position attribute (will be mutated)
 * @param {THREE.BufferAttribute|null} params.selection  - per-vertex selection weight attribute (getX)
 * @param {boolean}              params.useSelection     - whether to apply selection weighting
 * @param {'X'|'Y'|'Z'}         params.axis             - axis to move along
 * @param {number}               params.baseOffset       - constant delta offset (from node)
 * @param {number}               params.factor           - multiplier applied to inputValue
 * @param {number}               params.inputValue       - group input value (e.g. trailerWidth)
 */
export function applyMoveNode({
  original,
  position,
  selection,
  useSelection,
  axis,
  baseOffset,
  factor,
  inputValue,
}) {
  const delta = baseOffset + factor * inputValue
  const axisIndex = { X: 0, Y: 1, Z: 2 }[axis]

  for (let i = 0; i < position.count; i++) {
    const ox = original[i * 3]
    const oy = original[i * 3 + 1]
    const oz = original[i * 3 + 2]

    const weight = (useSelection && selection) ? selection.getX(i) : 1.0

    const offset = delta * weight
    const nx = ox + (axisIndex === 0 ? offset : 0)
    const ny = oy + (axisIndex === 1 ? offset : 0)
    const nz = oz + (axisIndex === 2 ? offset : 0)

    position.setXYZ(i, nx, ny, nz)
  }

  position.needsUpdate = true
}


// ─── Compound: apply multiple Move nodes in sequence ─────────────────────────

/**
 * Applies a chain of Move nodes to a single geometry.
 * Each node definition maps directly to the Blender node parameters.
 *
 * @param {Object} params
 * @param {THREE.BufferGeometry} params.geometry
 * @param {Map}                  params.store         - originalPositions ref map
 * @param {string}               params.uuid          - mesh uuid
 * @param {Array<MoveNodeDef>}   params.nodes         - array of node definitions
 *
 * @typedef {Object} MoveNodeDef
 * @property {string}          selectionAttribute    - geometry attribute name for selection
 * @property {boolean}         useSelection
 * @property {'X'|'Y'|'Z'}    axis
 * @property {number}          baseOffset
 * @property {number}          factor
 * @property {number}          inputValue
 */
export function applyMoveNodeChain({ geometry, store, uuid, nodes }) {
  const position = geometry.attributes.position
  if (!position) return

  // Cache originals from current position on first call
  cacheOriginalPositions(store, uuid, position.array)
  const original = getOriginalPositions(store, uuid)

  // Reset to originals before applying chain
  position.array.set(original)

  for (const node of nodes) {
    const selection = geometry.attributes[node.selectionAttribute] ?? null
    applyMoveNode({
      original: position.array.slice(), // snapshot after each node
      position,
      selection,
      useSelection: node.useSelection,
      axis: node.axis,
      baseOffset: node.baseOffset,
      factor: node.factor,
      inputValue: node.inputValue,
    })
  }

  geometry.computeVertexNormals()
}


// ─── Combined dimension deformation (width + length + height in one pass) ─────

// Base dimensions — the model is exported at these values (rest state = zero delta)
const BASE_WIDTH_FT  = 8
const BASE_LENGTH_FT = 26
const BASE_HEIGHT_FT = 6 + 7 / 12   // 6'7"
const FEET_TO_M      = 0.305         // matches the Blender "Feet to Meter" node

/**
 * Applies width, length, and height deformations in a single vertex pass.
 * Inputs are raw feet values matching the Blender Geometry Nodes Factor input.
 * Deltas are computed as (targetFt − baseFt) × 0.305 — identical to the node graph.
 *
 * Vertex attributes expected in the GLB:
 *   width  → _leftselection, _rightselection   (Z axis)
 *   length → _rearselection                    (X axis — rear moves, front stays)
 *   height → _topselection                     (Y axis — ceiling rises, floor stays)
 *
 * @param {Object} params
 * @param {THREE.BufferGeometry} params.geometry
 * @param {Map}    params.store
 * @param {string} params.uuid
 * @param {string} params.meshName
 * @param {number} params.widthFt   - target width  in feet (e.g. 6 or 8)
 * @param {number} params.lengthFt  - target length in feet (e.g. 26–34)
 * @param {number} params.heightFt  - target height in feet (e.g. 6.58–10.5)
 */
export function applyDimensionDeformations({ geometry, store, uuid, meshName, widthFt, lengthFt, heightFt, globalZCenter, globalXMin, globalXMax }) {
  const position = geometry.attributes.position
  if (!position) {
    console.warn(`[deform] "${meshName}" — SKIP: no position attribute`)
    return
  }

  // Feet → meter deltas  (same arithmetic as the Blender node)
  const deltaWidth  = (widthFt  - BASE_WIDTH_FT)  * FEET_TO_M  // negative = narrowing
  const deltaLength = (lengthFt - BASE_LENGTH_FT) * FEET_TO_M  // positive = extending rear
  const deltaHeight = (heightFt - BASE_HEIGHT_FT) * FEET_TO_M  // positive = raising ceiling

  cacheOriginalPositions(store, uuid, position.array)
  const original = getOriginalPositions(store, uuid)
  const count = position.count

  // Bounding box from originals — never recomputed from deformed positions
  let minX = Infinity, maxX = -Infinity
  let minY = Infinity, maxY = -Infinity
  let minZ = Infinity, maxZ = -Infinity
  for (let i = 0; i < count; i++) {
    const ox = original[i * 3], oy = original[i * 3 + 1], oz = original[i * 3 + 2]
    if (ox < minX) minX = ox; if (ox > maxX) maxX = ox
    if (oy < minY) minY = oy; if (oy > maxY) maxY = oy
    if (oz < minZ) minZ = oz; if (oz > maxZ) maxZ = oz
  }
  const xCenter = (minX + maxX) / 2, xRange = (maxX - minX) / 2
  // Use globalZCenter when provided — per-mesh zCenter is wrong for wall panels
  // that sit entirely on one side: inner/outer faces straddle the local midpoint
  // and get pushed in opposite directions, exploding wall thickness.
  const meshZCenter = (minZ + maxZ) / 2
  const zCenter = globalZCenter !== undefined ? globalZCenter : meshZCenter
  const zRange  = (maxZ - minZ) / 2
  const yRange  = maxY - minY

  const leftSel  = geometry.attributes._leftselection
  const rightSel = geometry.attributes._rightselection
  const rearSel  = geometry.attributes._rearselection
  const topSel   = geometry.attributes._topselection

  // ── Per-mesh attribute diagnostics (logged once) ─────────────────────────────
  if (!store.has(`_logged_${uuid}`)) {
    store.set(`_logged_${uuid}`, true)

    const selStats = (attr, label) => {
      if (!attr) return `${label}:MISSING`
      let minW = Infinity, maxW = -Infinity, nonZero = 0
      for (let i = 0; i < attr.count; i++) {
        const v = attr.getX(i)
        if (v < minW) minW = v
        if (v > maxW) maxW = v
        if (v > 0) nonZero++
      }
      return `${label}:[${minW.toFixed(3)}–${maxW.toFixed(3)}] nonZero:${nonZero}/${attr.count}`
    }

    console.groupCollapsed(`[deform INIT] "${meshName}" verts:${count}`)
    console.log('Attrs on mesh:', Object.keys(geometry.attributes).join(', '))
    console.log(selStats(leftSel,  '_leftselection'))
    console.log(selStats(rightSel, '_rightselection'))
    console.log(selStats(rearSel,  '_rearselection'))
    console.log(selStats(topSel,   '_topselection'))
    console.log(`BBox Z: ${minZ.toFixed(3)}–${maxZ.toFixed(3)}, meshZCenter:${meshZCenter.toFixed(3)}, usedZCenter:${zCenter.toFixed(3)}, zRange:${zRange.toFixed(3)}`)
    console.groupEnd()
  }

  // ── Width deformation tracking ────────────────────────────────────────────────
  let maxW = 0, minDeltaZ = Infinity, maxDeltaZ = -Infinity
  let overweightCount = 0

  for (let i = 0; i < count; i++) {
    let ox = original[i * 3]
    let oy = original[i * 3 + 1]
    let oz = original[i * 3 + 2]

    // Width (Z axis) — selection weights drive which edges move
    if (leftSel && rightSel) {
      const w   = leftSel.getX(i) + rightSel.getX(i)
      const dir = oz > zCenter ? 1 : -1
      const dz  = dir * deltaWidth * w
      oz += dz
      if (w > maxW) maxW = w
      if (w > 1.001) overweightCount++
      if (dz < minDeltaZ) minDeltaZ = dz
      if (dz > maxDeltaZ) maxDeltaZ = dz
    } else if (deltaWidth !== 0 && zRange > 0) {
      const t  = (oz - zCenter) / zRange    // –1…+1
      const dz = t * deltaWidth
      oz += dz
      if (dz < minDeltaZ) minDeltaZ = dz
      if (dz > maxDeltaZ) maxDeltaZ = dz
    }

    // Length (X axis) — rear-only (Blender node behaviour)
    if (rearSel) {
      ox += deltaLength * rearSel.getX(i)
    } else if (xRange > 0) {
      const t = (ox - xCenter) / xRange
      ox += t * deltaLength
    }

    // Height (Y axis) — floor anchored, ceiling rises
    if (topSel) {
      oy += deltaHeight * topSel.getX(i)
    } else if (deltaHeight !== 0 && yRange > 0) {
      const t = (oy - minY) / yRange       // 0…1 (floor → ceiling)
      oy += t * deltaHeight
    }

    position.setXYZ(i, ox, oy, oz)
  }

  // ── Width change summary (every call, only when delta is non-zero) ────────────
  if (deltaWidth !== 0) {
    const mode = (leftSel && rightSel) ? 'ATTR' : 'fallback'
    console.log(
      `[deform WIDTH] "${meshName}" | widthFt:${widthFt} Δ:${deltaWidth.toFixed(3)}m | mode:${mode}` +
      ` | dZ range:[${minDeltaZ.toFixed(3)}, ${maxDeltaZ.toFixed(3)}]` +
      (mode === 'ATTR' ? ` | maxCombinedWeight:${maxW.toFixed(3)} overweightVerts:${overweightCount}` : '')
    )
  }

  position.needsUpdate = true
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
}


// ─── Width deformation (your existing Cabinet logic) ─────────────────────────

/**
 * Applies left/right selection-based width deformation.
 * Extracted directly from CabinetModel — drop-in replacement.
 *
 * @param {Object} params
 * @param {THREE.BufferGeometry} params.geometry
 * @param {Map}                  params.store
 * @param {string}               params.uuid
 * @param {number}               params.widthFactor   - 0 (narrow) → 1 (wide)
 */
export function applyWidthDeformation({ geometry, store, uuid, widthFactor }) {
  const position = geometry.attributes.position
  const leftSel  = geometry.attributes._leftselection
  const rightSel = geometry.attributes._rightselection

  if (!position || !leftSel || !rightSel) return

  cacheOriginalPositions(store, uuid, position.array)
  const original = getOriginalPositions(store, uuid)

  geometry.computeBoundingBox()
  const bbox   = geometry.boundingBox
  const zCenter = (bbox.min.z + bbox.max.z) / 2
  const zRange  = (bbox.max.z - bbox.min.z) / 2

  for (let i = 0; i < position.count; i++) {
    const ox = original[i * 3]
    const oy = original[i * 3 + 1]
    const oz = original[i * 3 + 2]

    const totalWeight = leftSel.getX(i) + rightSel.getX(i)
    const direction   = oz > zCenter ? -1 : 1
    const newZ        = oz + direction * zRange * totalWeight * widthFactor

    position.setXYZ(i, ox, oy, newZ)
  }

  position.needsUpdate = true
  geometry.computeVertexNormals()
}