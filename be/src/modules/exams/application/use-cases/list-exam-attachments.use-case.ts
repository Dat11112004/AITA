import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { IExamRepository } from '../../domain/repositories/exam-repository.interface.js'
import { ExamAttachmentResponseDto } from '../dtos/exam.dto.js'
import { NotFoundError } from '../../../../shared/application/app.error.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'

export class ListExamAttachmentsUseCase implements IUseCase<string, ExamAttachmentResponseDto[]> {
  constructor(private readonly examRepo: IExamRepository) {}

  async execute(examId: string): Promise<ExamAttachmentResponseDto[]> {
    const exam = await this.examRepo.findById(examId)
    if (!exam) {
      throw new NotFoundError(MESSAGES.EXAM_NOT_FOUND)
    }

    const attachments = await this.examRepo.listAttachments(examId)
    return attachments.map(ExamAttachmentResponseDto.from)
  }
}
