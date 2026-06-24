import { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import { PrismaAssignmentRepository } from '../../infrastructure/repositories/prisma-assignment-repository.js'
import { CreateAssignmentDto } from '../dtos/assignment.dto.js'

export class CreateAssignmentUseCase {
    constructor(private readonly uow: IUnitOfWork) { }

    async execute(dto: CreateAssignmentDto) {
        const repo = this.uow.getRepo(PrismaAssignmentRepository)
        const assignment = await repo.create({
            Title: dto.title,
            Description: dto.description,
            SubjectId: dto.classId,
            ExamType: dto.type ?? 'ASSIGNMENT',
            Status: 'DRAFT',
            TotalPoints: dto.maxScore ?? 10,
        })

        return {
            id: assignment.Id,
            title: assignment.Title,
            status: assignment.Status?.toLowerCase(),
        }
    }
}
