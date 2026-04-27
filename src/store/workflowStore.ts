import { create } from 'zustand';
import type { PipelineStage, Token, WorkflowTask, NotionDatabase, SavedWorkflow } from '@/types';

interface WorkflowStore {
  // ── State ──────────────────────────────────────────────────────────────────

  /** 사용자가 입력한 원문 텍스트. */
  input: string;

  /** 입력 텍스트를 토큰화한 결과 배열. */
  tokens: Token[];

  /** 현재 파이프라인 단계. */
  stage: PipelineStage;

  /** SSE 스트림으로 수신된 텍스트 누적값. */
  streamedText: string;

  /** 추출된 실행 태스크 목록. TaskCard / TaskExecutor에서 소비. */
  tasks: WorkflowTask[];

  /** 실제 LLM에 전달된 system prompt. PromptLog에 표시. */
  promptLog: string;

  /** 에러 메시지. stage === 'error'일 때 ErrorBanner에서 소비. */
  errorMessage: string | null;

  /** Notion 워크스페이스에서 선택된 대상 DB ID. */
  notionTargetDatabaseId: string | null;

  /** 연결된 Notion DB 목록. NotionBrowser에서 소비. */
  notionDatabases: NotionDatabase[];

  /** localStorage에 저장된 워크플로우 목록. */
  savedWorkflows: SavedWorkflow[];

  /** 헤더에 입력된 GitHub 레포 (owner/repo 형식). */
  githubRepo: string;

  // ── Actions ────────────────────────────────────────────────────────────────

  setInput: (input: string) => void;
  setTokens: (tokens: Token[]) => void;
  setStage: (stage: PipelineStage) => void;
  /** SSE 청크를 기존 streamedText 뒤에 누적한다. */
  appendStreamedText: (chunk: string) => void;
  /** 새 분석 시작 전 이전 streamedText를 초기화한다. */
  clearStreamedText: () => void;
  setTasks: (tasks: WorkflowTask[]) => void;
  setPromptLog: (log: string) => void;
  setErrorMessage: (message: string | null) => void;
  setNotionTargetDatabaseId: (id: string | null) => void;
  setNotionDatabases: (dbs: NotionDatabase[]) => void;
  setSavedWorkflows: (workflows: SavedWorkflow[]) => void;
  setGithubRepo: (repo: string) => void;
  /** 모든 상태를 초기값으로 되돌린다. 새 입력 시작 시 호출. */
  reset: () => void;
}

const initialState = {
  input: '',
  tokens: [],
  stage: 'idle' as PipelineStage,
  streamedText: '',
  tasks: [],
  promptLog: '',
  errorMessage: null as string | null,
  notionTargetDatabaseId: null as string | null,
  notionDatabases: [] as NotionDatabase[],
  savedWorkflows: [] as SavedWorkflow[],
  githubRepo: '',
};

export const useWorkflowStore = create<WorkflowStore>((set) => ({
  ...initialState,

  setInput: (input) => set({ input }),
  setTokens: (tokens) => set({ tokens }),
  setStage: (stage) => set({ stage }),
  appendStreamedText: (chunk) =>
    set((state) => ({ streamedText: state.streamedText + chunk })),
  clearStreamedText: () => set({ streamedText: '' }),
  setTasks: (tasks) => set({ tasks }),
  setPromptLog: (log) => set({ promptLog: log }),
  setErrorMessage: (message) => set({ errorMessage: message }),
  setNotionTargetDatabaseId: (id) => set({ notionTargetDatabaseId: id }),
  setNotionDatabases: (dbs) => set({ notionDatabases: dbs }),
  setSavedWorkflows: (workflows) => set({ savedWorkflows: workflows }),
  setGithubRepo: (repo) => set({ githubRepo: repo }),
  reset: () => set(initialState),
}));
