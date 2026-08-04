import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function test() {
    const phong = await prisma.user.findFirst({ where: { Email: { contains: "giaunguyen" } } })
    console.log("Phong ID:", phong?.Id, phong?.Email)

    const c = await prisma.class.findFirst({
        where: {
            ClassCode: "SE18C02",
            Subject: { SubjectCode: "PRF192" }
        }
    })
    console.log("Class ID:", c?.Id)

    const enrollment = await prisma.studentClass.findFirst({
        where: {
            UserId: phong?.Id,
            ClassId: c?.Id
        }
    })
    console.log("Enrollment:", enrollment)
}
test().finally(() => prisma.$disconnect())
