import { useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Save, UserCircle, KeyRound, Mail, Camera } from 'lucide-react'

export function LecturerProfile() {
  const [profile, setProfile] = useState({
    fullName: 'Tiến sĩ Nguyễn Văn A',
    email: 'nguyenvana@aita.edu.vn',
    phone: '0901234567',
    department: 'Công nghệ thông tin',
  })
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    try {
      // Mock API call
      await new Promise(r => setTimeout(r, 1000))
      alert('Cập nhật thông tin cá nhân thành công!')
    } catch (e: any) {
      alert(e.message || 'Lỗi khi lưu thông tin')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('Mật khẩu mới không khớp!')
      return
    }
    setSavingPassword(true)
    try {
      // Mock API call
      await new Promise(r => setTimeout(r, 1000))
      alert('Đổi mật khẩu thành công!')
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (e: any) {
      alert(e.message || 'Lỗi đổi mật khẩu')
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="space-y-8 p-6 max-w-5xl mx-auto animate-in fade-in duration-500">
      <PageHeader 
        title="Hồ sơ Cá nhân" 
        breadcrumbs={[{ label: 'Giảng viên', path: '/lecturer' }, { label: 'Hồ sơ' }]} 
      />

      <div className="grid md:grid-cols-3 gap-8">
        
        {/* Left Column: Avatar & Basic Info */}
        <div className="md:col-span-1 space-y-6">
          <Card className="p-6 flex flex-col items-center text-center bg-gradient-to-b from-brand-50 to-white dark:from-slate-800 dark:to-slate-900 border-brand-100 dark:border-slate-800">
            <div className="relative mb-4 group cursor-pointer">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-lg">
                <img src="https://i.pravatar.cc/150?u=a042581f4e29026024d" alt="Avatar" className="w-full h-full object-cover" />
              </div>
              <div className="absolute inset-0 bg-black/40 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="text-white mb-1" size={24} />
                <span className="text-xs text-white font-medium">Đổi ảnh</span>
              </div>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{profile.fullName}</h3>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-center gap-1">
              <Mail size={14} /> {profile.email}
            </p>
            <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
              Giảng viên - {profile.department}
            </div>
          </Card>
        </div>

        {/* Right Column: Forms */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Profile Form */}
          <Card className="overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCircle className="text-brand-500 w-5 h-5 ml-1" />
                <CardHeader title="Thông tin Chung" />
              </div>
              <Button onClick={handleSaveProfile} disabled={savingProfile} size="sm" className="bg-brand-600 hover:bg-brand-700 text-white">
                {savingProfile ? 'Đang lưu...' : <><Save size={16} className="mr-2"/> Lưu thay đổi</>}
              </Button>
            </div>
            <div className="p-6 grid sm:grid-cols-2 gap-5">
              <Input 
                label="Họ và Tên" 
                value={profile.fullName}
                onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
              />
              <Input 
                label="Email hệ thống (Không thể đổi)" 
                value={profile.email}
                disabled
              />
              <Input 
                label="Số điện thoại" 
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              />
              <Input 
                label="Khoa / Bộ môn" 
                value={profile.department}
                disabled
              />
            </div>
          </Card>

          {/* Password Form */}
          <Card className="overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="text-amber-500 w-5 h-5 ml-1" />
                <CardHeader title="Đổi Mật Khẩu" />
              </div>
              <Button onClick={handleChangePassword} disabled={savingPassword || !passwordForm.newPassword} size="sm" variant="outline" className="text-amber-700 border-amber-200 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-900 dark:hover:bg-amber-900/30">
                {savingPassword ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
              </Button>
            </div>
            <div className="p-6 space-y-4 max-w-md">
              <Input 
                type="password"
                label="Mật khẩu hiện tại" 
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              />
              <Input 
                type="password"
                label="Mật khẩu mới" 
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              />
              <Input 
                type="password"
                label="Nhập lại mật khẩu mới" 
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              />
            </div>
          </Card>
          
        </div>
      </div>
    </div>
  )
}
