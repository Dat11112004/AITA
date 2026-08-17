import { PrismaClient } from '@prisma/client'
import * as xlsx from 'xlsx'
import { detectSeasonFromFilename, SeasonDetectorError, matchesSeason } from '../../../../shared/utils/season-detector.util.js'
import { IEmailService } from '../../../../shared/application/email.service.interface.js'
import { AppError } from '../../../../shared/application/app.error.js'

import { normalizeExcelHeader } from '../../../../shared/utils/avatar-extractor.util.js'

const prisma = new PrismaClient()

type ImportAssignmentRow = Record<string, unknown>

const HEADER_ALIASES: Record<string, string[]> = {
    lecturerCode: ['mã gv', 'ma gv', 'mã giảng viên', 'instructor code', 'lecturer code', 'mssv/gv', 'gvien', 'g.viên', 'giảng viên', 'gv', 'ma'],
    lecturerName: ['họ và tên gv', 'ho ten gv', 'tên gv', 'name', 'họ và tên', 'ho va ten', 'tên', 'họ tên', 'ho ten'],
    subjectCode: ['môn', 'môn dạy', 'mon day', 'subjects', 'mã môn', 'subject code', 'ma mon', 'mã môn học'],
    classCode: ['lớp', 'lớp dạy', 'lop day', 'classes', 'mã lớp', 'class code', 'ma lop', 'lớp học']
}

function getField(row: ImportAssignmentRow, key: keyof typeof HEADER_ALIASES): string | undefined {
    const aliases = HEADER_ALIASES[key]
    for (const [header, value] of Object.entries(row)) {
        const normH = normalizeExcelHeader(header);
        const lowerH = header.trim().toLowerCase();
        if (aliases.includes(lowerH) || aliases.some(a => normalizeExcelHeader(a) === normH)) {
            const s = value?.toString().trim()
            if (s && s !== 'undefined' && s !== 'null') return s
        }
    }
    return undefined
}

export class ImportTeachingAssignmentsExcelUseCase {
    constructor(private readonly emailService: IEmailService) { }

    async execute(input: { fileBuffer: Buffer; fileName: string; fileUrl: string; importedByUserId: string }) {
        const { fileBuffer, fileName, fileUrl, importedByUserId } = input

        const normalizedName = fileName.toLowerCase()
        if (!normalizedName.includes('teaching') && !normalizedName.includes('assignment') && !normalizedName.includes('phan_cong') && !normalizedName.includes('phân công')) {
            throw new AppError('INVALID_FILE_NAME', 'Tên file không hợp lệ. Vui lòng đặt tên file có chứa từ khoá "teachingassignments" (ví dụ: Teachingassignments_Spring2026.xlsx)', 400)
        }

        // BẮT BUỘC THEO THỨ TỰ: Học sinh -> Giảng viên -> Phân công
        const lecturerCount = await prisma.userRole.count({
            where: { Role: { RoleName: 'LECTURER' } }
        })
        if (lecturerCount === 0) {
            throw new AppError('LECTURER_IMPORT_REQUIRED', 'Vui lòng import danh sách Giảng viên vào hệ thống trước khi import file Phân công giảng viên.', 400)
        }

        let successCount = 0
        let errorCount = 0
        const errors: string[] = []
        const emailPromises: Promise<any>[] = []

        // 1. SEASON DETECTION
        let detectedSeasonInfo
        try {
            detectedSeasonInfo = detectSeasonFromFilename(fileName)
        } catch (err: any) {
            const errorMsg = err instanceof SeasonDetectorError
                ? err.message
                : 'Không thể xác định mùa học từ tên file'
            throw new AppError('INVALID_SEASON', errorMsg, 400)
        }

        const allSemesters = await prisma.semester.findMany()
        const targetSemesters = allSemesters.filter(
            s => matchesSeason(s.Season, detectedSeasonInfo)
        )

        if (targetSemesters.length === 0) {
            throw new AppError('NOT_FOUND', `Không tìm thấy học kỳ nào khớp với mùa '${detectedSeasonInfo.formatted}' để phân công giảng dạy. Vui lòng kiểm tra lại.`, 404)
        }

        const batch = await prisma.importBatch.create({
            data: {
                FileName: fileName,
                FileUrl: fileUrl,
                Status: 'PROCESSING',
                TotalRows: 0,
                SuccessCount: 0,
                ErrorCount: 0,
                ImportedBy: importedByUserId
            }
        })

        try {
            const workbook = xlsx.read(fileBuffer, { type: 'buffer' })
            const sheetName = workbook.SheetNames[0]
            if (!sheetName) {
                throw new AppError('INVALID_FILE', 'File Excel không có dữ liệu', 400)
            }

            const sheet = workbook.Sheets[sheetName]
            const rows: ImportAssignmentRow[] = xlsx.utils.sheet_to_json(sheet)

            await prisma.importBatch.update({
                where: { Id: batch.Id },
                data: { TotalRows: rows.length }
            })

            // Gom nhóm assignments theo từng giảng viên để gửi mail 1 lần
            const assignmentsByUser = new Map<string, { user: any, assignments: { subjectCode: string, classCode: string, studentCount: number }[] }>()
            const targetSemesterIds = new Set(targetSemesters.map(s => s.Id))

            let currentLecturerCode: string | undefined = undefined
            let currentLecturerName: string | undefined = undefined
            let currentSubjectCode: string | undefined = undefined
            
            const lecturerCache = new Map<string, any>()
            const missingLecturers = new Set<string>()

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i]

                try {
                    let lecturerCode = getField(row, 'lecturerCode')
                    let lecturerName = getField(row, 'lecturerName')
                    let subjectCode = getField(row, 'subjectCode')
                    const classCodeStr = getField(row, 'classCode')

                    // Bỏ qua các dòng trống hoàn toàn (thường xuất hiện ở cuối file excel)
                    if (!lecturerCode && !subjectCode && !classCodeStr) {
                        continue
                    }

                    // Fill down logic: Nhớ Mã GV và Môn cho các dòng bị gộp (merged) hoặc để trống bên dưới
                    if (lecturerCode) {
                        currentLecturerCode = lecturerCode
                        currentLecturerName = lecturerName
                        currentSubjectCode = undefined // Reset môn khi sang GV mới để tránh lỗi copy nhầm
                    } else {
                        lecturerCode = currentLecturerCode
                        lecturerName = currentLecturerName
                    }

                    if (subjectCode) {
                        currentSubjectCode = subjectCode
                    } else {
                        subjectCode = currentSubjectCode
                    }

                    if (!lecturerCode || !subjectCode || !classCodeStr) {
                        throw new Error('Thiếu thông tin bắt buộc (Mã GV, Mã Môn, Mã Lớp)')
                    }

                    const classCodes = classCodeStr.split(/[,;\n| ]+/).map(c => c.trim()).filter(c => c)
                    if (classCodes.length === 0) {
                        throw new Error('Không tìm thấy mã lớp hợp lệ')
                    }

                    // 1. Cross-check Giảng viên
                    if (missingLecturers.has(lecturerCode)) {
                        // Đã báo lỗi không tìm thấy GV này ở dòng trên, bỏ qua không báo lại để tránh spam
                        continue
                    }

                    let user = lecturerCache.get(lecturerCode)
                    if (!user) {
                        user = await prisma.user.findFirst({
                            where: { LecturerCode: lecturerCode }
                        })

                        if (!user) {
                            missingLecturers.add(lecturerCode)
                            const nameStr = lecturerName ? ` (${lecturerName})` : ''
                            console.warn(`[Import Assignment] Không tìm thấy giảng viên mã '${lecturerCode}'${nameStr} — bỏ qua`)
                            throw new Error(`Không tìm thấy giảng viên mã '${lecturerCode}'${nameStr}`)
                        }
                        lecturerCache.set(lecturerCode, user)
                    }

                    // 2. Lookup Subject
                    const targetSubj = await prisma.subject.findUnique({
                        where: { SubjectCode: subjectCode }
                    })

                    if (!targetSubj) {
                        console.warn(`[Import Assignment] Không tìm thấy môn '${subjectCode}' — bỏ qua`)
                        throw new Error(`Không tìm thấy môn '${subjectCode}'`)
                    }

                    // Xử lý từng lớp học trong ô Lớp (nếu user nhập nhiều lớp ngăn cách bằng phẩy/dấu cách/xuống dòng)
                    for (const classCode of classCodes) {
                        // 3. Lookup or Create Class within this season
                        let cls = await prisma.class.findFirst({
                            where: {
                                ClassCode: classCode,
                                SubjectId: targetSubj.Id,
                                SemesterId: { in: Array.from(targetSemesterIds) }
                            },
                            select: { Id: true, SemesterId: true }
                        })

                        if (!cls) {
                            let targetSemId: string | undefined = undefined;

                            if (targetSubj.Semester !== null && targetSubj.Semester !== undefined) {
                                const expectedCode = `Kỳ ${targetSubj.Semester}`;
                                const matchedSem = await prisma.semester.findFirst({
                                    where: {
                                        Id: { in: Array.from(targetSemesterIds) },
                                        Code: expectedCode
                                    }
                                });
                                if (matchedSem) {
                                    targetSemId = matchedSem.Id;
                                }
                            }

                            if (!targetSemId) {
                                const semSubj = await (prisma as any).semesterSubject.findFirst({
                                    where: {
                                        SubjectId: targetSubj.Id,
                                        SemesterId: { in: Array.from(targetSemesterIds) }
                                    }
                                })
                                targetSemId = semSubj?.SemesterId;
                            }

                            if (!targetSemId) {
                                throw new Error(`Môn '${subjectCode}' không được mở trong kỳ '${detectedSeasonInfo.formatted}'`)
                            }

                            cls = await prisma.class.create({
                                data: {
                                    ClassCode: classCode,
                                    SubjectId: targetSubj.Id,
                                    SemesterId: targetSemId,
                                    Status: 'Active'
                                }
                            })
                        }

                        // 4. Assign class to instructor
                        const existingEnrollment = await prisma.instructorClass.findUnique({
                            where: { UserId_ClassId: { UserId: user.Id, ClassId: cls.Id } }
                        })
                        
                        if (!existingEnrollment) {
                            await prisma.instructorClass.create({
                                data: { UserId: user.Id, ClassId: cls.Id, EnrolledAt: new Date() }
                            })
                        }

                        const studentCount = await prisma.studentClass.count({ where: { ClassId: cls.Id } })

                        // 5. Thêm vào danh sách để gửi mail
                        if (!assignmentsByUser.has(user.Id)) {
                            assignmentsByUser.set(user.Id, { user, assignments: [] })
                        }
                        assignmentsByUser.get(user.Id)!.assignments.push({
                            subjectCode: subjectCode!,
                            classCode,
                            studentCount
                        })
                    }

                    successCount++
                } catch (err: any) {
                    errorCount++
                    errors.push(`Dòng ${i + 2}: ${err.message}`)
                    console.error(`[Import Assignment] Row ${i + 2} error:`, err.message)
                }
            }

            // Gửi email tổng hợp cho mỗi giảng viên
            const webUrl = (process.env.FRONTEND_URL || 'https://feaita.edubridge.edu.vn').replace(/\/$/, '')
            for (const data of assignmentsByUser.values()) {
                const { user, assignments } = data
                if (!user.Email) continue

                const enrolledClassDetails = assignments.map(a => `
                    <tr>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: 600;">${a.subjectCode}</td>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #334155;">${a.classCode}</td>
                        <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; text-align: center;">
                            <span style="background: #e0f2fe; color: #0284c7; padding: 4px 10px; border-radius: 12px; font-size: 13px; font-weight: 700;">${a.studentCount}</span>
                        </td>
                    </tr>
                `)

                const classEnrollmentContent = `
                    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #eaeaea;">
                        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px 20px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 22px; letter-spacing: 0.5px;">Phân Công Giảng Dạy</h1>
                            <p style="color: #d1fae5; margin: 8px 0 0 0; font-size: 15px;">Mùa học ${detectedSeasonInfo.formatted}</p>
                        </div>
                        <div style="padding: 32px 24px; color: #334155; line-height: 1.6;">
                            <p style="font-size: 16px; margin-top: 0;">Kính gửi Giảng viên <strong style="color: #0f172a;">${user.FullName || ''}</strong>,</p>
                            <p>Thầy/cô đã được phân công phụ trách các lớp học trên hệ thống AITA. Dưới đây là danh sách chi tiết các lớp:</p>
                            
                            <div style="border-radius: 8px; margin: 24px 0; border: 1px solid #e2e8f0; overflow: hidden;">
                                <table style="width: 100%; border-collapse: collapse; text-align: left; background: #ffffff;">
                                    <thead>
                                        <tr style="background: #f8fafc;">
                                            <th style="padding: 12px 16px; font-size: 14px; color: #475569; border-bottom: 2px solid #e2e8f0;">Môn Học</th>
                                            <th style="padding: 12px 16px; font-size: 14px; color: #475569; border-bottom: 2px solid #e2e8f0;">Lớp Học</th>
                                            <th style="padding: 12px 16px; font-size: 14px; color: #475569; border-bottom: 2px solid #e2e8f0; text-align: center;">Số Sinh Viên</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${enrolledClassDetails.length > 0 ? enrolledClassDetails.join('\n') : '<tr><td colspan="3" style="padding: 20px; text-align: center; color: #64748b; font-style: italic;">Chưa có dữ liệu phân công</td></tr>'}
                                    </tbody>
                                </table>
                            </div>
                            
                            <div style="text-align: center; margin: 28px 0;">
                                <a href="${webUrl}/lecturer" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 15px; text-decoration: none; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.35); letter-spacing: 0.3px;">
                                    👉 Xem lịch phân công trên AITA
                                </a>
                            </div>
                            
                            <p>Thầy/cô vui lòng đăng nhập vào hệ thống để kiểm tra danh sách sinh viên, quản lý điểm danh và thiết lập cấu hình môn học.</p>
                            
                            <p style="margin-bottom: 0; margin-top: 30px;">Trân trọng,<br><strong style="color: #0f172a;">Ban quản trị AITA</strong></p>
                        </div>
                    </div>
                `
                emailPromises.push(
                    this.emailService.sendEmail(user.Email, 'Phân công giảng dạy hệ thống AITA', classEnrollmentContent)
                        .catch(e => console.error(`Failed to send assignment email to ${user.Email}:`, e))
                )
            }

            await prisma.importBatch.update({
                where: { Id: batch.Id },
                data: {
                    Status: 'COMPLETED',
                    SuccessCount: successCount,
                    ErrorCount: errorCount
                }
            })

            // Fire and forget emails
            Promise.allSettled(emailPromises).then(results => {
                const failed = results.filter(r => r.status === 'rejected')
                if (failed.length > 0) {
                    console.log(`[Import Assignment] Có ${failed.length} email phân công gửi thất bại.`)
                }
            })

            return { successCount, errorCount, errors, batchId: batch.Id }
        } catch (error: any) {
            await prisma.importBatch.update({
                where: { Id: batch.Id },
                data: {
                    Status: 'FAILED',
                    ErrorDetails: error.message
                }
            })
            throw error
        }
    }
}
