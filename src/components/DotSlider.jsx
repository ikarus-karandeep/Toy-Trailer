import { useRef, useState, useLayoutEffect } from 'react'

export default function DotSlider({ options, value, onChange, badge }) {
  const rowRef = useRef(null)
  const pillRef = useRef(null)
  const containerRef = useRef(null)
  const [dragRatio, setDragRatio] = useState(null)
  const [pillWidth, setPillWidth] = useState(0)
  const [containerWidth, setContainerWidth] = useState(0)

  // Measure pill and container whenever badge changes or on mount
  useLayoutEffect(() => {
    if (pillRef.current) setPillWidth(pillRef.current.offsetWidth)
    if (containerRef.current) setContainerWidth(containerRef.current.offsetWidth)
  }, [badge])

  const getRatio = (clientX) => {
    const el = rowRef.current
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  }

  const ratioToIndex = (ratio) => Math.round(ratio * (options.length - 1))

  const handleMouseDown = (e) => {
    e.preventDefault()
    setDragRatio(getRatio(e.clientX))

    const onMove = (ev) => setDragRatio(getRatio(ev.clientX))
    const onUp = (ev) => {
      const idx = ratioToIndex(getRatio(ev.clientX))
      onChange(options[idx].id)
      setDragRatio(null)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const handleTouchStart = (e) => {
    setDragRatio(getRatio(e.touches[0].clientX))

    const onMove = (ev) => setDragRatio(getRatio(ev.touches[0].clientX))
    const onEnd = (ev) => {
      const touch = ev.changedTouches[0]
      const idx = ratioToIndex(getRatio(touch.clientX))
      onChange(options[idx].id)
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

  // Thumb center in px relative to the container
  const thumbPx = thumbRatio * containerWidth

  // Ideal pill left so pill is centered on thumb
  const halfPill = pillWidth / 2
  const idealLeft = thumbPx - halfPill

  // Clamp pill so it never goes outside [0, containerWidth - pillWidth]
  const clampedLeft = Math.max(0, Math.min(containerWidth - pillWidth, idealLeft))

  // Arrow offset relative to the pill — keeps pointing at the thumb dot
  const arrowLeft = thumbPx - clampedLeft

  return (
    <div className="px-1" style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
      {/* Badge area — fixed height so layout doesn't jump */}
      <div ref={containerRef} className="relative h-9 mb-1">
        {badge && (
          <div
            className="absolute bottom-0 pointer-events-none"
            style={{
              left: clampedLeft,
              transition: isDragging ? 'none' : 'left 0.15s ease',
            }}
          >
            {/* Pill */}
            <span
              ref={pillRef}
              className="inline-flex items-center whitespace-nowrap px-3 py-1 rounded-full text-xs font-semibold tracking-wider text-white"
              style={{ background: 'linear-gradient(135deg, #DA634B 0%, #c04a32 100%)' }}
            >
              {badge}
            </span>
            {/* Arrow — shifts within the pill to always point at the dot */}
            <span
              style={{
                position: 'absolute',
                bottom: -5,
                left: Math.max(8, Math.min(pillWidth - 13, arrowLeft - 5)),
                width: 0,
                height: 0,
                borderLeft: '5px solid transparent',
                borderRight: '5px solid transparent',
                borderTop: '5px solid #c04a32',
                transition: isDragging ? 'none' : 'left 0.15s ease',
              }}
            />
          </div>
        )}
      </div>

      <div className="relative flex items-center h-7">
        {/* Track line */}
        <div className="absolute left-2 right-2 top-1/2 h-[2px] bg-white/80 -translate-y-1/2" />

        {/* Invisible drag zone */}
        <div
          ref={rowRef}
          className="absolute left-0 right-0 top-0 bottom-0 cursor-pointer"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        />

        {/* Static dots */}
        <div className="relative w-full flex justify-between items-center pointer-events-none">
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
                    isActive ? 'bg-white shadow-md' : 'bg-white'
                  }`}
                  style={{ width: '100%', height: '100%' }}
                />
              </span>
            )
          })}
        </div>

        {/* Moving thumb — only visible while dragging */}
        {isDragging && (
          <div
            className="absolute z-20 pointer-events-none"
            style={{
              left: `${thumbRatio * 100}%`,
              top: '50%',
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
      <div className="flex justify-between mt-2 px-0">
        {options.map((opt, i) => (
          <button
            key={opt.id}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onChange(opt.id)}
            className={`text-[9px] font-semibold tracking-wider transition-colors ${
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
