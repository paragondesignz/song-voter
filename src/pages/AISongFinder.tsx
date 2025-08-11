import { useState, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useBand } from '@/hooks/useBands'
import { Header } from '@/components/Header'
import { BandSidebar } from '@/components/BandSidebar'
import { Bot, Send, Loader2, Music, Mic, ExternalLink, Clock, User, Disc3, Guitar, Info } from 'lucide-react'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export function AISongFinder() {
  const { bandId } = useParams<{ bandId: string }>()
  const { data: band } = useBand(bandId!)
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hello! I'm your AI Musicologist, an expert with encyclopedic knowledge of all songs, artists, albums, and music production details across all genres and eras. 

I can help you with:
• Song key and BPM analysis
• Lyrics and legal sources
• Streaming platform links
• Artist and album information
• Production details and session musicians
• Instrument and synth information
• Performance insights and cover tips
• "Making of" videos and trivia

What song would you like to learn about today?`,
      timestamp: new Date()
    }
  ])
  
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)
    setError(null)

    try {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY
      if (!apiKey) {
        throw new Error('OpenAI API key not configured')
      }

      const systemPrompt = `You are an expert musicologist with encyclopedic knowledge of all songs, artists, albums, and music production details across all genres and eras. When asked about a song, you provide detailed and accurate information useful for musicians, especially those interested in covering the song.

For each song requested, provide:

Song key and BPM
Lyrics: If full lyrics can be shared legally and are available, provide them. If not, do not provide full lyrics but instead offer a link to AZLyrics - https://www.azlyrics.com/search/?q=song+title
Links to official Spotify, YouTube, or other popular streaming platforms
Artist(s) information, including notable members and background
Album name and release year
Details about session musicians, songwriters, producers, and other contributors
Thumbnail or album art image
Information on instruments and synths used in the recording
Interesting or notable trivia related to the song's creation, impact, or covers
Any other relevant musical or production insights helpful for cover musicians. Any explanations or performance ideas. If there's any Youtube 'making of' videos about the song, provide those too.

Present the information clearly and concisely. If some details are unavailable, explain politely and offer alternative info if possible.`

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.map(msg => ({ role: msg.role, content: msg.content })),
            { role: 'user', content: userMessage.content }
          ],
          temperature: 0.7,
          max_tokens: 1500
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`)
      }

      const data = await response.json()
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.choices[0]?.message?.content || 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      
      const errorResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I'm sorry, I encountered an error: ${errorMessage}. Please try again or check your internet connection.`,
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, errorResponse])
    } finally {
      setIsLoading(false)
    }
  }

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">AI Musicologist Chat</h1>
          {band?.name && <p className="text-lg text-gray-600 mt-2">{band.name}</p>}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Chat Interface */}
            <div className="card h-[600px] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <Bot className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">AI Musicologist</h2>
                    <p className="text-sm text-gray-500">Expert music knowledge at your fingertips</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Music className="w-4 h-4" />
                  <span>Powered by GPT-4</span>
                </div>
              </div>
              
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.role === 'user'
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <div className="flex items-start space-x-2">
                        {message.role === 'assistant' && (
                          <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Bot className="w-4 h-4 text-primary-600" />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="whitespace-pre-wrap">{message.content}</div>
                          <div className={`text-xs mt-2 ${
                            message.role === 'user' ? 'text-primary-100' : 'text-gray-500'
                          }`}>
                            {formatTimestamp(message.timestamp)}
                          </div>
                        </div>
                        {message.role === 'user' && (
                          <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <User className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center">
                          <Bot className="w-4 h-4 text-primary-600" />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
                          <span className="text-sm text-gray-600">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
              
              {/* Input */}
              <div className="border-t border-gray-200 p-4">
                <form onSubmit={handleSubmit} className="flex space-x-3">
                  <div className="flex-1 relative">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="Ask about any song, artist, or music topic..."
                      className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      disabled={isLoading}
                    />
                    <Mic className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                  <button
                    type="submit"
                    disabled={!inputValue.trim() || isLoading}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send</span>
                  </button>
                </form>
                
                {error && (
                  <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                    Error: {error}
                  </div>
                )}
              </div>
            </div>

            {/* Example Questions */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Try asking about:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  onClick={() => setInputValue("What's the key and BPM of Bohemian Rhapsody by Queen?")}
                  className="text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="font-medium text-gray-900">Song Analysis</div>
                  <div className="text-sm text-gray-600">"What's the key and BPM of Bohemian Rhapsody?"</div>
                </button>
                
                <button
                  onClick={() => setInputValue("Tell me about the production of Hotel California by Eagles")}
                  className="text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="font-medium text-gray-900">Production Details</div>
                  <div className="text-sm text-gray-600">"Tell me about the production of Hotel California"</div>
                </button>
                
                <button
                  onClick={() => setInputValue("What instruments are used in Sweet Child O Mine by Guns N Roses?")}
                  className="text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="font-medium text-gray-900">Instrumentation</div>
                  <div className="text-sm text-gray-600">"What instruments are used in Sweet Child O Mine?"</div>
                </button>
                
                <button
                  onClick={() => setInputValue("Find me songs similar to Imagine by John Lennon")}
                  className="text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="font-medium text-gray-900">Song Discovery</div>
                  <div className="text-sm text-gray-600">"Find me songs similar to Imagine"</div>
                </button>
              </div>
            </div>

            {/* Features */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">What I can help you with:</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Music className="w-6 h-6 text-primary-600" />
                  </div>
                  <h4 className="font-medium text-gray-900 mb-2">Song Analysis</h4>
                  <p className="text-sm text-gray-600">Key, BPM, structure, and musical theory</p>
                </div>
                
                <div className="text-center p-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Disc3 className="w-6 h-6 text-primary-600" />
                  </div>
                  <h4 className="font-medium text-gray-900 mb-2">Production Details</h4>
                  <p className="text-sm text-gray-600">Recording techniques, instruments, and session info</p>
                </div>
                
                <div className="text-center p-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Guitar className="w-6 h-6 text-primary-600" />
                  </div>
                  <h4 className="font-medium text-gray-900 mb-2">Performance Tips</h4>
                  <p className="text-sm text-gray-600">Cover advice, practice techniques, and insights</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div>
            <BandSidebar bandId={bandId!} />
          </div>
        </div>
      </main>
    </div>
  )
}
