import { AggregateRoot } from '../../../../shared/domain/domain-event.js'

export type AssignmentType = 'QUIZ' | 'CODING' | 'GROUP'
export type AssignmentStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED'

export class Assignment extends AggregateRoot {
  id: string
  classId: string
  title: string
  description?: string
  type: AssignmentType
  status: AssignmentStatus
  dueAt?: Date
  maxScore: number
  content?: string
  createdAt: Date
  updatedAt: Date

  private constructor(
    id: string,
    classId: string,
    title: string,
    type: AssignmentType,
    status: AssignmentStatus,
    maxScore: number = 10,
    description?: string,
    dueAt?: Date,
    content?: string,
    createdAt: Date = new Date(),
    updatedAt: Date = new Date()
  ) {
    super()
    this.id = id
    this.classId = classId
    this.title = title
    this.type = type
    this.status = status
    this.maxScore = maxScore
    this.description = description
    this.dueAt = dueAt
    this.content = content
    this.createdAt = createdAt
    this.updatedAt = updatedAt
  }

  static create(
    id: string,
    classId: string,
    title: string,
    type: AssignmentType,
    description?: string,
    dueAt?: Date,
    content?: string,
    maxScore: number = 10
  ): Assignment {
    return new Assignment(
      id,
      classId,
      title,
      type,
      'DRAFT',
      maxScore,
      description,
      dueAt,
      content
    )
  }

  static restore(
    id: string,
    classId: string,
    title: string,
    type: AssignmentType,
    status: AssignmentStatus,
    maxScore: number,
    description?: string,
    dueAt?: Date,
    content?: string,
    createdAt?: Date,
    updatedAt?: Date
  ): Assignment {
    return new Assignment(
      id,
      classId,
      title,
      type,
      status,
      maxScore,
      description,
      dueAt,
      content,
      createdAt,
      updatedAt
    )
  }

  publish(): void {
    this.status = 'PUBLISHED'
    this.updatedAt = new Date()
  }

  close(): void {
    this.status = 'CLOSED'
    this.updatedAt = new Date()
  }

  isPublished(): boolean {
    return this.status === 'PUBLISHED'
  }

  isDraft(): boolean {
    return this.status === 'DRAFT'
  }

  updateBasicInfo(title: string, description?: string, content?: string): void {
    this.title = title
    this.description = description
    this.content = content
    this.updatedAt = new Date()
  }

  updateDeadline(dueAt: Date): void {
    this.dueAt = dueAt
    this.updatedAt = new Date()
  }
}
