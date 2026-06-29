import { Submission } from '../../domain/entities/submission.entity.js'
import type { GradingStatusValue, ReviewStatusValue } from '../../domain/entities/submission.entity.js'

export class SubmissionMapper {
  static toDomain(raw: any): Submission {
    const submission = Submission.restore(
      raw.Id,
      raw.ExamId,
      raw.StudentId,
      raw.ClassId,
      raw.AttemptNumber,
      raw.IsLatest,
      raw.SubmittedAt,
      raw.ZipFileUrl,
      raw.GradingStatus as GradingStatusValue,
      raw.ReviewStatus as ReviewStatusValue,
      raw.TotalScore,
      raw.FinalScore,
      raw.InstructorFeedback,
      raw.ReviewedBy,
      raw.ReviewedAt,
      raw.GradedAt
    )
    
    // Attach unmapped fields for DTO compatibility
    if (raw.User_Submission_StudentIdToUser) {
      (submission as any).student = {
        fullName: raw.User_Submission_StudentIdToUser.FullName,
        studentCode: raw.User_Submission_StudentIdToUser.StudentCode
      }
    }
    if (raw.Exam) {
      (submission as any).exam = {
        title: raw.Exam.Title,
        description: raw.Exam.Description
      }
    }
    if (raw.Class) {
      (submission as any).className = raw.Class.ClassName
    }

    return submission
  }

  static toPersistence(submission: Submission): any {
    return {
      Id: submission.id,
      ExamId: submission.examId,
      StudentId: submission.studentId,
      ClassId: submission.classId,
      AttemptNumber: submission.attemptNumber,
      IsLatest: submission.isLatest,
      SubmittedAt: submission.submittedAt,
      ZipFileUrl: submission.zipFileUrl,
      GradingStatus: submission.gradingStatus,
      ReviewStatus: submission.reviewStatus,
      TotalScore: submission.totalScore,
      FinalScore: submission.finalScore,
      InstructorFeedback: submission.instructorFeedback,
      ReviewedBy: submission.reviewedBy,
      ReviewedAt: submission.reviewedAt,
      GradedAt: submission.gradedAt
    }
  }
}
