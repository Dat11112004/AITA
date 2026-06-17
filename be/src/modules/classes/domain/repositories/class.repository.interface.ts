import { Class } from '../entities/class.entity.js'

export interface IClassRepository {
  findById(id: string): Promise<Class | null>
  findByCode(code: string): Promise<Class | null>
  findByLecturerId(lecturerId: string): Promise<Class[]>
  create(classEntity: Class): Promise<Class>
  update(classEntity: Class): Promise<Class>
  delete(id: string): Promise<void>
  listAll(limit?: number, offset?: number): Promise<Class[]>
}
