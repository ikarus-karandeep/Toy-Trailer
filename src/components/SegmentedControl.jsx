export default function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="flex bg-[#282828] rounded-full border border-[#5C5C5C] w-full p-1 relative">
      {options.map(opt => {
        const isSelected = value === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={`flex-1 text-center py-2.5 text-[14px] uppercase font-normal rounded-full transition-all duration-200 ${
              isSelected
                ? 'text-[#DA634B] border border-[#DA634B] z-10'
                : 'text-gray-400 hover:text-white border border-transparent z-0'
            }`}
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
          </button>
        )
      })}
    </div>
  )
}
