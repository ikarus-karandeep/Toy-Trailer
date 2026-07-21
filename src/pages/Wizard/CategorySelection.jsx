import React, { useState, useEffect } from 'react';

const CATEGORIES = [
  {
    id: 'motorsports',
    title: 'Motorsports/ Racing',
    description: 'For hauling a race car to the track, running car shows, or transporting a project car. Leads to exterior styling, wheels, and race-day features',
    image: '/motorspots.png'
  },
  {
    id: 'car-hauling',
    title: 'Car Hauling',
    description: "For moving a daily driver, a project car, or a vehicle you're storing - no racing, just point A to B. Leads to a mix of styling and cargo options.",
    image: '/car-hauling.png'
  },
  {
    id: 'livability',
    title: 'Livability / Toy Hauler',
    description: 'For hauling an ATV, side-by-side, or bikes, plus somewhere to sleep or hang out afterward. Leads to interior build-out, AC, and insulation/rm storage.',
    image: '/livality.png'
  },
  {
    id: 'contractor',
    title: 'Contractor / Work',
    description: 'For hauling tools, equipment, and materials to job sites. Leads to storage, cabinets, and tie-down options',
    image: '/contractor.png'
  },
  {
    id: 'not-sure',
    title: 'Not Sure Yet',
    description: 'Skip this and see all packages — you can still build from scratch or pick one that fits.',
    image: 'notsure.png'
  }
];

export default function CategorySelection({ onSelect, initialSelected }) {
  const [selected, setSelected] = useState(initialSelected ?? CATEGORIES[0].id);

  // Sync when prop changes (e.g. navigating back with a previous selection)
  useEffect(() => {
    if (initialSelected) setSelected(initialSelected)
  }, [initialSelected])

  return (
    <div className="h-dvh bg-viewer flex flex-col relative overflow-x-hidden overflow-y-auto">
      {/* Header — positioned identically to Configurator */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center gap-6 px-4 pt-4 pb-1 pointer-events-none lg:top-8 lg:left-8 lg:px-0 lg:pt-0 lg:pb-0">
        <img src="/Logo Up.png" alt="Toy Trailers" className="w-20 h-14 lg:w-30 lg:h-20 object-contain pointer-events-auto" />
      </div>

      {/* Cards Grid */}
      <div className="flex-1 flex items-center justify-center pt-24 lg:pt-32 px-8 lg:px-16 pb-8 lg:pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 max-w-[1600px] mx-auto w-full">
          {CATEGORIES.map((cat) => {
            const isSelected = selected === cat.id;
            return (
              <div
                key={cat.id}
                onClick={() => setSelected(cat.id)}
                className={`
                  group relative bg-[#1a1a1a] rounded-[24px] overflow-hidden flex flex-col h-full
                  transition-all duration-300 border-2 cursor-pointer
                  ${isSelected
                    ? 'border-[#DA634B] shadow-[0_0_20px_rgba(218,99,75,0.35)]'
                    : 'border-[#3a3a3a] hover:border-[#5a5a5a]'
                  }
                `}
              >
                {/* Image Background */}
                <div className="relative h-64 w-full overflow-hidden shrink-0">
                  <img 
                    src={cat.image} 
                    alt={cat.title} 
                    className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-out
                      ${isSelected ? 'opacity-100 scale-105 grayscale-0' : 'opacity-60 grayscale-[0.2] scale-100 group-hover:opacity-100 group-hover:scale-105 group-hover:grayscale-0'}
                    `} 
                  />
                  {/* Glassy gradient overlay to blend into card background */}
                  <div className="absolute inset-x-0 bottom-0 h-40 pointer-events-none">
                    <div className="absolute inset-0 backdrop-blur-md [mask-image:linear-gradient(to_top,black_10%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_top,black_10%,transparent_100%)]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-[#1a1a1a]/80 to-transparent" />
                  </div>
                </div>

                {/* Content positioned to overlap the faded image */}
                <div className="relative flex flex-col flex-1 px-6 pb-6 -mt-20 z-10">
                  <h2 className="text-[28px] font-bold text-white leading-tight drop-shadow-lg tracking-wide mb-3">{cat.title}</h2>
                  <p className="text-[13px] text-gray-300 leading-relaxed flex-1 drop-shadow">
                    {cat.description}
                  </p>

                  <div className="mt-6 pt-2">
                    {isSelected ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); onSelect(cat.id); }}
                        className="w-full py-3.5 bg-[#DA634B] hover:bg-[#c4553e] text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 shadow-lg"
                      >
                        Continue
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelected(cat.id); }}
                        className="w-full py-3.5 bg-[#3a3a3a] hover:bg-[#4a4a4a] text-white rounded-lg font-semibold transition-colors shadow-md group-hover:bg-[#4a4a4a]"
                      >
                        Choose
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
