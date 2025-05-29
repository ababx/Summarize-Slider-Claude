// Centralized prompt configuration for all complexity levels
// This is the single source of truth for all prompts used throughout the application

import fs from 'fs';
import path from 'path';

const promptsPath = path.join(process.cwd(), 'lib', 'prompts.json');
export const PROMPTS = JSON.parse(fs.readFileSync(promptsPath, 'utf8'));

// Function to get prompt by complexity level with URL replacement
export function getPrompt(complexity, url) {
  const prompt = PROMPTS[complexity] || PROMPTS.standard;
  return prompt.replace('{url}', url);
}

// Function to get all available complexity levels
export function getComplexityLevels() {
  return Object.keys(PROMPTS);
}

// Legacy aliases for backward compatibility
export const COMPLEXITY_PROMPTS = PROMPTS;