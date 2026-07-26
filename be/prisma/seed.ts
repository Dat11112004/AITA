import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

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
  const defaultSubjects = [
    { code: 'PRF192', name: 'Programming Fundamentals', desc: 'Học các kiến thức lập trình cơ bản bằng ngôn ngữ C: biến, kiểu dữ liệu, toán tử, điều kiện, vòng lặp, hàm, mảng, chuỗi, con trỏ cơ bản, cấu trúc dữ liệu (struct), đọc/ghi tệp và tư duy giải thuật.', semester: 1 },
    { code: 'PRO192', name: 'Object-Oriented Programming', desc: 'Lập trình hướng đối tượng bằng Java: class, object, constructor, encapsulation, inheritance, polymorphism, abstraction, interface, exception handling, collection framework và làm việc với file.', semester: 2 },
    { code: 'CSD201', name: 'Data Structures and Algorithms', desc: 'Nghiên cứu cấu trúc dữ liệu và thuật toán: linked list, stack, queue, tree, binary search tree, heap, hash table, graph, các thuật toán sắp xếp, tìm kiếm và phân tích độ phức tạp Big-O.', semester: 3 },
    { code: 'DBI202', name: 'Introduction to Database Systems', desc: 'Thiết kế và quản lý cơ sở dữ liệu quan hệ: mô hình ERD, chuẩn hóa (Normalization), khóa, ràng buộc, SQL (DDL, DML, DCL), JOIN, VIEW, INDEX, TRIGGER, PROCEDURE và TRANSACTION.', semester: 3 },
    { code: 'SWP391', name: 'Software Development Project', desc: 'Thực hiện dự án phần mềm theo nhóm, áp dụng quy trình phát triển phần mềm từ phân tích yêu cầu, thiết kế, lập trình, kiểm thử, quản lý mã nguồn bằng Git và trình bày sản phẩm hoàn chỉnh.', semester: 4 },
    { code: 'PRJ301', name: 'Java Web Application Development', desc: 'Phát triển ứng dụng Web bằng Java với Servlet, JSP, JSTL, MVC, JDBC, Session, Cookie, Filter, Authentication, Authorization và kết nối cơ sở dữ liệu.', semester: 5 },
    { code: 'PRM392', name: 'Mobile Programming', desc: 'Phát triển ứng dụng di động Android bằng Java hoặc Kotlin: Activity, Fragment, Intent, RecyclerView, SQLite/Room, REST API, Firebase, Material Design và quản lý vòng đời ứng dụng.', semester: 5 },
    { code: 'PRN212', name: 'C# Programming and .NET', desc: 'Phát triển ứng dụng bằng C# và .NET: LINQ, Entity Framework Core, ASP.NET Core Web API, Dependency Injection, Authentication (JWT), RESTful API và kết nối SQL Server.', semester: 6 },
    { code: 'WDP301', name: 'Web Application Development', desc: 'Xây dựng ứng dụng web hiện đại với HTML5, CSS3, JavaScript, Responsive Design, AJAX/Fetch API, REST API và tích hợp Frontend với Backend.', semester: 6 },
    { code: 'SWD392', name: 'Software Architecture and Design', desc: 'Thiết kế kiến trúc phần mềm sử dụng UML, Design Pattern (Singleton, Factory, Repository, Strategy...), kiến trúc nhiều lớp (Layered Architecture), Clean Architecture, SOLID Principles và tối ưu khả năng bảo trì, mở rộng hệ thống.', semester: 7 },
  ]

  for (const subj of defaultSubjects) {
    await prisma.subject.upsert({
      where: { SubjectCode: subj.code },
      update: {
        SubjectName: subj.name,
        Description: subj.desc,
        Semester: subj.semester
      },
      create: {
        SubjectCode: subj.code,
        SubjectName: subj.name,
        Description: subj.desc,
        IsActive: true,
        Semester: subj.semester
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
  .catch((err) => {
    console.error('❌ Lỗi không xác định khi seed:', err instanceof Error ? err.message : err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
