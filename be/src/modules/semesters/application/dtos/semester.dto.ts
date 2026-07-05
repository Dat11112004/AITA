const validateDate = (dateStr: string) => {
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) throw new Error('Ngày không hợp lệ')
  if (date.getFullYear() > 2100 || date.getFullYear() < 1900) throw new Error('Năm phải nằm trong khoảng 1900 - 2100')
  return date
}

export class CreateSemesterRequestDto {
  static from(body: any) {
    if (!body.code || typeof body.code !== 'string') {
      throw new Error('Mã kỳ học (code) là bắt buộc')
    }
    
    return {
      data: {
        code: body.code.trim(),
        startDate: body.startDate ? validateDate(body.startDate) : undefined,
        endDate: body.endDate ? validateDate(body.endDate) : undefined,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : true
      }
    }
  }
}

export class UpdateSemesterRequestDto {
  static from(body: any, id: string) {
    if (!id) {
      throw new Error('ID kỳ học là bắt buộc')
    }

    return {
      id,
      data: {
        code: body.code ? body.code.trim() : undefined,
        startDate: body.startDate ? validateDate(body.startDate) : undefined,
        endDate: body.endDate ? validateDate(body.endDate) : undefined,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined
      }
    }
  }
}

export class SemesterResponseDto {
  static from(semester: any) {
    return {
      id: semester.id,
      code: semester.code,
      isActive: semester.isActive,
      startDate: semester.startDate?.toISOString() ?? null,
      endDate: semester.endDate?.toISOString() ?? null
    }
  }
}
