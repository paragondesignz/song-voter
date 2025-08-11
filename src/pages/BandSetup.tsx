import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useCreateBand, useJoinBand } from '@/hooks/useBands'
import { Music, Users, ArrowLeft } from 'lucide-react'

interface CreateBandForm {
  name: string
}

interface JoinBandForm {
  inviteCode: string
}

export function BandSetup() {
  const [mode, setMode] = useState<'create' | 'join'>('create')
  const navigate = useNavigate()
  const createBand = useCreateBand()
  const joinBand = useJoinBand()

  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    formState: { errors: errorsCreate },
  } = useForm<CreateBandForm>()

  const {
    register: registerJoin,
    handleSubmit: handleSubmitJoin,
    formState: { errors: errorsJoin },
  } = useForm<JoinBandForm>()

  const onCreateBand = async (data: CreateBandForm) => {
    const band = await createBand.mutateAsync(data.name)
    navigate(`/band/${band.id}`)
  }

  const onJoinBand = async (data: JoinBandForm) => {
    const band = await joinBand.mutateAsync(data.inviteCode)
    navigate(`/band/${band.id}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-center mb-8">
            <Music className="h-12 w-12 text-primary-600 mr-3" />
            <Users className="h-12 w-12 text-primary-600" />
          </div>

          <h1 className="text-3xl font-bold text-center mb-8 text-gray-900">
            Band Setup
          </h1>

          <div className="flex border-b border-gray-200 mb-8">
            <button
              onClick={() => setMode('create')}
              className={`flex-1 py-3 text-center font-medium transition-colors ${
                mode === 'create'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Create New Band
            </button>
            <button
              onClick={() => setMode('join')}
              className={`flex-1 py-3 text-center font-medium transition-colors ${
                mode === 'join'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Join Existing Band
            </button>
          </div>

          {/* TEMP: Direct access to Hands Off band */}
          <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 mb-3">
              <strong>Quick Access:</strong> Can't see your "Hands Off" band? Click here:
            </p>
            <button
              onClick={() => navigate('/band/6ea8b825-ec5d-4fe5-9858-9c92cfcae91f')}
              className="btn-primary"
            >
              Go to "Hands Off" Band
            </button>
          </div>

          {mode === 'create' ? (
            <form onSubmit={handleSubmitCreate(onCreateBand)} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Band Name
                </label>
                <input
                  {...registerCreate('name', {
                    required: 'Band name is required',
                    minLength: {
                      value: 2,
                      message: 'Band name must be at least 2 characters',
                    },
                    maxLength: {
                      value: 50,
                      message: 'Band name must be less than 50 characters',
                    },
                  })}
                  type="text"
                  className="input-field"
                  placeholder="The Rolling Stones"
                />
                {errorsCreate.name && (
                  <p className="mt-1 text-sm text-red-600">{errorsCreate.name.message}</p>
                )}
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> You'll be the admin of this band. You can invite up to 9 other members using the invite code that will be generated.
                </p>
              </div>

              <button
                type="submit"
                disabled={createBand.isPending}
                className="w-full btn-primary"
              >
                {createBand.isPending ? 'Creating...' : 'Create Band'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmitJoin(onJoinBand)} className="space-y-6">
              <div>
                <label htmlFor="inviteCode" className="block text-sm font-medium text-gray-700 mb-2">
                  Invite Code
                </label>
                <input
                  {...registerJoin('inviteCode', {
                    required: 'Invite code is required',
                    minLength: {
                      value: 8,
                      message: 'Invite code must be 8 characters',
                    },
                    maxLength: {
                      value: 8,
                      message: 'Invite code must be 8 characters',
                    },
                  })}
                  type="text"
                  className="input-field font-mono uppercase"
                  placeholder="ABC12345"
                  maxLength={8}
                />
                {errorsJoin.inviteCode && (
                  <p className="mt-1 text-sm text-red-600">{errorsJoin.inviteCode.message}</p>
                )}
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Ask your band admin for the invite code. Once you join, you'll be able to suggest songs and vote on the band's repertoire.
                </p>
              </div>

              <button
                type="submit"
                disabled={joinBand.isPending}
                className="w-full btn-primary"
              >
                {joinBand.isPending ? 'Joining...' : 'Join Band'}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}