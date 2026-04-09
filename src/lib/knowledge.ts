export interface KnowledgeItem {
  id: string;
  label: string;
  category: "messaging" | "task" | "data" | "schedule";
  keywords: string[];
  /** 20차원 데모용 하드코딩 벡터 */
  vector: number[];
}

export const KNOWLEDGE_BASE: KnowledgeItem[] = [
  {
    id: "slack-msg",
    label: "Send Slack Message",
    category: "messaging",
    keywords: ["slack", "message", "send", "channel", "notify", "chat", "team"],
    vector: [0.9, 0.1, 0.0, 0.8, 0.2, 0.0, 0.1, 0.0, 0.7, 0.0, 0.0, 0.1, 0.0, 0.0, 0.3, 0.0, 0.0, 0.1, 0.0, 0.5],
  },
  {
    id: "jira-ticket",
    label: "Create Jira Ticket",
    category: "task",
    keywords: ["jira", "ticket", "issue", "task", "bug", "story", "sprint"],
    vector: [0.1, 0.9, 0.2, 0.0, 0.8, 0.1, 0.0, 0.7, 0.0, 0.0, 0.2, 0.0, 0.0, 0.6, 0.0, 0.1, 0.0, 0.0, 0.3, 0.0],
  },
  {
    id: "email-send",
    label: "Compose/Send Email",
    category: "messaging",
    keywords: ["email", "mail", "send", "recipient", "subject", "inbox", "compose"],
    vector: [0.8, 0.0, 0.1, 0.6, 0.0, 0.2, 0.0, 0.0, 0.9, 0.0, 0.0, 0.0, 0.1, 0.0, 0.4, 0.0, 0.0, 0.2, 0.0, 0.3],
  },
  {
    id: "calendar-event",
    label: "Create Calendar Event",
    category: "schedule",
    keywords: ["calendar", "event", "schedule", "date", "time", "meeting", "reminder"],
    vector: [0.0, 0.1, 0.0, 0.2, 0.0, 0.9, 0.8, 0.0, 0.0, 0.7, 0.0, 0.0, 0.5, 0.0, 0.0, 0.6, 0.0, 0.0, 0.1, 0.2],
  },
  {
    id: "db-query",
    label: "Query Database",
    category: "data",
    keywords: ["database", "query", "sql", "select", "data", "table", "record", "fetch"],
    vector: [0.0, 0.2, 0.9, 0.0, 0.1, 0.0, 0.0, 0.8, 0.0, 0.1, 0.7, 0.0, 0.0, 0.2, 0.0, 0.0, 0.6, 0.0, 0.0, 0.0],
  },
  {
    id: "code-review",
    label: "Request Code Review",
    category: "task",
    keywords: ["code", "review", "pr", "pull", "request", "github", "merge", "diff"],
    vector: [0.1, 0.8, 0.3, 0.0, 0.7, 0.0, 0.0, 0.6, 0.0, 0.0, 0.4, 0.9, 0.0, 0.5, 0.0, 0.0, 0.2, 0.0, 0.4, 0.0],
  },
  {
    id: "file-upload",
    label: "Upload File",
    category: "data",
    keywords: ["file", "upload", "storage", "document", "attach", "save", "bucket"],
    vector: [0.0, 0.1, 0.8, 0.0, 0.0, 0.1, 0.0, 0.9, 0.0, 0.0, 0.6, 0.3, 0.0, 0.0, 0.0, 0.0, 0.7, 0.0, 0.0, 0.1],
  },
  {
    id: "notification",
    label: "Send Notification",
    category: "messaging",
    keywords: ["notification", "alert", "push", "notify", "broadcast", "announce"],
    vector: [0.7, 0.0, 0.0, 0.9, 0.1, 0.0, 0.0, 0.0, 0.6, 0.0, 0.0, 0.0, 0.0, 0.0, 0.8, 0.0, 0.0, 0.3, 0.0, 0.4],
  },
  {
    id: "report-gen",
    label: "Generate Report",
    category: "data",
    keywords: ["report", "generate", "summary", "analytics", "chart", "dashboard", "export"],
    vector: [0.0, 0.3, 0.7, 0.0, 0.2, 0.0, 0.0, 0.5, 0.0, 0.0, 0.9, 0.4, 0.0, 0.3, 0.0, 0.0, 0.5, 0.0, 0.1, 0.0],
  },
  {
    id: "meeting-schedule",
    label: "Schedule Meeting",
    category: "schedule",
    keywords: ["meeting", "schedule", "invite", "attendee", "zoom", "call", "conference"],
    vector: [0.2, 0.0, 0.0, 0.3, 0.0, 0.8, 0.9, 0.0, 0.1, 0.8, 0.0, 0.0, 0.6, 0.0, 0.2, 0.7, 0.0, 0.0, 0.0, 0.3],
  },
];

/**
 * 입력 단어 집합과 각 항목의 keywords 집합 간 Jaccard 유사도 계산.
 * 임베딩 API 없이 브라우저에서 비용 제로로 동작.
 */
export function computeSimilarities(
  inputWords: string[],
  items: KnowledgeItem[]
): Record<string, number> {
  const result: Record<string, number> = {};

  const inputSet = new Set(inputWords.map((w) => w.toLowerCase()).filter(Boolean));

  for (const item of items) {
    const keywordSet = new Set(item.keywords.map((k) => k.toLowerCase()));

    const intersection = [...inputSet].filter((w) => keywordSet.has(w)).length;
    const union = new Set([...inputSet, ...keywordSet]).size;

    result[item.id] = union > 0 ? intersection / union : 0;
  }

  return result;
}

/** 두 벡터 간 코사인 유사도 (D3 force strength에 사용) */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? dot / denom : 0;
}
