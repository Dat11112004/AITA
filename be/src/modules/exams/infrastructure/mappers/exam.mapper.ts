import { Exam } from '../../domain/entities/exam.entity.js'
import type { ExamTypeValue, ExamStatusValue } from '../../domain/entities/exam.entity.js'
import { ExamAttachment } from '../../domain/entities/exam-attachment.value-object.js'

export class ExamMapper {
  static toDomain(raw: any): Exam {
    const exam = Exam.restore(
      raw.Id,
      raw.Title,
      raw.Description,
      raw.AssignmentTemplateId,
      raw.ProjectTypeId,
      raw.GradingProfileId,
      raw.SubjectId,
      raw.ExamType as ExamTypeValue,
      raw.Duration,
      raw.TotalPoints,
      raw.Status as ExamStatusValue,
      raw.SubmissionFormat,
      raw.AiGeneratedContent,
      raw.OriginalPrompt,
      raw.PromptTemplateId,
      raw.CreatedBy
    )
    
    // Add additional unmapped fields safely if needed by DTOs or logic
    if (raw.Subject) {
      (exam as any).subjectName = raw.Subject.SubjectName;
      (exam as any).subjectCode = raw.Subject.SubjectCode;
    }
    if (raw._count?.Submission !== undefined) {
      (exam as any).submissionCount = raw._count.Submission
    }

    return exam
  }

  static toPersistence(exam: Exam): any {
    return {
      Id: exam.id,
      Title: exam.title,
      Description: exam.description,
      AssignmentTemplateId: exam.assignmentTemplateId,
      ProjectTypeId: exam.projectTypeId,
      GradingProfileId: exam.gradingProfileId,
      SubjectId: exam.subjectId,
      ExamType: exam.examType,
      Duration: exam.duration,
      TotalPoints: exam.totalPoints,
      Status: exam.status,
      SubmissionFormat: exam.submissionFormat,
      AiGeneratedContent: exam.aiGeneratedContent,
      OriginalPrompt: exam.originalPrompt,
      PromptTemplateId: exam.promptTemplateId,
      CreatedBy: exam.createdBy
    }
  }

  static attachmentToDomain(raw: any): ExamAttachment {
    return ExamAttachment.restore(raw.Id, raw.ExamId, raw.FileName, raw.FileUrl, raw.FileType)
  }

  static attachmentToPersistence(attachment: ExamAttachment): any {
    return {
      Id: attachment.id,
      ExamId: attachment.examId,
      FileName: attachment.fileName,
      FileUrl: attachment.fileUrl,
      FileType: attachment.fileType,
    }
  }
}
