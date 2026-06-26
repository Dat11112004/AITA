import { IRubricRepository } from '../../domain/repositories/rubric-repository.interface.js'
import { NotFoundError } from '../../../../shared/application/app.error.js'

export class ListRubricRulesUseCase {
    constructor(private readonly rubricRepo: IRubricRepository) { }

    async execute() {
        return await this.rubricRepo.listRules()
    }
}

export class GetRubricRuleWithCriteriaUseCase {
    constructor(private readonly rubricRepo: IRubricRepository) { }

    async execute(id: string) {
        const rule = await this.rubricRepo.getRule(id)
        if (!rule) throw new NotFoundError('Quy tắc chấm điểm không tồn tại')

        const criteria = await this.rubricRepo.listCriteria(id)
        return { ...rule, criteria }
    }
}
