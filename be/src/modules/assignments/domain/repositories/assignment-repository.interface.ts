export interface IAssignmentRepository {
    findMany(where?: any): Promise<any[]>
    findById(id: string): Promise<any | null>
    create(data: any): Promise<any>
    update(id: string, data: any): Promise<any>
    count(where?: any): Promise<number>
}
