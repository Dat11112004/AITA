import { useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { User, Lock, Shield, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export function StudentProfile() {
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState({
    name: 'Nguyễn Văn Sinh Viên',
    email: 'student@example.com',
    studentId: 'SE180001',
    phone: '0123456789',
    address: 'Hà Nội, Việt Nam',
    major: 'Software Engineering',
  })

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const handleUpdateProfile = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      alert('Đã cập nhật thông tin thành công!')
    }, 1000)
  }

  const handleChangePassword = () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('Mật khẩu mới không khớp!')
      return
    }
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      alert('Đã đổi mật khẩu thành công!')
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    }, 1000)
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      <PageHeader
        title="Hồ sơ Sinh viên"
        description="Quản lý thông tin cá nhân và bảo mật tài khoản của bạn."
      />

      <div className="grid md:grid-cols-3 gap-6">
        
        {/* Left Col: Avatar & Basic Info */}
        <div className="md:col-span-1 space-y-6">
          <Card className="p-6 text-center border-slate-200 dark:border-slate-800 bg-white dark:bg-[#151821]">
            <div className="w-24 h-24 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto mb-4 border-4 border-white dark:border-[#151821] shadow-md">
              <span className="text-3xl font-black">{profile.name.charAt(0)}</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{profile.name}</h2>
            <p className="text-sm text-slate-500 font-mono mt-1">{profile.studentId}</p>
            <p className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded-full inline-block mt-3 dark:bg-brand-900/30 dark:text-brand-400">
              Chuyên ngành: {profile.major}
            </p>
          </Card>

          <Card className="p-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-[#151821] overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50">
              <Shield size={16} className="text-brand-600" /> Trạng thái tài khoản
            </div>
            <div className="p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Trạng thái:</span>
                <span className="font-bold text-emerald-600">Đang hoạt động</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Lần đăng nhập cuối:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">Hôm nay, 08:30 AM</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Col: Forms */}
        <div className="md:col-span-2 space-y-6">
          <Card className="p-6 border-slate-200 dark:border-slate-800 bg-white dark:bg-[#151821]">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-5 flex items-center gap-2">
              <User size={20} className="text-brand-600" /> Thông tin cơ bản
            </h3>
            <div className="grid sm:grid-cols-2 gap-5 mb-6">
              <Input 
                label="Họ và Tên" 
                value={profile.name} 
                onChange={e => setProfile({...profile, name: e.target.value})} 
              />
              <Input 
                label="Email (Không thể sửa)" 
                value={profile.email} 
                disabled 
              />
              <Input 
                label="Số điện thoại" 
                value={profile.phone} 
                onChange={e => setProfile({...profile, phone: e.target.value})}
              />
              <Input 
                label="Địa chỉ" 
                value={profile.address} 
                onChange={e => setProfile({...profile, address: e.target.value})}
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleUpdateProfile} disabled={loading} className="bg-brand-600 hover:bg-brand-700 text-white w-full sm:w-auto">
                {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
                Lưu Thay Đổi
              </Button>
            </div>
          </Card>

          <Card className="p-6 border-slate-200 dark:border-slate-800 bg-white dark:bg-[#151821]">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-5 flex items-center gap-2">
              <Lock size={20} className="text-brand-600" /> Đổi mật khẩu
            </h3>
            <div className="grid gap-5 mb-6 max-w-md">
              <Input 
                type="password" 
                label="Mật khẩu hiện tại" 
                value={passwordForm.currentPassword}
                onChange={e => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
              />
              <Input 
                type="password" 
                label="Mật khẩu mới" 
                value={passwordForm.newPassword}
                onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})}
              />
              <Input 
                type="password" 
                label="Xác nhận mật khẩu mới" 
                value={passwordForm.confirmPassword}
                onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
              />
            </div>
            <div className="flex justify-start">
              <Button onClick={handleChangePassword} disabled={loading || !passwordForm.newPassword} variant="outline" className="border-slate-200 w-full sm:w-auto">
                {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
                Cập nhật Mật khẩu
              </Button>
            </div>
          </Card>
        </div>

      </div>
    </div>
  )
}
