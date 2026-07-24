import { useState } from 'react';

export default function OptionPill({
  label,
  price,
  originalPrice,
  isStandard = false,
  isSelected = false,
  isMulti = false,
  isLocked = false,
  hasSettings = false,
  onSettingsClick,
  quantity,
  onQuantityChange,
  onClick,
  packageBadge = null,
}) {
  const [tooltipPos, setTooltipPos] = useState({ left: '50%', transform: 'translateX(-50%)', arrowLeft: '50%' });

  const formatPrice = (p) => {
    if (p == null) return '';
    return p >= 0 ? `+$${p.toLocaleString()}` : `-$${Math.abs(p).toLocaleString()}`;
  };

  const handleMouseEnter = (e) => {
    if (!isSelected || !packageBadge || !packageBadge.badge) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const screenWidth = window.innerWidth;
    
    // Estimate tooltip width ~220px. Needs 110px on each side of center.
    if (rect.left + rect.width / 2 < 110) {
      setTooltipPos({ left: '0', right: 'auto', transform: 'translateX(0)', arrowLeft: '20px' });
    } else if (screenWidth - (rect.left + rect.width / 2) < 110) {
      setTooltipPos({ left: 'auto', right: '0', transform: 'translateX(0)', arrowLeft: 'calc(100% - 20px)' });
    } else {
      setTooltipPos({ left: '50%', right: 'auto', transform: 'translateX(-50%)', arrowLeft: '50%' });
    }
  };

  return (
    <div
      role="button"
      tabIndex={isLocked ? -1 : 0}
      onClick={isLocked ? undefined : onClick}
      onKeyDown={(e) => {
        if (!isLocked && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick && onClick(e);
        }
      }}
      onMouseEnter={handleMouseEnter}
      className={`group w-fit relative flex items-center justify-center gap-3 px-8 py-3 rounded-full border text-[12px] md:text-[14px] font-normal uppercase transition-all duration-150 text-left ${
        isLocked
          ? 'border-[#3a3a3a] text-gray-500 bg-[#2a2a2a] cursor-not-allowed opacity-70'
          : isSelected
            ? 'border-[#DA634B] text-[#DA634B] bg-transparent cursor-pointer'
            : 'border-[#5C5C5C] text-gray-300 bg-[#282828] hover:border-[#7a7a7a] hover:text-white cursor-pointer'
      }`}
      style={
        isSelected && !isLocked
          ? { boxShadow: '0 0 20px -2px rgba(218, 99, 75, 0.5), inset 0 -8px 38.8px -7px rgba(218, 99, 75, 0.42)' }
          : {}
      }
    >
      {/* Dynamic Package Tooltip */}
      {isSelected && packageBadge && packageBadge.badge && (
        <div 
          className="absolute bottom-full mb-2 hidden group-hover:flex items-center justify-center whitespace-nowrap bg-[#DA634B] text-white text-[11px] font-medium px-3 py-2 rounded-md shadow-lg z-50 uppercase pointer-events-none"
          style={{ left: tooltipPos.left, right: tooltipPos.right, transform: tooltipPos.transform }}
        >
          {price == null ? `Included in ${packageBadge.name} (No charges)` : `Included in ${packageBadge.name}`}
          <div 
            className="absolute top-full border-[5px] border-transparent border-t-[#DA634B]" 
            style={{ left: tooltipPos.arrowLeft, transform: 'translateX(-50%)' }}
          />
        </div>
      )}

      <span className="flex items-center justify-center gap-2 min-w-0">
        <span className="leading-snug">{label}</span>
        {isSelected && packageBadge && packageBadge.badge && (
          <img src={packageBadge.badge} alt="package" className="h-5 w-5 object-contain flex-shrink-0 opacity-90" />
        )}
        {isLocked && (
          <img src="/Lock Icon.png" alt="Locked" className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />
        )}
        {/* {isStandard && !isLocked && (
          <span className="flex-shrink-0 bg-[#DA634B] text-white text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full">
            STANDARD
          </span>
        )} */}
        {!isStandard && !isLocked && price != null && quantity === undefined && (
          <span className={`flex-shrink-0 font-normal text-[12px] lg:text-[14px] ${
             isSelected
              ? 'text-[#DA634B]'
              : ''
          }`}>
            · {formatPrice(price)}
          </span>
        )}
        {originalPrice != null && (
          <span className="flex-shrink-0 font-normal text-[12px] lg:text-[14px] line-through text-gray-500">
            ${originalPrice.toLocaleString()}
          </span>
        )}
      </span>

      {((hasSettings && isSelected && !isLocked) || 
        (quantity !== undefined && !isLocked) || 
        (isMulti && quantity === undefined && !isLocked)) && (
        <div className="flex items-center gap-2">
          {hasSettings && isSelected && !isLocked && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onSettingsClick) onSettingsClick();
              }}
              className={`flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center transition-all bg-[#DA634B] border-[#DA634B] text-white hover:bg-[#c5553e]`}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          )}

          {quantity !== undefined && !isLocked && (
            <div className="flex items-center gap-3 bg-[#1a1a1a] rounded-full px-2 py-1.5 border border-[#3a3a3a]">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onQuantityChange) onQuantityChange(Math.max(0, quantity - 1));
                }}
                className="w-6 h-6 rounded-full flex items-center justify-center bg-[#2a2a2a] text-gray-300 hover:text-white hover:bg-[#444] text-lg leading-none pb-0.5"
              >
                -
              </button>
              <span className="text-[13px] font-medium min-w-[3.5rem] text-center tracking-wide">
                {quantity} · ${price != null ? price.toLocaleString() : '0'}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onQuantityChange) onQuantityChange(quantity + 1);
                }}
                className="w-6 h-6 rounded-full flex items-center justify-center bg-[#2a2a2a] text-gray-300 hover:text-white hover:bg-[#444] text-lg leading-none pb-0.5"
              >
                +
              </button>
            </div>
          )}

          {isMulti && quantity === undefined && !isLocked && (
            <span
              className={`flex-shrink-0 flex items-center justify-center transition-all ${
                isSelected
                  ? 'text-[#DA634B]'
                  : 'text-gray-500'
              }`}
            >
              {isSelected ? (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
                </svg>
              )}
            </span>
          )}
        </div>
      )}
    </div>
  )
}