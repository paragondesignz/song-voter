import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Music, CheckCircle, XCircle } from 'lucide-react'

export function VerifyEmail() {
  const [verificationState, setVerificationState] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const navigate = useNavigate()
  const { user } = useAuth()

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // Get the URL hash parameters
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        const type = hashParams.get('type')

        if (type === 'signup' && accessToken && refreshToken) {
          // Set the session with the tokens from the URL
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })

          if (error) {
            setErrorMessage(error.message)
            setVerificationState('error')
          } else {
            setVerificationState('success')
            // Redirect to dashboard after a short delay
            setTimeout(() => {
              navigate('/dashboard')
            }, 3000)
          }
        } else {
          setErrorMessage('Invalid verification link')
          setVerificationState('error')
        }
      } catch (error: unknown) {
        setErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred')
        setVerificationState('error')
      }
    }

    // Only run verification if there are hash parameters
    if (window.location.hash) {
      verifyEmail()
    } else if (user) {
      // If user is already logged in, redirect to dashboard
      navigate('/dashboard')
    } else {
      setErrorMessage('No verification parameters found')
      setVerificationState('error')
    }
  }, [navigate, user])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
        <div className="flex items-center justify-center mb-8">
          <Music className="h-12 w-12 text-primary-600" />
        </div>

        {verificationState === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Verifying Your Email</h2>
            <p className="text-gray-600">Please wait while we verify your email address...</p>
          </>
        )}

        {verificationState === 'success' && (
          <>
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Email Verified!</h2>
            <p className="text-gray-600 mb-4">
              Your email has been successfully verified. You're now logged in and will be redirected to your dashboard.
            </p>
            <div className="bg-green-50 rounded-lg p-4 mb-4">
              <p className="text-green-800 text-sm">
                🎵 Welcome to Rehearsalist! You can now create or join bands and start suggesting songs.
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-primary"
            >
              Go to Dashboard
            </button>
          </>
        )}

        {verificationState === 'error' && (
          <>
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Verification Failed</h2>
            <p className="text-gray-600 mb-4">
              {errorMessage || 'There was a problem verifying your email address.'}
            </p>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/register')}
                className="btn-primary w-full"
              >
                Try Signing Up Again
              </button>
              <button
                onClick={() => navigate('/login')}
                className="btn-secondary w-full"
              >
                Back to Login
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}