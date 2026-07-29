export const DEFAULT_SUBJECT_DESCRIPTIONS: Record<string, string> = {
  DBI202: 'Relational database design & management: ERD modeling, Normalization, primary/foreign keys, constraints, and SQL (DDL, DML, DCL).',
  CSD201: 'Core data structures & algorithms: linked lists, stacks, queues, trees, BSTs, heaps, hash tables, graphs, and Big-O complexity analysis.',
  PRF192: 'Fundamental C programming concepts: variables, data types, control flow, functions, pointers, structs, file I/O, and algorithmic thinking.',
  PRO192: 'Object-oriented programming using Java: classes, encapsulation, inheritance, polymorphism, interfaces, exception handling, and collections.',
  SWP391: 'Team-based software project: applying agile development, requirement analysis, design, testing, Git version control, and final delivery.',
  PRJ301: 'Java Web Application development using Servlets, JSP, MVC architecture, JDBC, Sessions, Filters, and database integration.',
  PRM392: 'Android mobile application development: Activities, Fragments, Room database, REST APIs, Firebase integration, and Material Design UI.',
  PRN212: 'C# and .NET application development: LINQ, Entity Framework Core, ASP.NET Core Web API, JWT authentication, and SQL Server.',
  WDP301: 'Modern web application development using HTML5, CSS3, JavaScript, responsive layouts, REST APIs, and frontend-backend integration.',
  SWD392: 'Software architecture and design patterns: UML, GoF patterns, layered architecture, Clean Architecture, SOLID principles, and system scalability.'
}

export function getCleanSubjectDescription(code?: string | null, rawDesc?: string | null): string {
  if (code && DEFAULT_SUBJECT_DESCRIPTIONS[code.toUpperCase()]) {
    return DEFAULT_SUBJECT_DESCRIPTIONS[code.toUpperCase()]
  }
  if (!rawDesc) {
    return 'Comprehensive course covering core principles, practical exercises, and real-world software applications.'
  }
  const hasVietnamese = /[àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(rawDesc)
  if (hasVietnamese) {
    return 'Comprehensive course covering core principles, practical exercises, and real-world software applications.'
  }
  return rawDesc
}
