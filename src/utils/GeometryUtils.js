/**
 * Reusable geometry deformation utilities for Blender Geometry Node setups
 */
import { BlenderNodes } from './BlenderNodes'

// ─── Core: store original vertex positions ────────────────────────────────────

/**
 * Caches original vertex positions for a mesh (call once on first run)
 * @param {THREE.BufferGeometry} geometry
 * @param {Float32Array} positionArray - geometry.attributes.position.array
 */
export function cacheOriginalPositions(geometry, positionArray) {
  if (!geometry.userData.originalPosition) {
    geometry.userData.originalPosition = positionArray.slice()
  }
}

/**
 * Returns cached original positions for a mesh
 * @param {THREE.BufferGeometry} geometry
 * @returns {Float32Array|null}
 */
export function getOriginalPositions(geometry) {
  return geometry.userData.originalPosition ?? null
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
  cacheOriginalPositions(geometry, position.array)
  const original = getOriginalPositions(geometry)

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

  // Same as applyDimensionDeformations: restore cached normals instead of recomputing.
  // computeVertexNormals() on non-indexed geometry produces flat shading.
  const normalAttr = geometry.attributes.normal
  if (normalAttr) {
    if (!geometry.userData.originalNormal) {
      geometry.userData.originalNormal = normalAttr.array.slice()
    }
    normalAttr.array.set(geometry.userData.originalNormal)
    normalAttr.needsUpdate = true
  }
}


// ─── Combined dimension deformation (width + length + height in one pass) ─────

// Base dimensions — the model is exported at these values (rest state = zero delta)
const BASE_WIDTH_FT = 8.5
const BASE_LENGTH_FT = 32
const BASE_HEIGHT_FT = 8.5
const FEET_TO_M = 0.305         // matches the Blender "Feet to Meter" node

// Dedup: each meshName logs its attribute discovery only once per session
const _loggedMeshAttrs = new Set()

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
export function applyDimensionDeformations({ geometry, store, uuid, meshName, widthFt, lengthFt, heightFt, awningFt, hasCabinet, globalZCenter, globalXMin, globalXMax, we, ie, narrowTrackOffset = 0 }) {
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

  // Node 4: Handles length changes BELOW 16.5ft
  const minL4 = Math.min(lengthFt, 16.5)
  const minB4 = Math.min(BASE_LENGTH_FT, 16.5)
  const delta4 = (minL4 - minB4) * FEET_TO_M

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


  cacheOriginalPositions(geometry, position.array)
  const original = getOriginalPositions(geometry)
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
  // Normalize key: lowercase + strip underscores/spaces so "Rear_Selection_4" → "rearselection4"
  const normKey = k => k.toLowerCase().replace(/[_ ]/g, '')
  const key4 = attrKeys.find(k => normKey(k).includes('rearselection4'))
  const key3 = attrKeys.find(k => normKey(k).includes('rearselection3'))
  const key2 = attrKeys.find(k => normKey(k).includes('rearselection2'))
  const key1 = attrKeys.find(k => normKey(k).includes('rearselection') && !normKey(k).includes('rearselection2') && !normKey(k).includes('rearselection3') && !normKey(k).includes('rearselection4'))
  const topKey = attrKeys.find(k => normKey(k).includes('topselection'))
  const leftKey = attrKeys.find(k => normKey(k).includes('leftselection'))
  const rightKey = attrKeys.find(k => normKey(k).includes('rightselection'))

  const leftSel = leftKey ? geometry.attributes[leftKey] : null
  const rightSel = rightKey ? geometry.attributes[rightKey] : null
  const rearSel4 = key4 ? geometry.attributes[key4] : null
  const rearSel3 = key3 ? geometry.attributes[key3] : null
  const rearSel2 = key2 ? geometry.attributes[key2] : null
  const rearSel1 = key1 ? geometry.attributes[key1] : null
  const topSel = topKey ? geometry.attributes[topKey] : null

  const hasSel4 = !!rearSel4;
  const hasSel3 = !!rearSel3;
  const hasSel2 = !!rearSel2;
  const hasSel1 = !!rearSel1;
  // Proxy cutouts (e.g. Gullwing_Escape_Door_Proxy) ship without selection attrs.
  // The position-based width fallback spreads verts symmetrically about zCenter,
  // which mirrors the proxy onto the opposite wall.
  const isProxy = meshName.toLowerCase().includes('proxy') || 
                  meshName.toLowerCase().includes('slides') || 
                  meshName.toLowerCase().includes('tray') ||
                  meshName.toLowerCase().includes('window') ||
                  meshName.toLowerCase().includes('glider') ||
                  meshName.toLowerCase().includes('slider') ||
                  meshName.toLowerCase().includes('egress');

  const frontendKey = attrKeys.find(k => normKey(k).includes('frontend'))
  const rearendKey = attrKeys.find(k => normKey(k).includes('rearend'))
  const frontEndSel = frontendKey ? geometry.attributes[frontendKey] : null
  const rearEndSel = rearendKey ? geometry.attributes[rearendKey] : null
  const hasFrontEnd = !!frontEndSel
  const hasRearEnd = !!rearEndSel
  const BASE_AWNING_FT = 18
  const deltaAwning = awningFt !== undefined ? (awningFt - BASE_AWNING_FT) * FEET_TO_M : 0

  // ── DEBUG: log attribute discovery once per mesh ─────────────────────────────
  // if (!_loggedMeshAttrs.has(meshName)) {
  //   _loggedMeshAttrs.add(meshName)
  //   console.log(
  //     `[deform] "${meshName}" attrs — all:`, attrKeys,
  //     '| rearSel1:', key1 ?? 'NONE',
  //     '| rearSel2:', key2 ?? 'NONE',
  //     '| rearSel3:', key3 ?? 'NONE',
  //     '| rearSel4:', key4 ?? 'NONE',
  //   )
  // }

  // // ── DEBUG: log delta values whenever length is in the sub-16.5 zone ──────────
  // if (lengthFt < 16.5) {
  //   console.log(
  //     `[deform] "${meshName}" lengthFt=${lengthFt} < 16.5`,
  //     '| delta4:', delta4.toFixed(4), '| hasSel4:', hasSel4,
  //     '| delta3:', delta3.toFixed(4), '| hasSel3:', hasSel3,
  //     '| delta2:', delta2.toFixed(4), '| hasSel2:', hasSel2,
  //     '| delta1:', delta1.toFixed(4), '| hasSel1:', hasSel1,
  //   )
  // }

  // Cascade missing deltas to older nodes (if a mesh hasn't been updated with newer maps).
  // When sel4 is present, sel3 only carries the 16.5–23.5 portion (delta3 − delta4).
  // Old meshes without sel4 use delta3 as-is (it already covers the full <23.5 range).
  let applyDelta4 = 0, applyDelta3 = 0, applyDelta2 = 0, applyDelta1 = 0;
  if (hasSel4) {
      applyDelta4 = delta4;
      applyDelta3 = delta3 - delta4;
      applyDelta2 = delta2;
      applyDelta1 = delta1;
  } else if (hasSel3) {
      applyDelta3 = delta3;
      applyDelta2 = delta2;
      applyDelta1 = delta1;
  } else if (hasSel2) {
      applyDelta2 = delta2 + delta3 + delta4;
      applyDelta1 = delta1;
  } else if (hasSel1) {
      applyDelta1 = delta1 + delta2 + delta3 + delta4;
  }

  // ── DEBUG: log cascade result when sub-16.5 zone is active ───────────────────
  // if (lengthFt < 16.5) {
  //   console.log(
  //     `[deform cascade] "${meshName}"`,
  //     '| applyDelta4:', applyDelta4.toFixed(4),
  //     '| applyDelta3:', applyDelta3.toFixed(4),
  //     '| applyDelta2:', applyDelta2.toFixed(4),
  //     '| applyDelta1:', applyDelta1.toFixed(4),
  //     '| branch used:', hasSel4 ? 'sel4' : hasSel3 ? 'sel3' : hasSel2 ? 'sel2' : hasSel1 ? 'sel1' : 'FALLBACK',
  //   )
  // }

  let proxyMoveX = 0, proxyMoveY = 0, proxyMoveZ = 0;
  if (isProxy && count > 0) {
      let totalDx = 0, totalDy = 0, totalDz = 0;
      for (let i = 0; i < count; i++) {
          let ox = original[i * 3]; let oy = original[i * 3 + 1]; let oz = original[i * 3 + 2];
          if (we) {
            const wx = we[0] * ox + we[4] * oy + we[8] * oz + we[12];
            const wy = we[1] * ox + we[5] * oy + we[9] * oz + we[13];
            const wz = we[2] * ox + we[6] * oy + we[10] * oz + we[14];
            ox = wx; oy = wy; oz = wz;
          }
          let nox = ox, noy = oy, noz = oz;
          
          if (leftSel || rightSel) {
            if (leftSel) noz += deltaWidth * leftSel.getX(i);
            if (rightSel) noz -= deltaWidth * rightSel.getX(i);
          } else if (deltaWidth !== 0) {
            noz += deltaWidth;
          }
          
          if (narrowTrackOffset !== 0) {
            if (noz > zCenter) noz -= narrowTrackOffset;
            else noz += narrowTrackOffset;
          }
          
          if (hasSel1 || hasSel2 || hasSel3 || hasSel4) {
            let move = 0;
            if (hasSel4) move += applyDelta4 * rearSel4.getX(i);
            if (hasSel3) move += applyDelta3 * rearSel3.getX(i);
            if (hasSel2) move += applyDelta2 * rearSel2.getX(i);
            if (hasSel1) move += applyDelta1 * rearSel1.getX(i);
            nox += move;
          } else if (!isProxy && deltaLength !== 0 && globalXMax !== undefined && globalXMin !== undefined) {
            const globalXRange = globalXMin - globalXMax;
            if (globalXRange !== 0) nox += ((nox - globalXMax) / globalXRange) * deltaLength;
          }
          
          if (topSel) {
            noy += deltaHeight * topSel.getX(i);
          } else if (!isProxy && deltaHeight !== 0 && yRange > 0) {
            noy += ((noy - minY) / yRange) * deltaHeight;
          }
          
          totalDx += (nox - ox);
          totalDy += (noy - oy);
          totalDz += (noz - oz);
      }
      proxyMoveX = totalDx / count;
      proxyMoveY = totalDy / count;
      proxyMoveZ = totalDz / count;
      // console.log(`[GEOMETRY DEBUG] Proxy "${meshName}" computed uniform move: X=${proxyMoveX.toFixed(3)}, Y=${proxyMoveY.toFixed(3)}, Z=${proxyMoveZ.toFixed(3)}`);
  }

  for (let i = 0; i < count; i++) {
    let ox = original[i * 3]
    let oy = original[i * 3 + 1]
    let oz = original[i * 3 + 2]

    if (we) {
      const wx = we[0] * ox + we[4] * oy + we[8] * oz + we[12]
      const wy = we[1] * ox + we[5] * oy + we[9] * oz + we[13]
      const wz = we[2] * ox + we[6] * oy + we[10] * oz + we[14]
      ox = wx; oy = wy; oz = wz
    }

    if (isProxy) {
      ox += proxyMoveX;
      oy += proxyMoveY;
      oz += proxyMoveZ;
    } else {
      if (leftSel || rightSel) {
        if (leftSel) oz += deltaWidth * leftSel.getX(i)
        if (rightSel) oz -= deltaWidth * rightSel.getX(i)
      } else if (deltaWidth !== 0 && zRange > 0) {
        const t = (oz - zCenter) / zRange
        oz += t * deltaWidth
      }

      if (narrowTrackOffset !== 0) {
        if (oz > zCenter) {
          oz -= narrowTrackOffset
        } else {
          oz += narrowTrackOffset
        }
      }

      if (hasSel1 || hasSel2 || hasSel3 || hasSel4) {
        let move = 0;
        if (hasSel4) move += applyDelta4 * rearSel4.getX(i);
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

      if (hasFrontEnd || hasRearEnd) {
        if (hasFrontEnd) {
          ox -= (deltaAwning / 2) * frontEndSel.getX(i);
        }
        if (hasRearEnd) {
          ox += (deltaAwning / 2) * rearEndSel.getX(i);
        }
      }

      if (topSel) {
        oy += deltaHeight * topSel.getX(i)
      } else if (deltaHeight !== 0 && yRange > 0) {
        const t = (oy - minY) / yRange
        oy += t * deltaHeight
      }
    }

    if (ie) {
      const lx = ie[0] * ox + ie[4] * oy + ie[8] * oz + ie[12]
      const ly = ie[1] * ox + ie[5] * oy + ie[9] * oz + ie[13]
      const lz = ie[2] * ox + ie[6] * oy + ie[10] * oz + ie[14]
      ox = lx; oy = ly; oz = lz
    }

    position.setXYZ(i, ox, oy, oz)
  }

  position.needsUpdate = true

  // Restore original GLB normals instead of recomputing from scratch.
  // computeVertexNormals() on non-indexed GLB geometry (the common case, especially
  // after Draco decode) assigns each triangle's flat geometric normal to all its
  // vertices — equivalent to flatShading:true — and destroys Blender's smooth groups.
  // Since deformations here are axis-aligned translations on mostly-planar faces,
  // the original normals remain correct after deformation.
  const normalAttr = geometry.attributes.normal
  if (normalAttr) {
    if (!geometry.userData.originalNormal) {
      geometry.userData.originalNormal = normalAttr.array.slice()
    }
    normalAttr.array.set(geometry.userData.originalNormal)
    normalAttr.needsUpdate = true
  }

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

  cacheOriginalPositions(geometry, position.array)
  const original = getOriginalPositions(geometry)

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
  // Restore cached normals — same reasoning as applyDimensionDeformations.
  const normalAttr = geometry.attributes.normal
  if (normalAttr) {
    if (!geometry.userData.originalNormal) {
      geometry.userData.originalNormal = normalAttr.array.slice()
    }
    normalAttr.array.set(geometry.userData.originalNormal)
    normalAttr.needsUpdate = true
  }
}