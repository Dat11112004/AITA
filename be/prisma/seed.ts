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

  // ── Exams (assignments) ──
  // Idempotent: the seed runs on every backend start (npm run dev), so we key each exam by
  // (Title, SubjectId) and update-or-create instead of blindly create() — otherwise every
  // restart would pile up duplicate assignments. Due dates are anchored to "now" so the
  // deadline/countdown UI always renders a live date rather than a stale past one.
  const now = Date.now()
  const day = 24 * 60 * 60 * 1000

  const examSeeds = [
    { title: 'Lab 1: REST API cơ bản', desc: 'Xây dựng CRUD API với Express: CRUD, phân trang, xác thực JWT.', type: 'Assignment', dueInDays: 3, duration: 7 * 24 * 60 },
    { title: 'Quiz: OOP & Design Patterns', desc: 'Trắc nghiệm 10 câu về hướng đối tượng và các mẫu thiết kế.', type: 'Midterm', dueInDays: 10, duration: 60 },
    { title: 'Đồ án: Ứng dụng Java Web', desc: 'Xây dựng ứng dụng web hoàn chỉnh theo nhóm (Servlet/JSP + JDBC).', type: 'Assignment', dueInDays: 21, duration: 21 * 24 * 60 },
  ]

  for (const e of examSeeds) {
    const dueDate = new Date(now + e.dueInDays * day)
    const data = {
      Title: e.title,
      Description: e.desc,
      SubjectId: subject.Id,
      ExamType: e.type,
      Status: 'Published',
      Duration: e.duration,
      StartDate: new Date(now),
      DueDate: dueDate,
      TotalPoints: 10,
      CreatedBy: lecturer.Id,
    }
    const existing = await prisma.exam.findFirst({ where: { Title: e.title, SubjectId: subject.Id } })
    const exam = existing
      ? await prisma.exam.update({ where: { Id: existing.Id }, data })
      : await prisma.exam.create({ data })

    // Assign the exam to the class (this is what makes it a due-dated assignment for enrolled students)
    await prisma.examClass.upsert({
      where: { ExamId_ClassId: { ExamId: exam.Id, ClassId: cls.Id } },
      update: { DueDate: dueDate },
      create: { ExamId: exam.Id, ClassId: cls.Id, AssignedAt: new Date(now), DueDate: dueDate },
    })
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Enriched cohort — extra classes, ~30 students, enrollments and submissions.
  // Makes the lecturer dashboard show real numbers: classes, student counts,
  // pending grading, recent submissions and an average score. Fully idempotent.
  // ══════════════════════════════════════════════════════════════════════════
  const studentHash = await hash('student123')
  const surnames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ']
  const givenNames = ['An', 'Bình', 'Chi', 'Dũng', 'Giang', 'Hà', 'Hải', 'Hùng', 'Khoa', 'Lan', 'Linh', 'Long', 'Mai', 'Minh', 'Nam', 'Nga', 'Ngọc', 'Nhung', 'Phong', 'Quân', 'Quỳnh', 'Sơn', 'Thảo', 'Thắng', 'Trang', 'Trung', 'Tú', 'Vy', 'Yến', 'Đạt']

  const students: { Id: string }[] = []
  for (let i = 0; i < 30; i++) {
    const code = `HE1700${String(i + 2).padStart(2, '0')}` // HE170002 .. HE170031
    const email = `${code.toLowerCase()}@fpt.edu.vn`
    const u = await prisma.user.upsert({
      where: { Email: email },
      update: {},
      create: {
        Email: email,
        PasswordHash: studentHash,
        FullName: `${surnames[i % surnames.length]} ${givenNames[i]}`,
        StudentCode: code,
        Status: 'Active',
      },
    })
    await prisma.userRole.upsert({
      where: { UserId_RoleId: { UserId: u.Id, RoleId: studentRole.Id } },
      update: {},
      create: { UserId: u.Id, RoleId: studentRole.Id },
    })
    students.push(u)
  }

  // Two more classes taught by the same lecturer (Spring 2026).
  const prm = await prisma.subject.findUniqueOrThrow({ where: { SubjectCode: 'PRM392' } })
  const swd = await prisma.subject.findUniqueOrThrow({ where: { SubjectCode: 'SWD392' } })
  const allClasses = [cls]
  for (const def of [
    { code: 'PRM392-SE1702', subjectId: prm.Id },
    { code: 'SWD392-SE1703', subjectId: swd.Id },
  ]) {
    const cl = await prisma.class.upsert({
      where: { ClassCode_SubjectId_SemesterId: { ClassCode: def.code, SubjectId: def.subjectId, SemesterId: semester.Id } },
      update: {},
      create: { ClassCode: def.code, SubjectId: def.subjectId, SemesterId: semester.Id, Status: 'Active' },
    })
    await prisma.instructorClass.upsert({
      where: { UserId_ClassId: { UserId: lecturer.Id, ClassId: cl.Id } },
      update: {},
      create: { UserId: lecturer.Id, ClassId: cl.Id },
    })
    allClasses.push(cl)
  }

  // Distribute the cohort across the three classes.
  const enrollPlan = [
    { cl: allClasses[0], slice: students.slice(0, 13) },
    { cl: allClasses[1], slice: students.slice(13, 23) },
    { cl: allClasses[2], slice: students.slice(23, 30) },
  ]
  for (const { cl, slice } of enrollPlan) {
    for (const s of slice) {
      await prisma.studentClass.upsert({
        where: { UserId_ClassId: { UserId: s.Id, ClassId: cl.Id } },
        update: {},
        create: { UserId: s.Id, ClassId: cl.Id },
      })
    }
  }

  // Submissions for class 1 (PRJ301) on its first exam: 8 graded + 5 pending.
  const class1Exams = await prisma.exam.findMany({ where: { SubjectId: subject.Id, Title: { in: examSeeds.map((e) => e.title) } } })
  const gradeExam = class1Exams[0]
  let submissionCount = 0
  if (gradeExam) {
    const class1Students = students.slice(0, 13)
    for (let i = 0; i < class1Students.length; i++) {
      const s = class1Students[i]
      const existing = await prisma.submission.findFirst({
        where: { StudentId: s.Id, ExamId: gradeExam.Id, ClassId: cls.Id, AttemptNumber: 1 },
      })
      if (existing) continue
      const graded = i < 8
      const score = graded ? Math.round((6 + (i % 4) * 0.9 + 0.5) * 10) / 10 : null // deterministic 6.5–9.2
      await prisma.submission.create({
        data: {
          ExamId: gradeExam.Id,
          StudentId: s.Id,
          ClassId: cls.Id,
          AttemptNumber: 1,
          IsLatest: true,
          SubmittedAt: new Date(now - (i + 1) * 6 * 60 * 60 * 1000),
          GradingStatus: graded ? 'Graded' : 'Pending',
          ReviewStatus: graded ? 'Reviewed' : 'Pending',
          TotalScore: score,
          FinalScore: score,
          InstructorFeedback: graded ? 'Bài làm tốt, cần cải thiện phần xử lý lỗi và kiểm thử.' : null,
          GradedAt: graded ? new Date(now - (i + 1) * 3 * 60 * 60 * 1000) : null,
          ReviewedBy: graded ? lecturer.Id : null,
        },
      })
      submissionCount++
    }
  }

  console.log(`   + enriched: ${students.length} students, ${allClasses.length} classes, ${submissionCount} new submissions`)

  // ── A welcome notification for the student (idempotent) ──
  const notifTitle = 'Chào mừng đến với AITA'
  let notif = await prisma.notification.findFirst({ where: { Title: notifTitle } })
  if (!notif) {
    notif = await prisma.notification.create({
      data: {
        Title: notifTitle,
        Message: 'Bạn có bài tập mới cần hoàn thành. Xem danh sách bài tập để bắt đầu nhé!',
        Type: 'System',
        CreatedBy: lecturer.Id,
        CreatedAt: new Date(now),
      },
    })
  }
  const recipient = await prisma.notificationRecipient.findFirst({ where: { NotificationId: notif.Id, UserId: student.Id } })
  if (!recipient) {
    await prisma.notificationRecipient.create({
      data: { NotificationId: notif.Id, UserId: student.Id, IsRead: false },
    })
  }

  // Audit log (idempotent — one seed marker row)
  const seededBefore = await prisma.auditLog.findFirst({ where: { EntityName: 'Database', Action: 'Seeded' } })
  if (!seededBefore) {
    await prisma.auditLog.create({
      data: {
        UserId: admin.Id,
        Action: 'Seeded',
        EntityName: 'Database',
        NewValue: JSON.stringify({ users: 3, classes: 1, exams: examSeeds.length }),
      },
    })
  }

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
