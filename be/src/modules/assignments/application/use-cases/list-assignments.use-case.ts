import { AssignmentResponseDto } from '../../application/dtos/assignment.dto.js'
import { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import { PrismaAssignmentRepository } from '../../infrastructure/repositories/prisma-assignment-repository.js'

export class ListAssignmentsUseCase {
    constructor(private readonly uow: IUnitOfWork) { }

    async execute(user: any, params: { classId?: string; status?: string; type?: string; tab?: string }): Promise<AssignmentResponseDto[]> {
        const repo = this.uow.getRepo(PrismaAssignmentRepository)
        const { classId, status, type } = params

        const where: Record<string, unknown> = {}
        if (classId) where.SubjectId = classId
        if (type) where.ExamType = String(type).toUpperCase()
        if (status) where.Status = String(status).toUpperCase()

        const list = await repo.findMany(where)

        // Simplified filtering logic for this refactor example
        let filtered = list
        if (user.role === 'LECTURER') {
            // Logic from legacy service would go here, or even better, in the repository query
        }

        return filtered.map((a: any) => ({
            id: a.Id,
            title: a.Title,
            description: a.Description,
            type: a.ExamType?.toLowerCase() || 'assignment',
            status: a.Status?.toLowerCase() || 'draft',
            subjectId: a.SubjectId,
            maxScore: a.TotalPoints,
            dueAt: a.Duration,
            createdAt: a.Id,
        }))
    }
}
