import '@google/model-viewer'
import { useRef, useEffect, useCallback, useState } from 'react'
import * as THREE from 'three'
import { isAndroidDevice } from '../utils/arPlatform'

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
  const [showPrompt, setShowPrompt] = useState(false)
  const [isReady, setIsReady] = useState(false)

  const handleExport = useCallback(async (mesh) => {
    try {
      const result = await exportGLB(mesh)
      const blob = new Blob([result], { type: 'model/gltf-binary' })
      const blobUrl = URL.createObjectURL(blob)

      const viewer = modelViewerRef.current
      if (!viewer) return

      const handleLoad = () => {
        viewer.removeEventListener('load', handleLoad)
        if (viewer.canActivateAR) {
          setIsReady(true)
          if (isAndroidDevice()) {
            setShowPrompt(true)
          } else {
            viewer.activateAR()
          }
        }
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

  const handleOpenAR = () => {
    const viewer = modelViewerRef.current
    if (viewer?.canActivateAR) viewer.activateAR()
  }

  return (
    <>
      <model-viewer
        ref={modelViewerRef}
        ar
        ar-modes={isAndroidDevice() ? 'webxr' : 'quick-look webxr'}
        reveal="auto"
        className="fixed top-0 left-0 w-px h-px opacity-0 pointer-events-none"
      />

      {isReady && showPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-[28px] bg-[#2a2a2a] border border-white/10 shadow-2xl px-5 pt-6 pb-5">
            <h2 className="text-white text-[22px] leading-tight font-extrabold">
              View in AR?
            </h2>
            <p className="mt-3 text-white/70 text-[14px] leading-relaxed">
              You can view this object in 3D and place it in your surroundings using augmented reality.
            </p>
            <div className="mt-7 grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowPrompt(false)}
                className="h-12 rounded-full bg-white/10 text-white text-sm font-semibold hover:bg-white/15 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleOpenAR}
                className="h-12 rounded-full bg-[#5a5a5a] text-white text-sm font-semibold hover:bg-[#686868] transition-colors"
              >
                View in AR
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
