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
  const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js')

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
      // Flatten to individual Mesh nodes — iOS Quick Look ignores EXT_mesh_gpu_instancing.
      // Negative-scale (mirrored) instances are handled by baking reflection into geometry.
      const baseGeo = child.geometry.clone()
      baseGeo.deleteAttribute('color')

      const mat = Array.isArray(sanitized)
        ? sanitized.map(m => m ? m.clone() : m)
        : (sanitized ? sanitized.clone() : undefined)

      if (triplanarScale !== null) {
        const tmp = new THREE.Mesh(baseGeo, mat)
        tmp.applyMatrix4(child.matrixWorld)
        generateBoxProjectionUVs(tmp, 1.0 / triplanarScale, true)
      }

      let negGeo = null
      const m4 = new THREE.Matrix4()

      for (let i = 0; i < child.count; i++) {
        child.getMatrixAt(i, m4)
        m4.premultiply(child.matrixWorld)

        const isNeg = m4.determinant() < 0
        if (isNeg) {
          if (!negGeo) {
            negGeo = baseGeo.clone()
            negGeo.applyMatrix4(reflectX)
            reverseWinding(negGeo)
          }
          m4.multiply(reflectX)
        }

        const single = new THREE.Mesh(isNeg ? negGeo : baseGeo, mat)
        single.name = `${child.name}_${i}`
        single.matrixAutoUpdate = false
        single.matrix.copy(m4)
        single.updateMatrixWorld(true)
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
  }

  return new Promise((resolve, reject) =>
    new GLTFExporter().parse(exportGroup, resolve, reject, { binary: true })
  )
}
