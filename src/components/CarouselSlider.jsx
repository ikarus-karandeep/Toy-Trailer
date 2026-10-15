import { useRef, useEffect, useLayoutEffect, useState } from 'react'

export default function CarouselSlider({
  options = [],
  value,
  onChange,
  badge,
  formatLabel,
  maxWidth = 'max-w-[420px]'
}) {
  const scrollRef = useRef(null)
  const selectedRef = useRef(null)
  const badgeContainerRef = useRef(null)
  const pillRef = useRef(null)

  const [clampedLeft, setClampedLeft] = useState(0)
  const [arrowLeft, setArrowLeft] = useState(0)
  const [pillWidth, setPillWidth] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)

  const activeIndex = options.findIndex((opt) => opt.id === value)
  const canPrev = activeIndex > 0
  const canNext = activeIndex < options.length - 1

  // Update floating badge position directly over selected item
  const updateBadgePosition = () => {
    if (!selectedRef.current || !badgeContainerRef.current) return
    const selRect = selectedRef.current.getBoundingClientRect()
    const contRect = badgeContainerRef.current.getBoundingClientRect()
    const pWidth = pillRef.current ? pillRef.current.offsetWidth : 70
    setPillWidth(pWidth)

    const centerPx = selRect.left + selRect.width / 2 - contRect.left
    const idealLeft = centerPx - pWidth / 2
    const clamped = Math.max(0, Math.min(contRect.width - pWidth, idealLeft))
    const arrowOffset = centerPx - clamped

    setClampedLeft(clamped)
    setArrowLeft(arrowOffset)
  }

  // Keep selected item centered in the carousel
  useEffect(() => {
    if (selectedRef.current && scrollRef.current) {
      selectedRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest'
      })
    }
  }, [value, options])

  useLayoutEffect(() => {
    updateBadgePosition()
    const timer = setTimeout(updateBadgePosition, 60)
    return () => clearTimeout(timer)
  }, [value, badge, options])

  useEffect(() => {
    const handleResize = () => updateBadgePosition()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handlePrev = () => {
    for (let i = activeIndex - 1; i >= 0; i--) {
      if (!options[i].locked) {
        onChange(options[i].id)
        break
      }
    }
  }

  const handleNext = () => {
    for (let i = activeIndex + 1; i < options.length; i++) {
      if (!options[i].locked) {
        onChange(options[i].id)
        break
      }
    }
  }

  // Mouse drag handling
  const handleMouseDown = (e) => {
    if (!scrollRef.current) return
    setIsDragging(true)
    setStartX(e.pageX - scrollRef.current.offsetLeft)
    setScrollLeft(scrollRef.current.scrollLeft)
  }

  const handleMouseMove = (e) => {
    if (!isDragging || !scrollRef.current) return
    e.preventDefault()
    const x = e.pageX - scrollRef.current.offsetLeft
    const walk = (x - startX) * 1.5
    scrollRef.current.scrollLeft = scrollLeft - walk
    updateBadgePosition()
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  return (
    <div className={`w-full ${maxWidth} mx-auto select-none`}>
      {/* Floating Badge (pointing down at selected item) */}
      <div
        ref={badgeContainerRef}
        className="relative w-full h-8 mb-1 pointer-events-none"
      >
        {badge && (
          <div
            className="absolute bottom-0"
            style={{
              left: clampedLeft,
              transition: isDragging ? 'none' : 'left 0.15s ease',
            }}
          >
            {/* Pill */}
            <span
              ref={pillRef}
              className="inline-flex items-center whitespace-nowrap px-3 py-1 rounded-full text-xs font-semibold tracking-wider text-white shadow-md"
              style={{ background: 'linear-gradient(135deg, #DA634B 0%, #c04a32 100%)' }}
            >
              {badge}
            </span>
            {/* Downward pointing arrow */}
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

      {/* Pill Slider / Carousel */}
      <div className="relative flex items-center justify-between bg-[#1e2023] border border-[#34373d] rounded-full px-2 sm:px-3 py-1.5 w-full shadow-inner">
        {/* Left Arrow Button */}
        <button
          type="button"
          onClick={handlePrev}
          disabled={!canPrev}
          aria-label="Previous Option"
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors disabled:opacity-25 disabled:cursor-not-allowed hover:bg-white/5 active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Scrollable Items Row */}
        <div
          ref={scrollRef}
          onScroll={updateBadgePosition}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="flex-1 overflow-x-auto scrollbar-hide flex items-center gap-1.5 sm:gap-2 px-2 py-0.5 scroll-smooth cursor-grab active:cursor-grabbing"
        >
          {options.map((opt) => {
            const isSelected = opt.id === value
            const labelText = formatLabel ? formatLabel(opt) : (opt.label || opt.id)

            if (isSelected) {
              return (
                <button
                  key={opt.id}
                  ref={selectedRef}
                  type="button"
                  className="flex-shrink-0 min-w-[34px] sm:min-w-[38px] px-2.5 h-8 sm:h-9 rounded-full bg-[#DA634B] text-white font-bold text-xs sm:text-sm flex items-center justify-center shadow-[0_0_12px_rgba(218,99,75,0.45)] transition-transform scale-105 whitespace-nowrap"
                >
                  {labelText}
                </button>
              )
            }

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  if (!opt.locked) onChange(opt.id)
                }}
                disabled={opt.locked}
                className={`flex-shrink-0 min-w-[30px] sm:min-w-[34px] px-2 h-7 sm:h-8 rounded-full font-medium text-xs sm:text-sm flex items-center justify-center transition-all whitespace-nowrap ${
                  opt.locked
                    ? 'text-gray-600 cursor-not-allowed opacity-40'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {labelText}
              </button>
            )
          })}
        </div>

        {/* Right Arrow Button */}
        <button
          type="button"
          onClick={handleNext}
          disabled={!canNext}
          aria-label="Next Option"
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors disabled:opacity-25 disabled:cursor-not-allowed hover:bg-white/5 active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}
