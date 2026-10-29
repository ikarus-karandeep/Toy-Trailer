import { useState } from 'react'
import { useConfigurator } from '../context/ConfiguratorContext'
import { getItemizedQuote, buildConfigShareUrl } from '../utils/configSerializer'
import { generateQuotePDF } from '../utils/pdfGenerator'

export default function QuoteModal({ isOpen, onClose }) {
  const ctx = useConfigurator()
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [customerNotes, setCustomerNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const formatPhoneNumber = (val) => {
    if (val.startsWith('+')) {
      return '+' + val.slice(1).replace(/[^0-9 \-]/g, '').slice(0, 16)
    }
    let digits = val.replace(/\D/g, '')
    if (!digits) return ''
    if (digits.length === 11 && digits.startsWith('1')) {
      digits = digits.slice(1)
    }
    digits = digits.slice(0, 10)
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`
  }

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value)
    setCustomerPhone(formatted)
    const digits = formatted.replace(/\D/g, '')
    if (digits.length === 0 || digits.length >= 10) {
      setPhoneError('')
    }
  }

  const handlePhoneBlur = () => {
    const digits = customerPhone.replace(/\D/g, '')
    if (customerPhone.trim() && digits.length < 10) {
      setPhoneError('Please enter a valid 10-digit phone number')
    } else {
      setPhoneError('')
    }
  }
  const [submittedQuote, setSubmittedQuote] = useState(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#quote') {
      const qd = getItemizedQuote(ctx)
      const quoteId = `QT-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`
      return {
        id: quoteId,
        date: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        customer: { name: 'Customer Quote', email: '', phone: '', notes: '' },
        trailerSummary: { width: ctx.width, length: ctx.length, color: ctx.selectedColor, packageId: ctx.packageId },
        quoteData: qd,
        shareUrl: buildConfigShareUrl(ctx, 'quote'),
        configuratorUrl: buildConfigShareUrl(ctx, 'configurator'),
        totalPrice: qd.grandTotal
      }
    }
    return null
  })
  const [copiedLink, setCopiedLink] = useState(false)

  if (!isOpen) return null

  const quoteData = getItemizedQuote(ctx)
  const shareUrl = buildConfigShareUrl(ctx, 'quote')
  const configuratorUrl = buildConfigShareUrl(ctx, 'configurator')

  // Derive current quote by merging customer submission metadata with live configuration
  const currentQuote = submittedQuote ? {
    ...submittedQuote,
    trailerSummary: {
      width: ctx.width,
      length: ctx.length,
      color: ctx.selectedColor,
      packageId: ctx.packageId
    },
    quoteData,
    shareUrl,
    configuratorUrl,
    totalPrice: quoteData.grandTotal
  } : null

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!customerName.trim() || !customerEmail.trim()) return

    const digits = customerPhone.replace(/\D/g, '')
    if (customerPhone.trim() && digits.length < 10) {
      setPhoneError('Please enter a valid 10-digit phone number')
      return
    }

    setIsSubmitting(true)
    setTimeout(() => {
      const quoteId = submittedQuote?.id || `QT-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`
      const newQuote = {
        id: quoteId,
        date: submittedQuote?.date || new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        customer: {
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
          notes: customerNotes
        },
        trailerSummary: {
          width: ctx.width,
          length: ctx.length,
          color: ctx.selectedColor,
          packageId: ctx.packageId
        },
        quoteData,
        shareUrl,
        configuratorUrl,
        totalPrice: quoteData.grandTotal
      }

      setSubmittedQuote(newQuote)
      setIsSubmitting(false)
    }, 400)
  }

  const handleCopyLink = () => {
    const urlToCopy = currentQuote ? currentQuote.shareUrl : shareUrl
    navigator.clipboard?.writeText(urlToCopy).then(() => {
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2500)
    })
  }

  const handleClose = () => {
    if (window.location.hash === '#quote') {
      window.location.hash = 'configurator'
    }
    onClose()
  }

  const handleReopenConfigurator = () => {
    handleClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#141414] border border-[#262626] rounded-2xl shadow-2xl overflow-hidden text-white">
        
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-[#222] bg-[#1a1a1a]/90 backdrop-blur shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[#DA634B]" />
            <h2 className="text-xs sm:text-sm font-bold tracking-widest uppercase text-gray-200">
              {currentQuote ? 'Itemized Build Quote' : 'Configure & Request Quote'}
            </h2>
            {currentQuote && (
              <span className="font-mono text-[11px] text-[#DA634B] bg-[#DA634B]/10 px-2 py-0.5 rounded border border-[#DA634B]/20">
                {currentQuote.id}
              </span>
            )}
          </div>

          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#282828] transition-colors"
            aria-label="Close quote modal"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 [scrollbar-width:thin] [scrollbar-color:#333_transparent]">

          {!currentQuote ? (
            /* ───────────────────────────────────────────────────────────── */
            /* 1. SUBMISSION FORM VIEW                                        */
            /* ───────────────────────────────────────────────────────────── */
            <div className="max-w-xl mx-auto space-y-6 py-2">
              <div className="text-center space-y-2">
                <h3 className="text-xl sm:text-2xl font-bold tracking-wide uppercase text-white">
                  Get Your Itemized Quote
                </h3>
                <p className="text-gray-400 text-xs sm:text-sm max-w-md mx-auto">
                  Submit your configuration to create an interactive quote with full pricing breakdown, downloadable PDF, and a saved 3D build link.
                </p>
              </div>

              {/* Current Build Highlight Box */}
              <div className="bg-[#1b1b1b] border border-[#2a2a2a] rounded-xl p-4 flex items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] text-gray-400 tracking-widest uppercase block font-semibold">Configured Trailer</span>
                  <span className="text-sm sm:text-base font-bold text-white uppercase">
                    {ctx.width} × {ctx.length}' {ctx.packageId ? `· ${ctx.packageId.replace('-', ' ')}` : ''}
                  </span>
                  <span className="text-xs text-gray-400 block capitalize">Exterior Color: {ctx.selectedColor}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-gray-400 tracking-widest uppercase block font-semibold">Total Estimate</span>
                  <span className="text-xl sm:text-2xl font-extrabold text-[#DA634B]">
                    ${ctx.totalPrice.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Submission Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold tracking-wider uppercase text-gray-300">
                    Full Name <span className="text-[#DA634B]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-[#181818] border border-[#333] focus:border-[#DA634B] rounded-xl px-4 py-3 text-sm text-white outline-none transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold tracking-wider uppercase text-gray-300">
                      Email Address <span className="text-[#DA634B]">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="john@example.com"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="w-full bg-[#181818] border border-[#333] focus:border-[#DA634B] rounded-xl px-4 py-3 text-sm text-white outline-none transition-colors"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold tracking-wider uppercase text-gray-300">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      inputMode="tel"
                      maxLength={12}
                      placeholder="555-000-0000"
                      value={customerPhone}
                      onChange={handlePhoneChange}
                      onBlur={handlePhoneBlur}
                      className={`w-full bg-[#181818] border ${phoneError ? 'border-red-500 focus:border-red-500' : 'border-[#333] focus:border-[#DA634B]'} rounded-xl px-4 py-3 text-sm text-white outline-none transition-colors`}
                    />
                    {phoneError && (
                      <p className="text-xs text-red-400 mt-1">{phoneError}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold tracking-wider uppercase text-gray-300">
                    Notes or Custom Specifications (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Specific delivery timeframe, questions, or custom requests..."
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    className="w-full bg-[#181818] border border-[#333] focus:border-[#DA634B] rounded-xl px-4 py-2.5 text-sm text-white outline-none transition-colors resize-none"
                  />
                </div>

                {/* Form Actions: Submit & Call */}
                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3.5 px-6 rounded-xl bg-[#DA634B] hover:bg-[#c5573f] text-white font-bold text-xs tracking-widest uppercase transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Generating Quote...
                      </>
                    ) : (
                      <>
                        Submit & View Quote
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      </>
                    )}
                  </button>

                  <a
                    href="tel:18005550199"
                    className="sm:w-auto px-6 py-3.5 rounded-xl bg-[#252525] hover:bg-[#303030] text-gray-200 font-bold text-xs tracking-widest uppercase transition-all border border-[#3a3a3a] flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                    </svg>
                    Call Us
                  </a>
                </div>
              </form>
            </div>
          ) : (
            /* ───────────────────────────────────────────────────────────── */
            /* 2. REFINED INTERACTIVE ITEMIZED QUOTE VIEW                     */
            /* ───────────────────────────────────────────────────────────── */
            <div className="space-y-5">
              
              {/* Premium Hero Spec Card */}
              <div className="bg-[#1b1b1b] border border-[#2b2b2b] rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
                {/* Subtle top edge gradient */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#DA634B] via-[#E88E7B] to-[#DA634B]/30" />

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  {/* Left: Build & Customer Details */}
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Active Estimate
                      </span>
                      <span className="text-xs text-gray-400">· {currentQuote.date}</span>
                    </div>

                    <div>
                      <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight uppercase">
                        {currentQuote.trailerSummary?.width} × {currentQuote.trailerSummary?.length}' Custom Build
                      </h3>
                      <p className="text-sm text-gray-300 mt-0.5">
                        Prepared for <strong className="text-white">{currentQuote.customer?.name || 'Customer'}</strong>
                        {currentQuote.customer?.email ? (
                          <span className="text-gray-400 text-xs font-normal"> · {currentQuote.customer.email}</span>
                        ) : null}
                        {currentQuote.customer?.phone ? (
                          <span className="text-gray-400 text-xs font-normal"> · {currentQuote.customer.phone}</span>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => setSubmittedQuote(null)}
                          className="ml-2.5 text-xs text-[#DA634B] hover:text-[#f07b64] font-medium underline underline-offset-2 transition-colors"
                        >
                          Edit Info
                        </button>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-gray-400">
                      <span className="bg-[#242424] px-2.5 py-1 rounded-md border border-[#303030] capitalize">
                        Color: <strong className="text-gray-200">{currentQuote.trailerSummary?.color}</strong>
                      </span>
                      {currentQuote.trailerSummary?.packageId && (
                        <span className="bg-[#242424] px-2.5 py-1 rounded-md border border-[#303030] capitalize">
                          Package: <strong className="text-gray-200">{currentQuote.trailerSummary.packageId.replace('-', ' ')}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Prominent Total & Unified Actions */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-4 pt-4 lg:pt-0 border-t lg:border-t-0 border-[#262626]">
                    <div className="text-left lg:text-right">
                      <span className="text-[10px] tracking-widest uppercase font-semibold text-gray-400 block">Total Estimated Price</span>
                      <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                        ${currentQuote.totalPrice.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => generateQuotePDF(currentQuote)}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#DA634B] hover:bg-[#c5573f] text-white text-xs font-bold tracking-wider uppercase transition-all shadow-md active:scale-[0.98]"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                        Download PDF
                      </button>

                      <button
                        onClick={handleReopenConfigurator}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#242424] hover:bg-[#2d2d2d] border border-[#383838] text-white text-xs font-bold tracking-wider uppercase transition-all active:scale-[0.98]"
                      >
                        <svg className="w-4 h-4 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                        </svg>
                        3D View
                      </button>

                      <a
                        href="tel:18005550199"
                        className="p-2.5 rounded-xl bg-[#242424] hover:bg-[#2d2d2d] border border-[#383838] text-gray-300 hover:text-white transition-colors"
                        title="Call Representative"
                      >
                        <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Clean Shareable Link Bar */}
              <div className="bg-[#181818] border border-[#262626] rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#222] flex items-center justify-center shrink-0 border border-[#2e2e2e]">
                    <svg className="w-4 h-4 text-[#DA634B]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-3.536l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white">Direct Link to Your Saved Configuration</p>
                    <p className="text-[11px] text-gray-400 truncate">Share or reopen this link anytime to reload this exact 3D build</p>
                  </div>
                </div>

                <button
                  onClick={handleCopyLink}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#242424] hover:bg-[#2e2e2e] border border-[#333] text-xs font-semibold tracking-wider text-gray-200 hover:text-white transition-all shrink-0 active:scale-[0.98]"
                >
                  {copiedLink ? (
                    <>
                      <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                      </svg>
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>

              {/* Itemized Specifications Section */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between pb-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Itemized Specifications & Pricing
                  </h4>
                  <span className="text-[11px] text-gray-500">
                    {currentQuote.quoteData.categories.length} Categories Configured
                  </span>
                </div>

                <div className="space-y-3">
                  {currentQuote.quoteData.categories.map((cat) => (
                    <div key={cat.title} className="bg-[#1a1a1a] border border-[#282828] rounded-xl overflow-hidden shadow-sm">
                      <div className="px-4 py-2.5 bg-[#202020] border-b border-[#292929] flex items-center justify-between">
                        <span className="text-xs font-bold tracking-wider uppercase text-gray-200">
                          {cat.title}
                        </span>
                        <span className="text-xs font-semibold text-gray-300">
                          ${cat.subtotal.toLocaleString()}
                        </span>
                      </div>

                      <div className="divide-y divide-[#232323]">
                        {cat.items.length === 0 ? (
                          <div className="px-4 py-2.5 text-xs text-gray-500 italic">Standard configuration included</div>
                        ) : (
                          cat.items.map((item, idx) => (
                            <div key={idx} className="px-4 py-2.5 flex items-center justify-between text-xs hover:bg-[#222]/50 transition-colors">
                              <div className="min-w-0 pr-3">
                                <span className="text-gray-200 font-medium block">{item.label}</span>
                                {item.subtext && <span className="text-gray-500 text-[10px] block mt-0.5">{item.subtext}</span>}
                                {item.qty > 1 && item.unitPrice != null && (
                                  <span className="text-gray-500 text-[10px] block mt-0.5">${item.unitPrice.toLocaleString()} each × {item.qty}</span>
                                )}
                              </div>
                              <span className={`shrink-0 font-semibold ${item.price > 0 ? 'text-[#E88E7B]' : 'text-gray-500 font-normal'}`}>
                                {item.price > 0 ? `+$${item.price.toLocaleString()}` : 'Included'}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals Breakdown Card */}
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-[#202020] p-3 rounded-xl border border-[#2b2b2b]">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-semibold">Foundation & Build</span>
                    <span className="text-base font-bold text-white mt-1 block">
                      ${(currentQuote.quoteData?.pricing?.trailerBuild ?? ctx.pricing?.trailerBuild ?? 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-[#202020] p-3 rounded-xl border border-[#2b2b2b]">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-semibold">Systems & Add-Ons</span>
                    <span className="text-base font-bold text-white mt-1 block">
                      ${(currentQuote.quoteData?.pricing?.configurations ?? ctx.pricing?.configurations ?? 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-[#202020] p-3 rounded-xl border border-[#2b2b2b]">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-semibold">Appearance & Style</span>
                    <span className="text-base font-bold text-white mt-1 block">
                      ${(currentQuote.quoteData?.pricing?.appearance ?? ctx.pricing?.appearance ?? 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="border-t border-[#262626] pt-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-gray-300 uppercase tracking-wider font-bold block">Estimated Grand Total</span>
                    <span className="text-[11px] text-gray-500">Excludes local taxes, registration & delivery</span>
                  </div>
                  <span className="text-2xl sm:text-3xl font-extrabold text-[#DA634B]">
                    ${currentQuote.totalPrice.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Bottom Footer Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-[#222]">
                <button
                  type="button"
                  onClick={() => setSubmittedQuote(null)}
                  className="text-xs text-gray-400 hover:text-white transition-colors uppercase tracking-wider font-semibold py-2"
                >
                  ← Modify Contact Info
                </button>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleReopenConfigurator}
                    className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-[#242424] hover:bg-[#2e2e2e] border border-[#333] text-gray-200 text-xs font-bold tracking-wider uppercase transition-colors"
                  >
                    Back to 3D
                  </button>

                  <button
                    onClick={() => generateQuotePDF(currentQuote)}
                    className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-[#DA634B] hover:bg-[#c5573f] text-white text-xs font-bold tracking-wider uppercase transition-all shadow-md"
                  >
                    Download PDF
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  )
}
