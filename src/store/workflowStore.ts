import { create } from 'zustand';
import type { PipelineStage, Token, WorkflowTask } from '@/types';

interface WorkflowStore {
  // state
  input: string;
  tokens: Token[];
  stage: PipelineStage;
  streamedText: string;
  tasks: WorkflowTask[];
  promptLog: string;

  // actions
  setInput: (input: string) => void;
  setTokens: (tokens: Token[]) => void;
  setStage: (stage: PipelineStage) => void;
  appendStreamedText: (chunk: string) => void;
  setTasks: (tasks: WorkflowTask[]) => void;
  setPromptLog: (log: string) => void;
  reset: () => void;
}

const initialState = {
  input: '',
  tokens: [],
  stage: 'idle' as PipelineStage,
  streamedText: '',
  tasks: [],
  promptLog: '',
};

export const useWorkflowStore = create<WorkflowStore>((set) => ({
  ...initialState,

  setInput: (input) => set({ input }),
  setTokens: (tokens) => set({ tokens }),
  setStage: (stage) => set({ stage }),
  appendStreamedText: (chunk) =>
    set((state) => ({ streamedText: state.streamedText + chunk })),
  setTasks: (tasks) => set({ tasks }),
  setPromptLog: (log) => set({ promptLog: log }),
  reset: () => set(initialState),
}));
