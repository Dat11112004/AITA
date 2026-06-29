import type { Exam, ExamStatusValue, ExamTypeValue } from '../entities/exam.entity.js'

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
}
