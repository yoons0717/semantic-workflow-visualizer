import { createGroq } from '@ai-sdk/groq';

const apiKey = process.env.GROQ_API_KEY;
if (!apiKey) throw new Error('GROQ_API_KEY environment variable is not set.');

export const groqProvider = createGroq({ apiKey });

export const GROQ_MODEL = 'llama-3.3-70b-versatile';

export const SYSTEM_PROMPT = `You are an AI assistant that analyzes user text.
Identify and analyze the following from the input, then output in English:

[Intent Analysis]
Identify the user's primary intent and goal.

[Entity Extraction]
Extract specific entities such as tools, platforms, quantities, time, and targets.

[Executability Assessment]
Evaluate whether the request is automation-executable and briefly outline the necessary tasks.`;
