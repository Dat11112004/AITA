import type { Class } from '../entities/class.entity.js'

export interface ClassFilter {
  semesterId?: string
  subjectId?: string
  instructorId?: string
}

export interface IClassRepository {
  findMany(filter?: ClassFilter, options?: { skip?: number; take?: number }): Promise<Class[]>
  findById(id: string): Promise<Class | null>
  findByCode(code: string): Promise<Class | null>
  create(classEntity: Class): Promise<void>
  update(classEntity: Class): Promise<void>
  delete(id: string): Promise<void>
  assignInstructor(classId: string, instructorId: string): Promise<void>
  save(classEntity: Class): Promise<void>
  updateNote(classId: string, note: string): Promise<void>
  isInstructor(classId: string, userId: string): Promise<boolean>
}
