import { BaseDTO } from '../../../../shared/application/base-use-case.js'

export class CreateClassRequestDTO extends BaseDTO {
  constructor(
    public readonly code: string,
    public readonly name: string,
    public readonly subject: string,
    public readonly semester: string,
    public readonly lecturerId: string,
    public readonly campus?: string,
    public readonly schedule?: string
  ) {
    super()
  }

  toJSON() {
    return {
      code: this.code,
      name: this.name,
      subject: this.subject,
      semester: this.semester,
      lecturerId: this.lecturerId,
      campus: this.campus,
      schedule: this.schedule,
    }
  }
}

export class ClassResponseDTO extends BaseDTO {
  constructor(
    public readonly id: string,
    public readonly code: string,
    public readonly name: string,
    public readonly subject: string,
    public readonly semester: string,
    public readonly lecturerId: string,
    public readonly campus?: string,
    public readonly schedule?: string,
    public readonly createdAt?: Date
  ) {
    super()
  }

  toJSON() {
    return {
      id: this.id,
      code: this.code,
      name: this.name,
      subject: this.subject,
      semester: this.semester,
      lecturerId: this.lecturerId,
      campus: this.campus,
      schedule: this.schedule,
      createdAt: this.createdAt?.toISOString(),
    }
  }
}

export class UpdateClassRequestDTO extends BaseDTO {
  constructor(
    public readonly name?: string,
    public readonly subject?: string,
    public readonly semester?: string,
    public readonly campus?: string,
    public readonly schedule?: string
  ) {
    super()
  }

  toJSON() {
    return {
      name: this.name,
      subject: this.subject,
      semester: this.semester,
      campus: this.campus,
      schedule: this.schedule,
    }
  }
}
