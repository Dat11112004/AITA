export class Semester {
  constructor(
    public readonly id: string,
    public code: string,
    public isActive: boolean,
    public startDate?: Date,
    public endDate?: Date,
  ) {}

  static create(id: string, code: string, isActive: boolean = true, startDate?: Date, endDate?: Date): Semester {
    return new Semester(id, code, isActive, startDate, endDate)
  }

  static fromPersistence(data: any): Semester {
    return new Semester(
      data.Id,
      data.Code,
      data.IsActive ?? false,
      data.StartDate ?? undefined,
      data.EndDate ?? undefined
    )
  }
}
