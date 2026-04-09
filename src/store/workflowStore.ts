import { create } from 'zustand';
import type { PipelineStage, Token, WorkflowTask } from '@/types';

interface WorkflowStore {
  // ── State ──────────────────────────────────────────────────────────────────

  /** Raw text entered by the user. Source for TokenizerPanel and Groq analysis request. */
  input: string;

  /** Tokenized result array of input text. Each token includes ID, text, and color index. */
  tokens: Token[];

  /** Current pipeline stage. Display reference for overall UI (Pipeline Bar, panel status). */
  stage: PipelineStage;

  /** Accumulated text received from Groq SSE stream. Appended in chunks for real-time rendering. */
  streamedText: string;

  /** List of execution tasks extracted by Groq structured output. Consumed in TaskCard / TaskExecutor. */
  tasks: WorkflowTask[];

  /** System prompt + context string actually passed to Groq. Displayed in the transparency panel (PromptLog). */
  promptLog: string;

  // ── Actions ────────────────────────────────────────────────────────────────

  setInput: (input: string) => void;
  setTokens: (tokens: Token[]) => void;
  setStage: (stage: PipelineStage) => void;
  /** Accumulate SSE chunks after existing streamedText. */
  appendStreamedText: (chunk: string) => void;
  setTasks: (tasks: WorkflowTask[]) => void;
  setPromptLog: (log: string) => void;
  /** Reset all state to initial values. Called when starting a new input. */
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
