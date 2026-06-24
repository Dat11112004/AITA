import { IAssignmentRepository } from '../../domain/repositories/assignment-repository.interface.js'

export class PrismaAssignmentRepository implements IAssignmentRepository {
    private client: any

    constructor(client: any) {
        this.client = client
    }

    async findMany(where?: any): Promise<any[]> {
        return this.client.exam.findMany({
            where,
            include: {
                Subject: true,
                AssignmentTemplate: true,
                _count: { select: { Submission: true } },
            },
            orderBy: { Id: 'desc' },
        })
    }

    async findById(id: string): Promise<any | null> {
        return this.client.exam.findUnique({
            where: { Id: id },
            include: {
                Subject: true,
                AssignmentTemplate: true,
                _count: { select: { Submission: true } },
            },
        })
    }

    async create(data: any): Promise<any> {
        return this.client.exam.create({
            data,
            include: {
                Subject: true,
                AssignmentTemplate: true,
                _count: { select: { Submission: true } },
            },
        })
    }

    async update(id: string, data: any): Promise<any> {
        return this.client.exam.update({
            where: { Id: id },
            data,
            include: {
                Subject: true,
                AssignmentTemplate: true,
                _count: { select: { Submission: true } },
            },
        })
    }

    async count(where?: any): Promise<number> {
        return this.client.exam.count({ where })
    }
}
