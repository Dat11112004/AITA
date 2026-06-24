import { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import { PrismaAssignmentRepository } from '../../infrastructure/repositories/prisma-assignment-repository.js'

export class GetAssignmentUseCase {
    constructor(private readonly uow: IUnitOfWork) { }

    async execute(id: string) {
        const repo = this.uow.getRepo(PrismaAssignmentRepository)
        const a = await repo.findById(id)
        if (!a) return null

        return {
            id: a.Id,
            title: a.Title,
            description: a.Description,
            type: a.ExamType?.toLowerCase(),
            status: a.Status?.toLowerCase(),
            subjectId: a.SubjectId,
            maxScore: a.TotalPoints,
        }
    }
}
