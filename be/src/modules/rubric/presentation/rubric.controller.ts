import { MESSAGES } from '../../../shared/constants/messages.js'
import type { Request, Response } from 'express'
import { ListRubricRulesUseCase, GetRubricRuleWithCriteriaUseCase } from '../application/use-cases/rubric.use-case.js'
import { BaseController } from '../../../shared/presentation/base-controller.js'
import type { ILogger } from '../../../shared/application/ports/logger.interface.js'

export class RubricController extends BaseController {
    constructor(
        private readonly listRubricRulesUseCase: ListRubricRulesUseCase,
        private readonly getRubricRuleWithCriteriaUseCase: GetRubricRuleWithCriteriaUseCase,
        private readonly logger: ILogger
    ) {
        super()
    }

    async listRules(_req: Request, res: Response): Promise<void> {
        this.logger.debug('Fetching list of rubric rules')
        const result = await this.listRubricRulesUseCase.execute()
        this.ok(res, result, MESSAGES.RUBRIC_LIST_SUCCESS)
    }

    async getRuleWithCriteria(req: Request, res: Response): Promise<void> {
        const id = req.params.id as string
        this.logger.debug(`Fetching rubric rule with criteria: ${id}`)
        const result = await this.getRubricRuleWithCriteriaUseCase.execute(id)
        this.ok(res, result, MESSAGES.RUBRIC_GET_SUCCESS)
    }
}
