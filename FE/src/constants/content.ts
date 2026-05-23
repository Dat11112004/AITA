export const PRODUCT_PILLARS = [
  {
    id: 'lecturer',
    title: 'Lecturer Web Dashboard',
    subtitle: 'Cổng giảng viên',
    description:
      'Quản lý lớp học, tạo bài tập bằng AI, duyệt nội dung, hỗ trợ chấm bài và theo dõi tiến độ sinh viên.',
    features: [
      'Quản lý lớp học và môn học',
      'Tạo & chỉnh sửa bài tập AI',
      'Chấm bài & phản hồi',
      'Báo cáo học tập',
    ],
  },
  {
    id: 'student',
    title: 'Student Learning Portal',
    subtitle: 'Cổng sinh viên',
    description:
      'Truy cập bài tập, nộp source code, nhận phản hồi AI và theo dõi tiến độ cá nhân.',
    features: [
      'Nhận & nộp bài trực tuyến',
      'Nộp mã nguồn',
      'Phản hồi AI chi tiết',
      'Đề xuất cải thiện kỹ năng',
    ],
  },
  {
    id: 'ai',
    title: 'AI Engine',
    subtitle: 'Động cơ trí tuệ nhân tạo',
    description:
      'Tạo bài tập, hỗ trợ đánh giá và phản hồi học tập cá nhân hóa — giảng viên duyệt trước khi công bố.',
    features: [
      'Exercise Generation AI',
      'AI-assisted Assessment',
      'Learning Feedback AI',
      'Điều chỉnh độ khó',
    ],
  },
]

export const AI_MODULES = [
  {
    id: 'exercise-gen',
    name: 'Exercise Generation AI',
    description: 'Tạo trắc nghiệm, bài lập trình, đề nhóm và điều chỉnh độ khó.',
    status: 'ready' as const,
  },
  {
    id: 'assessment',
    name: 'AI-assisted Assessment',
    description: 'Chấm trắc nghiệm, phân tích code, đánh giá nhóm và đóng góp thành viên.',
    status: 'ready' as const,
  },
  {
    id: 'feedback',
    name: 'Learning Feedback AI',
    description: 'Gợi ý ôn tập, nhận xét code, hướng nâng cao và phân tích hiệu quả học tập.',
    status: 'ready' as const,
  },
]

export const HOME_FEATURES = [
  {
    title: 'Giảm tải giảng viên',
    description: 'Tự động hóa tạo bài, chấm điểm sơ bộ và tổng hợp báo cáo.',
    icon: 'Zap',
  },
  {
    title: 'Phản hồi nhanh',
    description: 'Sinh viên nhận nhận xét trong vòng 40–60 giây (theo cấu hình AI).',
    icon: 'Clock',
  },
  {
    title: 'Đánh giá chuyên sâu',
    description: 'Không chỉ test case — còn style, logic, hiệu năng và làm việc nhóm.',
    icon: 'Code2',
  },
  {
    title: 'Cá nhân hóa',
    description: 'Phân tích điểm yếu và đề xuất nội dung ôn tập phù hợp.',
    icon: 'Target',
  },
]
