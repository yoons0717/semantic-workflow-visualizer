import { encode, decode } from 'gpt-tokenizer';
import type { Token } from '@/types';

export function tokenizeText(text: string): Token[] {
  if (!text) return [];

  const ids = encode(text);

  return ids.map((id, i) => ({
    id,
    text: decode([id]),
    colorIndex: i % 5,
  }));
}
