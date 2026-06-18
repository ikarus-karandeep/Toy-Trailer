export default function OptionSection({ title, children }) {
  return (
    <section className="px-2 mb-2 lg:mb-[24px]">
      <div className="rounded-2xl shadow-[-4px_4px_10px_rgba(0,0,0,0.40)]">
        <div className="px-8 pt-6 pb-6 option-card-gradient rounded-2xl overflow-hidden">
          <h2 className="text-white font-bold text-sm tracking-widest uppercase mb-6">
            {title}
          </h2>
          <div className="flex flex-col gap-6">{children}</div>
        </div>
      </div>
    </section>
  )
}