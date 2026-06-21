import { AggregateRoot, DomainEvent } from '../../../../shared/domain/domain-event.js'

// ──────────────────────────────────────────────────────────────
// Value Types
// ──────────────────────────────────────────────────────────────

export type GradingStatusValue = 'Pending' | 'Queued' | 'Grading' | 'Graded' | 'Error'
export type ReviewStatusValue = 'PendingReview' | 'Reviewed' | 'Disputed'

// ──────────────────────────────────────────────────────────────
// Domain Events
// ──────────────────────────────────────────────────────────────

export class SubmissionCreatedEvent extends DomainEvent {
  constructor(
    public readonly submissionId: string,
    public readonly studentId: string | null,
    public readonly examId: string | null
  ) {
    super('SubmissionCreatedEvent')
  }

  toJSON() {
    return {
      eventType: this.eventType,
      submissionId: this.submissionId,
      studentId: this.studentId,
      examId: this.examId,
      occurredAt: this.occurredAt,
    }
  }
}

export class SubmissionGradedEvent extends DomainEvent {
  constructor(
    public readonly submissionId: string,
    public readonly totalScore: number | null
  ) {
    super('SubmissionGradedEvent')
  }

  toJSON() {
    return {
      eventType: this.eventType,
      submissionId: this.submissionId,
      totalScore: this.totalScore,
      occurredAt: this.occurredAt,
    }
  }
}

export class SubmissionReviewedEvent extends DomainEvent {
  constructor(
    public readonly submissionId: string,
    public readonly reviewedBy: string | null,
    public readonly finalScore: number | null
  ) {
    super('SubmissionReviewedEvent')
  }

  toJSON() {
    return {
      eventType: this.eventType,
      submissionId: this.submissionId,
      reviewedBy: this.reviewedBy,
      finalScore: this.finalScore,
      occurredAt: this.occurredAt,
    }
  }
}

// ──────────────────────────────────────────────────────────────
// Aggregate Root: Submission
// ──────────────────────────────────────────────────────────────

export class Submission extends AggregateRoot {
  id: string
  examId: string | null
  studentId: string | null
  classId: string | null
  attemptNumber: number | null
  isLatest: boolean | null
  submittedAt: Date | null
  zipFileUrl: string | null
  gradingStatus: GradingStatusValue | null
  reviewStatus: ReviewStatusValue | null
  totalScore: number | null
  finalScore: number | null
  instructorFeedback: string | null
  reviewedBy: string | null
  reviewedAt: Date | null
  gradedAt: Date | null

  private constructor(
    id: string,
    examId: string | null,
    studentId: string | null,
    classId: string | null,
    attemptNumber: number | null,
    isLatest: boolean | null,
    submittedAt: Date | null,
    zipFileUrl: string | null,
    gradingStatus: GradingStatusValue | null,
    reviewStatus: ReviewStatusValue | null,
    totalScore: number | null,
    finalScore: number | null,
    instructorFeedback: string | null,
    reviewedBy: string | null,
    reviewedAt: Date | null,
    gradedAt: Date | null
  ) {
    super()
    this.id = id
    this.examId = examId
    this.studentId = studentId
    this.classId = classId
    this.attemptNumber = attemptNumber
    this.isLatest = isLatest
    this.submittedAt = submittedAt
    this.zipFileUrl = zipFileUrl
    this.gradingStatus = gradingStatus
    this.reviewStatus = reviewStatus
    this.totalScore = totalScore
    this.finalScore = finalScore
    this.instructorFeedback = instructorFeedback
    this.reviewedBy = reviewedBy
    this.reviewedAt = reviewedAt
    this.gradedAt = gradedAt
  }

  // ── Factory Methods ──

  static create(
    id: string,
    studentId: string,
    examId: string,
    classId: string,
    attemptNumber: number,
    zipFileUrl: string
  ): Submission {
    const submission = new Submission(
      id, examId, studentId, classId,
      attemptNumber, true, new Date(), zipFileUrl,
      'Pending', 'PendingReview',
      null, null, null, null, null, null
    )
    submission.addDomainEvent(
      new SubmissionCreatedEvent(submission.id, submission.studentId, submission.examId)
    )
    return submission
  }

  static restore(
    id: string,
    examId: string | null,
    studentId: string | null,
    classId: string | null,
    attemptNumber: number | null,
    isLatest: boolean | null,
    submittedAt: Date | null,
    zipFileUrl: string | null,
    gradingStatus: GradingStatusValue | null,
    reviewStatus: ReviewStatusValue | null,
    totalScore: number | null,
    finalScore: number | null,
    instructorFeedback: string | null,
    reviewedBy: string | null,
    reviewedAt: Date | null,
    gradedAt: Date | null
  ): Submission {
    return new Submission(
      id, examId, studentId, classId, attemptNumber, isLatest,
      submittedAt, zipFileUrl, gradingStatus, reviewStatus,
      totalScore, finalScore, instructorFeedback, reviewedBy,
      reviewedAt, gradedAt
    )
  }

  // ── Business Logic ──

  startGrading(): void {
    this.gradingStatus = 'Queued'
  }

  markGrading(): void {
    this.gradingStatus = 'Grading'
  }

  completeGrading(totalScore: number): void {
    this.gradingStatus = 'Graded'
    this.totalScore = totalScore
    this.gradedAt = new Date()
    this.addDomainEvent(new SubmissionGradedEvent(this.id, totalScore))
  }

  markGradingError(): void {
    this.gradingStatus = 'Error'
  }

  review(reviewedBy: string, finalScore: number, feedback?: string): void {
    this.reviewStatus = 'Reviewed'
    this.reviewedBy = reviewedBy
    this.reviewedAt = new Date()
    this.finalScore = finalScore
    if (feedback) this.instructorFeedback = feedback
    this.addDomainEvent(
      new SubmissionReviewedEvent(this.id, reviewedBy, finalScore)
    )
  }

  dispute(): void {
    this.reviewStatus = 'Disputed'
  }

  isGraded(): boolean {
    return this.gradingStatus === 'Graded'
  }

  isPendingReview(): boolean {
    return this.reviewStatus === 'PendingReview'
  }

  getEffectiveScore(): number | null {
    return this.finalScore ?? this.totalScore
  }
}
