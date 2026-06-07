import { discussionRepository } from '../repositories/discussion.repository.js'
import { mapDiscussionThread, mapDiscussionReply } from '../utils/mappers.js'
import { notFound } from '../utils/errors.js'
import type { AuthUser } from '../types/express.js'

export const discussionsService = {
  async listThreads(classId?: string) {
    const where: any = {}
    if (classId) where.classId = classId
    
    const threads = await discussionRepository.findManyThreads(where)
    return threads.map(mapDiscussionThread)
  },
  async getThread(id: string) {
    const thread = await discussionRepository.findThreadById(id)
    if (!thread) throw notFound()
    return mapDiscussionThread(thread)
  },
  async createThread(user: AuthUser, data: any) {
    const thread = await discussionRepository.createThread({
      ...data,
      authorId: user.id
    })
    return mapDiscussionThread(thread)
  },
  async reply(user: AuthUser, threadId: string, data: any) {
    const reply = await discussionRepository.createReply({
      ...data,
      threadId,
      authorId: user.id
    })
    return mapDiscussionReply(reply)
  }
}
