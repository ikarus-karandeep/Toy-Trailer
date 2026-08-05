export default function ToggleSwitch({ label, subtext, checked, onChange, disabled, price, badge }) {
  return (
    <div 
      className={`flex items-center justify-between bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-4 py-3 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      onClick={() => !disabled && onChange(!checked)}
    >
      <div className="flex flex-col">
        <span className="text-white text-sm font-medium tracking-widest">
          {label}
        </span>
        {subtext && (
          <span className="text-gray-400 text-xs mt-0.5 tracking-wide">
            {subtext}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
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
        disabled={disabled}
        className={`relative inline-flex items-center w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none ${disabled ? 'cursor-not-allowed' : ''} ${
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
