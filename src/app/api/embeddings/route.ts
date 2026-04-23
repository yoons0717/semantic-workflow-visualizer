import { KNOWLEDGE_BASE, cosineSimilarity } from '@/lib/knowledge';

// module-level 캐시 — warm instance에서 재사용, cold start 1회만 계산
const embeddingCache = new Map<string, number[]>();

async function fetchEmbeddings(texts: string[]): Promise<number[][]> {
  const res = await fetch('https://api.jina.ai/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.JINA_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'jina-embeddings-v3',
      input: texts,
    }),
  });

  if (!res.ok) throw new Error(`Jina API error: ${res.status}`);

  const data = await res.json();
  return data.data.map((item: { embedding: number[] }) => item.embedding);
}

export async function POST(req: Request) {
  if (!process.env.JINA_API_KEY) {
    return Response.json({ error: "JINA_API_KEY not configured" }, { status: 500 });
  }

  try {
    const { text } = await req.json();
    if (!text?.trim()) return Response.json({ similarities: {} });

    // cold start: knowledge base 임베딩 일괄 계산 후 캐시
    if (embeddingCache.size === 0) {
      const labels = KNOWLEDGE_BASE.map((item) => item.label);
      const vectors = await fetchEmbeddings(labels);
      KNOWLEDGE_BASE.forEach((item, i) => {
        embeddingCache.set(item.id, vectors[i]);
      });
    }

    // 입력 텍스트 임베딩 1회 계산
    const [inputVec] = await fetchEmbeddings([text]);

    // 각 knowledge item과 코사인 유사도 계산
    const similarities: Record<string, number> = {};
    for (const item of KNOWLEDGE_BASE) {
      const knowledgeVec = embeddingCache.get(item.id);
      if (knowledgeVec) {
        similarities[item.id] = cosineSimilarity(inputVec, knowledgeVec);
      }
    }

    return Response.json({ similarities });
  } catch {
    return Response.json({ error: "Failed to compute embeddings" }, { status: 500 });
  }
}
