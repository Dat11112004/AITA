import { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'
import { PrismaAssignmentRepository } from '../../infrastructure/repositories/prisma-assignment-repository.js'
import { UpdateAssignmentDto } from '../dtos/assignment.dto.js'

export class UpdateAssignmentUseCase {
    constructor(private readonly uow: IUnitOfWork) { }

    async execute(id: string, dto: UpdateAssignmentDto) {
        const repo = this.uow.getRepo(PrismaAssignmentRepository)
        const updated = await repo.update(id, {
            Title: dto.title,
            Description: dto.description,
            Status: dto.status,
        })

        return {
            id: updated.Id,
            title: updated.Title,
            status: updated.Status?.toLowerCase(),
        }
    }
}
