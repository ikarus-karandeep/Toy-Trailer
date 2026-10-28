import React from 'react'

export default function ConfirmationModal({
  isOpen,
  title = 'Confirm Replacement',
  message,
  confirmLabel = 'Replace',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-md bg-[#181818] border border-[#2e2e2e] rounded-2xl shadow-2xl p-6 text-white space-y-5"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#DA634B]/15 border border-[#DA634B]/30 flex items-center justify-center shrink-0 text-[#DA634B]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold uppercase tracking-wider text-white">
              {title}
            </h3>
            <p className="text-xs sm:text-sm text-gray-300 mt-1.5 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#2a2a2a]">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl bg-[#242424] hover:bg-[#2e2e2e] border border-[#383838] text-gray-300 hover:text-white text-xs font-semibold uppercase tracking-wider transition-colors active:scale-95"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-5 py-2.5 rounded-xl bg-[#DA634B] hover:bg-[#c5573f] text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md active:scale-95"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
