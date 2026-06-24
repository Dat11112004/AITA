import type { Request, Response } from 'express'
import { ListRubricRulesUseCase, GetRubricRuleWithCriteriaUseCase } from '../application/use-cases/rubric.use-case.js'
import { ApiResponse } from '../../../shared/presentation/api-response.js'

export class RubricController {
    constructor(
        private readonly listRubricRulesUseCase: ListRubricRulesUseCase,
        private readonly getRubricRuleWithCriteriaUseCase: GetRubricRuleWithCriteriaUseCase
    ) { }

    async listRules(_req: Request, res: Response): Promise<void> {
        const result = await this.listRubricRulesUseCase.execute()
        res.status(200).json(ApiResponse.success('Lấy danh sách quy tắc chấm điểm thành công', result))
    }

    async getRuleWithCriteria(req: Request, res: Response): Promise<void> {
        const id = req.params.id as string
        const result = await this.getRubricRuleWithCriteriaUseCase.execute(id)
        res.status(200).json(ApiResponse.success('Lấy chi tiết quy tắc chấm điểm thành công', result))
    }
}
