import { IConfigRepository } from '../../domain/repositories/config-repository.interface.js'
import { notFound } from '../../../../utils/errors.js'

export class ListProjectTypesUseCase {
    constructor(private readonly configRepo: IConfigRepository) { }

    async execute() {
        return await this.configRepo.listProjectTypes()
    }
}

export class GetProjectTypeUseCase {
    constructor(private readonly configRepo: IConfigRepository) { }

    async execute(code: string) {
        const pt = await this.configRepo.getProjectType(code)
        if (!pt) throw notFound('Loại dự án không tồn tại')
        return pt
    }
}

export class UpdateProjectTypeUseCase {
    constructor(private readonly configRepo: IConfigRepository) { }

    async execute(code: string, data: any) {
        const pt = await this.configRepo.getProjectType(code)
        if (!pt) throw notFound('Loại dự án không tồn tại')

        pt.updateConfig(data)
        await this.configRepo.saveProjectType(pt)
        return pt
    }
}
