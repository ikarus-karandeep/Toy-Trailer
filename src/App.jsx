import { ConfiguratorProvider } from './context/ConfiguratorContext'
import Configurator from './pages/Configurator'

export default function App() {
  return (
    <ConfiguratorProvider>
      <Configurator />
    </ConfiguratorProvider>
  )
}
