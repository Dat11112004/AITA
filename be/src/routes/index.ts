import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { authenticate, requireRoles } from '../middleware/auth.js'
import * as auth from '../controllers/auth.controller.js'
import * as users from '../controllers/users.controller.js'
import * as classes from '../controllers/classes.controller.js'
import * as assignments from '../controllers/assignments.controller.js'
import * as submissions from '../controllers/submissions.controller.js'
import * as ai from '../controllers/ai.controller.js'
import * as stats from '../controllers/stats.controller.js'
import * as settings from '../controllers/settings.controller.js'
import * as options from '../controllers/options.controller.js'
import * as reports from '../controllers/reports.controller.js'

const router = Router()

router.get('/health', (_req, res) => {
  res.json({ success: true, data: { service: 'AITA API', version: '1.0.0', status: 'ok' } })
})

router.post('/auth/login', asyncHandler(auth.login))
router.post('/auth/register', asyncHandler(auth.registerStudent))
router.get('/auth/me', authenticate, asyncHandler(auth.me))

router.get('/users', authenticate, requireRoles('ADMIN'), asyncHandler(users.list))
router.post('/users', authenticate, requireRoles('ADMIN'), asyncHandler(users.create))
router.patch('/users/:id', authenticate, requireRoles('ADMIN'), asyncHandler(users.update))

router.get('/classes', authenticate, asyncHandler(classes.list))
router.post('/classes', authenticate, requireRoles('ADMIN'), asyncHandler(classes.create))
router.get('/classes/:id/students', authenticate, requireRoles('ADMIN', 'LECTURER'), asyncHandler(classes.getStudents))
router.post('/classes/:id/enroll', authenticate, requireRoles('ADMIN', 'LECTURER'), asyncHandler(classes.enroll))

router.get('/assignments', authenticate, asyncHandler(assignments.list))
router.get('/assignments/:id', authenticate, asyncHandler(assignments.getOne))
router.post('/assignments', authenticate, requireRoles('LECTURER', 'ADMIN'), asyncHandler(assignments.create))
router.patch('/assignments/:id', authenticate, requireRoles('LECTURER', 'ADMIN'), asyncHandler(assignments.update))

router.get('/submissions', authenticate, asyncHandler(submissions.list))
router.get('/submissions/recent', authenticate, requireRoles('LECTURER'), asyncHandler(submissions.recent))
router.get('/submissions/:id', authenticate, asyncHandler(submissions.getOne))
router.post('/submissions', authenticate, requireRoles('STUDENT'), asyncHandler(submissions.submit))
router.patch('/submissions/:id/publish', authenticate, requireRoles('LECTURER', 'ADMIN'), asyncHandler(submissions.publishGrade))

router.post('/ai/generate-exercise', authenticate, requireRoles('LECTURER', 'ADMIN'), asyncHandler(ai.generateExercise))
router.post('/ai/save-assignment', authenticate, requireRoles('LECTURER', 'ADMIN'), asyncHandler(ai.saveAssignmentFromAI))
router.post('/ai/assess/:submissionId', authenticate, requireRoles('LECTURER', 'ADMIN'), asyncHandler(ai.assessSubmission))
router.get('/ai/feedback/:studentId', authenticate, asyncHandler(ai.learningFeedback))
router.get('/ai/reviews', authenticate, requireRoles('LECTURER', 'ADMIN'), asyncHandler(ai.listReviews))
router.patch('/ai/reviews/:jobId', authenticate, requireRoles('LECTURER', 'ADMIN'), asyncHandler(ai.reviewJob))
router.get('/ai/config', authenticate, requireRoles('ADMIN'), asyncHandler(ai.getConfig))
router.put('/ai/config', authenticate, requireRoles('ADMIN'), asyncHandler(ai.updateConfig))

router.get('/stats/overview', authenticate, asyncHandler(stats.overview))
router.get('/stats/activity', authenticate, requireRoles('ADMIN'), asyncHandler(stats.activityLogs))

router.get('/reports/admin', authenticate, requireRoles('ADMIN'), asyncHandler(reports.adminReport))
router.get('/reports/lecturer', authenticate, requireRoles('LECTURER'), asyncHandler(stats.lecturerReport))
router.get('/system/health', authenticate, requireRoles('ADMIN'), asyncHandler(reports.systemHealth))

router.get('/student/progress', authenticate, requireRoles('STUDENT'), asyncHandler(stats.studentProgress))
router.get('/student/feedback', authenticate, requireRoles('STUDENT'), asyncHandler(stats.studentFeedbackList))
router.get('/student/learning', authenticate, requireRoles('STUDENT'), asyncHandler(stats.studentLearning))

router.get('/settings', authenticate, requireRoles('ADMIN'), asyncHandler(settings.getAll))
router.put('/settings', authenticate, requireRoles('ADMIN'), asyncHandler(settings.update))

router.get('/options/classes', authenticate, asyncHandler(options.classOptions))
router.get('/options/assignments', authenticate, asyncHandler(options.assignmentOptions))
router.get('/options/lecturers', authenticate, requireRoles('ADMIN'), asyncHandler(options.lecturerOptions))

export default router
