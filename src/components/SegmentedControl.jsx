import React, { useState, useEffect } from 'react'

export default function SegmentedControl({ options, value, onChange }) {
  const [activeReason, setActiveReason] = useState(null);

  useEffect(() => {
    const handleClose = () => setActiveReason(null);
    window.addEventListener('closeAllTooltips', handleClose);
    window.addEventListener('click', handleClose);
    return () => {
      window.removeEventListener('closeAllTooltips', handleClose);
      window.removeEventListener('click', handleClose);
    };
  }, []);

  return (
    <div className="flex bg-[#282828] rounded-full border border-[#5C5C5C] w-full p-1 relative">
      {options.map((opt, index) => {
        const isSelected = value === opt.id;
        const showMobileReason = activeReason === opt.id;

        return (
          <React.Fragment key={opt.id}>
            {index > 0 && (
              <div className="w-[1px] bg-[#5C5C5C] my-2 mx-1 opacity-50 pointer-events-none" />
            )}
            <div
              className={`flex-1 relative group flex items-center justify-center ${opt.disabled ? 'cursor-not-allowed' : ''}`}
              onMouseLeave={() => setActiveReason(null)}
            >
              <button
                type="button"
                onClick={() => {
                  if (!opt.disabled) onChange(opt.id);
                }}
                className={`w-full py-2.5 flex items-center justify-center gap-1 text-[14px] uppercase font-normal rounded-full transition-all duration-200 ${
                  isSelected
                    ? 'text-[#DA634B] border border-[#DA634B] z-10'
                    : 'text-gray-400 hover:text-white border border-transparent z-0'
                } ${opt.disabled ? 'opacity-50' : ''}`}
                style={
                  isSelected
                    ? { 
                        boxShadow: '0 0 20px -2px rgba(218, 99, 75, 0.5), inset 0 -8px 38.8px -7px rgba(218, 99, 75, 0.42)',
                        backgroundColor: 'rgba(26,26,26,0.5)'
                      }
                    : {}
                }
              >
                {opt.label}
                {opt.disabled && opt.disabledReason && (
                  <div
                    role="button"
                    className="md:hidden flex items-center justify-center w-4 h-4 rounded-full bg-[#222] text-gray-300 text-[10px] font-bold border border-gray-500 pointer-events-auto shrink-0 leading-none ml-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (activeReason === opt.id) {
                        setActiveReason(null);
                      } else {
                        window.dispatchEvent(new CustomEvent('closeAllTooltips'));
                        setActiveReason(opt.id);
                      }
                    }}
                  >
                    ?
                  </div>
                )}
              </button>

              {/* Tooltip */}
              {opt.disabled && opt.disabledReason && (
                <div 
                  className={`absolute bottom-full mb-2 ${showMobileReason ? 'flex' : 'hidden md:group-hover:flex'} items-center justify-center whitespace-normal text-center bg-[#DA634B] text-white text-[11px] font-medium px-3 py-2 rounded-md shadow-lg z-50 pointer-events-none w-[200px] leading-tight normal-case`}
                >
                  {opt.disabledReason}
                  <div 
                    className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-[#DA634B]" 
                  />
                </div>
              )}
            </div>
          </React.Fragment>
        )
      })}
    </div>
  )
}
