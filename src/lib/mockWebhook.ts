import type { WorkflowTask } from '@/types';

export interface WebhookResult {
  success: boolean;
  message: string;
  notionPageUrl?: string;
}

const MOCK_DELAYS: Record<WorkflowTask['type'], number> = {
  slack: 600,
  jira: 1200,
  email: 800,
  generic: 500,
  notion: 900,
};

const MOCK_MESSAGES: Record<WorkflowTask['type'], (payload: Record<string, string>) => string> = {
  slack: (p) => `Message sent to ${p.channel ?? '#general'}`,
  jira: (p) => `Ticket created: ${p.project ?? 'PROJ'}-${Math.floor(Math.random() * 900) + 100}`,
  email: (p) => `Email delivered to ${p.to ?? 'recipient'}`,
  generic: () => 'Task executed successfully',
  notion: (p) => `Created in Notion: ${p.title ?? 'Untitled'}`,
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function executeSlackTask(payload: Record<string, string>): Promise<WebhookResult> {
  try {
    const res = await fetch('/api/webhook/slack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: payload.channel, message: payload.message }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.ok) {
        return { success: true, message: `Message sent to ${payload.channel ?? '#general'}` };
      }
    }
  } catch {
    // fall through to mock
  }
  // SLACK_WEBHOOK_URL 없거나 오류 → mock fallback
  await delay(MOCK_DELAYS.slack);
  return { success: true, message: MOCK_MESSAGES.slack(payload) };
}

async function executeNotionTask(payload: Record<string, string>): Promise<WebhookResult> {
  const res = await fetch('/api/notion/rows', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      database_id: payload.database_id,
      title: payload.title,
      status: payload.status,
      priority: payload.priority,
      content: payload.content,
    }),
  });
  const data = await res.json();
  if (res.ok) {
    return {
      success: true,
      message: `Created in Notion: ${payload.title ?? 'Untitled'}`,
      notionPageUrl: (data as { url?: string }).url ?? undefined,
    };
  }
  return { success: false, message: (data as { error?: string }).error ?? 'Failed to create row' };
}

export async function executeTask(task: WorkflowTask): Promise<WebhookResult> {
  if (task.type === 'slack') return executeSlackTask(task.payload);
  if (task.type === 'notion') return executeNotionTask(task.payload);
  await delay(MOCK_DELAYS[task.type]);
  return {
    success: true,
    message: MOCK_MESSAGES[task.type](task.payload),
  };
}
