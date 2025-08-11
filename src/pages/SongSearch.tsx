import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useSpotifyEmbed, type SpotifyTrack } from '@/hooks/useSpotify'
import { useSuggestSong } from '@/hooks/useSongs'
import { useBand } from '@/hooks/useBands'
import { Header } from '@/components/Header'
import { 
  Music, 
  Plus,
  ExternalLink,
  Link,
  Bot,
  Search,
  Loader2
} from 'lucide-react'
import { SpotifyEmbed } from '@/components/SpotifyEmbed'

interface ManualSongForm {
  title: string
  artist: string
  album: string
  notes: string
}

interface AISearchResult {
  title: string
  artist: string
  album?: string
  year?: string
  genre?: string
  confidence: number
}

export function SongSearch() {
  const { bandId } = useParams<{ bandId: string }>()
  const navigate = useNavigate()
  const [showManualForm, setShowManualForm] = useState(false)
  const [showAISearch, setShowAISearch] = useState(false)
  const [spotifyUrl, setSpotifyUrl] = useState('')
  const [editableTrack, setEditableTrack] = useState<SpotifyTrack | null>(null)
  const [aiSearchQuery, setAiSearchQuery] = useState('')
  const [aiSearchResults, setAiSearchResults] = useState<AISearchResult[]>([])
  const [isAISearching, setIsAISearching] = useState(false)
  
  const { data: band } = useBand(bandId!)
  const { isLoading, error, handleUrlSubmit } = useSpotifyEmbed()
  const suggestSong = useSuggestSong()
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<ManualSongForm>()

  const formatDuration = (durationMs: number) => {
    const minutes = Math.floor(durationMs / 60000)
    const seconds = Math.floor((durationMs % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

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
        spotify_track_id: editableTrack.spotify_track_id,
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
    
    setIsAISearching(true)
    setAiSearchResults([])
    
    try {
      // This would integrate with your ChatGPT setup
      // For now, I'll simulate the AI search results
      // You can replace this with actual ChatGPT API calls
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Mock AI search results - replace with actual ChatGPT integration
      const mockResults: AISearchResult[] = [
        {
          title: aiSearchQuery,
          artist: "The Beatles",
          album: "Abbey Road",
          year: "1969",
          genre: "Rock",
          confidence: 0.95
        },
        {
          title: aiSearchQuery,
          artist: "Led Zeppelin",
          album: "Led Zeppelin IV",
          year: "1971",
          genre: "Rock",
          confidence: 0.87
        }
      ]
      
      setAiSearchResults(mockResults)
    } catch (error) {
      console.error('AI search failed:', error)
    } finally {
      setIsAISearching(false)
    }
  }

  const handleAISearchResult = (result: AISearchResult) => {
    setEditableTrack({
      title: result.title,
      artist: result.artist,
      album: result.album || '',
      spotify_track_id: null,
      duration_ms: null,
      album_art_url: null,
      preview_url: null
    })
    setShowAISearch(false)
    setAiSearchResults([])
    setAiSearchQuery('')
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
          {/* Instructions */}
          <div className="card bg-blue-50 border-blue-200">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">How to add songs to your band</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>• <strong>Spotify songs:</strong> Paste a Spotify track URL to automatically get song details</p>
                  <p>• <strong>AI-powered search:</strong> Use ChatGPT to find artist information when you only know the song title</p>
                  <p>• <strong>Manual entry:</strong> Click "Add Manually" to enter song details yourself</p>
                  <p>• <strong>Preview songs:</strong> Listen to 30-second previews before suggesting</p>
                  <p>• <strong>Add notes:</strong> Include practice notes or why you think the band should learn it</p>
                  <p>• <strong>After suggesting:</strong> You'll be taken to see all song suggestions and can start voting</p>
                </div>
              </div>
            </div>
          </div>

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
                  Paste Spotify Track URL
                </label>
                <div className="flex space-x-2">
                  <div className="flex-1 relative">
                    <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      id="spotify-url"
                      type="url"
                      value={spotifyUrl}
                      onChange={(e) => setSpotifyUrl(e.target.value)}
                      className="input-field pl-10"
                      placeholder="https://open.spotify.com/track/..."
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

              {/* AI Search Instructions */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">How AI Search Works</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• <strong>Vague descriptions work:</strong> "That rock song with the guitar solo"</li>
                  <li>• <strong>Partial titles:</strong> "Bohemian" instead of "Bohemian Rhapsody"</li>
                  <li>• <strong>Lyric snippets:</strong> "Song about love and heartbreak"</li>
                  <li>• <strong>Genre hints:</strong> "Jazz song with saxophone"</li>
                </ul>
              </div>
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
    </div>
  )
}