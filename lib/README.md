# Prompt Management

This directory contains the centralized prompt configuration for the Summarize Slider extension.

## Editing Prompts

To modify the prompts for ELI5, Standard, and Expert complexity levels:

1. **Single Location**: Edit `/lib/prompts.json`
2. **All prompts use the same format**: Use `{url}` as a placeholder for the webpage URL
3. **Complexity levels**:
   - `eli5`: Simple, child-friendly summaries (3-5 bullet points)
   - `standard`: Balanced summaries for general audience (5-8 bullet points) 
   - `expert`: Comprehensive, analytical summaries (8-12 bullet points)

## How it Works

- **Backend (route.ts)**: Imports prompts via `/lib/prompts.js` 
- **Frontend (panel.js)**: Loads prompts from `/lib/prompts.json` via fetch
- **Backward compatibility**: `phd` level automatically maps to `expert`

## Example Prompt Format

```json
{
  "eli5": "Create a short, simple summary of the content from {url} that a 10-year-old would understand...",
  "standard": "Summarize the content from {url} using insightful bullet points...",
  "expert": "Provide a comprehensive analytical summary of the content from {url}..."
}
```

After editing prompts.json, restart the extension to see changes.