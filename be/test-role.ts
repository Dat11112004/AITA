import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const raw = await prisma.user.findUnique({
      where: { Email: 'lecturer@fpt.edu.vn' },
      include: { UserRole: { include: { Role: true } } },
    })
  console.log(JSON.stringify(raw?.UserRole, null, 2))
}

main().catch(console.error).finally(() => prisma.$disconnect());
