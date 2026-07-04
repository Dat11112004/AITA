import { useState, useRef, useEffect } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Save, UserCircle, KeyRound, Mail, Camera, Loader2, Shield } from 'lucide-react'
import { useAuth } from '@/store/AuthContext'
import { api } from '@/lib/api'

export function Profile() {
  const { user } = useAuth()
  
  const [profile, setProfile] = useState({
    fullName: '',
    phone: '',
  })
  
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user) {
      setProfile({
        fullName: user.fullName || user.name || '',
        phone: (user as any).phone || '', // Assuming phone might be in AuthUser or we just leave empty
      })
      if ((user as any).avatar) {
        setAvatarPreview(`${import.meta.env.VITE_API_URL || '/api'}`.replace('/api', '') + (user as any).avatar)
      }
    }
  }, [user])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    try {
      const formData = new FormData()
      formData.append('fullName', profile.fullName)
      formData.append('phone', profile.phone)
      if (avatarFile) {
        formData.append('avatar', avatarFile)
      }
      
      await api.updateProfile(formData)
      alert('Cập nhật thông tin cá nhân thành công!')
      window.location.reload() // Reload to update context user
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
      await api.changePassword({
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword
      })
      alert('Đổi mật khẩu thành công!')
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
    } catch (e: any) {
      alert(e.message || 'Lỗi đổi mật khẩu')
    } finally {
      setSavingPassword(false)
    }
  }

  if (!user) return null

  const getRoleLabel = (role: string) => {
    switch(role) {
      case 'admin': return 'Quản trị viên'
      case 'lecturer': return 'Giảng viên'
      case 'student': return 'Sinh viên'
      default: return role
    }
  }

  return (
    <div className="space-y-8 p-6 max-w-5xl mx-auto animate-in fade-in duration-500">
      <PageHeader 
        title="Hồ sơ Cá nhân" 
        description="Quản lý thông tin cá nhân và bảo mật tài khoản của bạn."
        breadcrumbs={[{ label: 'Hồ sơ' }]} 
      />

      <div className="grid md:grid-cols-3 gap-8">
        
        {/* Left Column: Avatar & Basic Info */}
        <div className="md:col-span-1 space-y-6">
          <Card className="p-6 flex flex-col items-center text-center bg-gradient-to-b from-brand-50 to-white dark:from-slate-800 dark:to-slate-900 border-brand-100 dark:border-slate-800">
            <div 
              className="relative mb-4 group cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-black">{user.fullName?.charAt(0) || user.name?.charAt(0) || user.email?.charAt(0)}</span>
                )}
              </div>
              <div className="absolute inset-0 bg-black/40 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="text-white mb-1" size={24} />
                <span className="text-xs text-white font-medium">Đổi ảnh</span>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/jpeg, image/png, image/webp, image/gif" 
                onChange={handleAvatarChange}
              />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{user.fullName || user.name}</h3>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-center gap-1">
              <Mail size={14} /> {user.email}
            </p>
            <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
              {getRoleLabel(user.role)}
            </div>
          </Card>
          
          <Card className="p-0 border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50">
              <Shield size={16} className="text-brand-600" /> Trạng thái tài khoản
            </div>
            <div className="p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Trạng thái:</span>
                <span className="font-bold text-emerald-600">Đang hoạt động</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Vai trò hệ thống:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{user.role.toUpperCase()}</span>
              </div>
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
                {savingProfile ? <><Loader2 size={16} className="animate-spin mr-2"/> Đang lưu...</> : <><Save size={16} className="mr-2"/> Lưu thay đổi</>}
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
                value={user.email}
                disabled
              />
              <Input 
                label="Số điện thoại" 
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
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
                {savingPassword ? <><Loader2 size={16} className="animate-spin mr-2"/> Đang cập nhật...</> : 'Cập nhật mật khẩu'}
              </Button>
            </div>
            <div className="p-6 space-y-4 max-w-md">
              <Input 
                type="password"
                label="Mật khẩu hiện tại" 
                value={passwordForm.oldPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
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
