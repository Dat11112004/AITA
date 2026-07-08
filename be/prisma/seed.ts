import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding AITA database...')

  const hash = (p: string) => bcrypt.hash(p, 10)

  // Create roles first
  const adminRole = await prisma.role.upsert({
    where: { RoleName: 'ADMIN' },
    update: {},
    create: { RoleName: 'ADMIN' },
  })

  const lecturerRole = await prisma.role.upsert({
    where: { RoleName: 'LECTURER' },
    update: {},
    create: { RoleName: 'LECTURER' },
  })

  const studentRole = await prisma.role.upsert({
    where: { RoleName: 'STUDENT' },
    update: {},
    create: { RoleName: 'STUDENT' },
  })

  // Create users
  const admin = await prisma.user.upsert({
    where: { Email: 'admin@fpt.edu.vn' },
    update: {},
    create: {
      Email: 'admin@fpt.edu.vn',
      PasswordHash: await hash('admin123'),
      FullName: 'Quản trị AITA',
      StudentCode: 'ADM001',
      Status: 'Active',
    },
  })

  const lecturer = await prisma.user.upsert({
    where: { Email: 'lecturer@fpt.edu.vn' },
    update: {},
    create: {
      Email: 'lecturer@fpt.edu.vn',
      PasswordHash: await hash('lecturer123'),
      FullName: 'Nguyễn Văn Giảng',
      StudentCode: 'GV001',
      Status: 'Active',
    },
  })

  const student = await prisma.user.upsert({
    where: { Email: 'student@fpt.edu.vn' },
    update: {},
    create: {
      Email: 'student@fpt.edu.vn',
      PasswordHash: await hash('student123'),
      FullName: 'Trần Thị Sinh',
      StudentCode: 'HE170001',
      Status: 'Active',
    },
  })

  // Assign roles
  await prisma.userRole.upsert({
    where: { UserId_RoleId: { UserId: admin.Id, RoleId: adminRole.Id } },
    update: {},
    create: { UserId: admin.Id, RoleId: adminRole.Id },
  })

  await prisma.userRole.upsert({
    where: { UserId_RoleId: { UserId: lecturer.Id, RoleId: lecturerRole.Id } },
    update: {},
    create: { UserId: lecturer.Id, RoleId: lecturerRole.Id },
  })

  await prisma.userRole.upsert({
    where: { UserId_RoleId: { UserId: student.Id, RoleId: studentRole.Id } },
    update: {},
    create: { UserId: student.Id, RoleId: studentRole.Id },
  })

  // Create subject
  const subject = await prisma.subject.upsert({
    where: { SubjectCode: 'PRJ301' },
    update: {},
    create: {
      SubjectCode: 'PRJ301',
      SubjectName: 'Java Web Application Development',
      Description: 'Xây dựng ứng dụng web với Java',
      IsActive: true,
    },
  })

  // Create semester
  const semester = await prisma.semester.upsert({
    where: { Season_Code: { Season: 'Spring', Code: '2026' } },
    update: {},
    create: {
      Season: 'Spring',
      Code: '2026',
      StartDate: new Date('2026-01-15'),
      EndDate: new Date('2026-05-30'),
      IsActive: true,
    },
  })

  // Create class
  const cls = await prisma.class.upsert({
    where: {
      ClassCode_SubjectId_SemesterId: {
        ClassCode: 'PRJ301-SE1701',
        SubjectId: subject.Id,
        SemesterId: semester.Id,
      },
    },
    update: {},
    create: {
      ClassCode: 'PRJ301-SE1701',
      SubjectId: subject.Id,
      SemesterId: semester.Id,
      Status: 'Active',
    },
  })

  // Assign instructor to class
  await prisma.instructorClass.upsert({
    where: { UserId_ClassId: { UserId: lecturer.Id, ClassId: cls.Id } },
    update: {},
    create: { UserId: lecturer.Id, ClassId: cls.Id },
  })

  // Enroll student in class
  await prisma.studentClass.upsert({
    where: { UserId_ClassId: { UserId: student.Id, ClassId: cls.Id } },
    update: {},
    create: { UserId: student.Id, ClassId: cls.Id },
  })

  // Create exams (assignments)
  await prisma.exam.create({
    data: {
      Title: 'Lab 1: REST API cơ bản',
      Description: 'Xây dựng CRUD API với Express.',
      SubjectId: subject.Id,
      ExamType: 'Assignment',
      Status: 'Published',
      Duration: 7 * 24 * 60, // 7 days in minutes
      TotalPoints: 10,
      CreatedBy: lecturer.Id,
    },
  })

  await prisma.exam.create({
    data: {
      Title: 'Quiz: OOP & Design Patterns',
      Description: 'Trắc nghiệm 10 câu.',
      SubjectId: subject.Id,
      ExamType: 'Midterm',
      Status: 'Published',
      Duration: 14 * 24 * 60,
      TotalPoints: 10,
      CreatedBy: lecturer.Id,
    },
  })

  // Create audit log
  await prisma.auditLog.create({
    data: {
      UserId: admin.Id,
      Action: 'Created',
      EntityName: 'Database',
      NewValue: JSON.stringify({ users: 3, classes: 1 }),
    },
  })

  console.log('✅ Seed xong!')
  console.log('   admin@fpt.edu.vn / admin123')
  console.log('   lecturer@fpt.edu.vn / lecturer123')
  console.log('   student@fpt.edu.vn / student123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
