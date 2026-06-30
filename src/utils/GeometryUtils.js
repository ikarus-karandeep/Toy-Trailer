/**
 * Reusable geometry deformation utilities for Blender Geometry Node setups
 */
import { BlenderNodes } from './BlenderNodes'

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
const BASE_WIDTH_FT = 8
const BASE_LENGTH_FT = 32
const BASE_HEIGHT_FT = 8
const FEET_TO_M = 0.305         // matches the Blender "Feet to Meter" node

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
 * @param {boolean} params.hasCabinet - whether the trailer has a cabinet
 */
export function applyDimensionDeformations({ geometry, store, uuid, meshName, widthFt, lengthFt, heightFt, hasCabinet, globalZCenter, globalXMin, globalXMax, we, ie }) {
  const position = geometry.attributes.position
  if (!position) {
    console.warn(`[deform] "${meshName}" — SKIP: no position attribute`)
    return
  }

  // ── Size Adjustments: exact Blender node graph math ──────────────────────────
  //
  // The Blender "Size Adjustments" group uses this formula per Move node:
  //   Offset = Delta_Offset + Factor × inputValue
  // applied as: new_pos = orig_pos + Offset × vertex_weight
  //
  // The Delta_Offset constants are absolute Blender-coordinate values baked into
  // the rest-state mesh. To get a DELTA from base we compute:
  //   delta = (Offset at target) - (Offset at base)
  //         = Factor × (targetValue - baseValue)
  //
  // ── LENGTH (X-axis, _rearselection) ─────────────────────────────────────────
  // Two Move nodes in series:
  //   Move 1: Delta_Offset=32.000, Factor=1.000, Input=min(length, 27')
  //           → delta₁ = 1.000 × (min(L,27) − min(26,27)) = min(L,27) − 26
  //   Move 2: Delta_Offset=0.000,  Factor=1.300, Input=max(length − 27', 0)
  //           → delta₂ = 1.300 × max(L − 27, 0)     [excess beyond 27' scaled 1.3×]
  const BASE_CLAMP_FT = 27          // "Limit to 27'" clamp node
  const EXCESS_FACTOR = 1.000       // Factor on second Move node
  const targetOffset1 = Math.min(lengthFt, BASE_CLAMP_FT)
  const targetOffset2 = Math.max(lengthFt - BASE_CLAMP_FT, 0) * EXCESS_FACTOR
  const baseOffset1 = Math.min(BASE_LENGTH_FT, BASE_CLAMP_FT)
  const baseOffset2 = Math.max(BASE_LENGTH_FT - BASE_CLAMP_FT, 0) * EXCESS_FACTOR
  const deltaLength = ((targetOffset1 + targetOffset2) - (baseOffset1 + baseOffset2)) * FEET_TO_M

  // Partial Deltas to match 3 chained Geometry Nodes in Blender
  // Node 1: Handles length changes ABOVE 27ft
  const delta1 = (Math.max(lengthFt - 27, 0) - Math.max(BASE_LENGTH_FT - 27, 0)) * FEET_TO_M
  
  // Node 2: Handles length changes BETWEEN 23.5ft and 27ft
  const clampL2 = Math.max(Math.min(lengthFt, 27), 23.5)
  const clampB2 = Math.max(Math.min(BASE_LENGTH_FT, 27), 23.5)
  const delta2 = (clampL2 - clampB2) * FEET_TO_M

  // Node 3: Handles length changes BELOW 23.5ft
  const minL3 = Math.min(lengthFt, 23.5)
  const minB3 = Math.min(BASE_LENGTH_FT, 23.5)
  const delta3 = (minL3 - minB3) * FEET_TO_M

  // ── WIDTH (Z-axis in Three.js, _leftselection / _rightselection) ─────────────
  // Two Move nodes, one per side:
  //   Move 3 (Left):  Delta_Offset=-8.500, Factor=0.500, Input=widthFt × FEET_TO_M
  //   Move 4 (Right): Delta_Offset=+8.500, Factor=0.500, Input=widthFt × FEET_TO_M
  // Both have Factor=0.500, so delta = 0.500 × (W − W₀) × FEET_TO_M
  const WIDTH_FACTOR = 0.500       // Factor on Move 3 / Move 4 nodes
  const deltaWidth = (widthFt - BASE_WIDTH_FT) * FEET_TO_M * WIDTH_FACTOR

  // ── HEIGHT (Y-axis, _topselection) ───────────────────────────────────────────
  // Move 5: Delta_Offset=0.500, Factor=1.000, Input=heightFt × FEET_TO_M
  //   delta = 1.000 × (H − H₀) × FEET_TO_M
  // The "Less Than" + Switch nodes gate the width moves to only apply where
  // height < some threshold — this is handled implicitly by vertex weights.
  const deltaHeight = (heightFt - BASE_HEIGHT_FT) * FEET_TO_M  // Factor=1.000


  cacheOriginalPositions(store, uuid, position.array)
  const original = getOriginalPositions(store, uuid)
  const count = position.count

  // Bounding box computed in world space (we/ie = worldMatrix / invWorldMatrix elements)
  let minX = Infinity, maxX = -Infinity
  let minY = Infinity, maxY = -Infinity
  let minZ = Infinity, maxZ = -Infinity
  for (let i = 0; i < count; i++) {
    let ox = original[i * 3], oy = original[i * 3 + 1], oz = original[i * 3 + 2]
    if (we) {
      const wx = we[0] * ox + we[4] * oy + we[8] * oz + we[12]
      const wy = we[1] * ox + we[5] * oy + we[9] * oz + we[13]
      const wz = we[2] * ox + we[6] * oy + we[10] * oz + we[14]
      ox = wx; oy = wy; oz = wz
    }
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
  const zRange = (maxZ - minZ) / 2
  const yRange = maxY - minY

  const attrKeys = Object.keys(geometry.attributes)
  const key3 = attrKeys.find(k => k.toLowerCase().includes('rearselection3'))
  const key2 = attrKeys.find(k => k.toLowerCase().includes('rearselection2'))
  const key1 = attrKeys.find(k => k.toLowerCase().includes('rearselection') && !k.toLowerCase().includes('rearselection2') && !k.toLowerCase().includes('rearselection3'))
  const topKey = attrKeys.find(k => k.toLowerCase().includes('topselection'))
  const leftKey = attrKeys.find(k => k.toLowerCase().includes('leftselection'))
  const rightKey = attrKeys.find(k => k.toLowerCase().includes('rightselection'))

  const leftSel = leftKey ? geometry.attributes[leftKey] : null
  const rightSel = rightKey ? geometry.attributes[rightKey] : null
  const rearSel3 = key3 ? geometry.attributes[key3] : null
  const rearSel2 = key2 ? geometry.attributes[key2] : null
  const rearSel1 = key1 ? geometry.attributes[key1] : null
  const topSel = topKey ? geometry.attributes[topKey] : null

  const hasSel3 = !!rearSel3;
  const hasSel2 = !!rearSel2;
  const hasSel1 = !!rearSel1;

  // Cascade missing deltas to older nodes (if a mesh hasn't been updated with newer maps)
  let applyDelta3 = 0, applyDelta2 = 0, applyDelta1 = 0;
  if (hasSel3) {
      applyDelta3 = delta3;
      applyDelta2 = delta2;
      applyDelta1 = delta1;
  } else if (hasSel2) {
      applyDelta2 = delta2 + delta3;
      applyDelta1 = delta1;
  } else if (hasSel1) {
      applyDelta1 = delta1 + delta2 + delta3;
  }

  for (let i = 0; i < count; i++) {
    let ox = original[i * 3]
    let oy = original[i * 3 + 1]
    let oz = original[i * 3 + 2]

    // Transform local → world space so direction/deformation math is axis-aligned
    if (we) {
      const wx = we[0] * ox + we[4] * oy + we[8] * oz + we[12]
      const wy = we[1] * ox + we[5] * oy + we[9] * oz + we[13]
      const wz = we[2] * ox + we[6] * oy + we[10] * oz + we[14]
      ox = wx; oy = wy; oz = wz
    }

    // Width (Z axis) — each selection drives its own direction independently.
    // In this model left = +Z, right = -Z (verified from outer-hull behavior).
    // Combining both into one weighted term and using vertex position for direction
    // was wrong for interior meshes (e.g. cabinets) whose inner faces can sit on
    // the "wrong" side of zCenter and would be displaced backwards.
    if (leftSel || rightSel) {
      if (leftSel) oz += deltaWidth * leftSel.getX(i)   // +Z = left wall
      if (rightSel) oz -= deltaWidth * rightSel.getX(i)  // -Z = right wall
    } else if (deltaWidth !== 0 && zRange > 0) {
      const t = (oz - zCenter) / zRange    // –1…+1
      oz += t * deltaWidth
    }

    // Length (X axis) — rear-only, applying partial chained deltas
    if (hasSel1 || hasSel2 || hasSel3) {
      let move = 0;
      if (hasSel3) move += applyDelta3 * rearSel3.getX(i);
      if (hasSel2) move += applyDelta2 * rearSel2.getX(i);
      if (hasSel1) move += applyDelta1 * rearSel1.getX(i);
      ox += move;
    } else if (deltaLength !== 0 && globalXMax !== undefined && globalXMin !== undefined) {
      const globalXRange = globalXMin - globalXMax
      if (globalXRange !== 0) {
        const t = (ox - globalXMax) / globalXRange
        ox += t * deltaLength
      }
    }

    // Height (Y axis) — floor anchored, ceiling rises
    if (topSel) {
      oy += deltaHeight * topSel.getX(i)
    } else if (deltaHeight !== 0 && yRange > 0) {
      const t = (oy - minY) / yRange       // 0…1 (floor → ceiling)
      oy += t * deltaHeight
    }

    // Transform world → local space before writing back
    if (ie) {
      const lx = ie[0] * ox + ie[4] * oy + ie[8] * oz + ie[12]
      const ly = ie[1] * ox + ie[5] * oy + ie[9] * oz + ie[13]
      const lz = ie[2] * ox + ie[6] * oy + ie[10] * oz + ie[14]
      ox = lx; oy = ly; oz = lz
    }

    position.setXYZ(i, ox, oy, oz)
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
  const leftSel = geometry.attributes._leftselection || geometry.attributes._LEFTSELECTION
  const rightSel = geometry.attributes._rightselection || geometry.attributes._RIGHTSELECTION

  if (!position || !leftSel || !rightSel) return

  cacheOriginalPositions(store, uuid, position.array)
  const original = getOriginalPositions(store, uuid)

  geometry.computeBoundingBox()
  const bbox = geometry.boundingBox
  const zCenter = (bbox.min.z + bbox.max.z) / 2
  const zRange = (bbox.max.z - bbox.min.z) / 2

  for (let i = 0; i < position.count; i++) {
    const ox = original[i * 3]
    const oy = original[i * 3 + 1]
    const oz = original[i * 3 + 2]

    const totalWeight = leftSel.getX(i) + rightSel.getX(i)
    const direction = oz > zCenter ? -1 : 1
    const newZ = oz + direction * zRange * totalWeight * widthFactor

    position.setXYZ(i, ox, oy, newZ)
  }

  position.needsUpdate = true
  geometry.computeVertexNormals()
}