import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { PRF192_SYLLABUS } from './data/syllabi/prf192-syllabus.js'
import { PRO192_SYLLABUS } from './data/syllabi/pro192-syllabus.js'
import { DBI202_SYLLABUS } from './data/syllabi/dbi202-syllabus.js'
import { PRN212_SYLLABUS } from './data/syllabi/prn212-syllabus.js'
import { SWD392_SYLLABUS } from './data/syllabi/swd392-syllabus.js'
import { WDP301_SYLLABUS } from './data/syllabi/wdp301-syllabus.js'
import { PRJ301_SYLLABUS } from './data/syllabi/prj301-syllabus.js'
import { PRM392_SYLLABUS } from './data/syllabi/prm392-syllabus.js'
import { SWP391_SYLLABUS } from './data/syllabi/swp391-syllabus.js'
import { CSD201_SYLLABUS } from './data/syllabi/csd201-syllabus.js'
const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding AITA database...')

  try {
    await prisma.$connect()
  } catch (error: any) {
    console.error('\n❌ [LỖI KẾT NỐI CƠ SỞ DỮ LIỆU] Không thể kết nối tới SQL Server tại localhost:1433.')
    console.error('─────────────────────────────────────────────────────────────────────────────')
    console.error('👉 Vui lòng kiểm tra các bước sau:')
    console.error('   1. Dịch vụ SQL Server: Mở Services (services.msc) -> Kiểm tra SQL Server (SQLEXPRESS) hoặc MSSQLSERVER đã ở trạng thái Running chưa.')
    console.error('   2. Bật TCP/IP: Mở SQL Server Configuration Manager -> Protocols for SQLEXPRESS -> Enable TCP/IP -> Thiết lập IPAll TCP Port = 1433.')
    console.error('   3. Kiểm tra biến DATABASE_URL trong file be/.env.')
    console.error('─────────────────────────────────────────────────────────────────────────────\n')
    process.exit(1)
  }

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

  // Create subjects
  const defaultSubjects: Array<{ code: string; name: string; desc: string; semester: number; syllabus?: any }> = [
    { code: 'PRF192', name: 'Programming Fundamentals', desc: 'Fundamental C programming concepts: variables, data types, control flow, functions, pointers, structs, file I/O, and algorithmic thinking.', semester: 1, syllabus: PRF192_SYLLABUS },
    { code: 'PRO192', name: 'Object-Oriented Programming', desc: 'Object-oriented programming using Java: classes, encapsulation, inheritance, polymorphism, interfaces, exception handling, and collections.', semester: 2, syllabus: PRO192_SYLLABUS },
    { code: 'CSD201', name: 'Data Structures and Algorithms', desc: 'Core data structures & algorithms: linked lists, stacks, queues, trees, BSTs, heaps, hash tables, graphs, and Big-O complexity analysis.', semester: 3, syllabus: CSD201_SYLLABUS },
    { code: 'DBI202', name: 'Introduction to Database Systems', desc: 'Relational database design & management: ERD modeling, Normalization, primary/foreign keys, constraints, and SQL (DDL, DML, DCL).', semester: 3, syllabus: DBI202_SYLLABUS },
    { code: 'SWP391', name: 'Software Development Project', desc: 'Team-based software project: applying agile development, requirement analysis, design, testing, Git version control, and final delivery.', semester: 4, syllabus: SWP391_SYLLABUS },
    { code: 'PRJ301', name: 'Java Web Application Development', desc: 'Java Web Application development using Servlets, JSP, MVC architecture, JDBC, Sessions, Filters, and database integration.', semester: 3, syllabus: PRJ301_SYLLABUS },
    { code: 'PRM392', name: 'Mobile Programming', desc: 'Android mobile application development: Activities, Fragments, Room database, REST APIs, Firebase integration, and Material Design UI.', semester: 5, syllabus: PRM392_SYLLABUS },
    { code: 'PRN212', name: 'C# Programming and .NET', desc: 'C# and .NET application development: LINQ, Entity Framework Core, ASP.NET Core Web API, JWT authentication, and SQL Server.', semester: 6, syllabus: PRN212_SYLLABUS },
    { code: 'WDP301', name: 'Web Application Development', desc: 'Modern web application development using HTML5, CSS3, JavaScript, responsive layouts, REST APIs, and frontend-backend integration.', semester: 6, syllabus: WDP301_SYLLABUS },
    { code: 'SWD392', name: 'Software Architecture and Design', desc: 'Software architecture and design patterns: UML, GoF patterns, layered architecture, Clean Architecture, SOLID principles, and system scalability.', semester: 7, syllabus: SWD392_SYLLABUS },
  ]

  for (const subj of defaultSubjects) {
    const syllabusJson = subj.syllabus ? JSON.stringify(subj.syllabus) : null
    await (prisma.subject as any).upsert({
      where: { SubjectCode: subj.code },
      update: {
        SubjectName: subj.name,
        Description: subj.desc,
        Semester: subj.semester,
        ...(syllabusJson ? { SyllabusData: syllabusJson } : {})
      },
      create: {
        SubjectCode: subj.code,
        SubjectName: subj.name,
        Description: subj.desc,
        IsActive: true,
        Semester: subj.semester,
        SyllabusData: syllabusJson
      }
    })
  }

  // Fetch PRJ301 to use as default subject for subsequent dummy test items below
  const subject = await prisma.subject.findUniqueOrThrow({ where: { SubjectCode: 'PRJ301' } })

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

  // Exams will be created by lecturer through + Tạo Lab / Bài tập

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
  .catch((err) => {
    console.error('❌ Lỗi không xác định khi seed:', err instanceof Error ? err.message : err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
