import type { Exam, ExamStatusValue, ExamTypeValue } from '../entities/exam.entity.js'
import type { ExamAttachment } from '../entities/exam-attachment.value-object.js'

export interface ExamFilter {
  subjectId?: string
  status?: ExamStatusValue
  examType?: ExamTypeValue
  instructorId?: string
  classIds?: string[]
}

export interface IExamRepository {
  findMany(filter?: ExamFilter, options?: { skip?: number; take?: number }): Promise<Exam[]>
  findById(id: string): Promise<Exam | null>
  create(exam: Exam): Promise<void>
  update(exam: Exam): Promise<void>
  save(exam: Exam): Promise<void>
  addAttachment(attachment: ExamAttachment): Promise<void>
  listAttachments(examId: string): Promise<ExamAttachment[]>
  findAttachmentById(attachmentId: string): Promise<ExamAttachment | null>
}
