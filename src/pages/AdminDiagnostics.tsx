import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Header } from '@/components/Header'
import { 
  Activity,
  Users,
  Shield,
  AlertTriangle,
  CheckCircle,
  RefreshCw
} from 'lucide-react'
import { toast } from 'react-hot-toast'

interface DiagnosticStatus {
  timestamp: string
  system: string
  auth: {
    total_users: number
    confirmed_users: number
    unconfirmed_users: number
  }
  profiles: {
    total: number
    sample: Array<{ id: string; email: string; display_name: string }>
  }
  bands: {
    total: number
    with_shared_password: number
    sample: Array<{ id: string; name: string; shared_password: string | null }>
  }
  band_members: {
    total: number
    sample: Array<{ id: string; band_id: string; user_id: string; role: string }>
  }
  rls: string
  recommendations: string[]
}

export function AdminDiagnostics() {
  const { user } = useAuth()
  const [status, setStatus] = useState<DiagnosticStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runDiagnostics = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const { data, error: diagError } = await supabase.functions.invoke('diag-status')
      
      if (diagError) throw diagError
      
      setStatus(data)
      toast.success('Diagnostics completed successfully')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to run diagnostics'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    runDiagnostics()
  }, [])

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600">You must be logged in to access this page.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">System Diagnostics</h1>
              <p className="text-gray-600 mt-2">Monitor system health and troubleshoot authentication issues</p>
            </div>
            <button
              onClick={runDiagnostics}
              disabled={loading}
              className="btn-primary flex items-center space-x-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Running...' : 'Run Diagnostics'}</span>
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <span className="text-red-800 font-medium">Error</span>
              </div>
              <p className="text-red-700 mt-2">{error}</p>
            </div>
          )}

          {status && (
            <div className="space-y-6">
              {/* System Status */}
              <div className="card">
                <div className="flex items-center space-x-2 mb-4">
                  <Activity className="h-5 w-5 text-blue-500" />
                  <h2 className="text-xl font-semibold">System Status</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{status.auth.total_users}</div>
                    <div className="text-sm text-gray-600">Total Users</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{status.auth.confirmed_users}</div>
                    <div className="text-sm text-gray-600">Confirmed Users</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">{status.auth.unconfirmed_users}</div>
                    <div className="text-sm text-gray-600">Unconfirmed Users</div>
                  </div>
                </div>
              </div>

              {/* Profiles Status */}
              <div className="card">
                <div className="flex items-center space-x-2 mb-4">
                  <Users className="h-5 w-5 text-green-500" />
                  <h2 className="text-xl font-semibold">Profiles Status</h2>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-semibold">{status.profiles.total} Profiles</div>
                    <div className="text-sm text-gray-600">
                      {status.profiles.total === status.auth.total_users ? (
                        <span className="text-green-600">✓ All users have profiles</span>
                      ) : (
                        <span className="text-red-600">⚠ Missing profiles: {status.auth.total_users - status.profiles.total}</span>
                      )}
                    </div>
                  </div>
                  {status.profiles.sample.length > 0 && (
                    <div className="text-sm text-gray-600">
                      Sample: {status.profiles.sample.map(p => p.display_name).join(', ')}
                    </div>
                  )}
                </div>
              </div>

              {/* Bands Status */}
              <div className="card">
                <div className="flex items-center space-x-2 mb-4">
                  <Shield className="h-5 w-5 text-purple-500" />
                  <h2 className="text-xl font-semibold">Bands Status</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-lg font-semibold">{status.bands.total} Bands</div>
                    <div className="text-sm text-gray-600">
                      {status.bands.with_shared_password} with shared passwords
                    </div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{status.band_members.total} Band Members</div>
                    <div className="text-sm text-gray-600">Total memberships</div>
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              {status.recommendations.length > 0 && (
                <div className="card">
                  <div className="flex items-center space-x-2 mb-4">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    <h2 className="text-xl font-semibold">Recommendations</h2>
                  </div>
                  <ul className="space-y-2">
                    {status.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-yellow-500 mt-1">•</span>
                        <span className="text-gray-700">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Last Updated */}
              <div className="text-center text-sm text-gray-500">
                Last updated: {new Date(status.timestamp).toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
