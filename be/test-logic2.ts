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

    if (cls) {
        console.log("Bắt đầu thử enroll vào lớp...");
        const fullCls = await prisma.class.findUnique({
            where: { Id: cls.Id },
            include: { Subject: true, Semester: true }
        })
        if (!fullCls) return;

        console.log("Xóa data cũ...");

        const oldClasses = await prisma.studentClass.findMany({
            where: {
                UserId: userPhong.Id,
                Class: { SubjectId: fullCls.SubjectId, SemesterId: fullCls.SemesterId, Id: { not: cls.Id } }
            }
        });
        console.log("Old duplicate classes to remove:", oldClasses.length)

        try {
            const existingEnrollment = await prisma.studentClass.findUnique({
                where: { UserId_ClassId: { UserId: userPhong.Id, ClassId: cls.Id } }
            })
            if (!existingEnrollment) {
                console.log("Tạo mới enrollment...");
                await prisma.studentClass.create({
                    data: { UserId: userPhong.Id, ClassId: cls.Id, EnrolledAt: new Date() }
                })
                console.log("Tạo thành công!");
            } else {
                console.log("Đã có sẵn enrollment.");
            }

            console.log("Mở block update pe1...");
            const peQuery: any = { UserId: userPhong.Id, ClassCode: fullCls.ClassCode }
            if (fullCls.Semester?.Code) peQuery.SemesterCode = fullCls.Semester.Code
            await (prisma as any).pendingEnrollment.updateMany({
                where: peQuery, data: { Status: 'Enrolled' }
            })

            console.log("Mở block update pe2...");
            const peQuery2: any = { UserId: userPhong.Id, ClassCode: fullCls.ClassCode }
            if (fullCls.Subject?.SubjectCode) peQuery2.SubjectCode = fullCls.Subject.SubjectCode
            await (prisma as any).pendingEnrollment.updateMany({
                where: peQuery2, data: { Status: 'Enrolled' }
            })
            console.log("Ok không lỗi pe!");
        } catch (err: any) {
            console.error("LỖI CATCH:", err.message)
        }
    }

}
testLogic().finally(() => prisma.$disconnect())
