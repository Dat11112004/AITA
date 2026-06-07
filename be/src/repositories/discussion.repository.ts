import { prisma, Prisma } from '../database/prisma.js'

export const discussionRepository = {
  findManyThreads: (where?: Prisma.DiscussionThreadWhereInput) => prisma.discussionThread.findMany({
    where,
    include: { 
      author: { select: { fullName: true, role: true } },
      class: { select: { name: true } },
      _count: { select: { replies: true } }
    },
    orderBy: { createdAt: 'desc' },
  }),
  findThreadById: (id: string) => prisma.discussionThread.findUnique({
    where: { id },
    include: {
      author: { select: { fullName: true, role: true } },
      class: { select: { name: true } },
      replies: {
        include: { author: { select: { fullName: true, role: true } } },
        orderBy: { createdAt: 'asc' }
      }
    }
  }),
  createThread: (data: Prisma.DiscussionThreadUncheckedCreateInput) => prisma.discussionThread.create({ data }),
  updateThread: (id: string, data: Prisma.DiscussionThreadUpdateInput) => prisma.discussionThread.update({ where: { id }, data }),
  createReply: (data: Prisma.DiscussionReplyUncheckedCreateInput) => prisma.discussionReply.create({ data }),
}
