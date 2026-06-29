import { Class } from '../../domain/entities/class.entity.js'

export class ClassMapper {
  static toDomain(raw: any): Class {
    const classEntity = Class.restore(
      raw.Id,
      raw.ClassCode,
      raw.SubjectId,
      raw.SemesterId,
      raw.Status
    )
    
    // Attach unmapped fields for DTO compatibility
    if (raw.Subject) {
      (classEntity as any).subjectName = raw.Subject.SubjectName;
      (classEntity as any).subjectCode = raw.Subject.SubjectCode;
    }
    if (raw.Semester) {
      (classEntity as any).semesterName = raw.Semester.SemesterName
    }
    if (raw.InstructorClass && raw.InstructorClass.length > 0) {
      (classEntity as any).instructorName = raw.InstructorClass[0].User?.FullName;
      (classEntity as any).instructorId = raw.InstructorClass[0].User?.Id;
    }
    if (raw._count?.StudentClass !== undefined) {
      (classEntity as any).studentCount = raw._count.StudentClass
    }

    return classEntity
  }

  static toPersistence(classEntity: Class): any {
    return {
      Id: classEntity.id,
      ClassCode: classEntity.classCode,
      SubjectId: classEntity.subjectId,
      SemesterId: classEntity.semesterId,
      Status: classEntity.status,
    }
  }
}
