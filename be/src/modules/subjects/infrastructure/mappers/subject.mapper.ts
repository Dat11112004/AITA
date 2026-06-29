import { Subject } from '../../domain/entities/subject.entity.js'

export class SubjectMapper {
  static toDomain(raw: any): Subject {
    return Subject.restore(
      raw.Id,
      raw.SubjectCode,
      raw.SubjectName,
      raw.Description,
      raw.IsActive
    )
  }

  static toPersistence(subject: Subject): any {
    return {
      Id: subject.id,
      SubjectCode: subject.subjectCode,
      SubjectName: subject.subjectName,
      Description: subject.description,
      IsActive: subject.isActive,
    }
  }
}
