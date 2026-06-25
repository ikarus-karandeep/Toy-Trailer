import { useState, useEffect } from 'react'
import { ConfiguratorProvider } from './context/ConfiguratorContext'
import Configurator from './pages/Configurator'
import ARPage from './pages/ARPage'

export default function App() {
  const [hash, setHash] = useState(window.location.hash)

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  if (hash.startsWith('#ar')) return <ARPage />

  return (
    <ConfiguratorProvider>
      <Configurator />
    </ConfiguratorProvider>
  )
}
