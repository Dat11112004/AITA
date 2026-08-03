/**
 * Chụp toàn bộ màn hình AITA Mobile đang chạy ở http://localhost:8081 (expo start --web).
 *
 * Cách làm: đăng nhập qua API để lấy token thật + id thật, bơm token vào localStorage
 * (secureStore trên web fallback về localStorage), rồi điều hướng thẳng bằng URL —
 * expo-router trên web dùng URL thật nên không cần mô phỏng thao tác chạm.
 */
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

const API = 'http://localhost:3001/api'
const APP = 'http://localhost:8081'
const OUT = process.argv[2] || 'shots'

const VIEWPORT = { width: 390, height: 844 } // iPhone 14

async function api(pathname, { token, method = 'GET', body } = {}) {
  const res = await fetch(API + pathname, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Origin: APP,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const json = await res.json().catch(() => ({}))
  return json.Data !== undefined ? json.Data : json.data
}

async function login(email, password) {
  const d = await api('/auth/login', { method: 'POST', body: { email, password } })
  if (!d?.token) throw new Error('Login failed: ' + email)
  return d
}

/** Điều hướng + chờ app vẽ xong + chụp. */
async function shot(page, route, name, note) {
  const file = path.join(OUT, name + '.png')
  try {
    await page.goto(APP + route, { waitUntil: 'domcontentloaded', timeout: 60000 })
    // Chờ mất spinner rồi ổn định layout. Dev bundle load chậm ở lần đầu.
    await page.waitForTimeout(3200)
    await page.screenshot({ path: file })
    console.log('  OK  ' + name.padEnd(34) + (note || route))
  } catch (e) {
    console.log('  ERR ' + name.padEnd(34) + String(e.message).slice(0, 70))
  }
}

async function session(browser, auth) {
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 })
  if (auth) {
    await ctx.addInitScript((a) => {
      localStorage.setItem('aita_token', a.token)
      if (a.refreshToken) localStorage.setItem('aita_refresh', a.refreshToken)
      localStorage.setItem('aita_user', JSON.stringify(a.user))
    }, auth)
  }
  return ctx
}

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch()

  // ── 1. Màn chưa đăng nhập ────────────────────────────────────────────────
  console.log('\n[1] Chua dang nhap')
  {
    const ctx = await session(browser, null)
    const page = await ctx.newPage()
    await shot(page, '/login', '01-login', 'Đăng nhập')
    await shot(page, '/forgot-password', '02-forgot-password', 'Quên mật khẩu')
    await shot(page, '/reset-password', '03-reset-password', 'Đặt lại mật khẩu (OTP)')
    await ctx.close()
  }

  // ── 2. Sinh viên ─────────────────────────────────────────────────────────
  console.log('\n[2] Sinh vien')
  const stu = await login('student@fpt.edu.vn', 'student123')
  const [asgs, hist, classes, subjects] = await Promise.all([
    api('/assignments', { token: stu.token }).catch(() => []),
    api('/stats/student-history', { token: stu.token }).catch(() => []),
    api('/classes', { token: stu.token }).catch(() => []),
    api('/student-portal/subjects', { token: stu.token }).catch(() => []),
  ])
  console.log(`    du lieu: ${asgs?.length || 0} bai tap, ${hist?.length || 0} bai nop, ` +
              `${classes?.length || 0} lop, ${subjects?.length || 0} mon`)
  {
    const ctx = await session(browser, stu)
    const page = await ctx.newPage()
    await shot(page, '/dashboard', '04-sv-trang-chu', 'Trang chủ')
    await shot(page, '/assignments', '05-sv-bai-tap', 'Danh sách bài tập')
    if (asgs?.[0]?.id) await shot(page, `/assignments/${asgs[0].id}`, '06-sv-chi-tiet-bai-tap', 'Chi tiết bài tập')
    await shot(page, '/learning', '07-sv-hoc-tap', 'Môn học & lớp học')
    if (subjects?.[0]?.id) await shot(page, `/learning/subject/${subjects[0].id}`, '08-sv-chi-tiet-mon', 'Chi tiết môn')
    if (classes?.[0]?.id) await shot(page, `/learning/class/${classes[0].id}`, '09-sv-chi-tiet-lop', 'Chi tiết lớp')
    await shot(page, '/results', '10-sv-ket-qua', 'Bảng điểm + lịch sử')
    if (hist?.[0]?.id) await shot(page, `/results/${hist[0].id}`, '11-sv-chi-tiet-diem', 'Chi tiết điểm + phản hồi AI')
    await shot(page, '/notifications', '12-sv-thong-bao', 'Thông báo')
    await shot(page, '/profile', '13-ho-so', 'Hồ sơ')
    await shot(page, '/profile/edit', '14-sua-ho-so', 'Sửa hồ sơ + ảnh đại diện')
    await shot(page, '/profile/change-password', '15-doi-mat-khau', 'Đổi mật khẩu')
    await ctx.close()
  }

  // ── 3. Giảng viên ────────────────────────────────────────────────────────
  console.log('\n[3] Giang vien')
  const lec = await login('lecturer@fpt.edu.vn', 'lecturer123')
  const [lClasses, lAsgs, recent] = await Promise.all([
    api('/classes?page=1&limit=50', { token: lec.token }).catch(() => []),
    api('/assignments', { token: lec.token }).catch(() => []),
    api('/submissions/recent', { token: lec.token }).catch(() => []),
  ])
  console.log(`    du lieu: ${lClasses?.length || 0} lop, ${lAsgs?.length || 0} bai tap, ` +
              `${recent?.length || 0} bai nop gan day`)
  {
    const ctx = await session(browser, lec)
    const page = await ctx.newPage()
    await shot(page, '/dashboard', '16-gv-trang-chu', 'Trang chủ')
    await shot(page, '/classes', '17-gv-lop-hoc', 'Danh sách lớp')
    if (lClasses?.[0]?.id) {
      const c0 = lClasses[0]
      await shot(page, `/classes/${c0.id}?code=${encodeURIComponent(c0.code || '')}&name=${encodeURIComponent(c0.name || '')}`,
        '18-gv-chi-tiet-lop', 'Chi tiết lớp + roster')
    }
    await shot(page, '/grading', '19-gv-cham-bai', 'Chấm bài (Gần đây / Theo bài tập)')
    if (lAsgs?.[0]?.id) {
      await shot(page, `/grading/exam/${lAsgs[0].id}?title=${encodeURIComponent(lAsgs[0].title || '')}`,
        '20-gv-bai-nop-theo-bai-tap', 'Bài nộp theo bài tập')
    }
    if (recent?.[0]?.id) await shot(page, `/grading/${recent[0].id}`, '21-gv-cham-diem', 'Nhập điểm + nhận xét')
    await shot(page, '/notifications', '22-gv-thong-bao', 'Thông báo')
    await shot(page, '/notifications/broadcast', '23-gv-gui-thong-bao', 'Gửi thông báo')
    await ctx.close()
  }

  await browser.close()
  const files = fs.readdirSync(OUT).filter((f) => f.endsWith('.png'))
  console.log(`\nXong: ${files.length} anh trong ${path.resolve(OUT)}`)
})().catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
})
