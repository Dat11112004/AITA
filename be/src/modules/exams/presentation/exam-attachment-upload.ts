import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import multer from 'multer'
import { env } from '../../../config/env.js'
import { ValidationError } from '../../../shared/application/app.error.js'
import { MESSAGES } from '../../../shared/constants/messages.js'

export const EXAM_ATTACHMENT_DIR = path.resolve(env.UPLOAD_DIR, 'exam-attachments')

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.doc', '.docx'])
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

fs.mkdirSync(EXAM_ATTACHMENT_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, EXAM_ATTACHMENT_DIR),
  // Never trust the client filename on disk — store under a generated name,
  // keep the original (UTF-8 decoded) name only in the DB row.
  filename: (_req, file, cb) => cb(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
})

export const examAttachmentUpload = multer({
  storage,
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    if (!ALLOWED_EXTENSIONS.has(ext) || !ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new ValidationError(MESSAGES.EXAM_ATTACHMENT_INVALID_TYPE))
    }
    cb(null, true)
  },
})

/** Multer decodes originalname as latin1; re-decode so Vietnamese filenames survive. */
export function decodeOriginalName(originalname: string): string {
  return Buffer.from(originalname, 'latin1').toString('utf8')
}
