import { PrismaClient } from '@prisma/client'
import { IRubricRepository } from '../../domain/repositories/rubric-repository.interface.js'
import { RubricRule } from '../../domain/entities/rubric-rule.entity.js'
import { RubricCriterion } from '../../domain/entities/rubric-criterion.entity.js'

export class PrismaRubricRepository implements IRubricRepository {
    constructor(private readonly prisma: PrismaClient) { }

    async listRules(): Promise<RubricRule[]> {
        const list = await (this.prisma as any).rubricRule.findMany()
        return list.map((l: any) => (RubricRule as any).restore(l))
    }

    async getRule(id: string): Promise<RubricRule | null> {
        const r = await (this.prisma as any).rubricRule.findUnique({ where: { Id: id } })
        if (!r) return null
        return (RubricRule as any).restore(r)
    }

    async saveRule(rule: RubricRule): Promise<void> {
        await (this.prisma as any).rubricRule.upsert({
            where: { Id: rule.id },
            create: { /* mapping */ },
            update: { /* mapping */ }
        })
    }

    async listCriteria(ruleId: string): Promise<RubricCriterion[]> {
        const list = await (this.prisma as any).rubricCriterion.findMany({ where: { RubricRuleId: ruleId } })
        return list.map((l: any) => RubricCriterion.restore(
            l.Id, l.RubricRuleId, l.Description, l.MaxPoints, l.Weight, l.ValidationType, l.ValidationConfig, l.IsCritical, l.SortOrder
        ))
    }

    async saveCriterion(c: RubricCriterion): Promise<void> {
        await (this.prisma as any).rubricCriterion.upsert({
            where: { Id: c.id },
            create: {
                Id: c.id,
                RubricRuleId: c.rubricRuleId,
                Description: c.description,
                MaxPoints: c.maxPoints,
                Weight: c.weight,
                ValidationType: c.validationType,
                ValidationConfig: c.validationConfig,
                IsCritical: c.isCritical,
                SortOrder: c.sortOrder
            },
            update: {
                Description: c.description,
                MaxPoints: c.maxPoints,
                Weight: c.weight,
                ValidationType: c.validationType,
                ValidationConfig: c.validationConfig,
                IsCritical: c.isCritical,
                SortOrder: c.sortOrder
            }
        })
    }

    async deleteCriterion(id: string): Promise<void> {
        await (this.prisma as any).rubricCriterion.delete({ where: { Id: id } })
    }
}
