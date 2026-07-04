import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { IExamRepository } from '../../domain/repositories/exam-repository.interface.js'
import type { ExamAttachment } from '../../domain/entities/exam-attachment.value-object.js'
import { NotFoundError } from '../../../../shared/application/app.error.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'

export interface GetExamAttachmentInput {
  examId: string
  attachmentId: string
}

export class GetExamAttachmentUseCase implements IUseCase<GetExamAttachmentInput, ExamAttachment> {
  constructor(private readonly examRepo: IExamRepository) {}

  async execute(input: GetExamAttachmentInput): Promise<ExamAttachment> {
    const attachment = await this.examRepo.findAttachmentById(input.attachmentId)
    if (!attachment || attachment.examId !== input.examId) {
      throw new NotFoundError(MESSAGES.EXAM_ATTACHMENT_NOT_FOUND)
    }
    return attachment
  }
}
