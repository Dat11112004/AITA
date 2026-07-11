import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function testLogic() {
    const userPhong = await prisma.user.findFirst({ where: { Email: { contains: "giaunguyen" } } })
    console.log("Phong:", userPhong?.Id)

    if (!userPhong) return;

    const targetSemesters = await prisma.semester.findMany({
        where: { Season: "Summer 2026" } // Assuming this is the season
    })
    const targetSemesterIds = new Set(targetSemesters.map(s => s.Id))

    const retakeClassCode = "SE18C02"
    const subjectCode = "PRF192"

    let cls = await prisma.class.findFirst({
        where: {
            ClassCode: retakeClassCode,
            Subject: { SubjectCode: subjectCode },
            SemesterId: { in: Array.from(targetSemesterIds) }
        },
        select: { Id: true, SemesterId: true }
    })

    console.log("Tìm lớp theo format 1:", cls?.Id, cls?.SemesterId)

    // Simulate auto create format 1
    if (!cls) {
        console.log("Không tìm thấy! Auto-create...");
        const retakeSubj = await prisma.subject.findUnique({
            where: { SubjectCode: subjectCode }
        })
        if (retakeSubj) {
            console.log("Retake subject:", retakeSubj.Id)
            let semSubj = await (prisma as any).semesterSubject.findFirst({
                where: {
                    SubjectId: retakeSubj.Id,
                    SemesterId: { in: Array.from(targetSemesterIds) }
                }
            })
            console.log("Tự dò kỳ:", semSubj?.SemesterId)
        }
    }

    // Check enrollment
    const enrollment = await prisma.studentClass.findFirst({
        where: {
            UserId: userPhong.Id,
            Class: { ClassCode: "SE18C02", Subject: { SubjectCode: "PRF192" } }
        }
    })
    console.log("Enrollment for Phong in ANY PRF192/SE18C02:", enrollment)
}
testLogic().finally(() => prisma.$disconnect())
