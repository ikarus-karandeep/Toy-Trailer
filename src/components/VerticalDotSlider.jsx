import { useRef, useState, useLayoutEffect } from 'react'

export default function VerticalDotSlider({ options, value, onChange, badge }) {
  const colRef = useRef(null)
  const pillRef = useRef(null)
  const containerRef = useRef(null)
  const [dragRatio, setDragRatio] = useState(null)
  const [pillHeight, setPillHeight] = useState(0)
  const [containerHeight, setContainerHeight] = useState(0)

  // Measure pill and container whenever badge changes or on mount
  useLayoutEffect(() => {
    if (pillRef.current) setPillHeight(pillRef.current.offsetHeight)
    if (containerRef.current) setContainerHeight(containerRef.current.offsetHeight)
  }, [badge])

  const getRatio = (clientY) => {
    const el = colRef.current
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    return Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
  }

  const ratioToIndex = (ratio) => Math.round(ratio * (options.length - 1))

  const handleMouseDown = (e) => {
    e.preventDefault()
    setDragRatio(getRatio(e.clientY))

    const onMove = (ev) => setDragRatio(getRatio(ev.clientY))
    const onUp = (ev) => {
      const idx = ratioToIndex(getRatio(ev.clientY))
      if (!options[idx].locked) {
        onChange(options[idx].id)
      }
      setDragRatio(null)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const handleTouchStart = (e) => {
    setDragRatio(getRatio(e.touches[0].clientY))

    const onMove = (ev) => setDragRatio(getRatio(ev.touches[0].clientY))
    const onEnd = (ev) => {
      const touch = ev.changedTouches[0]
      const idx = ratioToIndex(getRatio(touch.clientY))
      if (!options[idx].locked) {
        onChange(options[idx].id)
      }
      setDragRatio(null)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
    }
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onEnd)
  }

  const activeIndex = options.findIndex((o) => o.id === value)
  const isDragging = dragRatio !== null
  const nearestIndex = isDragging ? ratioToIndex(dragRatio) : activeIndex
  const thumbRatio = isDragging ? dragRatio : activeIndex / (options.length - 1)

  const thumbPx = thumbRatio * containerHeight
  const halfPill = pillHeight / 2
  const idealTop = thumbPx - halfPill
  const clampedTop = Math.max(0, Math.min(containerHeight - pillHeight, idealTop))
  const arrowTop = thumbPx - clampedTop

  return (
    <div className="flex" style={{ userSelect: 'none', WebkitUserSelect: 'none', height: '100%' }}>
      {/* Badge area */}
      {badge && (
        <div ref={containerRef} className="relative w-20 mr-2 flex-shrink-0">
          <div
            className="absolute right-0 pointer-events-none"
            style={{
              top: clampedTop,
              transition: isDragging ? 'none' : 'top 0.15s ease',
            }}
          >
            <span
              ref={pillRef}
              className="inline-flex items-center whitespace-nowrap px-3 py-1 rounded-full text-xs font-semibold tracking-wider text-white"
              style={{ background: 'linear-gradient(135deg, #DA634B 0%, #c04a32 100%)' }}
            >
              {badge}
            </span>
            <span
              style={{
                position: 'absolute',
                right: -5,
                top: Math.max(8, Math.min(pillHeight - 13, arrowTop - 5)),
                width: 0,
                height: 0,
                borderTop: '5px solid transparent',
                borderBottom: '5px solid transparent',
                borderLeft: '5px solid #c04a32',
                transition: isDragging ? 'none' : 'top 0.15s ease',
              }}
            />
          </div>
        </div>
      )}

      <div className="relative flex flex-col items-center w-7 h-full flex-grow">
        {/* Track line */}
        <div className="absolute top-2 bottom-2 left-1/2 w-[2px] bg-white/80 -translate-x-1/2" />

        {/* Invisible drag zone */}
        <div
          ref={colRef}
          className="absolute left-0 right-0 top-0 bottom-0 cursor-pointer z-30"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        />

        {/* Static dots */}
        <div className="relative h-full flex flex-col justify-between items-center pointer-events-none">
          {options.map((opt, i) => {
            const isActive = i === nearestIndex
            return (
              <span
                key={opt.id}
                className="relative z-10 flex items-center justify-center"
                style={{ width: isActive ? 26 : 14, height: isActive ? 26 : 14 }}
              >
                <span
                  className={`block rounded-full transition-all duration-150 ${
                    isActive ? 'bg-white shadow-md' : opt.locked ? 'bg-gray-700' : 'bg-white'
                  }`}
                  style={{ width: '100%', height: '100%' }}
                />
              </span>
            )
          })}
        </div>

        {/* Moving thumb */}
        {isDragging && (
          <div
            className="absolute z-20 pointer-events-none"
            style={{
              top: `${thumbRatio * 100}%`,
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            <span
              className="block rounded-full bg-white"
              style={{
                width: 26,
                height: 26,
                boxShadow: '0 0 10px 3px rgba(255,255,255,0.45)',
              }}
            />
          </div>
        )}
      </div>

      {/* Labels */}
      <div className="flex flex-col justify-between ml-2 h-full py-0">
        {options.map((opt, i) => (
          <button
            key={opt.id}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onChange(opt.id)}
            className={`text-[9px] font-semibold tracking-wider transition-colors text-left ${
              i === nearestIndex ? 'text-[#DA634B]' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
