import { createAnthropic } from '@ai-sdk/anthropic';

export const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const CLAUDE_MODEL = 'claude-sonnet-4-6';

export const SYSTEM_PROMPT = `You are an AI assistant that analyzes user text.
Identify and analyze the following from the input, then output in English:

[Intent Analysis]
Identify the user's primary intent and goal.

[Entity Extraction]
Extract specific entities such as tools, platforms, quantities, time, and targets.

[Executability Assessment]
Evaluate whether the request is automation-executable and briefly outline the necessary tasks.`;
