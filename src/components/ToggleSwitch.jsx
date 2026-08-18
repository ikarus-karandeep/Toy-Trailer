import { useState, useEffect } from 'react';

export default function ToggleSwitch({ label, subtext, checked, onChange, disabled, disabledReason, price, badge }) {
  const [showMobileReason, setShowMobileReason] = useState(false);

  useEffect(() => {
    const handleClose = () => setShowMobileReason(false);
    window.addEventListener('closeAllTooltips', handleClose);
    window.addEventListener('click', handleClose);
    return () => {
      window.removeEventListener('closeAllTooltips', handleClose);
      window.removeEventListener('click', handleClose);
    };
  }, []);

  return (
    <div 
      className={`relative flex items-center justify-between rounded-lg px-4 py-3 group border ${
        disabled ? 'bg-[#2a2a2a]/50 border-[#3a3a3a]/50 cursor-not-allowed' : 'bg-[#2a2a2a] border-[#3a3a3a] cursor-pointer'
      }`}
      onClick={() => !disabled && onChange(!checked)}
      onMouseLeave={() => setShowMobileReason(false)}
    >
      {/* Disabled Reason Tooltip */}
      {disabled && disabledReason && (
        <div 
          className={`absolute bottom-full mb-2 right-4 ${showMobileReason ? 'flex' : 'hidden md:group-hover:flex'} items-center justify-center whitespace-normal text-center bg-[#DA634B] text-white text-[11px] font-medium px-3 py-2 rounded-md shadow-lg z-50 pointer-events-none w-[200px] leading-tight normal-case`}
        >
          {disabledReason}
          <div 
            className="absolute top-full right-4 border-[5px] border-transparent border-t-[#DA634B]" 
          />
        </div>
      )}

      <div className="flex flex-col">
        <span className={`text-sm font-medium tracking-widest flex items-center gap-2 ${disabled ? 'text-white/50' : 'text-white'}`}>
          {label}
          {disabled && disabledReason && (
            <button
              type="button"
              className="md:hidden flex items-center justify-center w-4 h-4 rounded-full bg-[#222] text-gray-300 text-[10px] font-bold border border-gray-500 pointer-events-auto shrink-0 leading-none"
              onClick={(e) => {
                e.stopPropagation();
                if (showMobileReason) {
                  setShowMobileReason(false);
                } else {
                  window.dispatchEvent(new CustomEvent('closeAllTooltips'));
                  setShowMobileReason(true);
                }
              }}
            >
              ?
            </button>
          )}
        </span>
        {subtext && (
          <span className={`text-xs mt-0.5 tracking-wide ${disabled ? 'text-gray-400/50' : 'text-gray-400'}`}>
            {subtext}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 relative z-10">
        {(price != null) && (
          <span className="text-gray-300 text-xs font-medium bg-[#1a1a1a] border border-[#3a3a3a] px-2 py-0.5 rounded-full">
            +${price}
          </span>
        )}
        {badge && (
          <span className="text-[#3a8c5c] text-[10px] font-bold tracking-widest uppercase bg-[#3a8c5c]/20 px-2 py-0.5 rounded-full whitespace-nowrap">
            {badge}
          </span>
        )}
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={(e) => { e.stopPropagation(); !disabled && onChange(!checked); }}
          className={`relative inline-flex items-center w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none ${disabled ? 'cursor-not-allowed opacity-50' : ''} ${
            checked ? 'bg-[#DA634B]' : 'bg-[#3a3a3a]'
          }`}
        >
          <span
            className={`relative absolute w-5 h-5 rounded-full shadow transform transition-transform duration-200 ${
              checked ? 'translate-x-6 bg-black' : 'translate-x-0.5 bg-white'
            }`}
          >
            {checked && (
              <svg
                className="absolute inset-0 m-auto w-3 h-3 text-[#da634b]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </span>
        </button>
      </div>
    </div>
  )
}
