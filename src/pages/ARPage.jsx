import '@google/model-viewer'
import { useRef, useEffect } from 'react'

export default function ARPage() {
  const modelRef = useRef()
  const modelUrl = `${window.location.origin}/models/Base.glb`

  useEffect(() => {
    const viewer = modelRef.current
    if (!viewer) return
    const onLoad = () => {
      if (viewer.canActivateAR) viewer.activateAR()
    }
    viewer.addEventListener('load', onLoad)
    return () => viewer.removeEventListener('load', onLoad)
  }, [])

  return (
    <model-viewer
      ref={modelRef}
      src={modelUrl}
      ar
      ar-modes="quick-look webxr scene-viewer"
      reveal="auto"
      camera-controls
      tone-mapping="commerce"
      shadow-intensity="1"
      exposure="0.7"
      touch-action="pan-y pinch-zoom"
      class="fixed inset-0 w-full h-full block"
    />
  )
}
