import { contentRepository } from '../repositories/content.repository.js'
import { mapContent } from '../utils/mappers.js'

export const contentsService = {
  async list(params: { category?: string; status?: string }) {
    const where: any = {}
    if (params.category) where.category = params.category
    if (params.status) where.status = params.status
    
    const contents = await contentRepository.findMany(where)
    return contents.map(mapContent)
  },
  async create(data: any) {
    const content = await contentRepository.create(data)
    return mapContent(content)
  },
  async update(id: string, data: any) {
    const content = await contentRepository.update(id, data)
    return mapContent(content)
  },
  async delete(id: string) {
    await contentRepository.delete(id)
  }
}
