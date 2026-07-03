import '@google/model-viewer'
import { useRef, useState, useEffect } from 'react'
import { isAndroidDevice } from '../utils/arPlatform'

export default function ARViewer({ url, onClose }) {
  const modelRef = useRef()
  const [status, setStatus] = useState('loading') // loading | ready | unsupported
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    const viewer = modelRef.current
    if (!viewer) return
    const handleLoad = () => {
      if (viewer.canActivateAR) {
        setStatus('ready')
        if (isAndroidDevice()) {
          setShowPrompt(true)
        } else {
          viewer.activateAR()
        }
      } else {
        setStatus('unsupported')
      }
    }
    viewer.addEventListener('load', handleLoad)
    return () => viewer.removeEventListener('load', handleLoad)
  }, [])

  const handleTap = () => {
    const viewer = modelRef.current
    if (viewer?.canActivateAR) viewer.activateAR()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <button
        onClick={onClose}
        className="absolute top-5 left-5 z-10 flex items-center gap-2 px-4 py-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg text-sm font-semibold text-gray-300 hover:border-[#DA634B] hover:text-white transition-all"
      >
        ← Back
      </button>

      <model-viewer
        ref={modelRef}
        src={url}
        ar
        ar-modes={isAndroidDevice() ? 'webxr' : 'quick-look webxr'}
        reveal="auto"
        camera-controls
        tone-mapping="commerce"
        shadow-intensity="1"
        exposure="0.7"
        touch-action="pan-y pinch-zoom"
        className={`w-full h-full block ${status !== 'unsupported' ? 'opacity-0 pointer-events-none' : ''}`}
      />

      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <img src="/loader.gif" alt="Loading" className="w-24 h-24" />
        </div>
      )}

      {status === 'ready' && showPrompt && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/55 backdrop-blur-sm px-4">
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
                onClick={handleTap}
                className="h-12 rounded-full bg-[#5a5a5a] text-white text-sm font-semibold hover:bg-[#686868] transition-colors"
              >
                View in AR
              </button>
            </div>
          </div>
        </div>
      )}

      {status === 'unsupported' && (
        <div className="absolute bottom-8 left-0 right-0 flex justify-center">
          <span className="text-gray-400 text-xs tracking-widest uppercase">
            AR not supported on this device
          </span>
        </div>
      )}
    </div>
  )
}
