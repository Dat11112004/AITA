import { z } from 'zod'

export const SubjectSchema = z.object({
  code: z.string().min(2, 'Mã môn học phải có ít nhất 2 ký tự'),
  name: z.string().min(2, 'Tên môn học phải có ít nhất 2 ký tự'),
})

export type SubjectRequestDtoType = z.infer<typeof SubjectSchema>

export class SubjectRequestDto {
  constructor(public readonly data: SubjectRequestDtoType) {}

  static from(body: unknown): SubjectRequestDto {
    return new SubjectRequestDto(SubjectSchema.parse(body))
  }
}

export class SubjectResponseDto {
  constructor(
    public readonly id: string,
    public readonly code: string,
    public readonly name: string
  ) {}

  static from(subject: any): SubjectResponseDto {
    return new SubjectResponseDto(
      subject.Id,
      subject.SubjectCode,
      subject.SubjectName
    )
  }
}
