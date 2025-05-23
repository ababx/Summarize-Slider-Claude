# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a hybrid Chrome extension + Next.js application called "Summarize Slider" that provides webpage summarization with adjustable complexity levels and multi-provider AI support. The architecture consists of two main components:

1. **Chrome Extension** (MV3) - Browser extension files in root directory
2. **Next.js API Backend** - Serverless functions deployed to Vercel

## Development Commands

```bash
# Start Next.js development server
npm run dev

# Build Next.js application for production
npm run build

# Install dependencies
npm install
```

Note: The Chrome extension uses static files and requires no build process. Load the extension by pointing Chrome to the root directory in developer mode.

## Architecture Overview

### Chrome Extension Structure
- `manifest.json` - Extension configuration with MV3 format
- `background.js` - Service worker handling API calls and message routing between extension components
- `content.js` - Injected script that creates the side panel UI and extracts webpage content
- `panel.html/js/css` - Side panel interface with complexity slider (ELI5/Standard/Expert) and model selection
- `lib/content-security.js` - API key validation and security utilities
- `lib/crypto.js` - Encryption utilities for secure API key storage
- Extension communicates via Chrome message passing API

### Next.js API Backend
- `app/api/summarize/route.ts` - Main summarization endpoint supporting multiple AI providers
- Deployed to Vercel at `v0-chromium-summarizer-extension.vercel.app`
- Handles three complexity levels with different prompt engineering and dynamic token limits
- Supports custom prompts with {url} placeholder replacement

### Communication Flow
1. Extension panel triggers content extraction via content script
2. Background script sends extracted content to Next.js API with selected model and complexity
3. API processes content through selected AI provider with complexity-specific prompts and token limits
4. Response rendered as markdown in panel with per-tab state storage

## Key Technical Details

### UI/UX Features
- **Shadcn-style Design**: Modern popup interface with tabbed provider selection
- **Model Selection**: Support for multiple AI providers (OpenAI, Anthropic, Google, Perplexity, X.AI)
- **API Key Management**: Secure browser storage with masked display and edit/delete functionality
- **Custom Prompts**: Editable prompts for each complexity level with individual reset buttons
- **Typography**: Crimson Text font family for summary content with responsive sizing
- **Usage Tracking**: 25/month limit for system default model with unlimited usage for user API keys

### Technical Implementation
- **Shadow DOM**: Panel uses shadow DOM for style isolation
- **Per-tab Storage**: Summaries, complexity preferences, and API keys stored per browser tab
- **Content Extraction**: Smart content detection using hierarchical semantic selectors
- **State Management**: Extension state persisted across tab interactions
- **Content Security Policy**: CSP-compliant event handling without inline scripts
- **Base64 Encoding**: Secure API key storage with base64 encoding in Chrome storage
- **Dynamic Token Limits**: Complexity-based token allocation (ELI5: 800, Standard: 1000, Expert: 2000)

### AI Provider Integration
- **Multi-Provider Support**: OpenAI, Anthropic, Google Gemini, Perplexity, X.AI
- **System Default**: Gemini Flash 2.5 with system API key (rate-limited to 25/month per user)
- **User API Keys**: Unlimited usage when users provide their own API keys
- **Model Separation**: Complete separation between system default and user API key usage tracking
- **Fallback System**: Automatic fallback to Perplexity if other providers fail

## Environment Variables

### Required for Deployment
- `GOOGLE_API_KEY` - System Google API key for default Gemini Flash 2.5 model
- `PERPLEXITY_API_KEY` - Fallback API key for default summarization

## Extension Development

### Testing Changes
1. Make changes to extension files in root directory
2. Reload extension in Chrome developer mode
3. For API changes, deploy to Vercel or test with local development server

### Security Considerations
- API keys stored securely in Chrome storage with base64 encoding
- System API keys stored as environment variables (not in code)
- Usage rate limiting prevents abuse of system resources
- Content Security Policy compliance prevents XSS attacks

### Model Configuration
Models are configured in both frontend (`panel.js`) and backend (`app/api/summarize/route.ts`):

**System Default Models:**
- ID: `gemini-flash-2.5` → API: `gemini-2.5-flash-preview-05-20` (system key, rate-limited)

**User API Key Models:**
- ID: `gemini-flash-2.5-user` → API: `gemini-2.5-flash-preview-05-20` (user key, unlimited)
- ID: `google-gemini-2.5-flash` → API: `gemini-2.5-flash-preview-05-20` (legacy mapping)

### Usage Tracking Logic
- **System Default**: Counts against 25/month limit when using `isSystemDefault: true` AND no user API key
- **User API Keys**: Unlimited usage when user provides own API key for any provider
- **Separation**: Complete independence between system and user usage tracking

The extension automatically adapts to API endpoint changes via the configured base URL in background.js.

## Publishing Readiness

The extension is designed for public distribution with:
- Rate limiting to control costs
- User upgrade path to unlimited usage
- Secure API key handling
- Multi-provider flexibility
- Professional UI/UX design