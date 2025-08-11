import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useProfile, useUpdateProfile, useUpdatePassword, useDeleteAccount, useUploadAvatar } from '@/hooks/useProfile'
import { 
  ArrowLeft, 
  User,
  Mail,
  Camera,
  Key,
  Trash2,
  Save,
  Eye,
  EyeOff,
  AlertTriangle
} from 'lucide-react'
import { useForm } from 'react-hook-form'

interface ProfileFormData {
  display_name: string
}

interface PasswordFormData {
  current_password: string
  new_password: string
  confirm_password: string
}

export function Profile() {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  // const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  
  const { data: profile, isLoading } = useProfile()
  const updateProfile = useUpdateProfile()
  const updatePassword = useUpdatePassword()
  const deleteAccount = useDeleteAccount()
  const uploadAvatar = useUploadAvatar()
  
  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors, isDirty: isProfileDirty }
  } = useForm<ProfileFormData>({
    defaultValues: {
      display_name: profile?.display_name || ''
    },
    values: {
      display_name: profile?.display_name || ''
    }
  })

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    watch,
    reset: resetPasswordForm
  } = useForm<PasswordFormData>()

  const watchNewPassword = watch('new_password')

  const handleProfileUpdate = async (data: ProfileFormData) => {
    await updateProfile.mutateAsync(data)
  }

  const handlePasswordUpdate = async (data: PasswordFormData) => {
    await updatePassword.mutateAsync(data.new_password)
    resetPasswordForm()
    setShowPasswordForm(false)
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAvatarUpload = async () => {
    if (avatarFile) {
      await uploadAvatar.mutateAsync(avatarFile)
      setAvatarFile(null)
      setAvatarPreview(null)
    }
  }

  const handleDeleteAccount = async () => {
    await deleteAccount.mutateAsync()
    await signOut()
    navigate('/login')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={() => navigate('/dashboard')}
              className="mr-4 text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <User className="h-6 w-6 text-primary-600 mr-3" />
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Profile Settings</h1>
              <p className="text-xs text-gray-500">Manage your account settings and preferences</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Profile Information */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Profile Information</h2>
            </div>

            {/* Avatar Section */}
            <div className="flex items-center space-x-6 mb-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar preview"
                      className="w-full h-full object-cover"
                    />
                  ) : profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Profile avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                </div>
                <label className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-lg cursor-pointer hover:bg-gray-50">
                  <Camera className="w-4 h-4 text-gray-600" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="sr-only"
                  />
                </label>
              </div>
              
              {avatarFile && (
                <div className="flex space-x-2">
                  <button
                    onClick={handleAvatarUpload}
                    disabled={uploadAvatar.isPending}
                    className="btn-primary text-sm"
                  >
                    {uploadAvatar.isPending ? 'Uploading...' : 'Save Avatar'}
                  </button>
                  <button
                    onClick={() => {
                      setAvatarFile(null)
                      setAvatarPreview(null)
                    }}
                    className="btn-secondary text-sm"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <form onSubmit={handleProfileSubmit(handleProfileUpdate)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Name
                </label>
                <input
                  {...registerProfile('display_name', {
                    required: 'Display name is required',
                    minLength: {
                      value: 2,
                      message: 'Display name must be at least 2 characters'
                    }
                  })}
                  className="input-field"
                  placeholder="Your display name"
                />
                {profileErrors.display_name && (
                  <p className="mt-1 text-sm text-red-600">{profileErrors.display_name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={profile?.email || ''}
                    disabled
                    className="input-field bg-gray-50 text-gray-500 cursor-not-allowed pr-10"
                  />
                  <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Email cannot be changed. Contact support if you need to update your email.
                </p>
              </div>

              {isProfileDirty && (
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={updateProfile.isPending}
                    className="btn-primary"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Password Section */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Password & Security</h2>
              <button
                onClick={() => setShowPasswordForm(!showPasswordForm)}
                className="btn-secondary text-sm"
              >
                <Key className="w-4 h-4 mr-2" />
                Change Password
              </button>
            </div>

            {showPasswordForm && (
              <form onSubmit={handlePasswordSubmit(handlePasswordUpdate)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      {...registerPassword('new_password', {
                        required: 'New password is required',
                        minLength: {
                          value: 6,
                          message: 'Password must be at least 6 characters'
                        }
                      })}
                      type={showNewPassword ? 'text' : 'password'}
                      className="input-field pr-10"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-5 h-5 text-gray-400" />
                      ) : (
                        <Eye className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {passwordErrors.new_password && (
                    <p className="mt-1 text-sm text-red-600">{passwordErrors.new_password.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      {...registerPassword('confirm_password', {
                        required: 'Please confirm your new password',
                        validate: value =>
                          value === watchNewPassword || 'Passwords do not match'
                      })}
                      type={showConfirmPassword ? 'text' : 'password'}
                      className="input-field pr-10"
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5 text-gray-400" />
                      ) : (
                        <Eye className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {passwordErrors.confirm_password && (
                    <p className="mt-1 text-sm text-red-600">{passwordErrors.confirm_password.message}</p>
                  )}
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordForm(false)
                      resetPasswordForm()
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updatePassword.isPending}
                    className="btn-primary"
                  >
                    {updatePassword.isPending ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Danger Zone */}
          <div className="card border-red-200">
            <div className="flex items-center mb-6">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
              <h2 className="text-xl font-semibold text-red-600">Danger Zone</h2>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-medium text-red-800 mb-2">Delete Account</h3>
              <p className="text-sm text-red-700 mb-4">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="btn-secondary text-red-600 border-red-300 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Account
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-red-800">
                    Are you absolutely sure? This will permanently delete your account and all data.
                  </p>
                  <div className="flex space-x-3">
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleteAccount.isPending}
                      className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 text-sm"
                    >
                      {deleteAccount.isPending ? 'Deleting...' : 'Yes, delete my account'}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="btn-secondary text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}