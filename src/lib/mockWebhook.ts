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

export async function executeTask(task: WorkflowTask): Promise<WebhookResult> {
  await delay(MOCK_DELAYS[task.type]);
  return {
    success: true,
    message: MOCK_MESSAGES[task.type](task.payload),
  };
}
