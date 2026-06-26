import { IUseCase } from '../../../../shared/application/base-use-case.js'
import { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import { AuthUser } from '../../../../types/express.js'
import { Prisma } from '../../../../database/prisma.js'

export class ListAssignmentsUseCase implements IUseCase<{ user: AuthUser; params: any }, any[]> {
    constructor(private readonly uow: IUnitOfWork) { }

    async execute({ user, params }: { user: AuthUser; params: any }): Promise<any[]> {
        const { classId, status, type, page = 1, limit = 10 } = params

        const where: Prisma.ExamWhereInput = {}
        if (classId) where.SubjectId = classId
        if (type) where.ExamType = String(type).toUpperCase() as any
        if (status) where.Status = String(status).toUpperCase() as any

        const skip = (page - 1) * limit
        const assignments = await this.uow.examRepository.findMany({ where, skip, take: limit })

        let allowedSubjectIds: Set<string> | null = null

        if (user.role === 'LECTURER') {
            const classes = await this.uow.classRepository.findMany({
                where: { InstructorClass: { some: { UserId: user.id } } }
            })
            allowedSubjectIds = new Set(classes.map((item: any) => item.Id))
        } else if (user.role === 'STUDENT') {
            const enrollments = await this.uow.enrollmentRepository.findMany({ UserId: user.id })
            allowedSubjectIds = new Set(enrollments.map((item: any) => item.ClassId))
        }

        const filtered = allowedSubjectIds
            ? assignments.filter((item: any) => allowedSubjectIds!.has(item.SubjectId))
            : assignments

        return filtered.map((a: any) => ({
            id: a.Id,
            title: a.Title,
            description: a.Description,
            type: a.ExamType?.toLowerCase() || 'assignment',
            status: a.Status?.toLowerCase() || 'draft',
            classId: a.SubjectId,
            class: a.Subject?.SubjectName || a.Subject?.SubjectCode || a.SubjectId,
            maxScore: a.TotalPoints,
            due: null,
            submitted: a._count?.Submission || 0
        }))
    }
}
