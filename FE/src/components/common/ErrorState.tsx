import { AlertCircle, RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'

interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  icon?: ReactNode
  className?: string
}

/**
 * Error state display component
 */
export function ErrorState({
  title = 'Có lỗi xảy ra',
  message,
  onRetry,
  icon,
  className = '',
}: ErrorStateProps) {
  return (
    <div className={`flex items-center justify-center p-8 bg-red-50 rounded-lg ${className}`}>
      <div className="text-center">
        <div className="flex justify-center mb-3">
          {icon || <AlertCircle className="h-12 w-12 text-red-600" />}
        </div>
        <h3 className="font-semibold text-lg text-red-900 mb-2">{title}</h3>
        <p className="text-sm text-red-700 mb-4">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            <RefreshCw className="h-4 w-4" />
            Thử lại
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * API Error component with detailed error info
 */
export function APIError({
  error,
  onRetry,
}: {
  error: Error | null
  onRetry?: () => void
}) {
  if (!error) return null

  const message =
    error instanceof Error
      ? error.message
      : 'Không xác định được lỗi. Vui lòng thử lại.'

  return (
    <ErrorState
      title="Lỗi tải dữ liệu"
      message={message}
      onRetry={onRetry}
      className="my-4"
    />
  )
}
