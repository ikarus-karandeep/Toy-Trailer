import { useConfigurator } from '../context/ConfiguratorContext'

export default function ViewToggle() {
  const { viewMode, setViewMode } = useConfigurator()

  return (
    <div className="flex bg-[#2a2a2a] border border-[#3a3a3a] rounded-md h-[50px] p-1">
      {['EXTERIOR', 'INTERIOR'].map((mode) => (
        <button
          key={mode}
          onClick={() => setViewMode(mode)}
          className={`px-6 text-sm tracking-widest rounded-md uppercase transition-all duration-200 ${
            viewMode === mode
              ? 'bg-[#16181b] text-white shadow'
              : 'text-white'
          }`}
        >
          {mode}
        </button>
      ))}
    </div>
  )
}
