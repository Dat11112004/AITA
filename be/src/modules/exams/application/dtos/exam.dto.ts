import { z } from 'zod'

export const CreateExamSchema = z.object({
  subjectId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['assignment', 'quiz']).optional(),
  duration: z.number().optional(),
  dueAt: z.string().optional(),
  maxScore: z.number().optional(),
})

export type CreateExamRequestDtoType = z.infer<typeof CreateExamSchema>

export class CreateExamRequestDto {
  constructor(public readonly data: CreateExamRequestDtoType) {}

  static from(body: unknown): CreateExamRequestDto {
    return new CreateExamRequestDto(CreateExamSchema.parse(body))
  }
}

export const UpdateExamSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  status: z.string().optional(),
})

export type UpdateExamRequestDtoType = z.infer<typeof UpdateExamSchema>

export class UpdateExamRequestDto {
  constructor(public readonly data: UpdateExamRequestDtoType) {}

  static from(body: unknown): UpdateExamRequestDto {
    return new UpdateExamRequestDto(UpdateExamSchema.parse(body))
  }
}

export class ExamResponseDto {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly description: string | null,
    public readonly type: string,
    public readonly status: string,
    public readonly subjectId: string | null,
    public readonly maxScore: number | null,
    public readonly dueAt: number | null,
    public readonly createdAt: string
  ) {}

  static from(exam: any): ExamResponseDto {
    return new ExamResponseDto(
      exam.Id,
      exam.Title,
      exam.Description,
      exam.ExamType?.toLowerCase() ?? 'assignment',
      exam.Status?.toLowerCase() ?? 'draft',
      exam.SubjectId,
      exam.TotalPoints,
      exam.Duration,
      exam.Id // using id as fallback for createdAt in legacy
    )
  }
}
