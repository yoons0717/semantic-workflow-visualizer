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
    label: "Slack 메시지 전송",
    category: "messaging",
    keywords: ["slack", "message", "send", "channel", "notify", "chat", "팀", "메시지", "슬랙"],
    vector: [0.9, 0.1, 0.0, 0.8, 0.2, 0.0, 0.1, 0.0, 0.7, 0.0, 0.0, 0.1, 0.0, 0.0, 0.3, 0.0, 0.0, 0.1, 0.0, 0.5],
  },
  {
    id: "jira-ticket",
    label: "Jira 티켓 생성",
    category: "task",
    keywords: ["jira", "ticket", "issue", "task", "bug", "story", "sprint", "티켓", "이슈", "작업"],
    vector: [0.1, 0.9, 0.2, 0.0, 0.8, 0.1, 0.0, 0.7, 0.0, 0.0, 0.2, 0.0, 0.0, 0.6, 0.0, 0.1, 0.0, 0.0, 0.3, 0.0],
  },
  {
    id: "email-send",
    label: "이메일 작성/전송",
    category: "messaging",
    keywords: ["email", "mail", "send", "recipient", "subject", "이메일", "메일", "발송", "수신"],
    vector: [0.8, 0.0, 0.1, 0.6, 0.0, 0.2, 0.0, 0.0, 0.9, 0.0, 0.0, 0.0, 0.1, 0.0, 0.4, 0.0, 0.0, 0.2, 0.0, 0.3],
  },
  {
    id: "calendar-event",
    label: "캘린더 이벤트 생성",
    category: "schedule",
    keywords: ["calendar", "event", "schedule", "date", "time", "meeting", "캘린더", "일정", "날짜", "시간"],
    vector: [0.0, 0.1, 0.0, 0.2, 0.0, 0.9, 0.8, 0.0, 0.0, 0.7, 0.0, 0.0, 0.5, 0.0, 0.0, 0.6, 0.0, 0.0, 0.1, 0.2],
  },
  {
    id: "db-query",
    label: "데이터베이스 조회",
    category: "data",
    keywords: ["database", "query", "sql", "select", "data", "table", "record", "데이터", "조회", "쿼리"],
    vector: [0.0, 0.2, 0.9, 0.0, 0.1, 0.0, 0.0, 0.8, 0.0, 0.1, 0.7, 0.0, 0.0, 0.2, 0.0, 0.0, 0.6, 0.0, 0.0, 0.0],
  },
  {
    id: "code-review",
    label: "코드 리뷰 요청",
    category: "task",
    keywords: ["code", "review", "pr", "pull", "request", "github", "merge", "코드", "리뷰", "검토"],
    vector: [0.1, 0.8, 0.3, 0.0, 0.7, 0.0, 0.0, 0.6, 0.0, 0.0, 0.4, 0.9, 0.0, 0.5, 0.0, 0.0, 0.2, 0.0, 0.4, 0.0],
  },
  {
    id: "file-upload",
    label: "파일 업로드",
    category: "data",
    keywords: ["file", "upload", "storage", "document", "attach", "파일", "업로드", "첨부", "저장"],
    vector: [0.0, 0.1, 0.8, 0.0, 0.0, 0.1, 0.0, 0.9, 0.0, 0.0, 0.6, 0.3, 0.0, 0.0, 0.0, 0.0, 0.7, 0.0, 0.0, 0.1],
  },
  {
    id: "notification",
    label: "알림 발송",
    category: "messaging",
    keywords: ["notification", "alert", "push", "notify", "broadcast", "알림", "푸시", "공지", "발송"],
    vector: [0.7, 0.0, 0.0, 0.9, 0.1, 0.0, 0.0, 0.0, 0.6, 0.0, 0.0, 0.0, 0.0, 0.0, 0.8, 0.0, 0.0, 0.3, 0.0, 0.4],
  },
  {
    id: "report-gen",
    label: "보고서 생성",
    category: "data",
    keywords: ["report", "generate", "summary", "analytics", "chart", "보고서", "리포트", "요약", "분석"],
    vector: [0.0, 0.3, 0.7, 0.0, 0.2, 0.0, 0.0, 0.5, 0.0, 0.0, 0.9, 0.4, 0.0, 0.3, 0.0, 0.0, 0.5, 0.0, 0.1, 0.0],
  },
  {
    id: "meeting-schedule",
    label: "미팅 스케줄링",
    category: "schedule",
    keywords: ["meeting", "schedule", "invite", "attendee", "zoom", "미팅", "회의", "초대", "참석자"],
    vector: [0.2, 0.0, 0.0, 0.3, 0.0, 0.8, 0.9, 0.0, 0.1, 0.8, 0.0, 0.0, 0.6, 0.0, 0.2, 0.7, 0.0, 0.0, 0.0, 0.3],
  },
];

/**
 * 입력 토큰 텍스트 집합과 각 항목의 keywords 집합 간 Jaccard 유사도 계산.
 * 임베딩 API 없이 브라우저에서 비용 제로로 동작.
 */
export function computeSimilarities(
  inputTokenTexts: string[],
  items: KnowledgeItem[]
): Record<string, number> {
  const result: Record<string, number> = {};

  // 토큰 텍스트를 소문자 단어 집합으로 변환
  const inputWords = new Set(
    inputTokenTexts
      .flatMap((t) => t.toLowerCase().split(/[\s\W]+/))
      .filter(Boolean)
  );

  for (const item of items) {
    const keywordSet = new Set(item.keywords.map((k) => k.toLowerCase()));

    const intersection = [...inputWords].filter((w) => keywordSet.has(w)).length;
    const union = new Set([...inputWords, ...keywordSet]).size;

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
