export interface Token {
  id: number;
  text: string;
  colorIndex: number;
}

export type PipelineStage = 'idle' | 'tokenizing' | 'analyzing' | 'executing' | 'done' | 'error';

export type TaskType = 'slack' | 'jira' | 'email' | 'generic' | 'notion';

export interface WorkflowTask {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  payload: Record<string, string>;
  status: 'pending' | 'approved' | 'rejected' | 'running' | 'success' | 'failed';
  notionPageUrl?: string;
}

export interface NotionDatabase {
  id: string;
  title: string;
  icon?: string;
}

