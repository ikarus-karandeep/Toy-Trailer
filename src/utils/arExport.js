/**
 * arExport.js
 * Single shared GLB export function used by ALL AR paths:
 *   - TrailerViewer.jsx   (QR scan / desktop "View in Driveway")
 *   - InlineAROverlay.jsx (direct mobile "View in AR" button)
 *   - ARPage.jsx          (/ar route opened from QR link)
 */

import * as THREE from 'three'
import { generateBoxProjectionUVs } from './TriplanarMaterial'

// ─── helpers ─────────────────────────────────────────────────────────────────

function reverseWinding(geo) {
  const index = geo.getIndex()
  if (index) {
    for (let j = 0; j < index.count; j += 3) {
      const a = index.getX(j)
      const c = index.getX(j + 2)
      index.setX(j, c)
      index.setX(j + 2, a)
    }
  } else {
    const pos  = geo.getAttribute('position')
    const norm = geo.getAttribute('normal')
    const uv   = geo.getAttribute('uv')
    for (let j = 0; j < pos.count; j += 3) {
      const swap = (attr) => {
        if (!attr) return
        for (let c = 0; c < attr.itemSize; c++) {
          const temp = attr.array[j * attr.itemSize + c]
          attr.array[j * attr.itemSize + c]       = attr.array[(j + 2) * attr.itemSize + c]
          attr.array[(j + 2) * attr.itemSize + c] = temp
        }
      }
      swap(pos); swap(norm); swap(uv)
    }
  }
}

function getTriplanarScale(mat) {
  const mats = Array.isArray(mat) ? mat : [mat]
  for (const m of mats) {
    if (m && m.userData && m.userData.triplanarScale != null) return m.userData.triplanarScale
  }
  return null
}

// Content-based signature so cloned materials with identical maps/values
// hash to the same bucket — letting the post-merge pass consolidate them.
function getMaterialSignature(mat) {
  if (!mat || !mat.isMaterial) return null
  return [
    mat.constructor.name,
    mat.color?.getHexString?.()     ?? '',
    mat.map?.uuid                   ?? '-',
    mat.normalMap?.uuid             ?? '-',
    mat.roughnessMap?.uuid          ?? '-',
    mat.metalnessMap?.uuid          ?? '-',
    mat.alphaMap?.uuid              ?? '-',
    mat.emissiveMap?.uuid           ?? '-',
    mat.emissive?.getHexString?.()  ?? '-',
    (mat.roughness  ?? 0).toFixed(3),
    (mat.metalness  ?? 0).toFixed(3),
    (mat.opacity    ?? 1).toFixed(3),
    mat.transparent ? '1' : '0',
    mat.side        ?? 0,
    (mat.alphaTest  ?? 0).toFixed(3),
    mat.userData?.isDecal        ? 'decal' : '',
    mat.userData?.triplanarScale ?? '',
  ].join('|')
}

// Extract the geometry for ONE material group from a BufferGeometry into a
// new standalone BufferGeometry containing only the relevant vertices/indices.
function extractGroupGeometry(geo, group) {
  const { start, count } = group
  if (!count) return null

  const out = new THREE.BufferGeometry()

  if (geo.index) {
    const indexMap = new Map()
    let nextV = 0
    const newIdx = new Int32Array(count)

    for (let i = 0; i < count; i++) {
      const v = geo.index.getX(start + i)
      if (!indexMap.has(v)) indexMap.set(v, nextV++)
      newIdx[i] = indexMap.get(v)
    }
    out.setIndex(new THREE.BufferAttribute(newIdx, 1))

    const nVerts = indexMap.size
    for (const [name, attr] of Object.entries(geo.attributes)) {
      const sz  = attr.itemSize
      const arr = new Float32Array(nVerts * sz)
      for (const [oldV, newV] of indexMap) {
        for (let k = 0; k < sz; k++) arr[newV * sz + k] = attr.array[oldV * sz + k]
      }
      out.setAttribute(name, new THREE.BufferAttribute(arr, sz))
    }
  } else {
    for (const [name, attr] of Object.entries(geo.attributes)) {
      const sz    = attr.itemSize
      const slice = attr.array.slice(start * sz, (start + count) * sz)
      out.setAttribute(name, new THREE.BufferAttribute(new Float32Array(slice), sz))
    }
  }

  return out
}

// ─── material sanitizer ───────────────────────────────────────────────────────

function processMaterial(mat) {
  if (!mat) return mat

  // 1. Decal: alphaMap-only → merge into RGBA canvas texture on MeshBasicMaterial
  //    MeshBasicMaterial is required to bypass Apple Quick Look lit-shader transparency bug.
  if (mat.alphaMap && !mat.map) {
    const img = mat.alphaMap.image
    if (img) {
      const pot = (v) => { v--; v|=v>>1; v|=v>>2; v|=v>>4; v|=v>>8; v|=v>>16; return v+1 }
      const potW = pot(img.width  || 512)
      const potH = pot(img.height || 512)
      const canvas = document.createElement('canvas')
      canvas.width = potW; canvas.height = potH
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, potW, potH)
      const imgData = ctx.getImageData(0, 0, potW, potH)
      const data = imgData.data
      const R = mat.color.r * 255, G = mat.color.g * 255, B = mat.color.b * 255
      for (let i = 0; i < data.length; i += 4) {
        const a = data[i]
        // Standard mask: a > 128 is opaque (logo), a < 128 is transparent (background)
        if (a > 128) { data[i]=R; data[i+1]=G; data[i+2]=B; data[i+3]=255 }
        else        { data[i]=0; data[i+1]=0; data[i+2]=0; data[i+3]=0 }
      }
      ctx.putImageData(imgData, 0, 0)

      const tex = new THREE.CanvasTexture(canvas)
      tex.colorSpace = THREE.SRGBColorSpace
      tex.flipY = false
      tex.wrapS = mat.alphaMap.wrapS
      tex.wrapT = mat.alphaMap.wrapT

      const newMat = new THREE.MeshStandardMaterial({
        name: mat.name, map: tex, color: 0xffffff,
        transparent: false, alphaTest: 0.5, side: THREE.DoubleSide,
        metalness: mat.metalness !== undefined ? mat.metalness : 0,
        roughness: mat.roughness !== undefined ? mat.roughness : 1,
        normalMap: mat.normalMap || null
      })
      newMat.userData = { ...(mat.userData || {}), isDecal: true }
      return newMat
    }
  }

  let m = mat.clone()
  m.onBeforeCompile = () => {}

  // 2. Strip noise normal map (breaks iOS USDZ)
  if (m.normalMap && m.normalMap.source && m.normalMap.source.data &&
      typeof m.normalMap.source.data.src === 'string' &&
      m.normalMap.source.data.src.includes('Simple_Noise')) {
    m.normalMap = null
  }

  // 3. Transmission/glass → transparent standard material
  if (m.isMeshPhysicalMaterial && m.transmission > 0) {
    m = new THREE.MeshStandardMaterial({
      color: m.color, map: m.map, transparent: true,
      opacity: 0.4, roughness: 0.1, metalness: 0.5, name: m.name
    })
  }

  // 4. Zero-intensity emissive → force black (Apple ignores emissiveIntensity=0)
  if (m.emissiveIntensity === 0) {
    m.emissive.set('#000000')
    m.emissiveMap = null
  }

  return m
}

// ─── main export ──────────────────────────────────────────────────────────────

export async function exportForAR(mesh) {
  const { GLTFExporter }    = await import('three/examples/jsm/exporters/GLTFExporter.js')
  const { mergeGeometries } = await import('three/examples/jsm/utils/BufferGeometryUtils.js')

  const exportGroup = new THREE.Group()
  mesh.updateWorldMatrix(true, true)

  const reflectX = new THREE.Matrix4().makeScale(-1, 1, 1)

  mesh.traverse(child => {
    if (!child.isMesh) return

    // Skip hidden nodes (walk full ancestor chain)
    let visible = true
    let node = child
    while (node) { if (!node.visible) { visible = false; break } node = node.parent }
    if (!visible) return

    child.updateWorldMatrix(true, false)

    // Sanitize material(s)
    const sanitized = Array.isArray(child.material)
      ? child.material.map(processMaterial)
      : processMaterial(child.material)

    const triplanarScale = getTriplanarScale(sanitized)

    if (child.isInstancedMesh) {
      // iOS Quick Look ignores EXT_mesh_gpu_instancing, so we flatten instances.
      // We now BAKE each instance's world transform into its own geometry clone
      // (rather than storing it as a node matrix) so the post-merge pass below
      // can merge all instances sharing the same material into ONE draw call.
      const baseGeo = child.geometry.clone()
      baseGeo.deleteAttribute('color')

      const mat = Array.isArray(sanitized)
        ? sanitized.map(m => m ? m.clone() : m)
        : (sanitized ? sanitized.clone() : undefined)

      let negGeoBase = null
      const m4 = new THREE.Matrix4()

      for (let i = 0; i < child.count; i++) {
        child.getMatrixAt(i, m4)
        m4.premultiply(child.matrixWorld)

        const isNeg = m4.determinant() < 0
        if (isNeg) {
          if (!negGeoBase) {
            negGeoBase = baseGeo.clone()
            negGeoBase.applyMatrix4(reflectX)
            reverseWinding(negGeoBase)
          }
          m4.multiply(reflectX)
        }

        // Clone + bake world transform so post-merge can group by material
        const instanceGeo = (isNeg ? negGeoBase : baseGeo).clone()
        instanceGeo.applyMatrix4(m4)

        // Triplanar UVs in world space — positions are already world-space after bake
        if (triplanarScale !== null) {
          generateBoxProjectionUVs(
            new THREE.Mesh(instanceGeo, mat), 1.0 / triplanarScale, true
          )
        }

        const single = new THREE.Mesh(instanceGeo, mat)
        single.name = `${child.name}_${i}`
        exportGroup.add(single)
      }
    } else {
      const geo = child.geometry.clone()
      geo.deleteAttribute('color')

      const mat = Array.isArray(sanitized)
        ? sanitized.map(m => m ? m.clone() : m)
        : (sanitized ? sanitized.clone() : undefined)

      // Decal Z-fighting: push vertices slightly along normals.
      // If it's a multi-material mesh, ONLY push the vertices that belong to the decal material.
      const pos = geo.attributes.position
      const norm = geo.attributes.normal
      if (pos && norm) {
        if (Array.isArray(mat)) {
          // Multi-material mesh: only push vertices in groups assigned to a decal material
          for (let i = 0; i < mat.length; i++) {
            if (mat[i] && mat[i].userData && mat[i].userData.isDecal) {
              const groups = geo.groups.filter(g => g.materialIndex === i)
              for (const group of groups) {
                // Determine vertex range based on whether geometry is indexed
                let startV = group.start
                let endV = group.start + group.count
                if (geo.index) {
                  // If indexed, we must find the min/max vertex indices in this group's index range
                  let minIdx = Infinity, maxIdx = -Infinity
                  for (let j = startV; j < endV; j++) {
                    const idx = geo.index.getX(j)
                    if (idx < minIdx) minIdx = idx
                    if (idx > maxIdx) maxIdx = idx
                  }
                  startV = minIdx
                  endV = maxIdx + 1
                }
                for (let v = startV; v < endV; v++) {
                  pos.setX(v, pos.getX(v) + norm.getX(v) * 0.005)
                  pos.setY(v, pos.getY(v) + norm.getY(v) * 0.005)
                  pos.setZ(v, pos.getZ(v) + norm.getZ(v) * 0.005)
                }
              }
              pos.needsUpdate = true
            }
          }
        } else if (mat && mat.userData && mat.userData.isDecal) {
          // Single material mesh: push all vertices
          for (let i = 0; i < pos.count; i++) {
            pos.setX(i, pos.getX(i) + norm.getX(i) * 0.005)
            pos.setY(i, pos.getY(i) + norm.getY(i) * 0.005)
            pos.setZ(i, pos.getZ(i) + norm.getZ(i) * 0.005)
          }
          pos.needsUpdate = true
        }
      }

      const isNeg = child.matrixWorld.determinant() < 0
      geo.applyMatrix4(child.matrixWorld)
      if (isNeg) reverseWinding(geo)

      if (triplanarScale !== null) {
        generateBoxProjectionUVs(new THREE.Mesh(geo, mat), 1.0 / triplanarScale, true)
      }

      const cloned = new THREE.Mesh(geo, mat)
      cloned.name = child.name
      exportGroup.add(cloned)
    }
  })

  if (exportGroup.children.length === 0) {
    console.error('[AR Export] exportGroup is EMPTY — no visible meshes found.')
    return new Promise((resolve, reject) =>
      new GLTFExporter().parse(exportGroup, resolve, reject, { binary: true })
    )
  }

  // ── Post-process: merge by material to minimise GLB draw calls ────────────
  //
  // getMaterialSignature() is content-based (map UUIDs, color, roughness…) so
  // independently-cloned materials with the same properties hash identically.
  // This lets meshes from different GLBs that share a visual material merge
  // into a single draw call — including all flattened InstancedMesh instances.
  //
  // Multi-material meshes are split by group (extractGroupGeometry) so each
  // sub-geometry enters the correct single-material bucket.

  const buckets = new Map()  // signature → { mat, geos }
  const unmergeable = []

  const addToBucket = (geo, mat) => {
    if (!geo || !mat) return false
    const matSig = getMaterialSignature(mat)
    if (!matSig) return false
    // Include sorted attribute names in the key: two geometries that differ in
    // which attributes they carry (e.g. one has 'uv', another doesn't) must NOT
    // be merged — mergeGeometries would silently drop the missing attribute from
    // the whole result, causing textures to disappear (the ladder rack issue).
    const attrSig = Object.keys(geo.attributes).sort().join(',')
    const sig = matSig + '::' + attrSig
    if (!buckets.has(sig)) buckets.set(sig, { mat, geos: [] })
    buckets.get(sig).geos.push(geo)
    return true
  }

  for (const child of [...exportGroup.children]) {
    if (!child.isMesh) { unmergeable.push(child); continue }

    const { geometry: geo, material: mat } = child

    if (Array.isArray(mat)) {
      if (geo.groups.length === 0) {
        if (!addToBucket(geo, mat[0])) unmergeable.push(child)
      } else {
        let allOk = true
        for (const group of geo.groups) {
          const subGeo = extractGroupGeometry(geo, group)
          const subMat = mat[group.materialIndex]
          if (!subGeo || !addToBucket(subGeo, subMat)) { allOk = false; break }
        }
        if (!allOk) unmergeable.push(child)
      }
    } else {
      if (!addToBucket(geo, mat)) unmergeable.push(child)
    }
  }

  exportGroup.clear()

  let savedDrawCalls = 0
  for (const { mat, geos } of buckets.values()) {
    if (geos.length === 1) {
      exportGroup.add(new THREE.Mesh(geos[0], mat))
      continue
    }
    try {
      const merged = mergeGeometries(geos, false)
      exportGroup.add(new THREE.Mesh(merged, mat))
      savedDrawCalls += geos.length - 1
    } catch (e) {
      console.warn('[AR Export] merge failed for a bucket, keeping separate:', e)
      for (const g of geos) exportGroup.add(new THREE.Mesh(g, mat))
    }
  }

  for (const child of unmergeable) exportGroup.add(child)

  console.log(
    `[AR Export] merged geometry: ${exportGroup.children.length + savedDrawCalls} primitives` +
    ` → ${exportGroup.children.length} (saved ${savedDrawCalls} draw calls)`
  )

  return new Promise((resolve, reject) =>
    new GLTFExporter().parse(exportGroup, resolve, reject, { binary: true })
  )
}
