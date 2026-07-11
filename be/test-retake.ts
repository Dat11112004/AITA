import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function test() {
    const classes = await prisma.class.findMany({
        where: {
            ClassCode: "SE18C02",
            Subject: { SubjectCode: "PRF192" }
        },
        include: { Semester: true }
    })
    console.log("Class globally found:");
    for (const c of classes) {
        console.log("-", c.Id, c.Semester?.Season, c.Semester?.Code)
    }

    const s = await prisma.subject.findUnique({ where: { SubjectCode: "PRF192" }, include: { SemesterSubject: { include: { Semester: true } } } })
    console.log("\nSubject semesters:")
    for (const ss of (s?.SemesterSubject || [])) {
        console.log("-", ss.Semester.Season, ss.Semester.Code)
    }
}
test().finally(() => prisma.$disconnect())
