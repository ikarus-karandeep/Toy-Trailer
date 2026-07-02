import '@google/model-viewer'
import { useRef, useState, useEffect } from 'react'

export default function ARViewer({ url, onClose }) {
  const modelRef = useRef()
  const [status, setStatus] = useState('loading') // loading | ready | unsupported

  useEffect(() => {
    const viewer = modelRef.current
    if (!viewer) return
    const handleLoad = () => {
      if (viewer.canActivateAR) {
        viewer.activateAR()
        setStatus('ready')
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
        ar-modes="quick-look webxr scene-viewer"
        reveal="auto"
        camera-controls
        tone-mapping="commerce"
        shadow-intensity="1"
        exposure="0.7"
        touch-action="pan-y pinch-zoom"
        class={`w-full h-full block ${status !== 'unsupported' ? 'opacity-0 pointer-events-none' : ''}`}
      />

      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <img src="/loader.gif" alt="Loading" className="w-24 h-24" />
        </div>
      )}

      {status === 'ready' && (
        <button
          onClick={handleTap}
          className="absolute inset-0 flex flex-col items-center justify-center gap-6 w-full"
        >
          <div className="w-20 h-20 rounded-full bg-[#DA634B] flex items-center justify-center">
            <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9.5 6.5l7 5.5-7 5.5z" />
            </svg>
          </div>
          <span className="text-white text-sm font-semibold tracking-widest uppercase">
            Tap to View in AR
          </span>
        </button>
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
