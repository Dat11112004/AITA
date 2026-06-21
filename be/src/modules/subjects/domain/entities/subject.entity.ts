import { AggregateRoot, DomainEvent } from '../../../../shared/domain/domain-event.js'

// ──────────────────────────────────────────────────────────────
// Domain Events
// ──────────────────────────────────────────────────────────────

export class SubjectCreatedEvent extends DomainEvent {
  constructor(
    public readonly subjectId: string,
    public readonly subjectCode: string | null
  ) {
    super('SubjectCreatedEvent')
  }

  toJSON() {
    return {
      eventType: this.eventType,
      subjectId: this.subjectId,
      subjectCode: this.subjectCode,
      occurredAt: this.occurredAt,
    }
  }
}

export class SubjectDeactivatedEvent extends DomainEvent {
  constructor(public readonly subjectId: string) {
    super('SubjectDeactivatedEvent')
  }

  toJSON() {
    return {
      eventType: this.eventType,
      subjectId: this.subjectId,
      occurredAt: this.occurredAt,
    }
  }
}

// ──────────────────────────────────────────────────────────────
// Aggregate Root: Subject
// ──────────────────────────────────────────────────────────────

export class Subject extends AggregateRoot {
  id: string
  subjectCode: string | null
  subjectName: string | null
  description: string | null
  isActive: boolean | null

  private constructor(
    id: string,
    subjectCode: string | null,
    subjectName: string | null,
    description: string | null,
    isActive: boolean | null
  ) {
    super()
    this.id = id
    this.subjectCode = subjectCode
    this.subjectName = subjectName
    this.description = description
    this.isActive = isActive
  }

  // ── Factory Methods ──

  static create(
    id: string,
    subjectCode: string,
    subjectName: string,
    description?: string
  ): Subject {
    const subject = new Subject(id, subjectCode, subjectName, description ?? null, true)
    subject.addDomainEvent(new SubjectCreatedEvent(subject.id, subject.subjectCode))
    return subject
  }

  static restore(
    id: string,
    subjectCode: string | null,
    subjectName: string | null,
    description: string | null,
    isActive: boolean | null
  ): Subject {
    return new Subject(id, subjectCode, subjectName, description, isActive)
  }

  // ── Business Logic ──

  isActiveSubject(): boolean {
    return this.isActive === true
  }

  deactivate(): void {
    this.isActive = false
    this.addDomainEvent(new SubjectDeactivatedEvent(this.id))
  }

  activate(): void {
    this.isActive = true
  }

  updateInfo(params: {
    subjectCode?: string
    subjectName?: string
    description?: string
  }): void {
    if (params.subjectCode !== undefined) this.subjectCode = params.subjectCode
    if (params.subjectName !== undefined) this.subjectName = params.subjectName
    if (params.description !== undefined) this.description = params.description
  }
}
