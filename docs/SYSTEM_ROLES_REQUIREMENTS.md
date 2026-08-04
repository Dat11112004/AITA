# Bảng Đặc Tả Yêu Cầu Chức Năng (System Roles & Requirements)

Tài liệu này mô tả chi tiết 100% các tính năng, luồng hoạt động và quyền hạn của 3 vai trò chính trong hệ thống: **Admin**, **Lecturer** (Giảng viên), và **Student** (Sinh viên/Học sinh).

---

## 1. Vai trò của Admin (Quản trị viên)

Admin chịu trách nhiệm thiết lập dữ liệu nền tảng, quản lý người dùng, và cấu hình hệ thống từ cấp độ cao nhất.

### 1.1 Quản lý tài khoản (Lecturer & Student)
- **Import danh sách hàng loạt (Template):** 
  - Hỗ trợ template import danh sách học sinh bao gồm các trường thông tin: `Tên`, `Gmail`, `Lớp`, `Kì học`.
  - Trong `Kì học` chứa thông tin về `Môn học` (các môn thuộc ngành học).
  - Cột `Lớp` bao gồm các mã định dạng (ví dụ: 18A01, 18B02, C, D...).
  - Trong file import hỗ trợ cột `STATUS` (Trạng thái) để thiết lập trạng thái tài khoản ngay từ đầu.
- **Chỉnh sửa (Update):** Cho phép thay đổi các thông tin cá nhân cơ bản của tài khoản như: Tên, Gmail, Mật khẩu...
- **Khóa tài khoản (Ban/Lock):** 
  - Áp dụng chủ yếu cho Student (ví dụ: vi phạm quy chế, sử dụng email sai mục đích hoặc vượt quyền).
  - Nền tảng quản lý theo cột `STATUS`. Khi khóa, tài khoản bị đóng và không thể đăng nhập.
- **Xóa tài khoản (Delete):** Xóa hoàn toàn hoặc vô hiệu hóa (Soft-delete) đối với những sinh viên đã nghỉ học, thôi học hoặc tốt nghiệp khỏi trường.

### 1.2 Quản lý Môn học (Subject) và Lớp học (Class)
- **Luồng khởi tạo dữ liệu:**
  1. Tạo **Kì học** (Ví dụ: Fall, Spring, Summer...).
  2. Tạo **Môn học** (Ví dụ: PRO, DBI, WEB...) thuộc vào kì học đó.
  3. Tạo **Lớp học** (Ví dụ: 18C01, 18B01...) thuộc vào môn học.
  4. Gán (Add) **Giảng viên** phụ trách và danh sách **Sinh viên** vào Lớp học.
- **Giao diện quản lý phân tầng thông minh:**
  - Quản trị viên chọn **Kì học (Fall)** -> Hiển thị danh sách các **Môn học (PRO, DBI...)**.
  - Nhấp vào **Môn học (PRO)** -> Hiển thị danh sách các **Lớp (18C01, 18B01...)**.
  - Nhấp vào **Lớp (18C01)** -> Hiển thị danh sách toàn bộ Sinh viên và Giảng viên trong lớp đó.

### 1.3 Quản lý Thông báo (Notifications)
- Chức năng phát hành thông báo hệ thống (như bảo trì web, thông báo khẩn cấp, nhắc nhở chung).
- **Phân loại đối tượng nhận:** Admin có quyền chọn gửi thông báo đến: Toàn bộ hệ thống (All), Chỉ Giảng viên (Lecturer), hoặc Chỉ Sinh viên (Student).

---

## 2. Vai trò của Lecturer (Giảng viên)

Giảng viên chịu trách nhiệm trực tiếp giảng dạy, quản lý lớp học, ra đề, giao bài tập, chấm điểm và theo dõi tiến độ của học sinh.

### 2.1 Quản lý Đề thi và Bài tập (Tích hợp AI)
- **Tạo mới Đề thi / Bài tập:**
  - Hệ thống phân chia rõ ràng 2 luồng: **Tạo Đề thi (Exam)** và **Tạo Bài tập (Assignment)**.
  - Hỗ trợ module tạo câu hỏi trắc nghiệm nhanh chóng, tách biệt quy trình của Exam và Assignment.
- **AI Hỗ trợ Ra Đề & Barem Điểm:**
  - Giảng viên có thể tải lên (Upload) file đề bài có sẵn hoặc bài tập lấy từ bên ngoài.
  - **AI phân tích:** AI sẽ đọc file tài liệu, tự động phân tích và đưa ra **Tiêu chí chấm điểm (Barem / Rubric)** chính xác.
- **Review và Giao bài:**
  - Trước khi chốt, AI sẽ đề xuất điểm, Giảng viên có quyền **Review (xem xét lại)** để đảm bảo AI cho điểm / tạo barem hoàn toàn chính xác.
  - Nhấn nút **Gửi (Send)**: Hệ thống cho phép chọn đối tượng nhận là một lớp cụ thể (18C01, 18B01...) hoặc toàn bộ các lớp (All).
  - Tự động kích hoạt gửi Email hoặc bắn thông báo Push Notification (qua App Mobile) tới từng sinh viên.

### 2.2 Chấm điểm (Tự động & Thủ công)
- **Chấm điểm Bài tập (Chạy ngầm - Tự động):**
  - Khi sinh viên nộp bài tập, AI sẽ **chấm ngầm ngay lập tức** (Ai nộp trước chấm trước).
  - Mục đích: Giảm tải áp lực cho giảng viên. Cuối ngày hoặc cuối deadline, giảng viên chỉ cần vào màn hình để **Review** lại kết quả tổng.
- **Chấm điểm Đề thi (Đồng loạt - Thủ công):**
  - Không áp dụng chấm ngầm. Do tính chất quan trọng của bài thi, giảng viên phải kiểm soát tuyệt đối.
  - Giảng viên chọn **Submit** để đẩy lên hệ thống chấm điểm đồng loạt. Bài giải của học sinh cũng cần được lưu trữ để nộp lại cho nhà trường (Audit/Backup).

### 2.3 Quản lý Môn học và Lớp học (Góc nhìn Giảng viên)
- Giao diện chọn Môn học -> Chọn Lớp học.
- Trong giao diện Lớp học, có tính năng **Giao Bài Tập**:
  - Cấu hình Ngày hết hạn (**Deadline**).
  - Hiển thị danh sách lớp và các cột điểm (Ass1, Ass2, Final...).
- Sau khi giao bài, hệ thống gửi thông báo (Gmail, Web, Mobile App). Sinh viên có thể click trực tiếp từ thông báo để mở màn hình nộp bài / xem đề bài (tương tự cơ chế của EduNext).

### 2.4 Quản lý Lịch sử chấm điểm & Khiếu nại (Feedback)
- **Quản lý Khiếu nại:** Khi sinh viên phản hồi, thắc mắc (ví dụ: điểm thấp không đúng kì vọng), hệ thống sẽ gửi thông báo (App Mobile/Web) tới Giảng viên.
- **Lịch sử chấm điểm:** Giảng viên có thể truy cập lịch sử chấm của từng sinh viên.
  - **Xem:** Xem lại toàn bộ tiến trình và chi tiết bài làm.
  - **Sửa:** Cập nhật lại điểm số nếu phản hồi của sinh viên là chính xác.
  - **Xóa:** Dọn dẹp các lịch sử cũ/nháp để tránh phình to dữ liệu hệ thống, giúp tối ưu tốc độ load của Website. *(Ghi chú: Cần có cơ chế log lưu vết bảo mật khi xóa điểm).*

### 2.5 Cài đặt cá nhân (Profile & Thông báo)
- Nhận thông báo chung từ Admin.
- Cập nhật Profile: Đổi mật khẩu, hình đại diện (Avatar), thông tin cá nhân.

---

## 3. Vai trò của Student (Học sinh / Sinh viên)

Sinh viên là người dùng cuối tham gia vào học tập, làm bài, theo dõi kết quả và nhận phản hồi để cải thiện.

### 3.1 AI Feedback (Dành riêng cho Bài tập)
- Hệ thống AI phân tích bài làm của sinh viên (đối chiếu với đề bài gốc).
- Khi sinh viên đạt điểm thấp hoặc có lỗ hổng kiến thức, AI sẽ tự động đưa ra **Gợi ý & Lộ trình cải thiện (Feedback)** cụ thể và cá nhân hóa, giúp sinh viên biết cần học thêm hay sửa sai ở đâu.

### 3.2 Nhận & Nộp Bài tập
- **Nhận bài:** 
  - Nhận thông báo có bài tập/đề thi mới qua Gmail, App Mobile.
  - Click vào thông báo sẽ hiển thị giao diện chi tiết đề bài trên hệ thống (do AI tạo và đẩy xuống màn hình làm bài).
- **Nộp bài:**
  - Sinh viên tải lên (Upload) file bài làm và nhấn **Submit**.
  - Giao diện phản hồi xác nhận: *"Đã nộp thành công"*.
- **Xử lý Deadline:** Khi thời gian vượt quá hạn chót (Overdue), hệ thống sẽ tự động **khóa chức năng nộp bài**. Các bài đã nộp trước deadline vẫn được giữ nguyên và chuyển sang trạng thái chờ chấm điểm.

### 3.3 Quản lý Môn học và Bảng điểm
- **Trang Môn học:** Hiển thị các môn đang học (PRO, DBI...).
- Khi click vào một Môn học: Hiển thị tên Lớp học, thông tin cá nhân, và các cột điểm (Ass1, Ass2...).
- **Chi tiết Bảng điểm:**
  - Xem chi tiết từng cột điểm, kết hợp với file bài làm mà mình đã nộp.
  - Xem chi tiết **AI Feedback** ngay bên dưới bài nộp.
- **Phản hồi / Khiếu nại:**
  - Có tính năng gửi **Feedback / Ý kiến về điểm số** trực tiếp từ bảng điểm.
  - Ý kiến này sẽ được hệ thống bắn Notification (báo rung/hiển thị) tới App Mobile của Giảng viên hoặc Giảng viên sẽ đọc trực tiếp khi lên lớp.

### 3.4 Cài đặt cá nhân (Profile)
- Quản lý thông tin cá nhân: Đổi tên hiển thị, mật khẩu, cập nhật ảnh đại diện (giống vai trò Lecturer).
