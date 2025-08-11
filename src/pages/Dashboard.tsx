import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useUserBands } from '@/hooks/useBands'
import { Users, Plus, LogOut, User } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Logo } from '@/components/Logo'

export function Dashboard() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { data: bands, isLoading } = useUserBands()

  useEffect(() => {
    if (!isLoading && bands) {
      if (bands.length === 1) {
        // Auto-redirect to the single band
        navigate(`/band/${bands[0].id}`)
      } else if (bands.length === 0) {
        navigate('/band-setup')
      }
    }
  }, [bands, isLoading, navigate])

  const handleSignOut = async () => {
    try {
      await signOut()
      toast.success('Signed out successfully')
      navigate('/login')
    } catch (error) {
      toast.error('Failed to sign out')
    }
  }

  const handleBandClick = (bandId: string) => {
    navigate(`/band/${bandId}`)
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
          <div className="flex justify-between items-center h-16">
            <Logo size="md" />
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {user?.user_metadata?.display_name || user?.email}
              </span>
              <button
                onClick={() => navigate('/profile')}
                className="text-gray-500 hover:text-gray-700"
                title="Profile Settings"
              >
                <User className="h-5 w-5" />
              </button>
              <button
                onClick={handleSignOut}
                className="text-gray-500 hover:text-gray-700"
                title="Sign Out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Bands</h2>
          
          {/* Instructions */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">How to use your dashboard</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>• <strong>Click on any band card</strong> to access that band's dashboard</p>
                  <p>• <strong>Use the profile button</strong> (👤) to update your account settings</p>
                  <p>• <strong>Sign out</strong> when you're done using the app</p>
                  <p>• If you don't see any bands, you'll be redirected to create or join one</p>
                </div>
              </div>
            </div>
          </div>
          
          {bands && bands.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bands.map((band) => (
                <div
                  key={band.id}
                  onClick={() => handleBandClick(band.id)}
                  className="card hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {band.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {band.role === 'admin' ? 'Admin' : 'Member'}
                      </p>
                    </div>
                    <Users className="h-6 w-6 text-gray-400" />
                  </div>
                  
                  <div className="mt-4">
                    <p className="text-xs text-gray-500">
                      Invite Code: <span className="font-mono font-semibold">{band.invite_code}</span>
                    </p>
                  </div>
                </div>
              ))}
              
              <div
                onClick={() => navigate('/band-setup')}
                className="card border-2 border-dashed border-gray-300 hover:border-primary-400 hover:shadow-lg transition-all cursor-pointer flex items-center justify-center min-h-[150px]"
              >
                <div className="text-center">
                  <Plus className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">Create or Join Band</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-6">You're not part of any bands yet</p>
              <button
                onClick={() => navigate('/band-setup')}
                className="btn-primary"
              >
                Create or Join a Band
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}