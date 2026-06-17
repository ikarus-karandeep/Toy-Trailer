export default function OptionSection({ title, children }) {
  return (
    <section className="px-2 mb-[24px]">
      <div className="rounded-2xl shadow-[-6px_6px_16px_rgba(0,0,0,0.85)]">
        <div className="px-8 pt-6 pb-6 diamond-plate rounded-2xl overflow-hidden">
          <h2 className="text-white font-bold text-sm tracking-widest uppercase mb-6">
            {title}
          </h2>
          <div className="flex flex-col gap-6">{children}</div>
        </div>
      </div>
    </section>
  )
}