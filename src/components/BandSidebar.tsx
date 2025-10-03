import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useBand, useBandMembers } from '@/hooks/useBands'
import { useBandRehearsals } from '@/hooks/useRehearsals'
import { Calendar } from 'lucide-react'

interface BandSidebarProps {
  bandId: string
}

export function BandSidebar({ bandId }: BandSidebarProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: band } = useBand(bandId)
  const { data: members } = useBandMembers(bandId)
  const { data: rehearsals } = useBandRehearsals(bandId)

  const userRole = members?.find(m => m.user_id === user?.id)?.role

  return (
    <div className="space-y-6">
      {/* Upcoming Rehearsals */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Upcoming Rehearsals</h3>
          <button
            onClick={() => navigate(`/band/${bandId}/rehearsals`)}
            className="text-sm font-medium transition-colors"
            style={{ color: 'var(--color-primary)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-secondary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
          >
            {userRole === 'admin' ? 'Manage' : 'View All'}
          </button>
        </div>
        {rehearsals && rehearsals.length > 0 ? (
          <div className="space-y-3">
            {rehearsals
              .filter(rehearsal => {
                const rehearsalDate = new Date(rehearsal.rehearsal_date)
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                return rehearsalDate >= today
              })
              .slice(0, 3)
              .map((rehearsal) => (
                <div
                  key={rehearsal.id}
                  className="p-4 rounded-lg transition-colors cursor-pointer"
                  style={{ backgroundColor: 'var(--color-surface-2)' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-border)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-2)'}
                  onClick={() => navigate(`/band/${bandId}/rehearsal/${rehearsal.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium" style={{ color: 'var(--color-text)' }}>{rehearsal.name}</h4>
                      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        {new Date(rehearsal.rehearsal_date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                        {rehearsal.start_time && (
                          <span> at {rehearsal.start_time}</span>
                        )}
                      </p>
                      {rehearsal.selection_deadline && (
                        <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                          Song selection cutoff: {new Date(rehearsal.selection_deadline).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                      )}
                    </div>
                    <div className="ml-4">
                      <Calendar className="h-5 w-5" style={{ color: 'var(--color-text-secondary)' }} />
                    </div>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--color-text-secondary)' }} />
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>No upcoming rehearsals scheduled</p>
          </div>
        )}
      </div>

      {/* Band members */}
      <div className="card">
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--color-text)' }}>{band?.name}</h2>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Band Members</h3>
            {userRole === 'admin' && (
              <button
                onClick={() => navigate(`/band/${bandId}/members`)}
                className="btn-secondary text-sm"
              >
                Manage Members
              </button>
            )}
          </div>
        </div>
        <div className="space-y-3">
          {members?.map((member) => (
            <div key={member.id} className="flex items-center justify-between">
              <div className="flex items-center">
                {member.user?.avatar_url ? (
                  <img
                    src={member.user.avatar_url}
                    alt={member.user.display_name}
                    className="w-8 h-8 rounded-full mr-3 object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gray-100 rounded-full mr-3 flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-600">
                      {member.user?.display_name?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  </div>
                )}
                <div>
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-gray-900">
                      {member.user?.display_name}
                    </p>
                    {member.role === 'admin' && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{member.user?.email}</p>
                </div>
              </div>
              {member.user_id === user?.id && (
                <span className="text-xs text-primary-600 font-medium">You</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}


