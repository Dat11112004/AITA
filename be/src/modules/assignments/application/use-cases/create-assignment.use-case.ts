import { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import { PrismaAssignmentRepository } from '../../infrastructure/repositories/prisma-assignment-repository.js'
import { CreateAssignmentDto } from '../dtos/assignment.dto.js'
import { AuthUser } from '../../../../types/express.js'

export class CreateAssignmentUseCase {
    constructor(private readonly uow: IUnitOfWork) { }

    async execute({ dto, user }: { dto: CreateAssignmentDto, user: AuthUser }) {
        const repo = this.uow.getRepo(PrismaAssignmentRepository)
        const assignment = await repo.create({
            Title: dto.title,
            Description: dto.description,
            SubjectId: dto.classId,
            ExamType: dto.type ?? 'ASSIGNMENT',
            Status: dto.status ?? 'DRAFT',
            TotalPoints: dto.maxScore ?? 10,
            CreatedBy: user.id
        })

        return {
            id: assignment.Id,
            title: assignment.Title,
            description: assignment.Description,
            type: assignment.ExamType?.toLowerCase(),
            status: assignment.Status?.toLowerCase(),
            classId: assignment.SubjectId,
            class: assignment.Subject?.SubjectName || assignment.Subject?.SubjectCode || assignment.SubjectId,
            maxScore: assignment.TotalPoints,
            due: null,
            submitted: 0
        }
    }
}
