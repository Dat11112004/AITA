import { IExamRepository, ExamFilter } from '../../domain/repositories/exam-repository.interface.js'
import { Exam } from '../../domain/entities/exam.entity.js'
import { ExamMapper } from '../mappers/exam.mapper.js'

export class PrismaExamRepository implements IExamRepository {
  constructor(private readonly client: any) {}

  private get include() {
    return {
      Subject: true,
      _count: { select: { Submission: true } }
    }
  }

  async findMany(filter?: ExamFilter, options?: { skip?: number; take?: number }): Promise<Exam[]> {
    const where: any = {}

    if (filter?.subjectId) {
      where.SubjectId = filter.subjectId
    }
    if (filter?.status) {
      where.Status = filter.status
    }
    if (filter?.examType) {
      where.ExamType = filter.examType
    }
    // Handle complex auth filters if needed here or passed correctly via UI

    const rawExams = await this.client.exam.findMany({
      where,
      skip: options?.skip,
      take: options?.take,
      include: this.include
    })

    return rawExams.map(ExamMapper.toDomain)
  }

  async findById(id: string): Promise<Exam | null> {
    const raw = await this.client.exam.findUnique({
      where: { Id: id },
      include: this.include
    })
    return raw ? ExamMapper.toDomain(raw) : null
  }

  async create(exam: Exam): Promise<void> {
    const data = ExamMapper.toPersistence(exam)
    await this.client.exam.create({ data })
  }

  async update(exam: Exam): Promise<void> {
    const data = ExamMapper.toPersistence(exam)
    await this.client.exam.update({
      where: { Id: exam.id },
      data
    })
  }

  async save(exam: Exam): Promise<void> {
    const existing = await this.client.exam.findUnique({ where: { Id: exam.id } })
    if (existing) {
      await this.update(exam)
    } else {
      await this.create(exam)
    }
  }
}
