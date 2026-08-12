import '@google/model-viewer'
import { useRef, useEffect, useCallback, useState } from 'react'
import { isAndroidDevice } from '../utils/arPlatform'
import { exportForAR } from '../utils/arExport'
import { useConfigurator } from '../context/ConfiguratorContext'

export default function InlineAROverlay({ modelMesh }) {
  const modelViewerRef = useRef()
  const triggered = useRef(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isReady, setIsReady] = useState(false)

  // eslint-disable-next-line no-unused-vars
  const config = useConfigurator()

  const handleExport = useCallback(async (mesh) => {
    try {
      const result = await exportForAR(mesh)
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
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Trigger export once when the model mesh is available.
  // Wait 1.5s so React Three Fiber can populate all instance matrices.
  useEffect(() => {
    if (!modelMesh || triggered.current) return
    triggered.current = true
    setTimeout(() => { handleExport(modelMesh) }, 1500)
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
