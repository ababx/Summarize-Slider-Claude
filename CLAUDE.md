# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a hybrid Chrome extension + Next.js application called "Summarize Slider" that provides webpage summarization with adjustable complexity levels. The architecture consists of two main components:

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
- `panel.html/js/css` - Side panel interface with complexity slider (ELI5/Standard/Expert)
- Extension communicates via Chrome message passing API

### Next.js API Backend
- `app/api/summarize/route.ts` - Main summarization endpoint using Perplexity Sonar API
- Deployed to Vercel at `v0-chromium-summarizer-extension.vercel.app`
- Handles three complexity levels with different prompt engineering

### Communication Flow
1. Extension panel triggers content extraction via content script
2. Background script sends extracted content to Next.js API
3. API processes content through Perplexity Sonar with complexity-specific prompts
4. Response rendered as markdown in panel with per-tab state storage

## Key Technical Details

- **Shadow DOM**: Panel uses shadow DOM for style isolation
- **Per-tab Storage**: Summaries and complexity preferences stored per browser tab
- **Content Extraction**: Smart content detection using hierarchical semantic selectors
- **State Management**: Extension state persisted across tab interactions
- **API Integration**: Uses `@ai-sdk/perplexity` for AI summarization

## Extension Development

To test extension changes:
1. Make changes to extension files in root directory
2. Reload extension in Chrome developer mode
3. For API changes, deploy to Vercel or test with local development server

The extension automatically adapts to API endpoint changes via the configured base URL in background.js.