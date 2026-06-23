import type { Request, Response } from 'express'
import { ApiResponse } from '../../../shared/presentation/api-response.js'
import { SubjectRequestDto } from '../application/dtos/subject.dto.js'
import { ListSubjectsUseCase } from '../application/use-cases/list-subjects.use-case.js'
import { CreateSubjectUseCase } from '../application/use-cases/create-subject.use-case.js'
import { UpdateSubjectUseCase } from '../application/use-cases/update-subject.use-case.js'
import { DeleteSubjectUseCase } from '../application/use-cases/delete-subject.use-case.js'

export class SubjectsController {
  constructor(
    private readonly listSubjectsUseCase: ListSubjectsUseCase,
    private readonly createSubjectUseCase: CreateSubjectUseCase,
    private readonly updateSubjectUseCase: UpdateSubjectUseCase,
    private readonly deleteSubjectUseCase: DeleteSubjectUseCase
  ) {}

  async list(_req: Request, res: Response): Promise<void> {
    const result = await this.listSubjectsUseCase.execute()
    res.status(200).json(ApiResponse.success('Thành công', result))
  }

  async create(req: Request, res: Response): Promise<void> {
    const dto = SubjectRequestDto.from(req.body)
    const result = await this.createSubjectUseCase.execute(dto)
    res.status(201).json(ApiResponse.success('Tạo môn học thành công', result, 201))
  }

  async update(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string
    const dto = SubjectRequestDto.from(req.body)
    const result = await this.updateSubjectUseCase.execute({ id, dto })
    res.status(200).json(ApiResponse.success('Cập nhật môn học thành công', result))
  }

  async remove(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string
    await this.deleteSubjectUseCase.execute(id)
    res.status(200).json(ApiResponse.success('Xóa môn học thành công', null))
  }
}
