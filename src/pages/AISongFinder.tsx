import { useParams } from 'react-router-dom'
import { useBand } from '@/hooks/useBands'
import { Header } from '@/components/Header'
import { BandSidebar } from '@/components/BandSidebar'
import { Bot, ExternalLink } from 'lucide-react'

export function AISongFinder() {
  const { bandId } = useParams<{ bandId: string }>()
  const { data: band } = useBand(bandId!)

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="AI Song Detail Finder" subtitle={band?.name} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Instructions */}
            <div className="card bg-blue-50 border-blue-200">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">How to use the AI Song Finder</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>• <strong>Ask questions:</strong> Type any music-related question in the chat interface</p>
                    <p>• <strong>Get recommendations:</strong> Ask for songs similar to your favorites or in specific genres</p>
                    <p>• <strong>Learn techniques:</strong> Get practice tips and music theory explanations</p>
                    <p>• <strong>Discover new music:</strong> Find artists and songs you might not know</p>
                    <p>• <strong>Practice guidance:</strong> Get exercises and learning resources for your skill level</p>
                    <p>• <strong>Open in new tab:</strong> Use the link below for a larger chat experience</p>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Chat Interface */}
            <div className="card">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">AI Song Detail Finder</h2>
                <div className="flex items-center space-x-2">
                  <Bot className="w-5 h-5 text-primary-600" />
                  <span className="text-sm text-gray-600">Powered by GPT</span>
                </div>
              </div>
              
              {/* GPT Embed */}
              <div className="p-4">
                <iframe
                  src="https://chatgpt.com/g/g-6899e85fd0348191aec344b0f99a72af-hands-off-musicologist"
                  width="100%"
                  height="600px"
                  frameBorder="0"
                  allow="clipboard-write"
                  className="rounded-lg border border-gray-200"
                  title="Hands Off Musicologist - AI Song Assistant"
                />
                
                <div className="mt-4 text-center">
                  <a
                    href="https://chatgpt.com/g/g-6899e85fd0348191aec344b0f99a72af-hands-off-musicologist"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 text-primary-600 hover:text-primary-700 font-medium"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Open in new tab</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Usage Tips */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">What the Hands Off Musicologist can help you with:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Song Discovery & Analysis</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Find songs similar to your favorites</li>
                    <li>• Discover new artists in your genre</li>
                    <li>• Get song recommendations for your skill level</li>
                    <li>• Analyze song structure and composition</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Practice & Learning</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Get practice tips for specific songs</li>
                    <li>• Learn about music theory concepts</li>
                    <li>• Find exercises to improve your skills</li>
                    <li>• Understand musical techniques and styles</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* About the AI */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">About Hands Off Musicologist</h3>
              <p className="text-gray-600 mb-3">
                This AI assistant is specifically trained to help musicians and bands with song discovery, 
                music theory, practice techniques, and musical insights. It can provide personalized 
                recommendations and guidance to enhance your musical journey.
              </p>
              <p className="text-gray-600">
                Simply type your questions in the chat interface above to get started. Whether you're 
                looking for new songs to practice, need help understanding a musical concept, or want 
                recommendations for your next rehearsal, the Hands Off Musicologist is here to help!
              </p>
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
