/**
 * Semester.Code is stored in Vietnamese in the database ("Kỳ 1" … "Kỳ 9"), and the
 * student-import matches semesters on that exact string. So the English form is a
 * DISPLAY-ONLY translation — never write it back to the API or the database.
 */
export function formatSemesterCode(code?: string | null): string {
  if (!code) return ''
  const match = /^k[yỳ]\s*(\d+)$/i.exec(code.trim())
  return match ? `Semester ${match[1]}` : code
}
