import React, { useState, useEffect } from 'react';

const PACKAGES = [
  {
    id: 'track-pack',
    title: 'Track Pack',
    badge: '/track-badge.png',
    features: [
      'REAR WING SPOILER', 'SPIDER ALUMINUM MAGS',
      'ANGLED RACING LIGHTS', 'BLACKOUT PKG - EXTERIOR',
      'FLOOR + WALL E-TRACK', 'D-RINGS',
      'SPREAD AXLES W/CORVETTE FENDERS',
      '7000LB LEAF SPRING/ TORSION'
    ],
    priceRange: '$3,200- $3,600',
    image: '/track-pack.png',
    hoverImage: '/track-pack-hover.png'
  },
  {
    id: 'job-site',
    title: 'Job Site',
    badge: '/jobsite-badge.png',
    features: [
      'BASE & OVERHEAD CABINETS', 'ELECTRIC JACKS',
      'FLOOR + WALL E-TRACK', 'D-RINGS',
      '30 AMP ELECTRICAL', 'RECESSED TIRE BOX'
    ],
    priceRange: '$2,970- $3,510',
    image: '/job-site.png',
    hoverImage: '/jobsite-hover.png'
  },
  {
    id: 'base-camp',
    title: 'Base Camp',
    badge: '/basecamp-badge.png',
    features: [
      'BASE & OVERHEAD CABINETS', 'ELECTRIC JACK',
      '18K MINI SPLIT AC W/200V WIRE',
      'WALL + CEILING INSULATION',
      'WHITE METAL WALLS & CEILING', '50 AMP ELECTRICAL'
    ],
    priceRange: '$6,500- $7,000',
    image: '/base-camp.png',
    hoverImage: '/basecamp-hover.png'
  },
  {
    id: 'no-package',
    title: 'No Package',
    badge: null,
    description: 'Skip the package and configure every item individually in the steps that follow.',
    priceRange: 'Final build cost depends on your choices',
    image: '/no-package.png',
    hoverImage: '/no-package.png'
  }
];

export default function PackageSelection({ onSelect, onBack, initialSelected }) {
  const [selected, setSelected] = useState(initialSelected ?? PACKAGES[0].id);

  // Sync when prop changes (e.g. navigating back with a previous selection)
  useEffect(() => {
    if (initialSelected) setSelected(initialSelected)
  }, [initialSelected])

  return (
    <div className="h-dvh bg-viewer flex flex-col relative overflow-x-hidden overflow-y-auto">
      {/* Header — positioned identically to Configurator */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center gap-6 px-4 pt-4 pb-1 pointer-events-none lg:top-8 lg:left-8 lg:px-0 lg:pt-0 lg:pb-0">
        <button
          onClick={onBack}
          className="pointer-events-auto flex items-center justify-center w-14 h-14 bg-[#3a3a3a] hover:bg-[#4a4a4a] text-white rounded-[20px] transition-colors shadow-lg"
          aria-label="Back"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 12H4M4 12L10 18M4 12L10 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <img src="/Logo Up.png" alt="Toy Trailers" className="w-20 h-14 lg:w-30 lg:h-20 object-contain pointer-events-auto" />
      </div>

      {/* Cards Grid */}
      <div className="flex-1 flex items-center justify-center pt-24 lg:pt-32 px-8 lg:px-16 pb-8 lg:pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-[1600px] mx-auto w-full">
          {PACKAGES.map((pkg) => {
            const isSelected = selected === pkg.id;
            return (
              <div
                key={pkg.id}
                onClick={() => setSelected(pkg.id)}
                className={`
                  group relative bg-[#1a1a1a] rounded-[24px] overflow-hidden flex flex-col h-full
                  transition-all duration-300 border cursor-pointer
                  ${isSelected
                    ? 'border-[#DA634B] shadow-[0_0_20px_rgba(218,99,75,0.35)]'
                    : 'border-[#3a3a3a] hover:border-[#5a5a5a]'
                  }
                `}
              >
                {/* Image Background */}
                <div className="relative h-[22rem] w-full overflow-hidden shrink-0">
                  {/* Default Image */}
                  <img 
                    src={pkg.image} 
                    alt={pkg.title} 
                    className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-out
                      ${isSelected ? 'opacity-0 scale-105' : 'opacity-100 scale-100 grayscale-[0.2] group-hover:opacity-0 group-hover:scale-105'}
                    `} 
                  />
                  {/* Hover/Selected Image */}
                  <img 
                    src={pkg.hoverImage} 
                    alt={`${pkg.title} active`} 
                    className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-out
                      ${isSelected ? 'opacity-100 scale-105' : 'opacity-0 scale-100 group-hover:opacity-100 group-hover:scale-105'}
                    `} 
                  />
                  {/* Glassy gradient overlay to blend into card background */}
                  <div className="absolute inset-x-0 bottom-0 h-48 pointer-events-none">
                    <div className="absolute inset-0 backdrop-blur-md [mask-image:linear-gradient(to_top,black_10%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_top,black_10%,transparent_100%)]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-[#1a1a1a]/80 to-transparent" />
                  </div>
                </div>

                {/* Content positioned to overlap the faded image */}
                <div className="relative flex flex-col flex-1 px-6 pb-6 -mt-32 z-10">
                  {/* Title & Badge */}
                  <div className="flex items-center gap-4 mb-6">
                    <h2 className="text-[32px] font-bold text-white leading-tight drop-shadow-lg tracking-wide">{pkg.title}</h2>
                    {pkg.badge && (
                      <img src={pkg.badge} alt={`${pkg.title} badge`} className="h-10 w-10 object-contain drop-shadow-md" />
                    )}
                  </div>

                  {/* Features */}
                  <div className="flex-1">
                    {pkg.features ? (
                      <>
                        <p className="text-[13px] font-medium mb-3 flex items-center gap-1 text-white drop-shadow">
                          What get's added
                          <span className="w-3.5 h-3.5 rounded-full border border-gray-400 text-gray-300 flex items-center justify-center text-[9px] ml-1">i</span>
                        </p>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {pkg.features.map((feature, i) => (
                            <span key={i} className="text-[10px] uppercase font-semibold tracking-wider bg-[#333]/80 backdrop-blur-sm border border-[#444] text-gray-300 px-2.5 py-1.5 rounded shadow-sm">
                              {feature}
                            </span>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="text-[13px] text-gray-300 leading-relaxed mb-4 drop-shadow">
                        {pkg.description}
                      </p>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="mt-auto pt-4">
                    {pkg.features && <p className="text-lg font-bold mb-4 text-white drop-shadow">Package Total: {pkg.priceRange}</p>}
                    {!pkg.features && <p className="text-lg font-bold text-gray-400 mb-4 drop-shadow">{pkg.priceRange}</p>}

                    {isSelected ? (
                      <button
                        onClick={() => onSelect(pkg.id)}
                        className="w-full py-3.5 bg-[#DA634B] hover:bg-[#c4553e] text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 shadow-lg"
                      >
                        Continue
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                    ) : (
                      <button
                        onClick={() => setSelected(pkg.id)}
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
