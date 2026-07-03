import * as THREE from 'three'
import { WebIO } from '@gltf-transform/core'
import { inspect } from '@gltf-transform/functions'
import { KHRONOS_EXTENSIONS, KHRDracoMeshCompression } from '@gltf-transform/extensions'

const MB = 1_000_000

function getPerformanceBadge(totalGpuMB, drawCalls) {
  if (totalGpuMB < 50 && drawCalls < 100) return 'Excellent'
  if (totalGpuMB < 150 && drawCalls < 250) return 'Good'
  if (totalGpuMB < 300 && drawCalls < 500) return 'Average'
  if (totalGpuMB < 600 && drawCalls < 1000) return 'Heavy'
  return 'Very Heavy'
}

function parseResolution(resolution) {
  if (!resolution) return { w: 0, h: 0 }
  if (Array.isArray(resolution)) return { w: resolution[0] || 0, h: resolution[1] || 0 }
  const parts = String(resolution).split(/[x×]/)
  return { w: Number(parts[0]) || 0, h: Number(parts[1]) || 0 }
}

async function makeThumb(imageData, mimeType) {
  if (!imageData) return ''
  try {
    const blob = new Blob([imageData], { type: mimeType || 'image/png' })
    const url = URL.createObjectURL(blob)
    return new Promise(resolve => {
      const img = new window.Image()
      const done = (result = '') => { URL.revokeObjectURL(url); resolve(result) }
      img.onload = () => {
        try {
          const c = window.document.createElement('canvas')
          c.width = 64; c.height = 64
          c.getContext('2d').drawImage(img, 0, 0, 64, 64)
          done(c.toDataURL('image/jpeg', 0.7))
        } catch (_e) { done() }
      }
      img.onerror = () => done()
      img.src = url
    })
  } catch { return '' }
}

const extensionsNoDraco = KHRONOS_EXTENSIONS.filter(e => e !== KHRDracoMeshCompression)

export async function generateModelReport(glbBuffer, threeRoot, fileName = 'trailer.glb') {
  let gltfDoc
  try {
    gltfDoc = await new WebIO()
      .registerExtensions(KHRONOS_EXTENSIONS)
      .readBinary(new Uint8Array(glbBuffer))
  } catch {
    gltfDoc = await new WebIO()
      .registerExtensions(extensionsNoDraco)
      .readBinary(new Uint8Array(glbBuffer))
  }

  const result = inspect(gltfDoc)
  const meshesProp = result.meshes.properties
  const texProp = result.textures.properties
  const matProp = result.materials.properties
  const sceneProp = result.scenes.properties

  const totalTriangles = meshesProp.reduce((acc, m) => acc + (m.glPrimitives || 0) * (m.instances || 1), 0)
  const totalDrawCalls = meshesProp.reduce((acc, m) => acc + (m.meshPrimitives || 1) * (m.instances || 1), 0)
  const estimatedTexMemBytes = texProp.reduce((acc, t) => acc + (t.gpuSize || 0), 0)
  const totalGeomBytes = meshesProp.reduce((acc, m) => acc + (m.size || 0), 0)
  const totalGpuMB = (totalGeomBytes + estimatedTexMemBytes) / MB

  const docTextures = gltfDoc.getRoot().listTextures()
  const thumbnailUrls = await Promise.all(
    docTextures.map(async tex => {
      const imageData = tex.getImage()
      const mimeType = tex.getMimeType() || ''
      if (imageData && !mimeType.includes('ktx') && !mimeType.includes('basis')) {
        return makeThumb(imageData, mimeType)
      }
      return ''
    })
  )

  const box = new THREE.Box3().setFromObject(threeRoot)
  const size = new THREE.Vector3()
  box.getSize(size)

  return {
    metadata: {
      version: '2.0',
      generator: gltfDoc.getRoot().getAsset().generator || 'Unknown',
      extensions: gltfDoc.getRoot().listExtensionsUsed().map(e => e.extensionName),
    },
    general: {
      fileName,
      fileSizeMB: glbBuffer.byteLength / MB,
      sceneCount: sceneProp.length,
      nodeCount: gltfDoc.getRoot().listNodes().length,
      meshCount: meshesProp.length,
      primitiveCount: meshesProp.reduce((acc, m) => acc + (m.meshPrimitives || 1), 0),
      materialCount: matProp.length,
      textureCount: texProp.length,
      imageCount: texProp.length,
      animationCount: result.animations.properties.length,
      cameraCount: gltfDoc.getRoot().listCameras().length,
    },
    scenes: sceneProp.map((s, idx) => {
      const sceneNode = gltfDoc.getRoot().listScenes()[idx]
      const children = sceneNode ? sceneNode.listChildren() : []
      const rootName = children.length > 0 && children[0].getName() ? children[0].getName() : `Scene ${idx}`
      return {
        id: idx,
        name: s.name || `Scene ${idx}`,
        rootName,
        bboxMin: `${box.min.x.toFixed(5)}, ${box.min.y.toFixed(5)}, ${box.min.z.toFixed(5)}`,
        bboxMax: `${box.max.x.toFixed(5)}, ${box.max.y.toFixed(5)}, ${box.max.z.toFixed(5)}`,
        renderVertexCount: totalTriangles * 3,
        uploadVertexCount: meshesProp.reduce((acc, m) => acc + (m.vertices || 0), 0),
        uploadNaiveVertexCount: meshesProp.reduce((acc, m) => acc + (m.vertices || 0) * (m.instances || 1), 0),
      }
    }),
    meshes: meshesProp.map((m, idx) => ({
      id: idx,
      name: m.name || `Mesh ${idx}`,
      mode: Array.isArray(m.mode) ? m.mode.join(', ') : (m.mode || 'TRIANGLES'),
      meshPrimitives: m.meshPrimitives || 1,
      glPrimitives: m.glPrimitives || 0,
      vertices: m.vertices || 0,
      indices: Array.isArray(m.indices) ? m.indices.join(', ') : (m.indices || 'none'),
      attributes: m.attributes ? m.attributes.join(', ') : '',
      instances: m.instances || 1,
      size: (m.size || 0) >= MB
        ? `${((m.size || 0) / MB).toFixed(2)} MB`
        : `${((m.size || 0) / 1000).toFixed(2)} KB`,
    })),
    geometry: {
      totalVertices: meshesProp.reduce((acc, m) => acc + (m.vertices || 0), 0),
      totalTriangles,
      totalDrawCalls,
      skinnedMeshCount: 0,
      morphTargetCount: 0,
    },
    gpuMemory: {
      totalGeometryMemoryMB: +(totalGeomBytes / MB).toFixed(2),
      estimatedTextureMemoryMB: +(estimatedTexMemBytes / MB).toFixed(2),
      totalEstimatedGpuMemoryMB: +totalGpuMB.toFixed(2),
    },
    textures: texProp.map((t, idx) => {
      const { w, h } = parseResolution(t.resolution)
      return {
        id: idx,
        name: t.name || `image_${idx}`,
        slots: Array.isArray(t.slots) ? t.slots : [],
        instances: t.instances || 1,
        mimeType: t.mimeType || 'unknown',
        compression: t.mimeType === 'image/ktx2' ? 'KTX2' : (t.compression || 'None'),
        width: w,
        height: h,
        estimatedMemoryMB: +((t.gpuSize || 0) / MB).toFixed(2),
        fileSizeKB: +((t.size || 0) / 1000).toFixed(1),
        colorSpace: t.colorSpace || 'sRGB',
        thumbnailUrl: thumbnailUrls[idx] || '',
      }
    }),
    materials: matProp.map((m, idx) => ({
      id: idx,
      name: m.name || `Material ${idx}`,
      instances: m.instances || 1,
      textures: Array.isArray(m.textures) ? m.textures : [],
      alphaMode: m.alphaMode || 'OPAQUE',
      doubleSided: !!m.doubleSided,
    })),
    performance: {
      drawCalls: totalDrawCalls,
      triangleCount: totalTriangles,
      vertexCount: meshesProp.reduce((acc, m) => acc + (m.vertices || 0), 0),
      totalGpuMemoryMB: +totalGpuMB.toFixed(2),
      badge: getPerformanceBadge(totalGpuMB, totalDrawCalls),
    },
    extensions: {
      used: gltfDoc.getRoot().listExtensionsUsed().map(e => e.extensionName),
      required: gltfDoc.getRoot().listExtensionsRequired().map(e => e.extensionName),
    },
    boundingBox: {
      width: +size.x.toFixed(3),
      height: +size.y.toFixed(3),
      depth: +size.z.toFixed(3),
    },
    suggestions: [],
  }
}
