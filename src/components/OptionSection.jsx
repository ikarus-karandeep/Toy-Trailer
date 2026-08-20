export default function OptionSection({ title, children }) {
  return (
    <section className="px-4 mb-2 lg:mb-[24px]">
      <div className="rounded-2xl shadow-[-4px_4px_10px_rgba(0,0,0,0.40)]">
        <div className="px-4 py-4 lg:px-8 lg:py-6 option-card-gradient rounded-2xl overflow-hidden">
          {title && (
            <h2 className="text-white font-medium text-[13px] md:text-[18px] lg:text-[20px] tracking-widest uppercase mb-4 lg:mb-6">
              {title}
            </h2>
          )}
          <div className="flex flex-col gap-4 lg:gap-6">{children}</div>
        </div>
      </div>
    </section>
  )
}