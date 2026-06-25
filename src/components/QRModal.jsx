import { QRCodeSVG } from 'qrcode.react'

export default function QRModal({ onClose, onOpenAR, exporting }) {
  const url = `${window.location.origin}/#ar`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#1a1a1a] border border-[#3a3a3a] rounded-2xl p-8 flex flex-col items-center gap-6 max-w-sm w-full mx-4">
        <h2 className="text-white text-xl font-bold tracking-widest uppercase text-center">
          View In Your Driveway
        </h2>

        <div className="bg-white p-4 rounded-xl">
          <QRCodeSVG value={url} size={200} />
        </div>

        <p className="text-gray-400 text-sm text-center leading-relaxed">
          Scan with your phone to view the trailer in AR
        </p>

        <button
          onClick={onOpenAR}
          disabled={exporting}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[#DA634B] rounded-lg text-sm font-semibold tracking-widest uppercase text-white hover:bg-[#c5573f] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exporting ? 'PREPARING AR...' : 'OPEN IN AR ON THIS DEVICE'}
        </button>

        <button
          onClick={onClose}
          className="text-gray-500 text-sm hover:text-gray-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
