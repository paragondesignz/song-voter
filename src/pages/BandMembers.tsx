import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useBand, useBandMembers, useUserBandRole, useRemoveBandMember, useUpdateMemberRole } from '@/hooks/useBands'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Header } from '@/components/Header'
import {
  Users,
  UserPlus,
  MoreVertical,
  Shield,
  Search,
  Lock,
  Mail,
  User
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'react-hot-toast'

export function BandMembers() {
  const { bandId } = useParams<{ bandId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [showAddMemberForm, setShowAddMemberForm] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [selectedMember, setSelectedMember] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreatingMember, setIsCreatingMember] = useState(false)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  
  // Form states
  const [memberEmail, setMemberEmail] = useState('')
  const [memberName, setMemberName] = useState('')
  const [memberRole, setMemberRole] = useState<'member' | 'admin'>('member')
  const [bandPassword, setBandPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  const { data: band } = useBand(bandId!)
  const { data: members, isLoading, refetch: refetchMembers } = useBandMembers(bandId!)
  const { data: userRole } = useUserBandRole(bandId!)
  const removeMember = useRemoveBandMember()
  const updateMemberRole = useUpdateMemberRole()

  const isCurrentUserAdmin = userRole === 'admin'
  const filteredMembers = members?.filter(member =>
    member.user?.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.user?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  const handleSetBandPassword = async () => {
    if (bandPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    
    if (bandPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    
    setIsUpdatingPassword(true)
    try {
      // Try to update with both columns first
      const updateData: any = { shared_password: bandPassword }
      
      // Try to check if password_updated_at column exists by attempting to update it
      try {
        updateData.password_updated_at = new Date().toISOString()
      } catch {
        // If password_updated_at doesn't exist, just update shared_password
      }
      
      const { error } = await supabase
        .from('bands')
        .update(updateData)
        .eq('id', bandId)
        
      if (error) {
        // If the update failed due to missing columns, try with just shared_password
        if (error.message.includes('column') && error.message.includes('does not exist')) {
          const { error: retryError } = await supabase
            .from('bands')
            .update({ shared_password: bandPassword })
            .eq('id', bandId)
            
          if (retryError) throw retryError
        } else {
          throw error
        }
      }
      
      toast.success('Band password set successfully!')
      setShowPasswordForm(false)
      setBandPassword('')
      setConfirmPassword('')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to set band password')
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  const handleCreateMember = async () => {
    if (!memberEmail || !memberName) {
      toast.error('Please fill in all fields')
      return
    }
    
    // Check if band has a shared password set
    const { data: bandData } = await supabase
      .from('bands')
      .select('shared_password')
      .eq('id', bandId)
      .single()
      
    if (!bandData?.shared_password) {
      toast.error('Please set a band password first')
      setShowAddMemberForm(false)
      setShowPasswordForm(true)
      return
    }
    
    setIsCreatingMember(true)
    try {
      const { error: edgeError } = await supabase.functions.invoke('create-band-member', {
        body: {
          p_email: memberEmail,
          p_band_id: bandId,
          p_role: memberRole,
          p_display_name: memberName,
        }
      })
      const error = edgeError
      
      
      if (error) throw error
      
      // Force a hard refresh of the members list
      await refetchMembers()
      
      // Also invalidate related queries to ensure consistency
      await new Promise(resolve => setTimeout(resolve, 1000)) // Small delay to ensure DB consistency
      await refetchMembers() // Second refetch to catch any delayed updates
      
      toast.success(`Member ${memberName} added successfully!`)
      setShowAddMemberForm(false)
      setMemberEmail('')
      setMemberName('')
      setMemberRole('member')
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message.includes('already exists')) {
          toast.error('A user with this email already exists')
        } else if (error.message.includes('gen_salt')) {
          toast.error('Database configuration issue. Please contact support.')
        } else {
          toast.error(error.message)
        }
      } else {
        toast.error('Failed to create member')
      }
    } finally {
      setIsCreatingMember(false)
    }
  }

  const handleRemoveMember = async (userId: string, memberName: string) => {
    if (window.confirm(`Are you sure you want to remove ${memberName} from the band? This action cannot be undone.`)) {
      await removeMember.mutateAsync({
        bandId: bandId!,
        userId
      })
    }
    setSelectedMember(null)
  }

  const handleUpdateRole = async (userId: string, newRole: 'admin' | 'member', memberName: string) => {
    const action = newRole === 'admin' ? 'promote' : 'demote'
    if (window.confirm(`Are you sure you want to ${action} ${memberName} ${newRole === 'admin' ? 'to admin' : 'to regular member'}?`)) {
      await updateMemberRole.mutateAsync({
        bandId: bandId!,
        userId,
        newRole
      })
    }
    setSelectedMember(null)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!isCurrentUserAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Title */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900">Band Members</h1>
            {band?.name && <p className="text-lg text-gray-600 mt-2">{band.name}</p>}
          </div>
          
          <div className="card text-center py-12">
            <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-gray-900 mb-2">Admin Access Required</h2>
            <p className="text-gray-600 mb-6">
              Only band admins can manage members. Contact your band admin if you need to invite or remove members.
            </p>
            <button
              onClick={() => navigate(`/band/${bandId}`)}
              className="btn-primary"
            >
              Back to Band Dashboard
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Manage Members</h1>
          <p className="text-lg text-gray-600 mt-2">{band?.name} • {members?.length || 0}/10 members</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">


            {/* Members list */}
            {/* Set Band Password Form */}
            {showPasswordForm && (
              <div className="card mb-8">
                <h2 className="text-xl font-semibold mb-4">Set Band Password</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Set a shared password that all band members will use to log in. Members can change their personal password after logging in.
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Band Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="password"
                        value={bandPassword}
                        onChange={(e) => setBandPassword(e.target.value)}
                        className="input-field pl-10"
                        placeholder="Enter band password (min 6 characters)"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="input-field pl-10"
                        placeholder="Confirm band password"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => {
                        setShowPasswordForm(false)
                        setBandPassword('')
                        setConfirmPassword('')
                      }}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSetBandPassword}
                      disabled={isUpdatingPassword}
                      className="btn-primary"
                    >
                      {isUpdatingPassword ? 'Setting...' : 'Set Password'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Add Member Form */}
            {showAddMemberForm && (
              <div className="card mb-8">
                <h2 className="text-xl font-semibold mb-4">Add New Member</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Add a new member directly. They'll be able to log in using their email and the band's shared password.
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="email"
                        value={memberEmail}
                        onChange={(e) => setMemberEmail(e.target.value)}
                        className="input-field pl-10"
                        placeholder="member@example.com"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Display Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={memberName}
                        onChange={(e) => setMemberName(e.target.value)}
                        className="input-field pl-10"
                        placeholder="Member's name"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role
                    </label>
                    <select
                      value={memberRole}
                      onChange={(e) => setMemberRole(e.target.value as 'member' | 'admin')}
                      className="input-field"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>



                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => {
                        setShowAddMemberForm(false)
                        setMemberEmail('')
                        setMemberName('')
                        setMemberRole('member')
                      }}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateMember}
                      disabled={isCreatingMember}
                      className="btn-primary"
                    >
                      {isCreatingMember ? 'Creating...' : 'Add Member'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Search and Filter */}
            <div className="card mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-field pl-10"
                  placeholder="Search members..."
                />
              </div>
            </div>

            {/* Members List */}
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Band Members</h2>
                <span className="text-sm text-gray-500">
                  {filteredMembers.length} of {members?.length || 0} members
                </span>
              </div>

              <div className="space-y-4">
                {filteredMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          {member.user?.display_name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>
                      
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-gray-900">
                            {member.user?.display_name}
                          </h3>
                          {member.user_id === user?.id && (
                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                              You
                            </span>
                          )}
                          {member.role === 'admin' && (
                            <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">
                              Admin
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{member.user?.email}</p>
                        <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                          <span>Joined {formatDistanceToNow(new Date(member.joined_at), { addSuffix: true })}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {member.user_id !== user?.id && (
                        <div className="relative">
                          <button
                            onClick={() => setSelectedMember(selectedMember === member.id ? null : member.id)}
                            className="p-2 rounded-full hover:bg-gray-200 transition-colors"
                          >
                            <MoreVertical className="w-4 h-4 text-gray-500" />
                          </button>
                          
                          {selectedMember === member.id && (
                            <div className="absolute right-0 top-10 rounded-lg shadow-lg border py-2 z-10 min-w-48" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                              <div className="px-4 py-2 text-xs border-b" style={{ color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}>
                                {member.user?.display_name}
                              </div>

                              {member.role === 'member' ? (
                                <button
                                  onClick={() => handleUpdateRole(member.user_id, 'admin', member.user?.display_name || 'User')}
                                  disabled={updateMemberRole.isPending}
                                  className="w-full px-4 py-2 text-left text-sm transition-colors"
                                  style={{ color: 'var(--color-text)' }}
                                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-2)'}
                                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                  Promote to Admin
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleUpdateRole(member.user_id, 'member', member.user?.display_name || 'User')}
                                  disabled={updateMemberRole.isPending}
                                  className="w-full px-4 py-2 text-left text-sm transition-colors"
                                  style={{ color: 'var(--color-text)' }}
                                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-2)'}
                                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                  Demote to Member
                                </button>
                              )}

                              <button
                                onClick={() => handleRemoveMember(member.user_id, member.user?.display_name || 'User')}
                                disabled={removeMember.isPending}
                                className="w-full px-4 py-2 text-left text-sm text-red-400 transition-colors"
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                Remove from Band
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {filteredMembers.length === 0 && searchQuery && (
                <div className="text-center py-12">
                  <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No members found</h3>
                  <p className="text-gray-600">
                    No members match your search "{searchQuery}"
                  </p>
                </div>
              )}
            </div>

            {/* Band Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div className="card">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Members</p>
                    <p className="text-2xl font-bold text-gray-900">{members?.length || 0}</p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center">
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <Shield className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Admins</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {members?.filter(m => m.role === 'admin').length || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <UserPlus className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Available Spots</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {10 - (members?.length || 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Action Buttons */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Member Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => setShowPasswordForm(true)}
                  className="w-full btn-secondary text-sm flex items-center justify-center"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Set Band Password
                </button>
                <button
                  onClick={() => setShowAddMemberForm(true)}
                  className="w-full btn-primary text-sm flex items-center justify-center"
                  disabled={members && members.length >= 10}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Member
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}