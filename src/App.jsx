import { useState, useEffect, useMemo, useCallback } from 'react'
import LZString from 'lz-string'
import { ConfiguratorProvider, useConfigurator } from './context/ConfiguratorContext'
import Configurator from './pages/Configurator'
import ARPage from './pages/ARPage'
import InlineAROverlay from './components/InlineAROverlay'
import CategorySelection from './pages/Wizard/CategorySelection'
import PackageSelection from './pages/Wizard/PackageSelection'
import { PACKAGE_INITIAL_CONFIGS } from './constants/packageConfigs'

function decodeArKey(search) {
  try {
    const match = search.match(/[?&]arKey=([^&]+)/)
    if (!match) return null
    const raw = match[1]
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

function WizardRouter({ step, goToStep, selectedCategory, setSelectedCategory, selectedPackage, setSelectedPackage, arConfig, modelMesh, handleModelReady }) {
  const { applyPackage } = useConfigurator()

  // AR route — handle before wizard
  if (!arConfig && window.location.hash.startsWith('#ar')) return <ARPage />

  // Step 1: Category Selection (clean URL)
  if (step === 1) {
    return (
      <CategorySelection
        key={selectedCategory}
        initialSelected={selectedCategory}
        onSelect={(id) => { 
          setSelectedCategory(id);
          if (id === 'motorsports') {
            setSelectedPackage('track-pack');
          } else if (id === 'contractor' || id === 'car-hauling') {
            setSelectedPackage('job-site');
          } else if (id === 'livability') {
            setSelectedPackage('base-camp');
          } else {
            setSelectedPackage('no-package');
          }
          goToStep(2);
        }}
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
          applyPackage(id, PACKAGE_INITIAL_CONFIGS[id] ?? {})
          goToStep(3)
        }}
        onBack={() => goToStep(1)}
      />
    )
  }

  // Step 3: Main Configurator (#configurator)
  return (
    <>
      <Configurator onModelReady={arConfig ? handleModelReady : undefined} />
      {arConfig && <InlineAROverlay modelMesh={modelMesh} />}
    </>
  )
}

export default function App() {
  const [hash, setHash] = useState(window.location.hash)
  const arConfig = useMemo(() => decodeArKey(window.location.search), [])
  const [modelMesh, setModelMesh] = useState(null)

  // Persist selections across wizard steps
  const [selectedCategory, setSelectedCategory] = useState(DEFAULT_CATEGORY)
  const [selectedPackage,  setSelectedPackage]  = useState(DEFAULT_PACKAGE)

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

  // The config that will be passed to ConfiguratorProvider ONLY ONCE
  // Merge package config with any AR config, and include the package ID for badge display
  const mergedConfig = useMemo(() => {
    return { packageId: selectedPackage, ...(PACKAGE_INITIAL_CONFIGS[selectedPackage] ?? {}), ...(arConfig ?? {}) }
  }, [arConfig]) // only run initially or when arConfig changes

  return (
    <ConfiguratorProvider initialConfig={mergedConfig}>
      <WizardRouter 
        step={step}
        goToStep={goToStep}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        selectedPackage={selectedPackage}
        setSelectedPackage={setSelectedPackage}
        arConfig={arConfig}
        modelMesh={modelMesh}
        handleModelReady={handleModelReady}
      />
    </ConfiguratorProvider>
  )
}
