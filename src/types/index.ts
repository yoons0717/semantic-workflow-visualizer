export interface Token {
  id: number;
  text: string;
  colorIndex: number;
}

export type PipelineStage = 'idle' | 'tokenizing' | 'analyzing' | 'executing' | 'done' | 'error';

export interface WorkflowTask {
  id: string;
  title: string;
  description: string;
  type: 'slack' | 'jira' | 'email' | 'generic';
  payload: Record<string, string>;
  status: 'pending' | 'approved' | 'rejected' | 'running' | 'success' | 'failed';
}

