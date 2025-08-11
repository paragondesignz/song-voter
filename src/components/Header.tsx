import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { useUserBands } from '@/hooks/useBands'
import { Logo } from '@/components/Logo'
import { 
  Plus,
  User,
  LogOut,
  ChevronDown
} from 'lucide-react'
import { toast } from 'react-hot-toast'

interface HeaderProps {
  title?: string
  subtitle?: string
}

export function Header({ title, subtitle }: HeaderProps) {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { data: bands } = useUserBands()
  const { data: profile } = useProfile()
  const [showDropdown, setShowDropdown] = useState(false)
  
  const userBand = bands?.[0] // Since users only have one band

  const handleSignOut = async () => {
    try {
      await signOut()
      toast.success('Signed out successfully')
      navigate('/login')
    } catch (error) {
      toast.error('Failed to sign out')
    }
  }

  const handleSuggestSong = () => {
    if (userBand) {
      navigate(`/band/${userBand.id}/search`)
    }
  }

  const handleProfile = () => {
    setShowDropdown(false)
    navigate('/profile')
  }

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Title */}
          <div className="flex items-center">
            <div
              onClick={() => userBand ? navigate(`/band/${userBand.id}`) : navigate('/dashboard')}
              className="cursor-pointer mr-4"
            >
              <Logo size="md" />
            </div>
            {(title || subtitle) && (
              <div>
                {title && <h1 className="text-lg font-semibold text-gray-900">{title}</h1>}
                {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
              </div>
            )}
          </div>

          {/* Right side navigation */}
          <div className="flex items-center space-x-3">
            {/* Suggest Song Button */}
            {userBand && (
              <button
                onClick={handleSuggestSong}
                className="btn-primary text-sm"
              >
                <Plus className="h-4 w-4 mr-1" />
                Suggest Song
              </button>
            )}

            {/* User Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  {profile?.avatar_url || user?.user_metadata?.avatar_url ? (
                    <img
                      src={profile?.avatar_url || (user?.user_metadata?.avatar_url as string)}
                      alt="Profile"
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-4 h-4 text-gray-500" />
                  )}
                </div>
                <span className="text-sm font-medium hidden sm:block">
                  {user?.user_metadata?.display_name || user?.email?.split('@')[0]}
                </span>
                <ChevronDown className="h-4 w-4" />
              </button>

              {/* Dropdown Menu */}
              {showDropdown && (
                <div className="absolute right-0 top-10 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 min-w-48">
                  <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-100">
                    {user?.email}
                  </div>
                  
                  <button
                    onClick={handleProfile}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center"
                  >
                    <User className="w-4 h-4 mr-2 text-gray-400" />
                    Profile Settings
                  </button>
                  
                  <button
                    onClick={handleSignOut}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center text-red-600"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Click outside to close dropdown */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </header>
  )
}