export default function LoadError({ message, onRetry }) {
  return (
    <div role="alert" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-red-500/60 bg-red-950/30 rounded-lg p-3 mb-6">
      <p className="text-sm text-red-300">{message}</p>
      <button onClick={onRetry} className="px-3 py-1 rounded bg-gray-800 hover:bg-gray-700 text-white text-sm border border-red-500/60">
        Retry
      </button>
    </div>
  )
}
