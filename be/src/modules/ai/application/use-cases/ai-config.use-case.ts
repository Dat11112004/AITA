import { IUnitOfWork } from '../../../../shared/application/ports/unit-of-work.interface.js'

export class GetAiConfigUseCase {
    constructor(private readonly uow: IUnitOfWork) { }

    async execute() {
        const settings = await (this.uow as any).prisma.systemConfig.findMany()
        const map = Object.fromEntries(settings.map((s: any) => [s.Key, s.Value]))
        return {
            aiEndpoint: map.aiEndpoint ?? '',
            aiModel: map.aiModel ?? 'stub',
            aiTimeout: map.aiTimeout ?? '60',
            aiStubMode: map.aiStubMode ?? 'true',
        }
    }
}

export class UpdateAiConfigUseCase {
    constructor(private readonly uow: IUnitOfWork) { }

    async execute(body: Record<string, string>) {
        const keys = ['aiEndpoint', 'aiModel', 'aiTimeout', 'aiStubMode']
        const prisma = (this.uow as any).prisma
        for (const key of keys) {
            if (body[key] !== undefined) {
                await prisma.systemConfig.upsert({
                    where: { Key: key },
                    create: { Key: key, Value: String(body[key]) },
                    update: { Value: String(body[key]) },
                })
            }
        }
        return body
    }
}
