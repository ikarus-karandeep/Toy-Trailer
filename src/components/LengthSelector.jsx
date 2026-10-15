import CarouselSlider from './CarouselSlider'

export default function LengthSelector({ options = [], value, onChange, badge, subtext }) {
  return (
    <div className="flex flex-col items-center w-full select-none">
      {/* Subtext description */}
      {subtext && (
        <p className="text-gray-400 text-xs tracking-wider -mt-3 mb-2 text-center sm:text-left w-full">
          {subtext}
        </p>
      )}

      {/* Trailer Vector Diagram */}
      <div className="w-full flex justify-center py-2 sm:py-3">
        <svg
          viewBox="0 0 340 170"
          className="w-full max-w-[260px] sm:max-w-[310px] h-auto drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Main roof & front body outline */}
          <path
            d="M 40 38 H 285 V 104 H 208 L 172 120 H 168"
            stroke="white"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Axle connecting line between wheels */}
          <line
            x1="132"
            y1="120"
            x2="108"
            y2="120"
            stroke="white"
            strokeWidth="5"
            strokeLinecap="round"
          />

          {/* Rear floor and rear vertical wall */}
          <path
            d="M 72 120 H 40 V 38"
            stroke="white"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Rear Wheel (Wheel 1) */}
          <circle
            cx="90"
            cy="120"
            r="18"
            fill="#16181b"
            stroke="white"
            strokeWidth="5"
          />

          {/* Front Wheel (Wheel 2) */}
          <circle
            cx="150"
            cy="120"
            r="18"
            fill="#16181b"
            stroke="white"
            strokeWidth="5"
          />

          {/* Tongue Jack vertical stem */}
          <line
            x1="246"
            y1="104"
            x2="246"
            y2="136"
            stroke="white"
            strokeWidth="5"
            strokeLinecap="round"
          />

          {/* Tongue Jack horizontal foot */}
          <line
            x1="235"
            y1="136"
            x2="257"
            y2="136"
            stroke="white"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Reusable Carousel Slider */}
      <CarouselSlider
        options={options}
        value={value}
        onChange={onChange}
        badge={badge}
        formatLabel={(opt) => opt.id.replace(/\D/g, '') || opt.id}
        maxWidth="max-w-[380px]"
      />
    </div>
  )
}
