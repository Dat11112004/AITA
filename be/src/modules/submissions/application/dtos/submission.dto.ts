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
    let aiFeedback = null;
    try {
      const rawReport = submission.reportData || submission.ReportData;
      if (rawReport) {
        const parsed = typeof rawReport === 'string' ? JSON.parse(rawReport) : rawReport;
        aiFeedback = parsed.overallFeedback || null;
      }
    } catch (e) {
      // Ignore parse errors
    }

    return {
      id: submission.id || submission.Id,
      examId: submission.examId || submission.ExamId,
      assignmentId: submission.examId || submission.ExamId,
      studentId: submission.studentId || submission.StudentId,
      classId: submission.classId || submission.ClassId,
      attemptNumber: submission.attemptNumber || submission.AttemptNumber,
      isLatest: submission.isLatest ?? submission.IsLatest,
      submittedAt: submission.submittedAt || submission.SubmittedAt,
      zipFileUrl: submission.zipFileUrl || submission.ZipFileUrl,
      gradingStatus: submission.gradingStatus || submission.GradingStatus,
      reviewStatus: submission.reviewStatus || submission.ReviewStatus,
      totalScore: submission.totalScore !== undefined && submission.totalScore !== null ? Number(submission.totalScore) : (submission.TotalScore !== undefined && submission.TotalScore !== null ? Number(submission.TotalScore) : null),
      finalScore: submission.finalScore !== undefined && submission.finalScore !== null ? Number(submission.finalScore) : (submission.FinalScore !== undefined && submission.FinalScore !== null ? Number(submission.FinalScore) : null),
      instructorFeedback: submission.instructorFeedback || submission.InstructorFeedback,
      studentFeedback: submission.studentFeedback || submission.StudentFeedback,
      reviewedBy: submission.reviewedBy || submission.ReviewedBy,
      reviewedAt: submission.reviewedAt || submission.ReviewedAt,
      gradedAt: submission.gradedAt || submission.GradedAt,
      aiFeedback: aiFeedback,
      student: submission.User_Submission_StudentIdToUser ? {
        id: submission.User_Submission_StudentIdToUser.Id,
        name: submission.User_Submission_StudentIdToUser.FullName,
        email: submission.User_Submission_StudentIdToUser.Email,
      } : (submission.student ? submission.student : null),
      exam: submission.Exam ? {
        id: submission.Exam.Id,
        title: submission.Exam.Title,
        status: submission.Exam.Status,
      } : (submission.exam ? submission.exam : null),
      class: submission.Class ? {
        id: submission.Class.Id,
        code: submission.Class.ClassCode,
      } : (submission.class ? submission.class : null),
    }
  }
}
