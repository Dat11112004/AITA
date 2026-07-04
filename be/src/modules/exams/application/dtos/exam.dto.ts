import { z } from 'zod'

export const CreateExamSchema = z.object({
  subjectId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.string().optional(),
  duration: z.coerce.number().optional(),
  dueAt: z.string().optional(),
  dueDate: z.string().optional(),
  maxScore: z.coerce.number().optional(),
  classIds: z.union([z.string(), z.array(z.string())]).optional().transform(val => {
    if (typeof val === 'string') {
      return val.split(',').map(s => s.trim()).filter(Boolean)
    }
    return val || []
  }),
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
    public readonly createdAt: string,
    public readonly classes: string[] | null,
    public readonly attachments?: { id: string, fileName: string, fileUrl: string, fileType: string }[] | null
  ) {}

  static from(exam: any): ExamResponseDto {
    return new ExamResponseDto(
      exam.Id || exam.id,
      exam.Title || exam.title,
      exam.Description || exam.description,
      (exam.ExamType || exam.type)?.toLowerCase() ?? 'assignment',
      (exam.Status || exam.status)?.toLowerCase() ?? 'draft',
      exam.SubjectId || exam.subjectId,
      exam.TotalPoints || exam.totalPoints,
      exam.Duration || exam.duration,
      exam.Id || exam.id, // using id as fallback for createdAt in legacy
      exam.classes || null,
      exam.ExamAttachment ? exam.ExamAttachment.map((a: any) => ({
        id: a.Id || a.id,
        fileName: a.FileName || a.fileName,
        fileUrl: a.FileUrl || a.fileUrl,
        fileType: a.FileType || a.fileType
      })) : null
    )
  }
}
