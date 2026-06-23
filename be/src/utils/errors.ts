import { AppError } from '../shared/application/app.error.js'

export { AppError }

export const notFound = (m = 'Không tìm thấy') => new AppError('NOT_FOUND', m, 404)
export const unauthorized = (m = 'Chưa đăng nhập') => new AppError('UNAUTHORIZED', m, 401)
export const forbidden = (m = 'Không có quyền') => new AppError('FORBIDDEN', m, 403)
export const badRequest = (m: string) => new AppError('BAD_REQUEST', m, 400)

