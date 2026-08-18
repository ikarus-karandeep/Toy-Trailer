import { useState } from 'react';

export default function OptionPill({
  label,
  price,
  badge,
  originalPrice,
  isStandard = false,
  isSelected = false,
  isMulti = false,
  isLocked = false,
  disabled = false,
  hasSettings = false,
  onSettingsClick,
  quantity,
  onQuantityChange,
  onClick,
  packageBadge = null,
  image = null,
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

  const isInteractive = !isLocked && !disabled;

  return (
    <div
      role="button"
      tabIndex={!isInteractive ? -1 : 0}
      onClick={!isInteractive ? undefined : onClick}
      onKeyDown={(e) => {
        if (isInteractive && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick && onClick(e);
        }
      }}
      onMouseEnter={handleMouseEnter}
      className={`group w-fit relative flex items-center justify-center gap-3 px-8 py-3 rounded-full border text-[12px] md:text-[14px] font-normal uppercase transition-all duration-150 text-left overflow-hidden ${
        isLocked
          ? 'border-[#3a3a3a] text-gray-500 bg-[#2a2a2a] cursor-not-allowed opacity-70'
          : disabled
            ? 'border-[#3a3a3a] text-[#7a7a7a] bg-[#282828] cursor-not-allowed opacity-50'
            : isSelected
              ? 'border-[#DA634B] text-[#DA634B] bg-transparent cursor-pointer'
              : 'border-[#5C5C5C] text-gray-300 bg-[#282828] hover:border-[#7a7a7a] hover:text-white cursor-pointer'
      }`}
      style={{
        ...(isSelected && isInteractive
          ? { boxShadow: '0 0 20px -2px rgba(218, 99, 75, 0.5), inset 0 -8px 38.8px -7px rgba(218, 99, 75, 0.42)' }
          : {}),
      }}
    >
      {/* Background Image Layer */}
      {image && !isLocked && !disabled && (
        <div 
          className={`absolute inset-0 z-0 bg-cover bg-center transition-opacity duration-300 ${isSelected ? 'opacity-60' : 'opacity-40 group-hover:opacity-50'}`}
          style={{ backgroundImage: `url("${image}")` }}
        />
      )}

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

      <span className="relative z-10 flex items-center justify-center gap-2 min-w-0">
        <span className="leading-snug">{label}</span>
        {isSelected && packageBadge && packageBadge.badge && (
          <img 
            src={packageBadge.badge} 
            alt="package" 
            title={`Included in ${packageBadge.name}`}
            className="h-5 w-5 object-contain flex-shrink-0 opacity-90" 
          />
        )}
        {isLocked && (
          <img src="/Lock Icon.png" alt="Locked" className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />
        )}
        {/* {isStandard && !isLocked && (
          <span className="flex-shrink-0 bg-[#DA634B] text-white text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full">
            STANDARD
          </span>
        )} */}
        {!isStandard && !isLocked && (price != null || badge != null) && quantity === undefined && (
          <span className={`flex-shrink-0 font-normal text-[12px] lg:text-[14px] ${
             isSelected
              ? 'text-[#DA634B]'
              : ''
          }`}>
            · {badge ? badge : formatPrice(price)}
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
        <div className="relative z-10 flex items-center gap-2">
          {hasSettings && isSelected && !isLocked && (
            // <button
            //   onClick={(e) => {
            //     e.stopPropagation();
            //     if (onSettingsClick) onSettingsClick();
            //   }}
            //   className={`flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center transition-all bg-[#DA634B] border-[#DA634B] text-white hover:bg-[#c5553e]`}
            // >
              <img src="/pitpack.png" alt="Settings" className="w-6 h-" />
            // </button>
          )}

          {quantity !== undefined && quantity > 0 && !isLocked && (
            <div className="flex items-center gap-2 md:gap-3 bg-[#111111] rounded-full px-1.5 py-1.5 border border-[#2a2a2a]/50">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onQuantityChange) onQuantityChange(Math.max(0, quantity - 1));
                }}
                className="w-7 h-7 md:w-8 md:h-8 shrink-0 rounded-full border border-[#DA634B] flex items-center justify-center text-white bg-[#DA634B]/20 hover:bg-[#DA634B]/40 text-xl font-light leading-none pb-1 transition-colors"
              >
                -
              </button>
              <span className="text-[14px] md:text-[15px] font-medium min-w-[3.5rem] text-center tracking-wide text-white whitespace-nowrap">
                {quantity} · ${price != null ? price.toLocaleString() : '000'}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onQuantityChange) onQuantityChange(quantity + 1);
                }}
                className="w-7 h-7 md:w-8 md:h-8 shrink-0 rounded-full border border-[#DA634B] flex items-center justify-center text-white bg-[#DA634B]/20 hover:bg-[#DA634B]/40 text-xl font-light leading-none pb-1 transition-colors"
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