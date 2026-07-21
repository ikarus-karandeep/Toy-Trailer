import React from 'react';
import OptionPill from './OptionPill';

export default function DetailedOptionCard({
  label,
  price,
  isSelected,
  onClick,
  includedItems = [],
  children,
  packageBadge = null,
}) {
  const showDetails = isSelected && (includedItems.length > 0 || children);

  if (showDetails) {
    return (
      <div className="p-2.5 -mx-2.5 rounded-[24px] border border-[#DA634B]/50 bg-[#1a1a1a] shadow-[0_0_20px_rgba(218,99,75,0.15),inset_0_0_10px_rgba(218,99,75,0.05)] flex flex-col gap-2.5 transition-all duration-300 backdrop-blur-md">
        <OptionPill
          label={label}
          price={price}
          isSelected={isSelected}
          onClick={onClick}
          packageBadge={packageBadge}
        />
        <div className="bg-[#111111] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[#A3A3A3] text-[11px] font-bold tracking-widest uppercase">
              WHAT'S INCLUDED
            </span>
            <span className="w-4 h-4 rounded-full border border-gray-500 text-gray-400 text-[9px] flex items-center justify-center">
              i
            </span>
          </div>
          {children ? (
            children
          ) : (
            <div className={includedItems.length > 1 ? "columns-2 gap-x-6 text-white text-[13px]" : "flex flex-col gap-4 text-white text-[13px]"}>
              {includedItems.map((item, index) => (
                <div key={index} className={`flex items-start gap-2 break-inside-avoid ${includedItems.length > 1 ? 'mb-4' : ''}`}>
                  <span className="mt-1.5 w-1 h-1 rounded-full bg-white shrink-0" />
                  <span className="leading-snug text-white/90">{item}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <OptionPill
      label={label}
      price={price}
      isSelected={isSelected}
      onClick={onClick}
      packageBadge={packageBadge}
    />
  );
}
