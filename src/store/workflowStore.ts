import { create } from 'zustand';
import type { PipelineStage, Token, WorkflowTask } from '@/types';

interface WorkflowStore {
  // ── State ──────────────────────────────────────────────────────────────────

  /** 사용자가 입력한 원문 텍스트. TokenizerPanel과 Groq 분석 요청의 원본 소스. */
  input: string;

  /** 입력 텍스트를 토큰화한 결과 배열. 각 토큰은 ID, 텍스트, 색상 인덱스를 포함. */
  tokens: Token[];

  /** 현재 파이프라인 단계. UI 전반(Pipeline Bar, 패널 상태)의 표시 기준. */
  stage: PipelineStage;

  /** Groq SSE 스트림으로 수신된 텍스트 누적값. 청크 단위로 append되어 실시간 렌더링에 사용. */
  streamedText: string;

  /** Groq structured output으로 추출된 실행 태스크 목록. TaskCard / TaskExecutor에서 소비. */
  tasks: WorkflowTask[];

  /** 실제 Groq에 전달된 system prompt + context 결합 문자열. 투명성 패널(PromptLog)에 표시. */
  promptLog: string;

  /** Jina AI 임베딩 기반 코사인 유사도. knowledge item id → 0~1 점수. VectorMap에서 소비. */
  similarities: Record<string, number>;

  /** 분석 실패 시 사용자에게 표시할 에러 메시지. stage === 'error'일 때 ErrorBanner에서 소비. */
  errorMessage: string | null;

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
  setSimilarities: (similarities: Record<string, number>) => void;
  setErrorMessage: (message: string | null) => void;
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
  similarities: {} as Record<string, number>,
  errorMessage: null as string | null,
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
  setSimilarities: (similarities) => set({ similarities }),
  setErrorMessage: (message) => set({ errorMessage: message }),
  reset: () => set(initialState),
}));
