import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { IExamRepository } from '../../domain/repositories/exam-repository.interface.js'
import { ExamResponseDto } from '../dtos/exam.dto.js'
import { NotFoundError } from '../../../../shared/application/app.error.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'

import { prisma } from '../../../../database/prisma.js'

export class GetExamUseCase implements IUseCase<string, ExamResponseDto> {
  constructor(private readonly examRepo: IExamRepository) {}

  async execute(id: string): Promise<ExamResponseDto> {
    const exam = await this.examRepo.findById(id)
    if (!exam) {
      throw new NotFoundError(MESSAGES.EXAM_NOT_FOUND)
    }

    // Attempt to load the AI-generated rubric if it exists
    try {
      const published = await prisma.publishedAssignment.findUnique({
        where: { Id: id }
      })
      
      if (published && published.Data) {
        const data = JSON.parse(published.Data)
        if (data.rubric && data.rubric.rules) {
          // Map AI rubric to DTO format
          (exam as any).aiRubrics = data.rubric.rules.map((rule: any) => ({
            id: rule.id,
            description: rule.criteria || rule.description || 'Tiêu chí lớn',
            maxPoints: Number(rule.weight) || 0,
            scoringStrategy: rule.scoringStrategy,
            requiredEvidence: rule.requiredEvidence,
            criteria: rule.levels ? rule.levels.map((level: any) => ({
              id: level.id,
              description: level.description,
              maxPoints: Number(level.score) || 0
            })) : []
          }))
        }
      }
    } catch (err) {
      console.error('Error fetching PublishedAssignment:', err)
    }
    
    return ExamResponseDto.from(exam as any)
  }
}
