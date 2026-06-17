import { BaseDTO } from '../../../../shared/application/base-use-case.js'

export class CreateAssignmentRequestDTO extends BaseDTO {
  constructor(
    public readonly classId: string,
    public readonly title: string,
    public readonly type: string,
    public readonly description?: string,
    public readonly dueAt?: Date,
    public readonly content?: string,
    public readonly maxScore: number = 10
  ) {
    super()
  }

  toJSON() {
    return {
      classId: this.classId,
      title: this.title,
      type: this.type,
      description: this.description,
      dueAt: this.dueAt?.toISOString(),
      content: this.content,
      maxScore: this.maxScore,
    }
  }
}

export class AssignmentResponseDTO extends BaseDTO {
  constructor(
    public readonly id: string,
    public readonly classId: string,
    public readonly title: string,
    public readonly type: string,
    public readonly status: string,
    public readonly maxScore: number,
    public readonly description?: string,
    public readonly dueAt?: Date,
    public readonly content?: string,
    public readonly createdAt?: Date
  ) {
    super()
  }

  toJSON() {
    return {
      id: this.id,
      classId: this.classId,
      title: this.title,
      type: this.type,
      status: this.status,
      maxScore: this.maxScore,
      description: this.description,
      dueAt: this.dueAt?.toISOString(),
      content: this.content,
      createdAt: this.createdAt?.toISOString(),
    }
  }
}

export class UpdateAssignmentRequestDTO extends BaseDTO {
  constructor(
    public readonly title?: string,
    public readonly description?: string,
    public readonly content?: string,
    public readonly dueAt?: Date,
    public readonly status?: string
  ) {
    super()
  }

  toJSON() {
    return {
      title: this.title,
      description: this.description,
      content: this.content,
      dueAt: this.dueAt?.toISOString(),
      status: this.status,
    }
  }
}
