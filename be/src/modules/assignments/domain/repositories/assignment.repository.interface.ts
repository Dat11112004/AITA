import { Assignment } from '../entities/assignment.entity.js'

export interface IAssignmentRepository {
  findById(id: string): Promise<Assignment | null>
  findByClassId(classId: string): Promise<Assignment[]>
  create(assignment: Assignment): Promise<Assignment>
  update(assignment: Assignment): Promise<Assignment>
  delete(id: string): Promise<void>
  listAll(limit?: number, offset?: number): Promise<Assignment[]>
}
