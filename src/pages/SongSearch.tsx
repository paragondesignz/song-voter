import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useSpotifyEmbed } from '@/hooks/useSpotify'
import { useSuggestSong } from '@/hooks/useSongs'
import { useBand } from '@/hooks/useBands'
import { useChatGPT, type SongSearchResult } from '@/hooks/useChatGPT'
import { Header } from '@/components/Header'
import { 
  Music, 
  Link,
  Bot,
  Search,
  Loader2,
  Check,
  X
} from 'lucide-react'

interface ManualSongForm {
  title: string
  artist: string
  album: string
  notes: string
}

export function SongSearch() {
  const { bandId } = useParams<{ bandId: string }>()
  const navigate = useNavigate()
  const [showManualForm, setShowManualForm] = useState(false)
  const [showAISearch, setShowAISearch] = useState(false)
  const [spotifyUrl, setSpotifyUrl] = useState('')
  const [editableTrack, setEditableTrack] = useState<{
    title: string
    artist: string
    album: string
    spotify_track_id: string | null
    duration_ms: number | null
    album_art_url: string | null
    preview_url: string | null
  } | null>(null)
  const [aiSearchQuery, setAiSearchQuery] = useState('')
  const [aiSearchResults, setAiSearchResults] = useState<SongSearchResult[]>([])
  const [selectedResult, setSelectedResult] = useState<SongSearchResult | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  
  const { data: band } = useBand(bandId!)
  const { isLoading, error, handleUrlSubmit } = useSpotifyEmbed()
  const suggestSong = useSuggestSong()
  const { searchSong, isSearching: isAISearching, error: aiError, clearError } = useChatGPT()
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<ManualSongForm>()



  const handleSpotifyUrlSubmit = async () => {
    if (!spotifyUrl.trim()) return
    
    const trackData = await handleUrlSubmit(spotifyUrl)
    if (trackData) {
      // Set the editable track for user modification
      setEditableTrack(trackData)
    }
  }

  const handleSpotifySuggest = async () => {
    if (!editableTrack) return
    
    await suggestSong.mutateAsync({ 
      bandId: bandId!, 
      track: {
        title: editableTrack.title,
        artist: editableTrack.artist,
        album: editableTrack.album,
        spotify_track_id: editableTrack.spotify_track_id || undefined,
        duration_ms: editableTrack.duration_ms,
        album_art_url: editableTrack.album_art_url,
        preview_url: editableTrack.preview_url
      }
    })
    navigate(`/band/${bandId}/suggestions`)
  }

  const handleManualSuggest = async (data: ManualSongForm) => {
    const track = {
      title: data.title,
      artist: data.artist,
      album: data.album || undefined,
    }
    
    await suggestSong.mutateAsync({ 
      bandId: bandId!, 
      track,
      notes: data.notes || null
    })
    
    reset()
    setShowManualForm(false)
    navigate(`/band/${bandId}/suggestions`)
  }

  const handleAISearch = async () => {
    if (!aiSearchQuery.trim()) return
    
    clearError()
    const results = await searchSong(aiSearchQuery)
    
    if (results.length > 0) {
      setAiSearchResults(results)
    }
  }

  const handleAISearchResult = (result: SongSearchResult) => {
    setSelectedResult(result)
    setShowConfirmation(true)
  }

  const confirmAISearchResult = () => {
    if (!selectedResult) return
    
    setEditableTrack({
      title: selectedResult.title,
      artist: selectedResult.artist,
      album: selectedResult.album || '',
      spotify_track_id: null,
      duration_ms: null,
      album_art_url: null,
      preview_url: null
    })
    
    setShowConfirmation(false)
    setSelectedResult(null)
    setShowAISearch(false)
    setAiSearchResults([])
    setAiSearchQuery('')
  }

  const cancelAISearchResult = () => {
    setShowConfirmation(false)
    setSelectedResult(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Search Songs</h1>
          {band?.name && <p className="text-lg text-gray-600 mt-2">{band.name}</p>}
        </div>
        
        <div className="space-y-8">


          {/* Search Options Tabs */}
          <div className="card">
            <div className="flex space-x-1 p-1 bg-gray-100 rounded-lg">
              <button
                onClick={() => {
                  setShowManualForm(false)
                  setShowAISearch(false)
                  setEditableTrack(null)
                }}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  !showManualForm && !showAISearch
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Link className="w-4 h-4 mr-2 inline" />
                Spotify URL
              </button>
              <button
                onClick={() => {
                  setShowManualForm(false)
                  setShowAISearch(true)
                  setEditableTrack(null)
                }}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  showAISearch
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Bot className="w-4 h-4 mr-2 inline" />
                AI Search
              </button>
              <button
                onClick={() => {
                  setShowManualForm(true)
                  setShowAISearch(false)
                  setEditableTrack(null)
                }}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  showManualForm
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Music className="w-4 h-4 mr-2 inline" />
                Manual Entry
              </button>
            </div>
          </div>

          {/* Spotify URL Search */}
          {!showManualForm && !showAISearch && (
            <div className="card">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Add Spotify Song</h2>
              </div>

              <div className="mb-6">
                <label htmlFor="spotify-url" className="block text-sm font-medium text-gray-700 mb-2">
                  Paste Spotify Track URL or ID
                </label>
                <div className="flex space-x-2">
                  <div className="flex-1 relative">
                    <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      id="spotify-url"
                      type="text"
                      value={spotifyUrl}
                      onChange={(e) => setSpotifyUrl(e.target.value)}
                      className="input-field pl-10"
                      placeholder="https://open.spotify.com/track/... or 3n3Ppam7vgaVa1iaRUc9Lp"
                    />
                  </div>
                  <button
                    onClick={handleSpotifyUrlSubmit}
                    disabled={!spotifyUrl.trim() || isLoading}
                    className="btn-primary px-4 py-2"
                  >
                    {isLoading ? 'Loading...' : 'Load Track'}
                  </button>
                </div>
                {error && (
                  <p className="text-red-600 text-sm mt-2">{error}</p>
                )}
              </div>

              {/* Track Preview */}
              {editableTrack && (
                <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column - Track Info */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Song Title
                        </label>
                        <input
                          type="text"
                          value={editableTrack.title}
                          onChange={(e) => setEditableTrack({ ...editableTrack, title: e.target.value })}
                          className="input-field w-full"
                          placeholder="Enter song title"
                        />
                        {editableTrack.title !== 'Track from Spotify' && (
                          <p className="text-xs text-green-600 mt-1">✓ Extracted from Spotify</p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Artist
                        </label>
                        <input
                          type="text"
                          value={editableTrack.artist}
                          onChange={(e) => setEditableTrack({ ...editableTrack, artist: e.target.value })}
                          className="input-field w-full"
                          placeholder="Enter artist name"
                        />
                        {editableTrack.artist !== 'Unknown Artist' && (
                          <p className="text-xs text-green-600 mt-1">✓ Extracted from Spotify</p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Album
                        </label>
                        <input
                          type="text"
                          value={editableTrack.album}
                          onChange={(e) => setEditableTrack({ ...editableTrack, album: e.target.value })}
                          className="input-field w-full"
                          placeholder="Enter album name"
                        />
                      </div>
                    </div>

                    {/* Right Column - Album Art & Preview */}
                    <div className="space-y-4">
                      {editableTrack.album_art_url && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Album Art</label>
                          <img
                            src={editableTrack.album_art_url}
                            alt="Album art"
                            className="w-32 h-32 rounded-lg object-cover"
                          />
                        </div>
                      )}
                      
                      {editableTrack.preview_url && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
                          <audio controls className="w-full">
                            <source src={editableTrack.preview_url} type="audio/mpeg" />
                            Your browser does not support the audio element.
                          </audio>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={handleSpotifySuggest}
                      disabled={suggestSong.isPending}
                      className="btn-primary"
                    >
                      {suggestSong.isPending ? 'Suggesting...' : 'Suggest Song'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AI-Powered Search */}
          {showAISearch && (
            <div className="card">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">AI-Powered Song Search</h2>
                <div className="flex items-center space-x-2">
                  <Bot className="w-5 h-5 text-primary-600" />
                  <span className="text-sm text-gray-600">Powered by ChatGPT</span>
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="ai-search" className="block text-sm font-medium text-gray-700 mb-2">
                  Enter song title or description
                </label>
                <div className="flex space-x-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      id="ai-search"
                      type="text"
                      value={aiSearchQuery}
                      onChange={(e) => setAiSearchQuery(e.target.value)}
                      className="input-field pl-10"
                      placeholder="e.g., 'that song about love with the guitar solo' or 'Bohemian Rhapsody'"
                    />
                  </div>
                  <button
                    onClick={handleAISearch}
                    disabled={!aiSearchQuery.trim() || isAISearching}
                    className="btn-primary px-4 py-2"
                  >
                    {isAISearching ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Bot className="w-4 h-4 mr-2" />
                        AI Search
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  ChatGPT will analyze your description and find the most likely song matches
                </p>
                {aiError && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">
                      <strong>AI Search Error:</strong> {aiError}
                    </p>
                    <button
                      onClick={clearError}
                      className="text-xs text-red-600 hover:text-red-800 mt-1 underline"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>

              {/* AI Search Results */}
              {aiSearchResults.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Search Results</h3>
                  {aiSearchResults.map((result, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleAISearchResult(result)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{result.title}</h4>
                          <p className="text-gray-600">{result.artist}</p>
                          {result.album && (
                            <p className="text-sm text-gray-500">{result.album}</p>
                          )}
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            {result.year && <span>{result.year}</span>}
                            {result.genre && <span>{result.genre}</span>}
                            <span className="text-green-600 font-medium">
                              {Math.round(result.confidence * 100)}% confidence
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <button className="btn-primary text-sm">
                            Use This Result
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}


            </div>
          )}

          {/* Manual Entry Form */}
          {showManualForm && (
            <div className="card">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Add Song Manually</h2>
              </div>

              <form onSubmit={handleSubmit(handleManualSuggest)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Song Title *
                    </label>
                    <input
                      {...register('title', { required: 'Song title is required' })}
                      className="input-field w-full"
                      placeholder="Enter song title"
                    />
                    {errors.title && (
                      <p className="text-red-600 text-sm mt-1">{errors.title.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Artist *
                    </label>
                    <input
                      {...register('artist', { required: 'Artist name is required' })}
                      className="input-field w-full"
                      placeholder="Enter artist name"
                    />
                    {errors.artist && (
                      <p className="text-red-600 text-sm mt-1">{errors.artist.message}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Album (Optional)
                  </label>
                  <input
                    {...register('album')}
                    className="input-field w-full"
                    placeholder="Enter album name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    {...register('notes')}
                    rows={3}
                    className="input-field w-full"
                    placeholder="Why should the band learn this song? Any practice notes?"
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowManualForm(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={suggestSong.isPending}
                    className="btn-primary"
                  >
                    {suggestSong.isPending ? 'Suggesting...' : 'Suggest Song'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* AI Search Result Confirmation Modal */}
      {showConfirmation && selectedResult && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Confirm Song Details</h3>
              <button
                onClick={cancelAISearchResult}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">AI Found This Song:</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Title:</span>
                    <span className="font-medium text-gray-900">{selectedResult.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Artist:</span>
                    <span className="font-medium text-gray-900">{selectedResult.artist}</span>
                  </div>
                  {selectedResult.album && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Album:</span>
                      <span className="font-medium text-gray-900">{selectedResult.album}</span>
                    </div>
                  )}
                  {selectedResult.year && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Year:</span>
                      <span className="font-medium text-gray-900">{selectedResult.year}</span>
                    </div>
                  )}
                  {selectedResult.genre && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Genre:</span>
                      <span className="font-medium text-gray-900">{selectedResult.genre}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Confidence:</span>
                    <span className="font-medium text-green-600">
                      {Math.round(selectedResult.confidence * 100)}%
                    </span>
                  </div>
                </div>
              </div>
              
              {selectedResult.reasoning && (
                <div className="text-sm text-gray-600">
                  <strong>AI Reasoning:</strong> {selectedResult.reasoning}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelAISearchResult}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={confirmAISearchResult}
                className="btn-primary flex items-center"
              >
                <Check className="w-4 h-4 mr-2" />
                Use These Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}