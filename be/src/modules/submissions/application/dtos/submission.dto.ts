import { z } from 'zod'

export const ListSubmissionsQuerySchema = z.object({
  assignmentId: z.string().optional(),
  examId: z.string().optional(),
  status: z.string().optional(),
})

export const CreateSubmissionSchema = z.object({
  assignmentId: z.string().optional(),
  examId: z.string().optional(),
  classId: z.string().optional(),
  zipFileUrl: z.string().optional(),
  content: z.string().optional(),
  language: z.string().optional(),
  groupCode: z.string().optional(),
}).refine((data) => data.assignmentId || data.examId, {
  message: 'assignmentId hoặc examId là bắt buộc',
})

export const PublishGradeSchema = z.object({
  score: z.coerce.number().optional(),
  finalScore: z.coerce.number().optional(),
  feedback: z.string().optional(),
})

export class ListSubmissionsQueryDto {
  constructor(public readonly data: z.infer<typeof ListSubmissionsQuerySchema>) {}

  static from(query: unknown): ListSubmissionsQueryDto {
    return new ListSubmissionsQueryDto(ListSubmissionsQuerySchema.parse(query))
  }
}

export class CreateSubmissionRequestDto {
  constructor(public readonly data: z.infer<typeof CreateSubmissionSchema>) {}

  static from(body: unknown): CreateSubmissionRequestDto {
    return new CreateSubmissionRequestDto(CreateSubmissionSchema.parse(body))
  }
}

export class PublishGradeRequestDto {
  constructor(public readonly data: z.infer<typeof PublishGradeSchema>) {}

  static from(body: unknown): PublishGradeRequestDto {
    return new PublishGradeRequestDto(PublishGradeSchema.parse(body))
  }
}

export class SubmissionResponseDto {
  static from(submission: any) {
    return {
      id: submission.Id,
      examId: submission.ExamId,
      assignmentId: submission.ExamId,
      studentId: submission.StudentId,
      classId: submission.ClassId,
      attemptNumber: submission.AttemptNumber,
      isLatest: submission.IsLatest,
      submittedAt: submission.SubmittedAt,
      zipFileUrl: submission.ZipFileUrl,
      gradingStatus: submission.GradingStatus,
      reviewStatus: submission.ReviewStatus,
      totalScore: submission.TotalScore === null || submission.TotalScore === undefined ? null : Number(submission.TotalScore),
      finalScore: submission.FinalScore === null || submission.FinalScore === undefined ? null : Number(submission.FinalScore),
      instructorFeedback: submission.InstructorFeedback,
      reviewedBy: submission.ReviewedBy,
      reviewedAt: submission.ReviewedAt,
      gradedAt: submission.GradedAt,
      student: submission.User_Submission_StudentIdToUser ? {
        id: submission.User_Submission_StudentIdToUser.Id,
        name: submission.User_Submission_StudentIdToUser.FullName,
        email: submission.User_Submission_StudentIdToUser.Email,
      } : null,
      exam: submission.Exam ? {
        id: submission.Exam.Id,
        title: submission.Exam.Title,
        status: submission.Exam.Status,
      } : null,
      class: submission.Class ? {
        id: submission.Class.Id,
        code: submission.Class.ClassCode,
      } : null,
    }
  }
}
