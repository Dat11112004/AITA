import { PrismaClient } from '@prisma/client'
import { IAiRepository } from '../../domain/repositories/ai-repository.interface.js'

export class PrismaAiRepository implements IAiRepository {
    constructor(private readonly prisma: PrismaClient) { }

    async logInteraction(userId: string, model: string, prompt: string, response: string) {
        await (this.prisma as any).aiUsageLog.create({
            data: {
                UserId: userId,
                Model: model,
                Prompt: prompt,
                Response: response,
                CreatedAt: new Date()
            }
        })
    }

    async listUserInteractions(userId: string, limit: number = 20) {
        return await (this.prisma as any).aiUsageLog.findMany({
            where: { UserId: userId },
            take: limit,
            orderBy: { CreatedAt: 'desc' }
        })
    }
}
