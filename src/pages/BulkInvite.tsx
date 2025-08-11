import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useBand, useBandMembers, useUserBandRole } from '@/hooks/useBands'
import { Header } from '@/components/Header'
import { supabase } from '@/lib/supabase'
import { 
  Send, 
  Users, 
  Copy, 
  Check,
  AlertCircle,
  ArrowLeft,
  Mail,
  UserPlus,
  Loader2
} from 'lucide-react'
import { toast } from 'react-hot-toast'

interface InviteResult {
  email: string
  name: string
  status: 'success' | 'error' | 'exists'
  message?: string
}

export function BulkInvite() {
  const { bandId } = useParams<{ bandId: string }>()
  const navigate = useNavigate()
  const [bulkEmails, setBulkEmails] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [results, setResults] = useState<InviteResult[]>([])
  const [copied, setCopied] = useState(false)
  
  const { data: band } = useBand(bandId!)
  const { data: members, refetch: refetchMembers } = useBandMembers(bandId!)
  const { data: userRole } = useUserBandRole(bandId!)

  const isAdmin = userRole === 'admin'
  const inviteCode = band?.invite_code || ''
  const availableSpots = 10 - (members?.length || 0)

  const handleCopyInviteLink = async () => {
    const inviteLink = `${window.location.origin}/join/${inviteCode}`
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    toast.success('Invite link copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const parseBulkInput = (input: string): { email: string; name: string }[] => {
    const lines = input.trim().split('\n').filter(line => line.trim())
    return lines.map(line => {
      const parts = line.split(',').map(p => p.trim())
      if (parts.length === 2) {
        return { email: parts[0], name: parts[1] }
      } else if (parts.length === 1) {
        const email = parts[0]
        const name = email.split('@')[0]
        return { email, name }
      }
      return null
    }).filter(Boolean) as { email: string; name: string }[]
  }

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleBulkInvite = async () => {
    const invites = parseBulkInput(bulkEmails)
    
    if (invites.length === 0) {
      toast.error('Please enter at least one email address')
      return
    }

    if (invites.length > availableSpots) {
      toast.error(`Cannot invite ${invites.length} members. Only ${availableSpots} spots available.`)
      return
    }

    const invalidEmails = invites.filter(i => !validateEmail(i.email))
    if (invalidEmails.length > 0) {
      toast.error(`Invalid email addresses: ${invalidEmails.map(i => i.email).join(', ')}`)
      return
    }

    const { data: bandData } = await supabase
      .from('bands')
      .select('shared_password')
      .eq('id', bandId)
      .single()
      
    if (!bandData?.shared_password) {
      toast.error('Please set a band password first')
      navigate(`/band/${bandId}/members`)
      return
    }

    setIsProcessing(true)
    setResults([])
    
    const results: InviteResult[] = []
    const existingEmails = members?.map(m => m.user?.email?.toLowerCase()) || []

    for (const invite of invites) {
      if (existingEmails.includes(invite.email.toLowerCase())) {
        results.push({
          email: invite.email,
          name: invite.name,
          status: 'exists',
          message: 'Already a member'
        })
        continue
      }

      try {
        const { error } = await supabase.functions.invoke('create-band-member', {
          body: {
            p_email: invite.email,
            p_band_id: bandId,
            p_role: 'member',
            p_display_name: invite.name,
          }
        })
        
        if (error) {
          results.push({
            email: invite.email,
            name: invite.name,
            status: 'error',
            message: error.message
          })
        } else {
          results.push({
            email: invite.email,
            name: invite.name,
            status: 'success',
            message: 'Invited successfully'
          })
        }
      } catch (error) {
        results.push({
          email: invite.email,
          name: invite.name,
          status: 'error',
          message: error instanceof Error ? error.message : 'Failed to invite'
        })
      }
    }

    setResults(results)
    await refetchMembers()
    
    const successCount = results.filter(r => r.status === 'success').length
    if (successCount > 0) {
      toast.success(`Successfully invited ${successCount} member(s)`)
      setBulkEmails('')
    }
    
    setIsProcessing(false)
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="card text-center py-12">
            <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-gray-900 mb-2">Admin Access Required</h2>
            <p className="text-gray-600 mb-6">
              Only band admins can send bulk invites.
            </p>
            <button
              onClick={() => navigate(`/band/${bandId}/members`)}
              className="btn-primary"
            >
              Back to Members
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate(`/band/${bandId}/members`)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Members
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Bulk Invite Members</h1>
          <p className="text-lg text-gray-600 mt-2">
            {band?.name} • {availableSpots} spots available
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Invite Code Section */}
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Share Invite Link</h2>
              <p className="text-sm text-gray-600 mb-4">
                Share this link with potential members. They can join using their email and the band password.
              </p>
              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  value={`${window.location.origin}/join/${inviteCode}`}
                  readOnly
                  className="input-field flex-1 bg-gray-50"
                />
                <button
                  onClick={handleCopyInviteLink}
                  className="btn-secondary"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Bulk Invite Form */}
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Bulk Add Members</h2>
              <p className="text-sm text-gray-600 mb-4">
                Enter email addresses and names, one per line. Format: email@example.com, Name
                <br />
                If no name is provided, the email prefix will be used.
              </p>
              
              <textarea
                value={bulkEmails}
                onChange={(e) => setBulkEmails(e.target.value)}
                placeholder="john@example.com, John Doe&#10;jane@example.com, Jane Smith&#10;mike@band.com"
                className="w-full h-48 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={isProcessing}
              />

              <div className="mt-4 flex justify-between items-center">
                <span className="text-sm text-gray-500">
                  {parseBulkInput(bulkEmails).length} valid entries
                </span>
                <button
                  onClick={handleBulkInvite}
                  disabled={isProcessing || parseBulkInput(bulkEmails).length === 0}
                  className="btn-primary"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Invites
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Results */}
            {results.length > 0 && (
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">Invite Results</h3>
                <div className="space-y-2">
                  {results.map((result, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        result.status === 'success'
                          ? 'bg-green-50 text-green-800'
                          : result.status === 'exists'
                          ? 'bg-yellow-50 text-yellow-800'
                          : 'bg-red-50 text-red-800'
                      }`}
                    >
                      <div className="flex items-center">
                        {result.status === 'success' ? (
                          <Check className="h-4 w-4 mr-2" />
                        ) : result.status === 'exists' ? (
                          <Users className="h-4 w-4 mr-2" />
                        ) : (
                          <AlertCircle className="h-4 w-4 mr-2" />
                        )}
                        <span className="font-medium">{result.name}</span>
                        <span className="ml-2 text-sm opacity-75">({result.email})</span>
                      </div>
                      <span className="text-sm">{result.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Instructions</h3>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-start">
                  <Mail className="h-4 w-4 mr-2 mt-0.5 text-gray-400" />
                  <span>Enter one member per line with their email and name</span>
                </li>
                <li className="flex items-start">
                  <UserPlus className="h-4 w-4 mr-2 mt-0.5 text-gray-400" />
                  <span>Members will be created with the band's shared password</span>
                </li>
                <li className="flex items-start">
                  <AlertCircle className="h-4 w-4 mr-2 mt-0.5 text-gray-400" />
                  <span>Maximum 10 members per band</span>
                </li>
              </ul>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Current Status</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Members</span>
                  <span className="font-medium">{members?.length || 0}/10</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Available Spots</span>
                  <span className="font-medium text-green-600">{availableSpots}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Band Password</span>
                  <span className="font-medium">{band?.shared_password ? 'Set' : 'Not Set'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}