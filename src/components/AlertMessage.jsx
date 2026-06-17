export default function AlertMessage({ message }) {
  return (
    <div className="flex items-center gap-2 px-1 py-1">
      <svg
        className="w-4 h-4 text-yellow-500 flex-shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
        />
      </svg>
      <span className="text-gray-400 text-xs tracking-wider uppercase leading-tight">
        {message}
      </span>
    </div>
  )
}