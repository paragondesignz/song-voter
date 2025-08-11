import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

export function DebugAuth() {
  const { user, session } = useAuth()
  const [sessionData, setSessionData] = useState<any>(null)
  const [testQuery, setTestQuery] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [fixResult, setFixResult] = useState<any>(null)

  useEffect(() => {
    // Get current session from Supabase
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        setError(`Session error: ${error.message}`)
      } else {
        setSessionData(data.session)
      }
    })

    // Test multiple queries
    const runTests = async () => {
      // Test profiles
      const profilesResult = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id || '')
        
      // Test bands (all bands)
      const bandsResult = await supabase
        .from('bands')
        .select('*')
        
      // Test band members (simple)
      const membersResult = await supabase
        .from('band_members')
        .select('*')
        .eq('user_id', user?.id || '')
        
      // Test band members with join (this is failing)
      const membersJoinResult = await supabase
        .from('band_members')
        .select(`
          band_id,
          role,
          bands (
            id,
            name,
            invite_code,
            created_by,
            created_at
          )
        `)
        .eq('user_id', user?.id || '')
        
      setTestQuery({
        profiles: profilesResult,
        bands: bandsResult,
        members: membersResult,
        membersJoin: membersJoinResult
      })
    }
    
    if (user) {
      runTests()
    }
  }, [user])

  const fixUserData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setFixResult({ error: 'No session' })
        return
      }

      const { data, error } = await supabase.functions.invoke('fix-user-data', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      })

      if (error) {
        setFixResult({ error: error.message })
      } else {
        setFixResult(data)
        // Reload page to refresh data
        setTimeout(() => window.location.reload(), 1000)
      }
    } catch (err: any) {
      setFixResult({ error: err.message })
    }
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded-lg max-w-md text-xs font-mono opacity-90 z-50">
      <div className="mb-2 font-bold">🔍 Debug Auth</div>
      
      <div className="mb-2">
        <strong>User ID:</strong> {user?.id || 'null'}
      </div>
      
      <div className="mb-2">
        <strong>Session:</strong> {session ? 'Active' : 'None'}
      </div>
      
      <div className="mb-2">
        <strong>Session Token:</strong> {sessionData?.access_token ? `${sessionData.access_token.substring(0, 20)}...` : 'null'}
      </div>
      
      <div className="mb-2">
        <strong>Auth Role:</strong> {sessionData?.user?.role || 'null'}
      </div>
      
      <div className="mb-2">
        <strong>Test Query:</strong> {JSON.stringify(testQuery, null, 2)}
      </div>
      
      {error && (
        <div className="text-red-400">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      <button
        onClick={fixUserData}
        className="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white text-xs"
      >
        🔧 Fix User Data
      </button>
      
      {fixResult && (
        <div className="mt-2 text-xs">
          <strong>Fix Result:</strong>
          <pre className="text-xs overflow-auto max-h-32">
            {JSON.stringify(fixResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}