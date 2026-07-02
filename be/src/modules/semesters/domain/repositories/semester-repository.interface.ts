import { Semester } from '../entities/semester.entity.js'

export interface ISemesterRepository {
  findById(id: string): Promise<Semester | null>
  findByCode(code: string): Promise<Semester | null>
  findAll(activeOnly?: boolean): Promise<Semester[]>
  create(semester: Semester): Promise<void>
  update(semester: Semester): Promise<void>
  delete(id: string): Promise<void>
}
