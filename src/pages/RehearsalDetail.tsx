import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useBand, useUserBandRole } from '@/hooks/useBands'
import {
  useRehearsal,
  useRehearsalSetlist,
  useRemoveFromSetlist,
  useAddToSetlist,
  useReorderSetlist,
  useUpdateRehearsal,
  useDeleteRehearsal
} from '@/hooks/useRehearsals'
import { useSongSuggestions } from '@/hooks/useSongs'
import { Header } from '@/components/Header'
import {
  Calendar,
  MapPin,
  Clock,
  Music,
  CheckCircle,
  AlertCircle,
  Trash2,
  ExternalLink,
  Users,
  Edit2,
  Save,
  X,
  GripVertical,
  Plus,
  Download
} from 'lucide-react'
import { format } from 'date-fns'

export function RehearsalDetail() {
  const { bandId, rehearsalId } = useParams<{ bandId: string; rehearsalId: string }>()
  const navigate = useNavigate()

  const { data: band } = useBand(bandId!)
  const { data: userRole } = useUserBandRole(bandId!)
  const { data: rehearsal, isLoading: rehearsalLoading } = useRehearsal(rehearsalId!)
  const { data: setlist, isLoading: setlistLoading } = useRehearsalSetlist(rehearsalId!)
  const { data: availableSongs } = useSongSuggestions(bandId!)
  const removeFromSetlist = useRemoveFromSetlist()
  const addToSetlist = useAddToSetlist()
  const reorderSetlist = useReorderSetlist()
  const updateRehearsal = useUpdateRehearsal()
  const deleteRehearsal = useDeleteRehearsal()

  const [isEditingDetails, setIsEditingDetails] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    rehearsal_date: '',
    start_time: '',
    location: '',
    description: ''
  })
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [showAvailableSongs, setShowAvailableSongs] = useState(false)

  const isAdmin = userRole === 'admin'

  const handleRemoveFromSetlist = async (setlistItemId: string) => {
    if (window.confirm('Remove this song from the rehearsal setlist?')) {
      await removeFromSetlist.mutateAsync(setlistItemId)
    }
  }

  const handleAddSong = async (songId: string) => {
    await addToSetlist.mutateAsync({
      rehearsalId: rehearsalId!,
      songId
    })
  }

  const handleStartEdit = () => {
    if (rehearsal) {
      setEditForm({
        name: rehearsal.name,
        rehearsal_date: rehearsal.rehearsal_date.split('T')[0],
        start_time: rehearsal.start_time || '',
        location: rehearsal.location || '',
        description: rehearsal.description || ''
      })
      setIsEditingDetails(true)
    }
  }

  const handleSaveEdit = async () => {
    await updateRehearsal.mutateAsync({
      rehearsalId: rehearsalId!,
      updates: editForm
    })
    setIsEditingDetails(false)
  }

  const handleCancelEdit = () => {
    setIsEditingDetails(false)
  }

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete "${rehearsal?.name}"? This action cannot be undone.`)) {
      await deleteRehearsal.mutateAsync(rehearsalId!)
      navigate(`/band/${bandId}/rehearsals`)
    }
  }

  const handleExportIcal = () => {
    if (!rehearsal) return

    // Create iCal format
    const ical = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Rehearsalist//Band Rehearsal//EN',
      'BEGIN:VEVENT',
      `UID:${rehearsalId}@rehearsalist.app`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTART:${rehearsal.rehearsal_date.replace(/-/g, '')}${rehearsal.start_time ? 'T' + rehearsal.start_time.replace(':', '') + '00' : ''}`,
      `SUMMARY:${rehearsal.name}`,
      rehearsal.location ? `LOCATION:${rehearsal.location}` : '',
      rehearsal.description ? `DESCRIPTION:${rehearsal.description}` : '',
      'END:VEVENT',
      'END:VCALENDAR'
    ].filter(Boolean).join('\r\n')

    // Create download
    const blob = new Blob([ical], { type: 'text/calendar;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${rehearsal.name.replace(/[^a-z0-9]/gi, '_')}.ics`
    link.click()
  }

  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItem(itemId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault()

    if (!draggedItem || !setlist) return

    const draggedIndex = setlist.findIndex(item => item.id === draggedItem)
    const targetIndex = setlist.findIndex(item => item.id === targetId)

    if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) return

    // Create new order
    const newSetlist = [...setlist]
    const [removed] = newSetlist.splice(draggedIndex, 1)
    newSetlist.splice(targetIndex, 0, removed)

    // Update positions
    const reorderedItems = newSetlist.map((item, index) => ({
      id: item.id,
      position: index + 1
    }))

    await reorderSetlist.mutateAsync({
      rehearsalId: rehearsalId!,
      reorderedItems
    })

    setDraggedItem(null)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'text-yellow-600 bg-yellow-50'
      case 'songs_selected': return 'text-blue-600 bg-blue-50'
      case 'completed': return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'planning': return <AlertCircle className="h-4 w-4" />
      case 'songs_selected': return <Music className="h-4 w-4" />
      case 'completed': return <CheckCircle className="h-4 w-4" />
      default: return <Calendar className="h-4 w-4" />
    }
  }

  // Filter out songs already in setlist
  const setlistSongIds = new Set(setlist?.map(item => item.song_suggestion_id) || [])
  const songsNotInSetlist = availableSongs?.filter(song => !setlistSongIds.has(song.id)) || []

  if (rehearsalLoading || setlistLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!rehearsal) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Rehearsal Not Found</h2>
          <p className="text-gray-600 mb-4">The rehearsal you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate(`/band/${bandId}/rehearsals`)}
            className="btn-primary"
          >
            Back to Rehearsals
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex justify-between items-center">
          <div className="flex items-center">
            <Calendar className="h-6 w-6 text-primary-600 mr-3" />
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{rehearsal.name}</h1>
              <p className="text-xs text-gray-500">{band?.name}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleExportIcal}
              className="btn-secondary text-sm flex items-center"
              title="Export to calendar"
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </button>
            {isAdmin && (
              <button
                onClick={handleDelete}
                disabled={deleteRehearsal.isPending}
                className="btn-secondary text-sm flex items-center text-red-600 hover:bg-red-50"
                title="Delete rehearsal"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </button>
            )}
            <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center ${getStatusColor(rehearsal.status)}`}>
              {getStatusIcon(rehearsal.status)}
              <span className="ml-1 capitalize">{rehearsal.status.replace('_', ' ')}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Rehearsal Info */}
          <div className="lg:col-span-1">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Rehearsal Details</h2>
                {isAdmin && rehearsal.status !== 'completed' && !isEditingDetails && (
                  <button
                    onClick={handleStartEdit}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    title="Edit details"
                  >
                    <Edit2 className="h-4 w-4 text-gray-600" />
                  </button>
                )}
              </div>

              {isEditingDetails ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={editForm.rehearsal_date}
                      onChange={(e) => setEditForm({ ...editForm, rehearsal_date: e.target.value })}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                    <input
                      type="time"
                      value={editForm.start_time}
                      onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <input
                      type="text"
                      value={editForm.location}
                      onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                      className="input-field"
                      placeholder="Rehearsal location"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className="input-field"
                      rows={3}
                      placeholder="Notes about this rehearsal"
                    />
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={handleSaveEdit}
                      disabled={updateRehearsal.isPending}
                      className="btn-primary flex items-center flex-1"
                    >
                      <Save className="h-4 w-4 mr-1" />
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="btn-secondary flex items-center flex-1"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center text-sm">
                    <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="font-medium">{format(new Date(rehearsal.rehearsal_date), 'EEEE, MMMM d, yyyy')}</p>
                      {rehearsal.start_time && (
                        <p className="text-gray-600 flex items-center mt-1">
                          <Clock className="h-4 w-4 mr-1" />
                          {rehearsal.start_time}
                        </p>
                      )}
                    </div>
                  </div>

                  {rehearsal.location && (
                    <div className="flex items-center text-sm">
                      <MapPin className="h-5 w-5 text-gray-400 mr-3" />
                      <p>{rehearsal.location}</p>
                    </div>
                  )}

                  <div className="flex items-center text-sm">
                    <Music className="h-5 w-5 text-gray-400 mr-3" />
                    <p>{rehearsal.songs_to_learn} song{rehearsal.songs_to_learn > 1 ? 's' : ''} to learn</p>
                  </div>

                  {rehearsal.selection_deadline && (
                    <div className="flex items-center text-sm">
                      <AlertCircle className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="font-medium">Selection Deadline</p>
                        <p className="text-gray-600">{format(new Date(rehearsal.selection_deadline), 'MMM d, yyyy h:mm a')}</p>
                      </div>
                    </div>
                  )}

                  {rehearsal.description && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <h3 className="font-medium mb-2">Description</h3>
                      <p className="text-sm text-gray-600">{rehearsal.description}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Available Songs to Add */}
            {isAdmin && rehearsal.status !== 'completed' && (
              <div className="card mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Add Songs</h3>
                  <button
                    onClick={() => setShowAvailableSongs(!showAvailableSongs)}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    {showAvailableSongs ? 'Hide' : 'Show'} ({songsNotInSetlist.length})
                  </button>
                </div>

                {showAvailableSongs && (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {songsNotInSetlist.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">All songs are in the setlist</p>
                    ) : (
                      songsNotInSetlist.map(song => (
                        <div key={song.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{song.title}</p>
                            <p className="text-xs text-gray-600 truncate">{song.artist}</p>
                          </div>
                          <button
                            onClick={() => handleAddSong(song.id)}
                            disabled={addToSetlist.isPending}
                            className="ml-2 p-1 rounded hover:bg-primary-100 text-primary-600"
                            title="Add to setlist"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Setlist */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Rehearsal Setlist</h2>
                {setlist && setlist.length > 0 && (
                  <span className="text-sm text-gray-500">
                    {setlist.length} of {rehearsal.songs_to_learn} songs selected
                  </span>
                )}
              </div>

              {setlist && setlist.length > 0 ? (
                <div className="space-y-4">
                  {setlist.map((item, index) => (
                    <div
                      key={item.id}
                      draggable={isAdmin && rehearsal.status !== 'completed'}
                      onDragStart={(e) => handleDragStart(e, item.id)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, item.id)}
                      className={`bg-gray-50 rounded-lg p-4 ${
                        isAdmin && rehearsal.status !== 'completed' ? 'cursor-move' : ''
                      } ${draggedItem === item.id ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4 flex-1">
                          {isAdmin && rehearsal.status !== 'completed' && (
                            <GripVertical className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1" />
                          )}

                          <div className="flex-shrink-0 w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div>
                              <h3 className="font-semibold text-gray-900 truncate">
                                {item.song_suggestion?.title}
                              </h3>
                              <p className="text-gray-600 truncate">{item.song_suggestion?.artist}</p>
                            </div>

                            <div className="flex items-center mt-2 space-x-4 text-xs text-gray-500">
                              <div className="flex items-center">
                                <Users className="w-3 h-3 mr-1" />
                                {item.vote_count_at_selection || item.song_suggestion?.vote_count || 0} votes
                              </div>

                              {item.selection_reason && (
                                <>
                                  <span>•</span>
                                  <span>{item.selection_reason}</span>
                                </>
                              )}

                              {item.song_suggestion?.spotify_track_id && (
                                <>
                                  <span>•</span>
                                  <a
                                    href={`https://open.spotify.com/track/${item.song_suggestion.spotify_track_id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary-600 hover:text-primary-700 flex items-center"
                                  >
                                    <ExternalLink className="w-3 h-3 mr-1" />
                                    Spotify
                                  </a>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {isAdmin && rehearsal.status !== 'completed' && (
                          <button
                            onClick={() => handleRemoveFromSetlist(item.id)}
                            disabled={removeFromSetlist.isPending}
                            className="ml-4 p-2 rounded-full transition-colors bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] hover:bg-red-500/10 hover:text-red-400 border border-[var(--color-border)]"
                            title="Remove from setlist"
                          >
                            <Trash2 className="w-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Music className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Songs Selected</h3>
                  <p className="text-gray-600">
                    {isAdmin
                      ? "Add songs from the 'Add Songs' section on the left."
                      : "The admin hasn't selected songs for this rehearsal yet."
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
