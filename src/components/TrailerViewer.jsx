const DOT_COUNT = 5

export default function TrailerViewer() {
  return (
    <div className="relative flex-1 flex flex-col min-h-0 pb-0 lg:pb-[72px]">

      {/* Trailer image — fills available space */}
      <div className="relative flex-1 flex items-center justify-center min-h-0 px-8 md:px-20">
        <img
          src="/trailer.png"
          alt="MAXX-D Trailer"
          className="max-w-full max-h-full object-contain drop-shadow-2xl"
          onError={(e) => { e.currentTarget.style.display = 'none' }}
        />
      </div>

      {/* Dot navigation — vertically centred on right edge */}
      {/* <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
        {Array.from({ length: DOT_COUNT }).map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-all ${
              i === 0 ? 'bg-[#DA634B]' : 'bg-[#4a4a4a]'
            }`}
          />
        ))}
      </div> */}

      {/* View controls — centred in viewer area (excludes right panel), hidden on mobile/tablet */}
      <div className="hidden lg:flex items-center justify-center mb-6 gap-3 py-5 lg:pr-[500px] xl:pr-[551px]">
        <button
          aria-label="360 View"
          className="w-11 h-9 flex items-center py-5 justify-center bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg hover:border-[#DA634B] transition-colors"
        >
          <img src="/eyes.png" />
        </button>

        <button
          aria-label="Scenic View"
          className="w-11 h-9 flex items-center py-5 justify-center bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg hover:border-[#DA634B] transition-colors"
        >
          <img src="/view.png" />
        </button>

        <button
          aria-label="Customize"
          className="w-11 h-9 flex items-center py-5 justify-center bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg hover:border-[#DA634B] transition-colors"
        >
          <img src="/Dimension.png" />
        </button>

        <button className="flex items-center gap-2 px-5 py-3 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg text-sm font-semibold tracking-widest uppercase text-gray-300 hover:border-[#DA634B] hover:text-white transition-all">
          
          VIEW IN YOUR DRIVEWAY
        </button>
      </div>
    </div>
  )
}
