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
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      <header className="shadow-sm" style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Logo size="md" />
            <div className="flex items-center space-x-4">
              <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Welcome, {user?.user_metadata?.display_name || user?.email}
              </span>
              <button
                onClick={() => navigate('/profile')}
                className="transition-colors"
                style={{ color: 'var(--color-text-secondary)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-text)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-secondary)'}
                title="Profile Settings"
              >
                <User className="h-5 w-5" />
              </button>
              <button
                onClick={handleSignOut}
                className="transition-colors"
                style={{ color: 'var(--color-text-secondary)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-text)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-secondary)'}
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
          <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-text)' }}>Your Bands</h2>
          

          
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
                      <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
                        {band.name}
                      </h3>
                      <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                        {band.role === 'admin' ? 'Admin' : 'Member'}
                      </p>
                    </div>
                    <Users className="h-6 w-6" style={{ color: 'var(--color-text-secondary)' }} />
                  </div>
                  
                  <div className="mt-4">
                    <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      Invite Code: <span className="font-mono font-semibold">{band.invite_code}</span>
                    </p>
                  </div>
                </div>
              ))}
              
              <div
                onClick={() => navigate('/band-setup')}
                className="card border-2 border-dashed hover:shadow-lg transition-all cursor-pointer flex items-center justify-center min-h-[150px]"
                style={{ 
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-surface-2)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-primary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border)'
                }}
              >
                <div className="text-center">
                  <Plus className="h-8 w-8 mx-auto mb-2" style={{ color: 'var(--color-text-secondary)' }} />
                  <p style={{ color: 'var(--color-text-secondary)' }}>Create or Join Band</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--color-text-secondary)' }} />
              <p className="mb-6" style={{ color: 'var(--color-text-secondary)' }}>You're not part of any bands yet</p>
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