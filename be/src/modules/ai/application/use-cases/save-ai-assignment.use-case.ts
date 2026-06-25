import { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'

export class SaveAiAssignmentUseCase {
    constructor(private readonly uow: IUnitOfWork) { }

    async execute({ dto, creatorId }: { dto: any; creatorId: string }) {
        return await this.uow.runInTransaction(async (tx) => {
            return await tx.examRepository.create({
                Title: dto.title,
                Description: dto.description,
                ExamType: dto.type,
                Status: dto.publish ? 'Published' : 'Draft',
                AiGeneratedContent: dto.content ? JSON.stringify(dto.content) : null,
                TotalPoints: 10,
                Duration: 14 * 24 * 60,
                CreatedBy: creatorId,
            })
        })
    }
}
