import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { useAuth } from '@/context/AuthContext'
import { Logo } from '@/components/Logo'

interface RegisterForm {
  email: string
  password: string
  confirmPassword: string
  displayName: string
}

export function Register() {
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterForm>()

  const password = watch('password')

  const onSubmit = async (data: RegisterForm) => {
    try {
      setLoading(true)
      await signUp(data.email, data.password, data.displayName)
      toast.success('Registration successful! Please check your email to verify your account before signing in.')
      navigate('/login')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to sign up')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <Logo size="lg" />
        </div>
        
        <h2 className="text-3xl font-bold text-center mb-8 text-gray-900">
          Create Your Account
        </h2>

        {/* Instructions */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Getting started with Song Voter</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>• <strong>Display name:</strong> This is how other band members will see you</p>
                <p>• <strong>Email verification:</strong> Check your email and click the verification link</p>
                <p>• <strong>Strong password:</strong> Use at least 8 characters for security</p>
                <p>• <strong>After signup:</strong> You'll be redirected to login to verify your account</p>
                <p>• <strong>Band setup:</strong> Create or join a band after your first login</p>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">