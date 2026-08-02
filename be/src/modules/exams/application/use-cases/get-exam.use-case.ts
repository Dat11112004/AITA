import type { IUseCase } from '../../../../shared/application/base-use-case.js'
import type { IExamRepository } from '../../domain/repositories/exam-repository.interface.js'
import { ExamResponseDto } from '../dtos/exam.dto.js'
import { NotFoundError } from '../../../../shared/application/app.error.js'
import { MESSAGES } from '../../../../shared/constants/messages.js'

import { prisma } from '../../../../database/prisma.js'

export class GetExamUseCase implements IUseCase<string, ExamResponseDto> {
  constructor(private readonly examRepo: IExamRepository) {}

  /**
   * @param viewerId optional id of the requesting user. When that user is enrolled in one of
   *   the exam's classes, the lecturer shown is the one teaching *their* class rather than
   *   whichever class happens to be attached first. Omitting it keeps the previous behaviour,
   *   which is what lecturers and admins continue to get.
   */
  async execute(id: string, viewerId?: string): Promise<ExamResponseDto> {
    const exam = await this.examRepo.findById(id)
    if (!exam) {
      throw new NotFoundError(MESSAGES.EXAM_NOT_FOUND)
    }

    if (viewerId) {
      const ownClass = ((exam as any).classLecturers ?? []).find(
        (c: any) => c.lecturer && Array.isArray(c.studentIds) && c.studentIds.includes(viewerId)
      )
      if (ownClass) {
        (exam as any).lecturer = ownClass.lecturer;
        (exam as any).lecturerAvatar = ownClass.lecturerAvatar;
      }
    }

    // An exam is not always attached to a class (ExamClass can be empty), yet the student is
    // still enrolled in a class for its subject and has a real lecturer there — which is why
    // the subject list showed a name and photo while this screen said "Not assigned". Resolve
    // it the same way the subject list does (student's enrolments -> class -> instructor) so
    // the two screens can no longer disagree. Only fills a blank; never overrides the above.
    if (viewerId && !(exam as any).lecturer && (exam as any).subjectId) {
      const enrolledClass = await prisma.class.findFirst({
        where: {
          SubjectId: (exam as any).subjectId,
          StudentClass: { some: { UserId: viewerId } },
          InstructorClass: { some: {} }
        },
        include: { InstructorClass: { include: { User: true } } }
      })
      const instructor = enrolledClass?.InstructorClass?.[0]?.User
      if (instructor) {
        (exam as any).lecturer = instructor.FullName;
        (exam as any).lecturerAvatar = instructor.Avatar;
      }
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
