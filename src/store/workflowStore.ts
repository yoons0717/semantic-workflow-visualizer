import { create } from 'zustand';
import type { PipelineStage, WorkflowTask, NotionDatabase } from '@/types';

interface WorkflowStore {
  // ── State ──────────────────────────────────────────────────────────────────

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

  /** 연결된 Notion DB 목록. TaskCard DB 셀렉터에서 소비. */
  notionDatabases: NotionDatabase[];

  /** GitHub 레포 (owner/repo 형식). GitHub PR 분석에서 사용. */
  githubRepo: string;

  /** GitHub PR 번호. GitHub PR 분석에서 사용. */
  githubPrNumber: string;

  // ── Actions ────────────────────────────────────────────────────────────────

  setStage: (stage: PipelineStage) => void;
  /** SSE 청크를 기존 streamedText 뒤에 누적한다. */
  appendStreamedText: (chunk: string) => void;
  /** 새 분석 시작 전 이전 streamedText를 초기화한다. */
  clearStreamedText: () => void;
  setTasks: (tasks: WorkflowTask[]) => void;
  setPromptLog: (log: string) => void;
  setErrorMessage: (message: string | null) => void;
  setNotionDatabases: (dbs: NotionDatabase[]) => void;
  setGithubRepo: (repo: string) => void;
  setGithubPrNumber: (pr: string) => void;
  /** 모든 상태를 초기값으로 되돌린다. 새 입력 시작 시 호출. */
  reset: () => void;
}

const initialState = {
  stage: 'idle' as PipelineStage,
  streamedText: '',
  tasks: [],
  promptLog: '',
  errorMessage: null as string | null,
  notionDatabases: [] as NotionDatabase[],
  githubRepo: '',
  githubPrNumber: '',
};

export const useWorkflowStore = create<WorkflowStore>((set) => ({
  ...initialState,

  setStage: (stage) => set({ stage }),
  appendStreamedText: (chunk) =>
    set((state) => ({ streamedText: state.streamedText + chunk })),
  clearStreamedText: () => set({ streamedText: '' }),
  setTasks: (tasks) => set({ tasks }),
  setPromptLog: (log) => set({ promptLog: log }),
  setErrorMessage: (message) => set({ errorMessage: message }),
  setNotionDatabases: (dbs) => set({ notionDatabases: dbs }),
  setGithubRepo: (repo) => set({ githubRepo: repo }),
  setGithubPrNumber: (pr) => set({ githubPrNumber: pr }),
  reset: () => set(initialState),
}));
