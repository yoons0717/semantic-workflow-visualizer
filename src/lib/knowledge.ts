export interface KnowledgeItem {
  id: string;
  label: string;
  category: "messaging" | "task" | "data" | "schedule";
  description: string;
}

export const KNOWLEDGE_BASE: KnowledgeItem[] = [
  { id: "slack-msg",        label: "Send Slack Message",    category: "messaging", description: "Post a message to a Slack channel or user." },
  { id: "jira-ticket",     label: "Create Jira Ticket",    category: "task",      description: "Create a bug, task, or story in a Jira project." },
  { id: "email-send",      label: "Compose/Send Email",    category: "messaging", description: "Send an email to one or more recipients." },
  { id: "calendar-event",  label: "Create Calendar Event", category: "schedule",  description: "Add an event or reminder to a calendar." },
  { id: "db-query",        label: "Query Database",        category: "data",      description: "Run a SQL query and retrieve records from a database." },
  { id: "code-review",     label: "Request Code Review",   category: "task",      description: "Open a pull request or request a review on GitHub." },
  { id: "file-upload",     label: "Upload File",           category: "data",      description: "Upload a document or file to storage." },
  { id: "notification",    label: "Send Notification",     category: "messaging", description: "Broadcast a push notification or alert to users." },
  { id: "report-gen",      label: "Generate Report",       category: "data",      description: "Create a summary report or analytics dashboard." },
  { id: "meeting-schedule", label: "Schedule Meeting",     category: "schedule",  description: "Schedule a meeting and send invites to attendees." },
];

export const CATEGORY_COLOR: Record<KnowledgeItem["category"], string> = {
  messaging: "#00d4a8",
  task:      "#f5a623",
  data:      "#4080f0",
  schedule:  "#8855ff",
};

/** 두 벡터 간 코사인 유사도 */
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
