import { randomUUID } from 'node:crypto'
import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { IExamRepository } from '../../domain/repositories/exam-repository.interface.js'
import { ExamAttachment } from '../../domain/entities/exam-attachment.value-object.js'
import { ExamAttachmentResponseDto } from '../dtos/exam.dto.js'
import { NotFoundError } from '../../../../shared/application/app.error.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'

export interface UploadExamAttachmentInput {
  examId: string
  fileName: string
  fileUrl: string
  fileType: string
}

export class UploadExamAttachmentUseCase implements IUseCase<UploadExamAttachmentInput, ExamAttachmentResponseDto> {
  constructor(private readonly examRepo: IExamRepository) {}

  async execute(input: UploadExamAttachmentInput): Promise<ExamAttachmentResponseDto> {
    const exam = await this.examRepo.findById(input.examId)
    if (!exam) {
      throw new NotFoundError(MESSAGES.EXAM_NOT_FOUND)
    }

    const attachment = ExamAttachment.create(
      randomUUID(),
      input.examId,
      input.fileName,
      input.fileUrl,
      input.fileType
    )
    await this.examRepo.addAttachment(attachment)

    return ExamAttachmentResponseDto.from(attachment)
  }
}
