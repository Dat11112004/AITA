import { PRF192_SYLLABUS } from './prf192-syllabus'
import { PRO192_SYLLABUS } from './pro192-syllabus'
import { CSD201_SYLLABUS } from './csd201-syllabus'
import { DBI202_SYLLABUS } from './dbi202-syllabus'
import { PRJ301_SYLLABUS } from './prj301-syllabus'
import { PRM392_SYLLABUS } from './prm392-syllabus'
import { PRN212_SYLLABUS } from './prn212-syllabus'
import { SWD392_SYLLABUS } from './swd392-syllabus'
import { SWP391_SYLLABUS } from './swp391-syllabus'
import { WDP301_SYLLABUS } from './wdp301-syllabus'

export const STATIC_SYLLABI: Record<string, any> = {
  PRF192: PRF192_SYLLABUS,
  PRO192: PRO192_SYLLABUS,
  CSD201: CSD201_SYLLABUS,
  DBI202: DBI202_SYLLABUS,
  PRJ301: PRJ301_SYLLABUS,
  PRM392: PRM392_SYLLABUS,
  PRN212: PRN212_SYLLABUS,
  SWD392: SWD392_SYLLABUS,
  SWP391: SWP391_SYLLABUS,
  WDP301: WDP301_SYLLABUS,
}

export function getStaticSyllabus(code?: string | null) {
  if (!code) return null
  return STATIC_SYLLABI[code.toUpperCase()] || null
}

