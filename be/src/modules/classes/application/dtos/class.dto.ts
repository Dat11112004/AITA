import { z } from 'zod'


export const CreateClassRequestSchema = z.object({
  code: z.string().min(2, 'Mã lớp phải có ít nhất 2 ký tự'),
  name: z.string().min(2, 'Tên lớp phải có ít nhất 2 ký tự'),
  subject: z.string().optional(),
  semester: z.string().optional(),
  campus: z.string().optional(),
  schedule: z.string().optional(),
  lecturerId: z.string().optional(),
})

export type CreateClassRequestDtoType = z.infer<typeof CreateClassRequestSchema>

export class CreateClassRequestDto {
  constructor(public readonly data: CreateClassRequestDtoType) {}

  static from(body: unknown): CreateClassRequestDto {
    try {
      const data = CreateClassRequestSchema.parse(body)
      return new CreateClassRequestDto(data)
    } catch (error) {
      throw error // Let the global errorHandler catch ZodError
    }
  }
}

export const EnrollStudentSchema = z.object({
  studentId: z.string({ required_error: 'studentId là bắt buộc' }),
})

export type EnrollStudentRequestDtoType = z.infer<typeof EnrollStudentSchema>

export class EnrollStudentRequestDto {
  constructor(public readonly data: EnrollStudentRequestDtoType) {}

  static from(body: unknown): EnrollStudentRequestDto {
    return new EnrollStudentRequestDto(EnrollStudentSchema.parse(body))
  }
}

export class ClassResponseDto {
  constructor(
    public readonly id: string,
    public readonly code: string,
    public readonly name: string | null,
    public readonly subject: any,
    public readonly semester: any,
    public readonly lecturers: any[]
  ) {}

  static from(cls: any): ClassResponseDto {
    return new ClassResponseDto(
      cls.Id,
      cls.ClassCode,
      cls.ClassName,
      cls.Subject ? { id: cls.Subject.Id, code: cls.Subject.SubjectCode, name: cls.Subject.SubjectName } : null,
      cls.Semester ? { id: cls.Semester.Id, code: cls.Semester.SemesterCode, name: cls.Semester.SemesterName } : null,
      cls.InstructorClass?.map((ic: any) => ({
        id: ic.User?.Id,
        name: ic.User?.FullName,
        email: ic.User?.Email,
      })) || []
    )
  }
}
