import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useBand, useBandMembers, useUserBandRole, useRemoveBandMember, useUpdateMemberRole } from '@/hooks/useBands'
import { useAuth } from '@/context/AuthContext'
import { 
  ArrowLeft, 
  Users,
  UserPlus,
  Crown,
  MoreVertical,
  Trash2,
  Shield,
  UserCheck,
  Calendar,
  Search
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'react-hot-toast'

export function BandMembers() {
  const { bandId } = useParams<{ bandId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [selectedMember, setSelectedMember] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  
  const { data: band } = useBand(bandId!)
  const { data: members, isLoading } = useBandMembers(bandId!)
  const { data: userRole } = useUserBandRole(bandId!)
  const removeMember = useRemoveBandMember()
  const updateMemberRole = useUpdateMemberRole()

  const isCurrentUserAdmin = userRole === 'admin'
  const filteredMembers = members?.filter(member =>
    member.user?.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.user?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []


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
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16">
              <button
                onClick={() => navigate(`/band/${bandId}`)}
                className="mr-4 text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <Users className="h-6 w-6 text-primary-600 mr-3" />
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Band Members</h1>
                <p className="text-xs text-gray-500">{band?.name}</p>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate(`/band/${bandId}`)}
                className="mr-4 text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <Users className="h-6 w-6 text-primary-600 mr-3" />
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Manage Members</h1>
                <p className="text-xs text-gray-500">{band?.name} • {members?.length || 0}/10 members</p>
              </div>
            </div>
            <button
              onClick={() => setShowInviteForm(true)}
              className="btn-primary text-sm"
              disabled={members && members.length >= 10}
            >
              <UserPlus className="h-4 w-4 mr-1" />
              Share Invite Code
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Invite Instructions */}
        {showInviteForm && (
          <div className="card mb-8">
            <h2 className="text-xl font-semibold mb-4">Invite New Members</h2>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-medium text-blue-900 mb-2">Share Invite Code</h3>
                <p className="text-sm text-blue-800 mb-4">
                  Share this invite code with new members. They can join the band by entering this code on their dashboard.
                </p>
                <div className="flex items-center space-x-3">
                  <div className="flex-1 p-3 bg-white border border-blue-200 rounded-lg">
                    <code className="text-lg font-mono font-bold text-blue-900">{band?.invite_code}</code>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(band?.invite_code || '')
                      toast.success('Invite code copied to clipboard!')
                    }}
                    className="btn-primary text-sm"
                  >
                    Copy Code
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  <strong>Note:</strong> New members must first create an account on the app, then use this invite code to join your band.
                  All new members will join as regular members and can be promoted to admin later.
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setShowInviteForm(false)}
                  className="btn-secondary"
                >
                  Close
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
                  <div className="relative">
                    {member.user?.avatar_url ? (
                      <img
                        src={member.user.avatar_url}
                        alt={member.user.display_name}
                        className="w-12 h-12 rounded-full"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                        <Users className="w-6 h-6 text-gray-500" />
                      </div>
                    )}
                    {member.role === 'admin' && (
                      <div className="absolute -top-1 -right-1 bg-yellow-500 text-white rounded-full p-1">
                        <Crown className="w-3 h-3" />
                      </div>
                    )}
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
                    </div>
                    <p className="text-sm text-gray-600">{member.user?.email}</p>
                    <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                      <div className="flex items-center">
                        <UserCheck className="w-3 h-3 mr-1" />
                        {member.role === 'admin' ? 'Admin' : 'Member'}
                      </div>
                      <div className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        Joined {formatDistanceToNow(new Date(member.joined_at), { addSuffix: true })}
                      </div>
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
                        <div className="absolute right-0 top-10 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10 min-w-48">
                          <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-100">
                            {member.user?.display_name}
                          </div>
                          
                          {member.role === 'member' ? (
                            <button
                              onClick={() => handleUpdateRole(member.user_id, 'admin', member.user?.display_name || 'User')}
                              disabled={updateMemberRole.isPending}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center"
                            >
                              <Crown className="w-4 h-4 mr-2 text-yellow-500" />
                              Promote to Admin
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdateRole(member.user_id, 'member', member.user?.display_name || 'User')}
                              disabled={updateMemberRole.isPending}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center"
                            >
                              <UserCheck className="w-4 h-4 mr-2 text-blue-500" />
                              Demote to Member
                            </button>
                          )}
                          
                          <button
                            onClick={() => handleRemoveMember(member.user_id, member.user?.display_name || 'User')}
                            disabled={removeMember.isPending}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
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
                <Crown className="h-6 w-6 text-yellow-600" />
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
      </main>
    </div>
  )
}