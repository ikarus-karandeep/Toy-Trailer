import '@google/model-viewer'
import { useRef, useEffect, useCallback } from 'react'
import * as THREE from 'three'

async function exportGLB(mesh) {
  const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js')
  const exportGroup = new THREE.Group()
  mesh.updateWorldMatrix(true, true)
  mesh.traverse(child => {
    if (!child.isMesh) return
    let visible = true
    let node = child
    while (node) { if (!node.visible) { visible = false; break } node = node.parent }
    if (!visible) return
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
    } else {
      const geo = child.geometry.clone()
      geo.applyMatrix4(child.matrixWorld)
      exportGroup.add(new THREE.Mesh(geo, child.material))
    }
  })
  return new Promise((resolve, reject) =>
    new GLTFExporter().parse(exportGroup, resolve, reject, { binary: true })
  )
}

export default function InlineAROverlay({ modelMesh }) {
  const modelViewerRef = useRef()
  const triggered = useRef(false)

  const handleExport = useCallback(async (mesh) => {
    try {
      const result = await exportGLB(mesh)
      const blob = new Blob([result], { type: 'model/gltf-binary' })
      const blobUrl = URL.createObjectURL(blob)

      const viewer = modelViewerRef.current
      if (!viewer) return

      const handleLoad = () => {
        viewer.removeEventListener('load', handleLoad)
        if (viewer.canActivateAR) viewer.activateAR()
      }
      viewer.addEventListener('load', handleLoad)
      viewer.setAttribute('src', blobUrl)
    } catch (err) {
      console.error('[InlineAR] export error:', err)
    }
  }, [])

  // Trigger export once when the main viewer's model mesh becomes available
  useEffect(() => {
    if (!modelMesh || triggered.current) return
    triggered.current = true
    handleExport(modelMesh)
  }, [modelMesh, handleExport])

  return (
    <model-viewer
      ref={modelViewerRef}
      ar
      ar-modes="quick-look scene-viewer webxr"
      reveal="auto"
      class="fixed top-0 left-0 w-px h-px opacity-0 pointer-events-none"
    />
  )
}
