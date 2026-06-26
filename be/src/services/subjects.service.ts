// @ts-nocheck
import { subjectRepository } from '../repositories/subject.repository.js'
import { mapSubject } from '../utils/mappers.js'

export const subjectsService = {
  async list() {
    const subjects = await subjectRepository.findMany()
    return subjects.map(mapSubject)
  },
  async create(data: any) {
    const subject = await subjectRepository.create(data)
    return mapSubject(subject)
  },
  async update(id: string, data: any) {
    const subject = await subjectRepository.update(id, data)
    return mapSubject(subject)
  },
  async delete(id: string) {
    await subjectRepository.delete(id)
  }
}
