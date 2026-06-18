export default function ColorSwatch({ id, label, color, image, isSelected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`relative py-5 lg:py-4 px-1 rounded-full border text-[9px] font-bold tracking-wider uppercase transition-all duration-150 overflow-hidden ${
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
    </button>
  )
}
