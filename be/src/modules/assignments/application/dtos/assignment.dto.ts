import { z } from 'zod'

export const createAssignmentSchema = z.object({
    title: z.string().min(3, 'Tiêu đề phải có ít nhất 3 ký tự'),
    description: z.string().optional(),
    classId: z.string().min(1, 'Mã lớp không được để trống'),
    type: z.enum(['QUIZ', 'CODING', 'GROUP']).optional(),
    maxScore: z.number().min(0).optional(),
    dueAt: z.string().optional(),
    status: z.enum(['DRAFT', 'PUBLISHED', 'CLOSED']).optional(),
})

export const updateAssignmentSchema = z.object({
    title: z.string().min(3).optional(),
    description: z.string().optional(),
    status: z.enum(['DRAFT', 'PUBLISHED', 'CLOSED']).optional(),
})

export class CreateAssignmentDto {
    title!: string
    description?: string
    classId!: string
    type?: 'QUIZ' | 'CODING' | 'GROUP'
    maxScore?: number
    dueAt?: string
    status?: 'DRAFT' | 'PUBLISHED' | 'CLOSED'

    static from(data: unknown): CreateAssignmentDto {
        const parsed = createAssignmentSchema.parse(data)
        const dto = new CreateAssignmentDto()
        Object.assign(dto, parsed)
        return dto
    }
}

export class UpdateAssignmentDto {
    title?: string
    description?: string
    status?: 'DRAFT' | 'PUBLISHED' | 'CLOSED'

    static from(data: unknown): UpdateAssignmentDto {
        const parsed = updateAssignmentSchema.parse(data)
        const dto = new UpdateAssignmentDto()
        Object.assign(dto, parsed)
        return dto
    }
}

export interface AssignmentResponseDto {
    id: string
    title: string
    description: string | null
    type: string
    status: string
    subjectId: string
    maxScore: number
    dueAt?: number
    createdAt: string
}
