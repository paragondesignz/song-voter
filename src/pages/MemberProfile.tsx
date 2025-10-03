import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useBand, useUserBandRole } from '@/hooks/useBands'
import { supabase } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import { Header } from '@/components/Header'
import {
  User,
  Mail,
  Lock,
  Camera,
  Save,
  Shield
} from 'lucide-react'

export function MemberProfile() {
  const { bandId } = useParams<{ bandId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: band } = useBand(bandId!)
  const { data: userRole } = useUserBandRole(bandId!)
  
  const [displayName, setDisplayName] = useState(user?.user_metadata?.display_name || '')
  // const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(user?.user_metadata?.avatar_url || '')
  const [isUpdating, setIsUpdating] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  
  const isAdmin = userRole === 'admin'

  const handleUpdateProfile = async () => {
    setIsUpdating(true)
    try {
      // Update display name in profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          display_name: displayName,
          avatar_url: avatarUrl 
        })
        .eq('id', user?.id)
      
      if (profileError) throw profileError
      
      // Update user metadata
      const { error: metadataError } = await supabase.auth.updateUser({
        data: { 
          display_name: displayName,
          avatar_url: avatarUrl
        }
      })
      
      if (metadataError) throw metadataError
      
      // Refresh handled by auth state change
      toast.success('Profile updated successfully!')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to update profile')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleUpdatePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }
    
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    
    setIsUpdating(true)
    try {
      // For band members, we don't require current password verification
      // since they may have been created with a shared password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })
      
      if (error) throw error
      
      toast.success('Password updated successfully!')
      // setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to update password')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB')
      return
    }
    
    setIsUploadingAvatar(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`
      
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          upsert: true
        })
      
      if (uploadError) throw uploadError
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)
      
      setAvatarUrl(publicUrl)
      toast.success('Avatar uploaded successfully!')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload avatar')
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center">
          <User className="h-6 w-6 text-primary-600 mr-3" />
          <div>
            <h1 className="text-lg font-semibold text-gray-900">My Profile</h1>
            <p className="text-xs text-gray-500">{band?.name}</p>
          </div>
        </div>
        {/* Role Badge */}
        {isAdmin && (
          <div className="mb-6">
            <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
              <Shield className="w-4 h-4 mr-1" />
              Band Admin
            </div>
          </div>
        )}

        {/* Profile Information */}
        <div className="card mb-8">
          <h2 className="text-xl font-semibold mb-6">Profile Information</h2>
          
          {/* Avatar Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Profile Picture
            </label>
            <div className="flex items-center space-x-4">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div className="w-20 h-20 bg-gray-300 rounded-full flex items-center justify-center">
                  <User className="w-10 h-10 text-gray-500" />
                </div>
              )}
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={isUploadingAvatar}
                  className="hidden"
                />
                <span className="btn-secondary text-sm flex items-center">
                  <Camera className="w-4 h-4 mr-1" />
                  {isUploadingAvatar ? 'Uploading...' : 'Change Photo'}
                </span>
              </label>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="input-field pl-10 bg-gray-100 cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Display Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="input-field pl-10"
                  placeholder="Your display name"
                />
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={handleUpdateProfile}
                disabled={isUpdating}
                className="btn-primary"
              >
                <Save className="w-4 h-4 mr-1" />
                {isUpdating ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-6">Change Password</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-field pl-10"
                  placeholder="Enter new password (min 6 characters)"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field pl-10"
                  placeholder="Confirm new password"
                />
              </div>
            </div>
            

            
            <div className="flex justify-end">
              <button
                onClick={handleUpdatePassword}
                disabled={isUpdating || !newPassword || !confirmPassword}
                className="btn-primary"
              >
                <Lock className="w-4 h-4 mr-1" />
                {isUpdating ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </div>
        </div>

        {/* Admin Actions */}
        {isAdmin && (
          <div className="mt-8 text-center">
            <button
              onClick={() => navigate(`/band/${bandId}/members`)}
              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              Manage Band Members →
            </button>
          </div>
        )}
      </main>
    </div>
  )
}