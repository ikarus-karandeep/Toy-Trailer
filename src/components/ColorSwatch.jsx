export default function ColorSwatch({ id, label, color, image, isSelected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`relative py-4 rounded-full border text-sm font-bold tracking-wider uppercase transition-all duration-150 overflow-hidden ${
        isSelected
          ? 'border-[#DA634B] ring-2 ring-[#DA634B]'
          : 'border-transparent hover:border-white/30'
      }`}
      style={
        image
          ? { backgroundImage: `url('${image}')`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : { backgroundColor: color }
      }
      aria-label={label}
      aria-pressed={isSelected}
    >
      {/* <span className="relative z-10 text-white font-bold tracking-widest drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]">
        {label}
      </span> */}
    </button>
  )
}
