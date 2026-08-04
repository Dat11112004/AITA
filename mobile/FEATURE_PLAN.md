# AITA Mobile — Kế hoạch bổ sung tính năng (2026-08-02)

Mục tiêu: mobile trở thành **bản đồng hành để quản lý và tra cứu** đầy đủ cho sinh viên +
giảng viên. **Không làm nộp bài** — đó vẫn là việc của web, theo yêu cầu.

Nền tảng giữ nguyên: Expo SDK 56 · expo-router · giao diện **Aurora Glass hiện có**
(`AuroraBackground` / `GlassCard` / `StatusBadge` / `SubjectChip` / `SubjectTile` /
`AssignmentCard` / `LoginField`). Không đụng `be/`.

---

## 0. Ba giới hạn từ BE (đã kiểm chứng trong code, không thể vượt nếu không sửa `be/`)

> **Đọc kỹ chỗ này:** L1 và L2 **không phải mobile thua web** — **web cũng không có**.
> Đã kiểm chứng 2026-08-02: `grep -rniE "serviceworker|web-push|firebase|onesignal|Notification.requestPermission" FE/src FE/public FE/index.html` → 0 kết quả (web không có push);
> `AdminNotifications.tsx:10` gửi `{title, message, targetRole, type}` — cũng chỉ 3 lựa chọn vai trò, không có ô chọn lớp;
> `grep -rn "broadcastNotification" FE/src` → chỉ 1 file, tức **web không có màn gửi thông báo cho giảng viên** (mobile có).
> Thứ duy nhất nhắm được vào lớp là thông báo **tự động** khi đăng bài / công bố điểm (`sendNotification` trong `LecturerSubmissions.tsx:44`), nội dung do máy soạn, dính liền luồng tạo bài — vốn để trên web.
> **Chốt 2026-08-02: không làm L1 và L2.** Giữ nguyên, ghi lại để sau này biết vì sao.

| # | Giới hạn | Bằng chứng | Mobile làm được tới đâu |
|---|---|---|---|
| L1 | **Không có hạ tầng push.** BE không có bảng device-token, không có endpoint đăng ký token, không gọi Expo/FCM/APNs. | `grep -riE "expo.?push\|devicetoken\|fcm\|apns" be/src` → 0 kết quả | Làm **thông báo cục bộ trên máy**: xin quyền, tạo Android channel, **tự đặt lịch nhắc hạn nộp** (trước 24h và 2h), bấm vào nhắc → mở đúng bài. Lấy sẵn Expo push token và hiện trong Hồ sơ để BE dùng sau. **Push từ server cần BE thêm endpoint.** |
| L2 | **Broadcast không nhắm được theo lớp.** `BroadcastNotificationParams` chỉ nhận `targetRole: 'ALL' \| 'LECTURER' \| 'STUDENT'`; `classId` mobile đang gửi bị BE bỏ qua. | `be/src/modules/notifications/application/use-cases/broadcast-notification.use-case.ts:7-13` | Làm màn **Gửi thông báo** với bộ chọn đối tượng (Tất cả / Sinh viên / Giảng viên) — chạy thật. **Gửi riêng cho 1 lớp cần BE.** |
| L3 | **Gợi ý AI theo từng tiêu chí rubric cần `ruleScoreId`**, mà `/submissions/:id` không trả về danh sách rule score. | `GetAiHintUseCase` nhận `ruleScoreId`; `SubmissionResponseDto.from` không xuất `ruleScores` | Làm **phản hồi AI tổng thể** (`aiFeedback`), nhận xét giảng viên, và bóc tách điểm (điểm thô → trừ nộp trễ → điểm cuối). **Gợi ý từng tiêu chí cần BE.** |

## 0b. Ba lỗi hợp đồng API phát hiện khi rà (sửa luôn)

| # | Lỗi | Đúng phải là |
|---|---|---|
| B1 | `api.changePassword` gửi `{ currentPassword, newPassword }` | BE nhận `{ oldPassword, newPassword }` — `ChangePasswordSchema` |
| B2 | `api.resetPassword` gửi `{ token, newPassword }` | BE nhận `{ email, otp (6 số), newPassword }` — luồng OTP, không phải token |
| B3 | `toSubmissionRow` đọc `student.fullName` | BE trả `student.name` → tên sinh viên luôn rỗng |

---

## 1. Nền — API & i18n

- [x] **T1.1** Sửa B1, B2, B3 trong `src/lib/api.ts`
- [x] **T1.2** Thêm/sửa method: `getNotifications(page,limit)`, `deleteNotification`, `getSubjectStudents`, `getSubmissionsByExam(examId,status?)`, `broadcastNotification({title,message,targetRole})`
- [x] **T1.3** Chuẩn hoá payload: `toNotificationRow`, `toClassDetail`, mở rộng `toAssignmentRow` (đính kèm, rubric, điểm tối đa, trọng số, phạt trễ) + kiểu `StudentSubject`, `PersonRow`, `ClassDetail`, `SubmissionRow` (đủ trường điểm/AI)
- [x] **T1.4** Bổ sung khoá i18n tiếng Việt cho toàn bộ màn mới
- [x] **T1.5** Cài `expo-notifications`, `expo-image-picker` bằng `npx expo install`

## 2. Tài khoản

- [x] **T2.1** `app/profile/index.tsx` — chuyển từ `profile.tsx`, thêm lối vào Sửa hồ sơ / Đổi mật khẩu / Nhắc hạn nộp
- [x] **T2.2** `app/profile/edit.tsx` — **Sửa hồ sơ**: họ tên, SĐT, **đổi ảnh đại diện** (expo-image-picker → `PATCH /auth/profile` multipart)
- [x] **T2.3** `app/profile/change-password.tsx` — **Đổi mật khẩu** (mật khẩu cũ + mới + xác nhận)
- [x] **T2.4** `app/forgot-password.tsx` — **Quên mật khẩu**: nhập email → BE gửi OTP
- [x] **T2.5** `app/reset-password.tsx` — **Đặt lại mật khẩu**: email + OTP 6 số + mật khẩu mới
- [x] **T2.6** Nối "Quên mật khẩu?" vào màn đăng nhập
- [x] **T2.7** Hiển thị ảnh đại diện thật (`avatar`) thay chữ cái đầu ở mọi chỗ có avatar

## 3. Thông báo

- [x] **T3.1** `components/NotificationList.tsx` — dùng chung 2 vai trò: đọc/chưa đọc, đánh dấu đã đọc, đánh dấu tất cả, xoá, kéo-để-làm-mới
- [x] **T3.2** `(student)/notifications.tsx` — tab **Thông báo** cho sinh viên
- [x] **T3.3** `(lecturer)/notifications/index.tsx` — tab **Thông báo** cho giảng viên
- [x] **T3.4** `(lecturer)/notifications/broadcast.tsx` — **Gửi thông báo** + bộ chọn đối tượng (giới hạn L2)
- [x] **T3.5** Chấm đỏ số chưa đọc trên tab

## 4. Sinh viên — Học tập

- [x] **T4.1** `(student)/learning/index.tsx` — **Môn học & Lớp học** trong một màn, hai khối
- [x] **T4.2** `(student)/learning/subject/[id].tsx` — **Chi tiết môn**: giảng viên, học kỳ, lớp, bài tập của môn
- [x] **T4.3** `(student)/learning/class/[id].tsx` — **Chi tiết lớp**: giảng viên, danh sách sinh viên, bài tập của lớp
- [x] **T4.4** Tab **Học tập** trong `(student)/_layout.tsx`

## 5. Sinh viên — Kết quả

- [x] **T5.1** `(student)/results/index.tsx` — **Bảng điểm**: GPA, thứ hạng, chuỗi ngày + **Lịch sử bài đã nộp**
- [x] **T5.2** `(student)/results/[id].tsx` — **Xem điểm & phản hồi AI chi tiết**: điểm thô → trừ nộp trễ → điểm cuối, phản hồi AI, nhận xét giảng viên, cờ nộp trễ / mở lại (giới hạn L3)
- [x] **T5.3** Tab **Kết quả** trong `(student)/_layout.tsx`

## 6. Sinh viên — Chi tiết bài tập (làm dày)

- [x] **T6.1** Bổ sung vào `(student)/assignments/[id].tsx`: điểm tối đa, trọng số, loại bài, tệp đính kèm (mở bằng trình duyệt), chính sách phạt nộp trễ, tiêu chí rubric
- [x] **T6.2** Hiện bài nộp của chính mình cho bài tập đó + lối tắt sang màn kết quả
- [x] **T6.3** Bỏ nút "Nộp bài" giả, thay bằng ghi chú trung thực "nộp bài trên web"

## 7. Giảng viên

- [x] **T7.1** `(lecturer)/classes/[id].tsx` — làm dày: giảng viên phụ trách, môn, sĩ số, **danh sách sinh viên** có ảnh + mã + email
- [x] **T7.2** `(lecturer)/grading/index.tsx` — hai chế độ: **Gần đây** và **Theo bài tập**
- [x] **T7.3** `(lecturer)/grading/exam/[id].tsx` — **Danh sách bài nộp theo bài tập** + lọc theo trạng thái
- [x] **T7.4** Tab **Thông báo** trong `(lecturer)/_layout.tsx`

## 8. Push / nhắc hạn nộp

- [x] **T8.1** `src/lib/push.ts` — xin quyền, Android channel, lấy Expo push token
- [x] **T8.2** Tự đặt lịch nhắc trước hạn 24h và 2h cho mọi bài `PUBLISHED`; huỷ lịch cũ trước khi đặt lại
- [x] **T8.3** Bấm vào thông báo → mở đúng màn chi tiết bài tập
- [x] **T8.4** Công tắc bật/tắt trong Hồ sơ + hiện Expo push token để BE dùng sau (giới hạn L1)

---

## Checkpoint kiểm thử

Ký hiệu: **✅ đã chạy qua** · **⬜ chưa** · **🚫 chặn bởi BE**

### Kiểm thử tự động / build

| # | Checkpoint | KQ |
|---|---|---|
| C1 | `npx tsc --noEmit` → 0 lỗi | ✅ |
| C2 | `npx expo export --platform web` → mọi route bundle sạch | ✅ **42/42 route** |
| C3 | `npx expo lint` → không phát sinh cảnh báo mới | ✅ còn 22 lỗi + 2 cảnh báo **có sẵn từ trước** (`set-state-in-effect` của pattern fetch-on-mount, `refs during render` trong `LoginField`, `Aurora` thừa trong `SubjectTile`) |
| C4 | `npx expo install --check` → không có dep lệch phiên bản | ✅ |
| C5 | Số màn hình: 12 → **24** | ✅ |

### Kiểm thử chức năng (cần chạy app + BE thật)

Bảng dưới **chưa chạy** — cần cắm BE thật và mở app trên máy/emulator. Đánh dấu ✅ khi qua.

| # | Màn / luồng | Việc cần làm | KQ |
|---|---|---|---|
| C6 | Đăng nhập | Sai mật khẩu → hiện lỗi; đúng → vào đúng vai trò | ⬜ |
| C7 | Quên mật khẩu | Nhập email → thấy màn nhập OTP | ⬜ |
| C8 | Đặt lại mật khẩu | OTP 6 số + mật khẩu mới → đăng nhập lại được bằng mật khẩu mới | ⬜ |
| C9 | Đổi mật khẩu | Sai mật khẩu cũ → báo lỗi; đúng → đổi thành công | ⬜ |
| C10 | Sửa hồ sơ | Đổi họ tên + SĐT → lưu, quay lại thấy giá trị mới | ⬜ |
| C11 | Đổi ảnh đại diện | Chọn ảnh từ máy → upload → avatar mới hiện ở Hồ sơ và tab bar | ⬜ |
| C12 | Thông báo (SV) | Danh sách hiện đúng, bấm 1 cái → mất chấm chưa đọc | ⬜ |
| C13 | Đánh dấu tất cả đã đọc | Số chưa đọc trên tab về 0 | ⬜ |
| C14 | Gửi thông báo (GV) | Gửi tới "Sinh viên" → tài khoản SV nhận được | ⬜ |
| C15 | Môn học | Danh sách môn hiện mã + tên + giảng viên | ⬜ |
| C16 | Chi tiết môn | Thấy lớp và bài tập thuộc môn đó | ⬜ |
| C17 | Chi tiết lớp (SV) | Thấy giảng viên, bạn cùng lớp, bài tập của lớp | ⬜ |
| C18 | Bảng điểm | GPA, thứ hạng khớp `/stats/student-progress` | ⬜ |
| C19 | Lịch sử bài nộp | Danh sách khớp `/stats/student-history` | ⬜ |
| C20 | Chi tiết bài nộp | Điểm thô − trừ trễ = điểm cuối; phản hồi AI hiện đúng | ⬜ |
| C21 | Bài nộp chưa công bố | Không lộ điểm (BE trả `null`) — UI phải nói "chưa công bố" | ⬜ |
| C22 | Chi tiết bài tập | Điểm tối đa, đính kèm, chính sách phạt trễ hiện đúng | ⬜ |
| C23 | Tệp đính kèm | Bấm → mở được trong trình duyệt | ⬜ |
| C24 | Chi tiết lớp (GV) | Danh sách sinh viên đủ, có mã + email | ⬜ |
| C25 | Bài nộp theo bài tập | Chọn bài tập → đúng danh sách bài nộp của bài đó | ⬜ |
| C26 | Lọc trạng thái | Lọc "Chờ chấm" → chỉ còn bài chờ chấm | ⬜ |
| C27 | Chấm điểm | Nhập điểm + nhận xét → công bố → SV thấy được | ⬜ |
| C28 | Nhắc hạn nộp | Bật công tắc → cấp quyền → lịch nhắc được đặt | ⬜ |
| C29 | Bấm vào nhắc | Mở đúng màn chi tiết bài tập | ⬜ |
| C30 | Chế độ tối | Mọi màn mới đọc được ở dark mode | ⬜ |
| C31 | Mạng lỗi | Tắt BE → mọi màn hiện `ErrorView` + nút Thử lại, không trắng màn | ⬜ |
| C32 | Push từ server | — | 🚫 Không làm (chốt 2026-08-02). Web cũng không có push. |
| C33 | Thông báo riêng 1 lớp | — | 🚫 Không làm (chốt 2026-08-02). Web cũng không có. |
| C34 | Gợi ý AI từng tiêu chí | — | 🚫 L3: `/submissions/:id` không trả `ruleScoreId` |
