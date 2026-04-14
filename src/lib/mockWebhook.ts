import type { WorkflowTask } from '@/types';

export interface WebhookResult {
  success: boolean;
  message: string;
}

const MOCK_DELAYS: Record<WorkflowTask['type'], number> = {
  slack: 600,
  jira: 1200,
  email: 800,
  generic: 500,
};

const MOCK_MESSAGES: Record<WorkflowTask['type'], (payload: Record<string, string>) => string> = {
  slack: (p) => `Message sent to ${p.channel ?? '#general'}`,
  jira: (p) => `Ticket created: ${p.project ?? 'PROJ'}-${Math.floor(Math.random() * 900) + 100}`,
  email: (p) => `Email delivered to ${p.to ?? 'recipient'}`,
  generic: () => 'Task executed successfully',
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
    const data = await res.json();
    if (data.ok) {
      return { success: true, message: `Message sent to ${payload.channel ?? '#general'}` };
    }
  } catch {
    // fall through to mock
  }
  // SLACK_WEBHOOK_URL 없거나 오류 → mock fallback
  await delay(MOCK_DELAYS.slack);
  return { success: true, message: MOCK_MESSAGES.slack(payload) };
}

export async function executeTask(task: WorkflowTask): Promise<WebhookResult> {
  if (task.type === 'slack') {
    return executeSlackTask(task.payload);
  }
  await delay(MOCK_DELAYS[task.type]);
  return {
    success: true,
    message: MOCK_MESSAGES[task.type](task.payload),
  };
}
