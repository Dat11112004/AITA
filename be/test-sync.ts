import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function testSyncDeletion() {
    const userPhong = await prisma.user.findFirst({ where: { Email: { contains: "giaunguyen" } } })
    const userLong = await prisma.user.findFirst({ where: { Email: { contains: "ntl07" } } })
    const userTin = await prisma.user.findFirst({ where: { Email: { contains: "khanhtin" } } })

    if (!userPhong || !userLong || !userTin) return;

    const targetSemesters = await prisma.semester.findMany({ where: { Season: "Summer 2026" } })
    const targetSemesterIds = new Set(targetSemesters.map(s => s.Id))

    const processedClasses: any[] = []

    // MOCK DATA for Long and Tin (row 3,4)
    // Kỳ học: 1, Lớp học: SE18C02
    processedClasses.push({ semesterCode: 'Kỳ 1', classCode: 'SE18C02', userId: userLong.Id })
    processedClasses.push({ semesterCode: 'Kỳ 1', classCode: 'SE18C02', userId: userTin.Id })

    // MOCK DATA for Phong (row 6)
    // Kỳ học: 2, Lớp học: SE19C02
    processedClasses.push({ semesterCode: 'Kỳ 2', classCode: 'SE19C02', userId: userPhong.Id })
    // Môn học lại: PRF192, Lớp học lại: SE18C02
    processedClasses.push({ subjectCode: 'PRF192', classCode: 'SE18C02', userId: userPhong.Id, isRetake: true })


    // ACTUALL SYNC DELETE LOGIC
    const classRosters = new Map<string, Set<string>>()

    for (const pc of processedClasses) {
        let clsId: string | null = null
        if (pc.semesterCode && pc.classCode) {
            const semester = targetSemesters.find(s => s.Code === pc.semesterCode) ?? null
            if (semester) {
                const cls = await prisma.class.findFirst({
                    where: { SemesterId: semester.Id, ClassCode: pc.classCode }
                })
                if (cls) clsId = cls.Id
            }
        } else if (pc.subjectCode && pc.classCode) {
            const cls = await prisma.class.findFirst({
                where: {
                    ClassCode: pc.classCode,
                    Subject: { SubjectCode: pc.subjectCode },
                    SemesterId: { in: Array.from(targetSemesterIds) }
                }
            })
            if (cls) clsId = cls.Id
        }

        if (clsId) {
            if (!classRosters.has(clsId)) {
                classRosters.set(clsId, new Set())
            }
            classRosters.get(clsId)!.add(pc.userId)
        }
    }

    console.log("Rosters:")
    for (const [clsId, users] of classRosters.entries()) {
        const cls = await prisma.class.findUnique({ where: { Id: clsId }, include: { Subject: true } })
        console.log("- Lớp:", cls?.ClassCode, cls?.Subject?.SubjectCode, clsId)
        console.log("  Users:", Array.from(users).map(u =>
            u === userPhong.Id ? "Phong" : u === userLong.Id ? "Long" : "Tin"
        ))
    }
}

testSyncDeletion().finally(() => prisma.$disconnect())
