import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// Vietnamese-first UI (matches the web). Add 'en'/'ja' resources later if needed.
export const resources = {
  vi: {
    translation: {
      appName: 'AITA',
      tabs: { home: 'Trang chủ', assignments: 'Bài tập' },
      login: {
        title: 'Đăng nhập',
        subtitle: 'Cổng sinh viên AITA',
        email: 'Email',
        password: 'Mật khẩu',
        submit: 'Đăng nhập',
        loading: 'Đang đăng nhập...',
        error: 'Đăng nhập thất bại',
      },
      dashboard: {
        title: 'Bảng điều khiển',
        greeting: 'Xin chào, {{name}}',
        role: 'Vai trò: {{role}}',
        myClasses: 'Lớp học của tôi',
        upcoming: 'Sắp đến hạn',
        noClasses: 'Bạn chưa có lớp học nào.',
        noUpcoming: 'Không có bài tập sắp đến hạn.',
        students: '{{count}} sinh viên',
        logout: 'Đăng xuất',
        stat: {
          classes: 'Lớp học',
          assignments: 'Bài tập',
          submissions: 'Bài nộp',
          averageScore: 'Điểm TB',
        },
      },
      assignments: {
        title: 'Bài tập',
        empty: 'Chưa có bài tập nào.',
      },
      assignment: {
        detailTitle: 'Chi tiết bài tập',
        due: 'Hạn nộp',
        noDue: 'Không có hạn nộp',
        description: 'Mô tả',
        noDescription: 'Chưa có mô tả.',
        submit: 'Nộp bài',
        submitSoon: 'Tính năng nộp bài sẽ có ở bước tiếp theo.',
      },
      status: {
        PUBLISHED: 'Đang mở',
        CLOSED: 'Đã đóng',
        DRAFT: 'Nháp',
        PENDING_AI_REVIEW: 'Chờ duyệt',
      },
      common: {
        retry: 'Thử lại',
        loading: 'Đang tải...',
        error: 'Không thể tải dữ liệu',
        notFound: 'Không tìm thấy',
        preview: 'CHẾ ĐỘ XEM THỬ (dữ liệu mẫu)',
      },
    },
  },
} as const

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: 'vi',
    fallbackLng: 'vi',
    interpolation: { escapeValue: false },
  })
}

export default i18n
