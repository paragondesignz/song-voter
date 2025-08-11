import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

export function DebugAuth() {
  const { user, session } = useAuth()
  const [sessionData, setSessionData] = useState<any>(null)
  const [testQuery, setTestQuery] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Get current session from Supabase
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        setError(`Session error: ${error.message}`)
      } else {
        setSessionData(data.session)
      }
    })

    // Test a simple query
    supabase
      .from('profiles')
      .select('*')
      .limit(1)
      .then(({ data, error }) => {
        if (error) {
          setTestQuery({ error: error.message, code: error.code })
        } else {
          setTestQuery({ success: true, data })
        }
      })
  }, [])

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
    </div>
  )
}