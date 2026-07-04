export class CreateSemesterRequestDto {
  static from(body: any) {
    if (!body.code || typeof body.code !== 'string') {
      throw new Error('Mã kỳ học (code) là bắt buộc')
    }
    
    return {
      data: {
        code: body.code.trim(),
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : true
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
