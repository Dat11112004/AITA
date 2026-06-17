import { AggregateRoot } from '../../../../shared/domain/domain-event.js'

export class Class extends AggregateRoot {
  id: string
  code: string
  name: string
  subject: string
  semester: string
  campus?: string
  schedule?: string
  lecturerId: string
  createdAt: Date
  updatedAt: Date

  private constructor(
    id: string,
    code: string,
    name: string,
    subject: string,
    semester: string,
    lecturerId: string,
    campus?: string,
    schedule?: string,
    createdAt: Date = new Date(),
    updatedAt: Date = new Date()
  ) {
    super()
    this.id = id
    this.code = code
    this.name = name
    this.subject = subject
    this.semester = semester
    this.lecturerId = lecturerId
    this.campus = campus
    this.schedule = schedule
    this.createdAt = createdAt
    this.updatedAt = updatedAt
  }

  static create(
    id: string,
    code: string,
    name: string,
    subject: string,
    semester: string,
    lecturerId: string,
    campus?: string,
    schedule?: string
  ): Class {
    return new Class(id, code, name, subject, semester, lecturerId, campus, schedule)
  }

  static restore(
    id: string,
    code: string,
    name: string,
    subject: string,
    semester: string,
    lecturerId: string,
    campus?: string,
    schedule?: string,
    createdAt?: Date,
    updatedAt?: Date
  ): Class {
    return new Class(id, code, name, subject, semester, lecturerId, campus, schedule, createdAt, updatedAt)
  }

  updateBasicInfo(name: string, subject?: string, semester?: string): void {
    this.name = name
    if (subject) this.subject = subject
    if (semester) this.semester = semester
    this.updatedAt = new Date()
  }

  updateSchedule(campus?: string, schedule?: string): void {
    this.campus = campus
    this.schedule = schedule
    this.updatedAt = new Date()
  }
}
