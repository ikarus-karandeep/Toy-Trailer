import { useState, useEffect, useMemo, useCallback } from 'react'
import LZString from 'lz-string'
import { ConfiguratorProvider } from './context/ConfiguratorContext'
import Configurator from './pages/Configurator'
import ARPage from './pages/ARPage'
import InlineAROverlay from './components/InlineAROverlay'
import CategorySelection from './pages/Wizard/CategorySelection'
import PackageSelection from './pages/Wizard/PackageSelection'
import { PACKAGE_INITIAL_CONFIGS } from './constants/packageConfigs'

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

function getStepFromHash(hash) {
  if (hash === '#package') return 2
  if (hash === '#configurator') return 3
  return 1
}

// Fallback defaults
const DEFAULT_CATEGORY = 'motorsports'
const DEFAULT_PACKAGE  = 'track-pack'

export default function App() {
  const [hash, setHash] = useState(window.location.hash)
  const arConfig = useMemo(() => decodeArKey(window.location.search), [])
  const [modelMesh, setModelMesh] = useState(null)

  // Persist selections across wizard steps
  const [selectedCategory, setSelectedCategory] = useState(DEFAULT_CATEGORY)
  const [selectedPackage,  setSelectedPackage]  = useState(DEFAULT_PACKAGE)

  // The config that will be passed to ConfiguratorProvider based on package chosen
  const [packageConfig, setPackageConfig] = useState(PACKAGE_INITIAL_CONFIGS[DEFAULT_PACKAGE] ?? {})

  // Derive step purely from hash (unless AR config skips to step 3)
  const step = arConfig ? 3 : getStepFromHash(hash)

  // Navigate forward — step 1 = clean URL, step 2+ = hash
  const goToStep = (newStep) => {
    if (newStep === 1) {
      history.pushState(null, '', window.location.pathname + window.location.search)
      setHash('')
    } else if (newStep === 2) {
      window.location.hash = 'package'
    } else if (newStep === 3) {
      window.location.hash = 'configurator'
    }
  }

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash)
    const onPopState   = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onHashChange)
    window.addEventListener('popstate',   onPopState)
    return () => {
      window.removeEventListener('hashchange', onHashChange)
      window.removeEventListener('popstate',   onPopState)
    }
  }, [])

  const handleModelReady = useCallback((mesh) => setModelMesh(mesh), [])

  // AR route — handle before wizard
  if (!arConfig && hash.startsWith('#ar')) return <ARPage />

  // Step 1: Category Selection (clean URL)
  if (step === 1) {
    return (
      <CategorySelection
        key={selectedCategory}
        initialSelected={selectedCategory}
        onSelect={(id) => { setSelectedCategory(id); goToStep(2) }}
      />
    )
  }

  // Step 2: Package Selection (#package)
  if (step === 2) {
    return (
      <PackageSelection
        key={selectedPackage}
        initialSelected={selectedPackage}
        onSelect={(id) => {
          setSelectedPackage(id)
          // Apply the package's preset options to the configurator
          setPackageConfig(PACKAGE_INITIAL_CONFIGS[id] ?? {})
          goToStep(3)
        }}
        onBack={() => goToStep(1)}
      />
    )
  }

  // Step 3: Main Configurator (#configurator)
  // Merge package config with any AR config, and include the package ID for badge display
  const mergedConfig = { packageId: selectedPackage, ...packageConfig, ...(arConfig ?? {}) }
  return (
    <ConfiguratorProvider initialConfig={mergedConfig}>
      <Configurator onModelReady={arConfig ? handleModelReady : undefined} />
      {arConfig && <InlineAROverlay modelMesh={modelMesh} />}
    </ConfiguratorProvider>
  )
}
