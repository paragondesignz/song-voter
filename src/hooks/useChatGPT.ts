import { useState } from 'react'

export interface SongSearchResult {
  title: string
  artist: string
  album?: string
  year?: string
  genre?: string
  confidence: number
  reasoning?: string
}

interface ChatGPTResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
}

export function useChatGPT() {
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const searchSong = async (query: string): Promise<SongSearchResult[]> => {
    setIsSearching(true)
    setError(null)

    try {
      // Debug: Log all environment variables
      console.log('Environment variables:', {
        VITE_OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY,
        VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
        VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
        NODE_ENV: import.meta.env.NODE_ENV,
        MODE: import.meta.env.MODE
      })

      // You'll need to set this environment variable
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY
      if (!apiKey) {
        throw new Error('OpenAI API key not configured')
      }

      const prompt = `You are a music expert. Based on this description: "${query}", find the most likely song matches. 

Return ONLY a JSON array with this exact format (no other text):
[
  {
    "title": "Exact Song Title",
    "artist": "Exact Artist Name", 
    "album": "Album Name if known",
    "year": "Year if known",
    "genre": "Genre if known",
    "confidence": 0.95,
    "reasoning": "Brief explanation of why this matches"
  }
]

Focus on accuracy. If you're not confident about a match, use a lower confidence score (0.1-0.5). 
Only include results you're reasonably sure about.`

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are a music expert assistant that helps identify songs based on descriptions.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 1000
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`)
      }

      const data: ChatGPTResponse = await response.json()
      const content = data.choices[0]?.message?.content

      if (!content) {
        throw new Error('No response from ChatGPT')
      }

      // Parse the JSON response
      let results: SongSearchResult[]
      try {
        // Extract JSON from the response (in case there's extra text)
        const jsonMatch = content.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          results = JSON.parse(jsonMatch[0])
        } else {
          throw new Error('No valid JSON found in response')
        }
      } catch (parseError) {
        console.error('Failed to parse ChatGPT response:', content)
        throw new Error('Invalid response format from ChatGPT')
      }

      // Validate and clean the results
      results = results.filter(result => 
        result.title && 
        result.artist && 
        typeof result.confidence === 'number' &&
        result.confidence >= 0 &&
        result.confidence <= 1
      )

      return results

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('ChatGPT search failed:', err)
      return []
    } finally {
      setIsSearching(false)
    }
  }

  return {
    searchSong,
    isSearching,
    error,
    clearError: () => setError(null)
  }
}
