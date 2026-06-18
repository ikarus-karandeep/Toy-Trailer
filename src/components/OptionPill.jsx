export default function OptionPill({
  label,
  price,
  isStandard = false,
  isSelected = false,
  isMulti = false,
  onClick,
}) {
  const formatPrice = (p) => `$${p?.toLocaleString()}`

  return (
    <button
      onClick={onClick}
      className={`w-fit relative flex items-center justify-between gap-2 px-3 py-2 lg:py-3 rounded-full border text-xs font-semibold tracking-wider uppercase transition-all duration-150 text-left ${
        isSelected
          ? 'border-[#DA634B] text-white bg-transparent'
          : 'border-[#3a3a3a] text-gray-300 bg-[#2a2a2a] hover:border-[#555] hover:text-white'
      }`}
      style={isSelected ? { boxShadow: 'inset 0 -8px 38.8px -7px rgba(218, 99, 75, 0.42)' } : {}}
    >
      <span className="flex items-center gap-2 flex-1 min-w-0">
        <span className="truncate">{label}</span>
        {isStandard && (
          <span className="flex-shrink-0 bg-[#DA634B] text-white text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full">
            STANDARD
          </span>
        )}
        {!isStandard && price != null && (
          <span className="flex-shrink-0 text-gray-400 font-normal">
            · {formatPrice(price)}
          </span>
        )}
      </span>

      {isMulti && (
        <span
          className={`flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center text-xs font-bold transition-all ${
            isSelected
              ? 'bg-[#DA634B] border-[#DA634B] text-white'
              : 'border-[#555] text-gray-400'
          }`}
        >
          {isSelected ? (
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            '+'
          )}
        </span>
      )}
    </button>
  )
}
