import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding AITA database...')

  const hash = (p: string) => bcrypt.hash(p, 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@fpt.edu.vn' },
    update: {},
    create: {
      email: 'admin@fpt.edu.vn',
      passwordHash: await hash('admin123'),
      fullName: 'Quản trị AITA',
      externalId: 'ADM001',
      role: 'ADMIN',
    },
  })

  const lecturer = await prisma.user.upsert({
    where: { email: 'lecturer@fpt.edu.vn' },
    update: {},
    create: {
      email: 'lecturer@fpt.edu.vn',
      passwordHash: await hash('lecturer123'),
      fullName: 'Nguyễn Văn Giảng',
      externalId: 'GV001',
      role: 'LECTURER',
    },
  })

  const student = await prisma.user.upsert({
    where: { email: 'student@fpt.edu.vn' },
    update: {},
    create: {
      email: 'student@fpt.edu.vn',
      passwordHash: await hash('student123'),
      fullName: 'Trần Thị Sinh',
      externalId: 'HE170001',
      role: 'STUDENT',
    },
  })



  const cls = await prisma.class.upsert({
    where: { code: 'PRJ301-SE1701' },
    update: {},
    create: {
      code: 'PRJ301-SE1701',
      name: 'Java Web Application Development',
      subject: 'PRJ301',
      semester: 'Spring 2026',
      campus: 'Hà Nội',
      schedule: 'T2, T5 (13:30-15:50)',
      lecturerId: lecturer.id,
    },
  })

  await prisma.classEnrollment.upsert({
    where: { classId_studentId: { classId: cls.id, studentId: student.id } },
    update: {},
    create: { classId: cls.id, studentId: student.id },
  })

  await prisma.assignment.upsert({
    where: { id: 'seed-assignment-coding' },
    update: {},
    create: {
      id: 'seed-assignment-coding',
      classId: cls.id,
      title: 'Lab 1: REST API cơ bản',
      description: 'Xây dựng CRUD API với Express.',
      type: 'CODING',
      status: 'PUBLISHED',
      dueAt: new Date(Date.now() + 7 * 86400000),
      maxScore: 10,
      content: JSON.stringify({ language: 'javascript' }),
    },
  })

  await prisma.assignment.upsert({
    where: { id: 'seed-assignment-quiz' },
    update: {},
    create: {
      id: 'seed-assignment-quiz',
      classId: cls.id,
      title: 'Quiz: OOP & Design Patterns',
      description: 'Trắc nghiệm 10 câu.',
      type: 'QUIZ',
      status: 'PUBLISHED',
      dueAt: new Date(Date.now() + 14 * 86400000),
      maxScore: 10,
    },
  })

  await prisma.learningInsight.deleteMany({ where: { studentId: student.id } })
  await prisma.learningInsight.createMany({
    data: [
      { studentId: student.id, topic: 'OOP & Design Patterns', level: 'weak', suggestion: 'Ôn lại SOLID' },
      { studentId: student.id, topic: 'REST API', level: 'medium' },
      { studentId: student.id, topic: 'Unit Testing', level: 'weak' },
      { studentId: student.id, topic: 'Git & Teamwork', level: 'strong' },
    ],
  })

  const settings = [
    ['appName', 'AITA'],
    ['organization', 'FPT University'],
    ['sessionTimeout', '60'],
    ['aiStubMode', 'true'],
    ['aiTimeout', '60'],
  ]
  for (const [key, value] of settings) {
    await prisma.systemSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    })
  }

  const codingAssignment = await prisma.assignment.findFirst({
    where: { id: 'seed-assignment-coding' },
  })

  if (codingAssignment) {
    await prisma.submission.upsert({
      where: {
        assignmentId_studentId: {
          assignmentId: codingAssignment.id,
          studentId: student.id,
        },
      },
      update: {},
      create: {
        assignmentId: codingAssignment.id,
        studentId: student.id,
        status: 'SUBMITTED',
        content: 'const express = require("express");\nconst app = express();\n// TODO\n',
        language: 'javascript',
        submittedAt: new Date(),
      },
    })
  }

  await prisma.activityLog.createMany({
    data: [
      {
        userId: admin.id,
        action: 'SYSTEM_SEED',
        entity: 'Database',
        metadata: JSON.stringify({ users: 3, classes: 1 }),
      },
      {
        userId: lecturer.id,
        action: 'CLASS_CREATE',
        entity: 'Class',
        entityId: cls.id,
      },
      {
        userId: student.id,
        action: 'SUBMISSION_CREATE',
        entity: 'Submission',
      },
    ],
  })

  console.log('✅ Seed xong!')
  console.log('   admin@fpt.edu.vn / admin123')
  console.log('   lecturer@fpt.edu.vn / lecturer123')
  console.log('   student@fpt.edu.vn / student123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
