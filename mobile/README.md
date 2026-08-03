# AITA Mobile

Ứng dụng đồng hành của AITA cho **sinh viên** và **giảng viên** — dùng để **theo dõi và tra
cứu**, không dùng để nộp bài hay soạn đề (hai việc đó ở trên web).

Expo SDK 56 · expo-router · React Native 0.85 · TypeScript

- Danh sách tính năng và checkpoint kiểm thử: [`FEATURE_PLAN.md`](./FEATURE_PLAN.md)
- Đối chiếu tính năng mobile ↔ web: [`../docs/AITA_Mobile_vs_Web_Feature_Comparison.html`](../docs/AITA_Mobile_vs_Web_Feature_Comparison.html)

---

## Chạy thử

### Bước 1 — Cài dependencies

```bash
cd mobile
npm install
```

### Bước 2 — Trỏ API base URL về máy đang chạy backend

App đọc biến `EXPO_PUBLIC_API_URL` trong `mobile/.env` (hoặc `.env.local`, file này thắng).

```bash
# mobile/.env.local
EXPO_PUBLIC_API_URL=http://localhost:3001/api
```

**Điền giá trị nào là tuỳ chỗ anh mở app:**

| Mở app ở đâu | `EXPO_PUBLIC_API_URL` |
|---|---|
| Trình duyệt trên chính máy chạy BE | `http://localhost:3001/api` |
| Android emulator | `http://10.0.2.2:3001/api` — `10.0.2.2` là cách emulator gọi `localhost` của máy chủ |
| iOS simulator | `http://localhost:3001/api` |
| **Điện thoại thật (Expo Go)** | `http://<IP-LAN-của-máy-chạy-BE>:3001/api` |

Điện thoại thật **không hiểu `localhost`** — nó sẽ tự gọi vào chính nó. Phải dùng IP LAN.
Máy hiện tại: **`192.168.0.102`** → `http://192.168.0.102:3001/api`

Lấy IP trên máy khác:

```powershell
# Windows
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' }
```

```bash
# macOS / Linux
ipconfig getifaddr en0     # macOS
hostname -I                # Linux
```

> **Hai điều kiện bắt buộc khi dùng điện thoại thật**
> 1. Điện thoại và máy chạy BE phải **chung một mạng Wi-Fi**.
> 2. Backend phải **cho phép origin đó qua CORS**. Danh sách nằm ở
>    `be/src/app.ts:20` — hiện có `localhost:5173`, `:5174`, `:3000`, `:8081`.
>    Gọi từ app Expo Go thì request **không kèm header `Origin`** nên vẫn qua được;
>    nhưng nếu mở bằng trình duyệt trên điện thoại thì phải thêm origin đó vào danh sách.
>
> Nếu vẫn không kết nối được, kiểm tra Windows Firewall có chặn cổng 3001 không.

### Bước 3 — Chạy

```bash
npx expo start
```

Muốn mở thẳng bằng trình duyệt: `npx expo start --web` (mặc định `http://localhost:8081`).

**Đổi `.env` xong phải khởi động lại Metro** — biến `EXPO_PUBLIC_*` được nhúng vào bundle
lúc build, sửa file mà không restart thì app vẫn dùng giá trị cũ.

### Bước 4 — Mở app

Sau khi Metro chạy, bấm phím trong terminal:

| Phím | Mở ở |
|---|---|
| `a` | Android emulator |
| `i` | iOS simulator (chỉ trên macOS) |
| `w` | Trình duyệt |

Hoặc mở bằng **Expo Go** trên điện thoại thật: cài Expo Go từ App Store / Google Play rồi
quét mã QR hiện trong terminal.

### Tài khoản để đăng nhập

Do `be` seed sẵn:

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Sinh viên | `student@fpt.edu.vn` | `student123` |
| Giảng viên | `lecturer@fpt.edu.vn` | `lecturer123` |

Admin không có giao diện mobile — đăng nhập bằng tài khoản admin sẽ bị đẩy vào khu sinh viên.

---

## Backend phải chạy trước

```bash
cd be
npm run dev          # http://localhost:3001
```

`npm run setup` (= `prisma generate` + `db push` + `seed`) **chỉ chạy lần đầu** — nó ghi đè
schema và seed lại dữ liệu.

Kiểm tra nhanh backend sống chưa:

```bash
curl http://localhost:3001/api/health
# {"status":"ok","timestamp":"..."}
```

---

## Cờ dành cho dev

Đặt trong `mobile/.env.local`. **Cả hai phải là `0` khi build thật.**

| Biến | Tác dụng |
|---|---|
| `EXPO_PUBLIC_DEV_PREVIEW=1` | Chạy bằng dữ liệu giả, không cần backend. Chỉ phủ trang chủ + bài tập của sinh viên; các màn mới (Học tập, Kết quả, Thông báo) vẫn gọi API thật nên sẽ báo lỗi. |
| `EXPO_PUBLIC_DEV_AUTOLOGIN=1` | Tự đăng nhập bằng tài khoản seed khi mở app, bỏ qua màn đăng nhập. Dùng API thật. |

---

## Kiểm tra trước khi giao

```bash
npx tsc --noEmit                 # 0 lỗi kiểu
npx expo export --platform web   # mọi route phải bundle được
npx expo lint
npx expo install --check         # dependency đúng phiên bản SDK
```

---

## Sự cố hay gặp

| Hiện tượng | Nguyên nhân |
|---|---|
| Đăng nhập quay mãi rồi báo "Không thể kết nối máy chủ" | `EXPO_PUBLIC_API_URL` sai, hoặc chưa restart Metro sau khi sửa `.env` |
| Điện thoại thật không gọi được API | Đang dùng `localhost` thay vì IP LAN, hoặc khác mạng Wi-Fi, hoặc firewall chặn cổng 3001 |
| BE log `Cannot reach SQL Server at localhost:1433` | Cảnh báo của script **dev-seed**, không phải của app. Nếu `curl /api/health` và đăng nhập vẫn chạy thì `DATABASE_URL` đang đúng, bỏ qua được |
| Prisma báo `P1001` khi nhiều request cùng lúc | SQL Server chỉ nhận một kết nối — thêm `;connectionLimit=1` vào cuối `DATABASE_URL` |
| Đổi ảnh đại diện không mở được thư viện ảnh | Chưa cấp quyền, hoặc đang chạy trên web (expo-image-picker cần thiết bị/emulator) |
| Bật "Nhắc hạn nộp" không có tác dụng | Thông báo cục bộ không chạy trên web — cần thiết bị thật hoặc emulator |
