import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
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
  actions?: React.ReactNode
}

export function Header({ actions }: HeaderProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, signOut } = useAuth()
  const { data: bands } = useUserBands()
  const { data: profile } = useProfile()
  const [showDropdown, setShowDropdown] = useState(false)
  
  const userBand = bands?.[0] // Since users only have one band

  // Helper function to check if a route is active
  const isActiveRoute = (path: string) => {
    return location.pathname.includes(path)
  }

  // Helper function to get button classes with active state
  const getButtonClasses = (isActive: boolean) => {
    const baseClasses = "btn-secondary text-sm transition-all duration-200 hover:shadow-lg hover:shadow-blue-400/30 hover:border-blue-300"
    if (isActive) {
      return `${baseClasses} border-blue-400 shadow-md shadow-blue-400/20`
    }
    return baseClasses
  }

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

  const handleDashboard = () => {
    if (userBand) {
      navigate(`/band/${userBand.id}`)
    }
  }

  const handleProfile = () => {
    setShowDropdown(false)
    navigate('/profile')
  }

  const handleAnalytics = () => {
    if (userBand) {
      navigate(`/band/${userBand.id}/voting-analytics`)
    }
  }

  const handleRehearsals = () => {
    if (userBand) {
      navigate(`/band/${userBand.id}/rehearsals`)
    }
  }

  return (
    <header className="bg-[var(--color-surface)]/90 backdrop-blur border-b border-[var(--color-border)]">
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

          </div>

          {/* Right side navigation */}
          <div className="flex items-center space-x-3">
            {actions}
            {/* Dashboard Button */}
            {userBand && (
              <button
                onClick={handleDashboard}
                className={getButtonClasses(isActiveRoute('/'))}
              >
                Dashboard
              </button>
            )}
            {/* Analytics Button */}
            {userBand && (
              <button
                onClick={handleAnalytics}
                className={getButtonClasses(isActiveRoute('/voting-analytics'))}
              >
                Analytics
              </button>
            )}
            {/* Rehearsals Button */}
            {userBand && (
              <button
                onClick={handleRehearsals}
                className={getButtonClasses(isActiveRoute('/rehearsals'))}
              >
                Rehearsals
              </button>
            )}

            {/* Suggest Song Button */}
            {userBand && (
              <button
                onClick={handleSuggestSong}
                className="btn-primary text-sm flex items-center"
              >
                <Plus className="h-4 w-4 mr-1" />
                Suggest Song
              </button>
            )}

            {/* User Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center space-x-2 text-secondary hover:text-white transition-colors"
              >
                <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center overflow-hidden ring-1 ring-gray-700/50">
                  {profile?.avatar_url || user?.user_metadata?.avatar_url ? (
                    <img
                      src={profile?.avatar_url || (user?.user_metadata?.avatar_url as string)}
                      alt="Profile"
                      className="w-8 h-8 object-cover"
                    />
                  ) : (
                    <User className="w-4 h-4 text-secondary" />
                  )}
                </div>
                <span className="text-sm font-medium hidden sm:block">
                  {user?.user_metadata?.display_name || user?.email?.split('@')[0]}
                </span>
                <ChevronDown className="h-4 w-4" />
              </button>

              {/* Dropdown Menu */}
              {showDropdown && (
                <div className="absolute right-0 top-10 bg-[var(--color-surface)] rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.35)] border border-gray-700/40 py-2 z-50 min-w-48">
                  <div className="px-4 py-2 text-xs text-secondary border-b border-gray-700/40">
                    {user?.email}
                  </div>
                  
                  <button
                    onClick={handleProfile}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-white/5 flex items-center"
                  >
                    <User className="w-4 h-4 mr-2 text-secondary" />
                    Profile Settings
                  </button>
                  
                  <button
                    onClick={handleSignOut}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-white/5 flex items-center text-red-400"
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