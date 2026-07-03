import { useState, useEffect, useMemo, useCallback } from 'react'
import LZString from 'lz-string'
import { ConfiguratorProvider } from './context/ConfiguratorContext'
import Configurator from './pages/Configurator'
import ARPage from './pages/ARPage'
import InlineAROverlay from './components/InlineAROverlay'

function decodeArKey(search) {
  try {
    const raw = new URLSearchParams(search).get('arKey')
    if (!raw) return null
    const decoded = LZString.decompressFromEncodedURIComponent(decodeURIComponent(raw))
    return decoded ? JSON.parse(decoded) : null
  } catch {
    return null
  }
}

export default function App() {
  const [hash, setHash] = useState(window.location.hash)
  const arConfig = useMemo(() => decodeArKey(window.location.search), [])
  const [modelMesh, setModelMesh] = useState(null)

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const handleModelReady = useCallback((mesh) => setModelMesh(mesh), [])

  if (hash.startsWith('#ar')) return <ARPage />

  return (
    <ConfiguratorProvider initialConfig={arConfig ?? {}}>
      <Configurator onModelReady={arConfig ? handleModelReady : undefined} />
      {arConfig && <InlineAROverlay modelMesh={modelMesh} />}
    </ConfiguratorProvider>
  )
}
