# ChatGPT Integration Setup

## Overview
The song search feature now includes AI-powered search using ChatGPT to find song details when users only know partial information (like a song title or description).

## Setup Instructions

### 1. Get OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Create a new API key
4. Copy the key (it starts with `sk-`)

### 2. Configure Environment Variable
Create a `.env` file in your project root (or add to existing one):

```bash
VITE_OPENAI_API_KEY=sk-your_actual_api_key_here
```

### 3. Restart Development Server
After adding the environment variable, restart your development server:

```bash
npm run dev
```

## How It Works

### AI Search Process
1. **User Input**: User types a song description (e.g., "that rock song with the guitar solo")
2. **ChatGPT Analysis**: The AI analyzes the description and searches its music knowledge
3. **Results**: Returns potential matches with confidence scores
4. **User Confirmation**: User reviews and confirms the correct song details
5. **Song Suggestion**: Confirmed details are loaded into the song suggestion form

### Example Queries That Work
- **Vague descriptions**: "That song about love with the guitar solo"
- **Partial titles**: "Bohemian" instead of "Bohemian Rhapsody"
- **Lyric snippets**: "Song about love and heartbreak"
- **Genre hints**: "Jazz song with saxophone"
- **Artist hints**: "That Beatles song about the long and winding road"

## Features

### Real-time AI Search
- Uses GPT-4 for accurate music identification
- Processes natural language descriptions
- Returns structured song data with confidence scores

### User Confirmation
- Shows all found details before applying
- Displays confidence scores and AI reasoning
- Allows users to accept or reject results

### Error Handling
- Graceful fallback if API calls fail
- Clear error messages for troubleshooting
- Rate limiting and API key validation

## Cost Considerations

- **API Calls**: Each search uses 1 API call to OpenAI
- **Model**: Uses GPT-4 for best accuracy
- **Tokens**: Approximately 100-200 tokens per search
- **Estimated Cost**: ~$0.01-0.02 per search (as of 2024)

## Troubleshooting

### Common Issues

1. **"OpenAI API key not configured"**
   - Check that `.env` file exists and has correct variable name
   - Ensure `VITE_` prefix is included
   - Restart development server after changes

2. **"API error: 401 Unauthorized"**
   - Verify API key is correct and active
   - Check if API key has sufficient credits
   - Ensure account is not suspended

3. **"Rate limit exceeded"**
   - Wait a few minutes before trying again
   - Check your OpenAI account usage limits

4. **"No valid JSON found in response"**
   - This is rare but can happen with malformed AI responses
   - Try rephrasing your search query
   - Contact support if issue persists

### Getting Help
- Check OpenAI's [API documentation](https://platform.openai.com/docs)
- Review your [OpenAI usage dashboard](https://platform.openai.com/usage)
- Ensure your account has sufficient credits

## Security Notes

- API keys are stored in environment variables (not in code)
- Keys are only sent to OpenAI's secure API endpoints
- No song search data is stored or logged by OpenAI
- User queries are processed but not retained for training

## Future Enhancements

- **Caching**: Store common search results to reduce API calls
- **Batch Processing**: Handle multiple searches in one API call
- **Custom Prompts**: Allow users to customize search behavior
- **Integration**: Connect with Spotify API for enhanced results
