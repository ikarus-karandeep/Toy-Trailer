export default function Logo() {
  return (
    <div className="flex flex-col select-none">
      <div className="flex items-end leading-none">
        <span className="text-white font-black uppercase tracking-wider text-4xl lg:text-5xl leading-none">
          TOY
        </span>
        <span className="text-[#DA634B] font-black text-4xl lg:text-5xl leading-none">!</span>
      </div>
      <div className="text-white font-black uppercase tracking-[0.25em] text-lg lg:text-xl leading-none mt-0.5">
        TRAILERS
      </div>
      <div className="flex items-center gap-1.5 mt-2">
        <span className="text-gray-400 text-xs tracking-wide">Powered by</span>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="7,1 13,4 13,10 7,13 1,10 1,4" fill="#3b82f6" />
        </svg>
        <span className="text-gray-300 text-xs font-semibold tracking-wide">Ikarus Delta</span>
      </div>
    </div>
  )
}
