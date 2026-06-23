import type { Request, Response } from 'express'
import { ApiResponse } from '../../../shared/presentation/api-response.js'
import { CreateExamRequestDto, UpdateExamRequestDto } from '../application/dtos/exam.dto.js'
import { ListExamsUseCase } from '../application/use-cases/list-exams.use-case.js'
import { CreateExamUseCase } from '../application/use-cases/create-exam.use-case.js'
import { UpdateExamUseCase } from '../application/use-cases/update-exam.use-case.js'
import { GetExamUseCase } from '../application/use-cases/get-exam.use-case.js'

export class ExamsController {
  constructor(
    private readonly listExamsUseCase: ListExamsUseCase,
    private readonly createExamUseCase: CreateExamUseCase,
    private readonly updateExamUseCase: UpdateExamUseCase,
    private readonly getExamUseCase: GetExamUseCase
  ) {}

  async list(req: Request, res: Response): Promise<void> {
    const params = {
      classId: req.query.classId,
      status: req.query.status,
      type: req.query.type,
      tab: req.query.tab,
    }
    const result = await this.listExamsUseCase.execute({ user: req.user!, params })
    res.status(200).json(ApiResponse.success('Thành công', result))
  }

  async create(req: Request, res: Response): Promise<void> {
    const dto = CreateExamRequestDto.from(req.body)
    const result = await this.createExamUseCase.execute(dto)
    res.status(201).json(ApiResponse.success('Thành công', result, 201))
  }

  async update(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string
    const dto = UpdateExamRequestDto.from(req.body)
    const result = await this.updateExamUseCase.execute({ id, dto })
    res.status(200).json(ApiResponse.success('Thành công', result))
  }

  async getOne(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string
    const result = await this.getExamUseCase.execute(id)
    res.status(200).json(ApiResponse.success('Thành công', result))
  }
}
