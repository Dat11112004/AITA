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
      raw.GradedAt,
      raw.StudentFeedback
    )
    
    // Attach related entities for the response DTO (the DTO reads these off the domain entity).
    if (raw.User_Submission_StudentIdToUser) {
      (submission as any).student = {
        id: raw.User_Submission_StudentIdToUser.Id,
        fullName: raw.User_Submission_StudentIdToUser.FullName,
        email: raw.User_Submission_StudentIdToUser.Email,
        studentCode: raw.User_Submission_StudentIdToUser.StudentCode,
      }
    }
    if (raw.Exam) {
      (submission as any).exam = {
        id: raw.Exam.Id,
        title: raw.Exam.Title,
        status: raw.Exam.Status,
        description: raw.Exam.Description,
      }
    }
    if (raw.Class) {
      // NOTE: the Class model has ClassCode, not ClassName.
      (submission as any).classInfo = { id: raw.Class.Id, code: raw.Class.ClassCode }
      ;(submission as any).className = raw.Class.ClassCode
    }
    if (raw.StudentFeedback) {
      (submission as any).studentFeedback = raw.StudentFeedback
    }
    if (raw.SubmissionArtifact) {
      (submission as any).submissionArtifacts = raw.SubmissionArtifact
    }
    if (raw.ReportData) {
      (submission as any).reportData = raw.ReportData
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
      StudentFeedback: submission.studentFeedback,
      ReviewedBy: submission.reviewedBy,
      ReviewedAt: submission.reviewedAt,
      GradedAt: submission.gradedAt
    }
  }
}
