export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
  ) {
    super(message)
  }
}

export const notFound = (m = 'Không tìm thấy') => new AppError(404, m, 'NOT_FOUND')
export const unauthorized = (m = 'Chưa đăng nhập') => new AppError(401, m, 'UNAUTHORIZED')
export const forbidden = (m = 'Không có quyền') => new AppError(403, m, 'FORBIDDEN')
export const badRequest = (m: string) => new AppError(400, m, 'BAD_REQUEST')
