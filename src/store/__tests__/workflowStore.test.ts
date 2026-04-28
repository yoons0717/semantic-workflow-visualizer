import { useWorkflowStore } from '../workflowStore';

beforeEach(() => {
  useWorkflowStore.getState().reset();
});

describe('appendStreamedText', () => {
  it('여러 청크를 순서대로 누적한다', () => {
    const { appendStreamedText } = useWorkflowStore.getState();
    appendStreamedText('Hello');
    appendStreamedText(', ');
    appendStreamedText('World');
    expect(useWorkflowStore.getState().streamedText).toBe('Hello, World');
  });

  it('clearStreamedText 후 다시 append하면 이전 내용 없이 새로 시작한다', () => {
    const { appendStreamedText, clearStreamedText } = useWorkflowStore.getState();
    appendStreamedText('old content');
    clearStreamedText();
    appendStreamedText('new');
    expect(useWorkflowStore.getState().streamedText).toBe('new');
  });
});

describe('reset', () => {
  it('분석 중 상태에서 reset하면 모든 파생 상태가 초기화된다', () => {
    const store = useWorkflowStore.getState();
    store.setInput('send slack message');
    store.setStage('error');
    store.appendStreamedText('partial stream');
    store.setErrorMessage('분석 중 오류가 발생했습니다');
    store.setNotionTargetDatabaseId('db-123');
    store.setGithubRepo('owner/repo');

    store.reset();

    const state = useWorkflowStore.getState();
    expect(state.input).toBe('');
    expect(state.stage).toBe('idle');
    expect(state.streamedText).toBe('');
    expect(state.errorMessage).toBeNull();
    expect(state.tasks).toEqual([]);
    expect(state.notionTargetDatabaseId).toBeNull();
    expect(state.githubRepo).toBe('');
  });

  it('reset 후 appendStreamedText가 정상 동작한다 (reset이 스트림 상태를 완전히 끊는다)', () => {
    const store = useWorkflowStore.getState();
    store.appendStreamedText('stale');
    store.reset();
    store.appendStreamedText('fresh');
    expect(useWorkflowStore.getState().streamedText).toBe('fresh');
  });
});

describe('setErrorMessage', () => {
  it('에러 발생 후 null 설정으로 배너를 숨길 수 있다', () => {
    const { setErrorMessage } = useWorkflowStore.getState();
    setErrorMessage('분석 중 오류가 발생했습니다');
    expect(useWorkflowStore.getState().errorMessage).toBe('분석 중 오류가 발생했습니다');

    setErrorMessage(null);
    expect(useWorkflowStore.getState().errorMessage).toBeNull();
  });
});
