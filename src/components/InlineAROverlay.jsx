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
  const [isPreparing, setIsPreparing] = useState(true)
  const [arProgress, setArProgress] = useState(0)

  // eslint-disable-next-line no-unused-vars
  const config = useConfigurator()

  useEffect(() => {
    let interval;
    if (isPreparing) {
      setArProgress(0)
      interval = setInterval(() => {
        setArProgress(p => {
          if (p >= 90) return p;
          return p + Math.random() * 15;
        })
      }, 200)
    } else {
      setArProgress(100)
      setTimeout(() => setArProgress(0), 300)
    }
    return () => clearInterval(interval)
  }, [isPreparing])

  const handleExport = useCallback(async (mesh) => {
    try {
      const result = await exportForAR(mesh)
      const blob = new Blob([result], { type: 'model/gltf-binary' })
      const blobUrl = URL.createObjectURL(blob)

      const viewer = modelViewerRef.current
      if (!viewer) {
        setIsPreparing(false)
        return
      }

      const handleLoad = () => {
        viewer.removeEventListener('load', handleLoad)
        setIsPreparing(false)
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
      setIsPreparing(false)
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

      {isPreparing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-[28px] bg-[#2a2a2a] border border-white/10 shadow-2xl px-6 pt-6 pb-8 flex flex-col items-center">
            <h2 className="text-white text-[18px] leading-tight font-extrabold mb-4 text-center">
              Preparing AR Model
            </h2>
            <div className="w-full h-2 bg-[#1a1a1a] rounded-full overflow-hidden relative">
              <div 
                className="absolute top-0 left-0 bottom-0 bg-[#DA634B] transition-all duration-300 ease-out" 
                style={{ width: `${arProgress}%` }}
              />
            </div>
            <p className="mt-3 text-white/50 text-[12px] font-medium tracking-wide uppercase">
              Please wait...
            </p>
          </div>
        </div>
      )}

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
