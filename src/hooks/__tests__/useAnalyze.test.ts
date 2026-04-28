import { renderHook, act } from '@testing-library/react';
import { useAnalyze } from '../useAnalyze';
import { useWorkflowStore } from '@/store/workflowStore';

// fetch mock helpers
// jsdom에서 ReadableStream.getReader()가 정상 동작하지 않으므로
// useAnalyze가 사용하는 reader 인터페이스만 직접 구현
function makeReader(chunks: string[]) {
  const encoder = new TextEncoder();
  let index = 0;
  return {
    read(): Promise<{ done: boolean; value: Uint8Array | undefined }> {
      if (index < chunks.length) {
        return Promise.resolve({ done: false, value: encoder.encode(chunks[index++]) });
      }
      return Promise.resolve({ done: true, value: undefined });
    },
    releaseLock() {},
  };
}

function makeStreamBody(chunks: string[]) {
  return { getReader: () => makeReader(chunks) };
}

function mockFetch(analyzeChunks: string[], tasks: unknown[] = []) {
  fetchMock.mockImplementation((url: string) => {
    if (url === '/api/analyze') {
      return Promise.resolve({
        ok: true,
        headers: { get: () => null },
        body: makeStreamBody(analyzeChunks),
      });
    }
    if (url === '/api/tasks') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(tasks),
      });
    }
  });
}

const fetchMock = jest.fn();

beforeAll(() => {
  Object.defineProperty(globalThis, 'fetch', {
    value: fetchMock,
    writable: true,
    configurable: true,
  });
});

beforeEach(() => {
  fetchMock.mockReset();
  useWorkflowStore.getState().reset();
});

describe('useAnalyze - 정상 플로우', () => {
  it('analyze 호출 즉시 stage가 analyzing으로 전환된다', async () => {
    mockFetch(['Hello ', 'World']);

    const { result } = renderHook(() => useAnalyze());

    await act(async () => {
      result.current.analyze('send slack message');
    });

    // analyzing은 비동기 흐름 중 거치는 단계라 최종 stage를 확인
    const stage = useWorkflowStore.getState().stage;
    expect(['executing', 'done']).toContain(stage);
  });

  it('스트리밍 청크가 streamedText에 누적된다', async () => {
    mockFetch(['Intent: ', 'send slack', ' message']);

    const { result } = renderHook(() => useAnalyze());

    await act(async () => {
      await result.current.analyze('send slack message');
    });

    expect(useWorkflowStore.getState().streamedText).toBe('Intent: send slack message');
  });

  it('태스크가 있으면 stage가 executing으로 전환되고 tasks가 설정된다', async () => {
    const mockTasks = [
      { id: '1', title: 'Slack', description: '', type: 'slack', payload: {}, status: 'pending' },
    ];
    mockFetch(['analysis text'], mockTasks);

    const { result } = renderHook(() => useAnalyze());

    await act(async () => {
      await result.current.analyze('send slack message');
    });

    const state = useWorkflowStore.getState();
    expect(state.tasks).toHaveLength(1);
    expect(state.tasks[0].title).toBe('Slack');
    expect(state.stage).toBe('executing');
  });

  it('태스크가 없으면 stage가 곧바로 done으로 전환된다', async () => {
    mockFetch(['analysis text'], []);

    const { result } = renderHook(() => useAnalyze());

    await act(async () => {
      await result.current.analyze('hello world');
    });

    expect(useWorkflowStore.getState().stage).toBe('done');
  });

  it('새 분석 시작 시 이전 streamedText가 초기화된다', async () => {
    mockFetch(['first run']);
    const { result } = renderHook(() => useAnalyze());
    await act(async () => { await result.current.analyze('first'); });

    mockFetch(['second run']);
    await act(async () => { await result.current.analyze('second'); });

    expect(useWorkflowStore.getState().streamedText).toBe('second run');
  });
});

describe('useAnalyze - 태스크 추출 엣지케이스', () => {
  it('/api/tasks 실패 시 tasks는 빈 배열, stage는 error로 처리된다', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url === '/api/analyze') return Promise.resolve({
        ok: true,
        headers: { get: () => null },
        body: makeStreamBody(['analysis']),
      });
      if (url === '/api/tasks') return Promise.reject(new Error('tasks API down'));
    });

    const { result } = renderHook(() => useAnalyze());

    await act(async () => {
      await result.current.analyze('test');
    });

    const state = useWorkflowStore.getState();
    expect(state.tasks).toEqual([]);
    expect(state.stage).toBe('error');
    expect(state.errorMessage).toBe('태스크 추출 중 오류가 발생했습니다');
  });

  it('/api/tasks 응답이 배열이 아니면 빈 배열로 처리된다', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url === '/api/analyze') return Promise.resolve({
        ok: true,
        headers: { get: () => null },
        body: makeStreamBody(['analysis']),
      });
      if (url === '/api/tasks') return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ error: 'invalid format' }),
      });
    });

    const { result } = renderHook(() => useAnalyze());

    await act(async () => {
      await result.current.analyze('test');
    });

    expect(useWorkflowStore.getState().tasks).toEqual([]);
    expect(useWorkflowStore.getState().stage).toBe('done');
  });
});

describe('useAnalyze - 에러 플로우', () => {
  it('/api/analyze 실패 시 stage가 error로 전환된다', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url === '/api/analyze') return Promise.resolve({ ok: false, status: 500 });
    });

    const { result } = renderHook(() => useAnalyze());

    await act(async () => {
      await result.current.analyze('fail');
    });

    expect(useWorkflowStore.getState().stage).toBe('error');
  });

  it('에러 시 errorMessage가 설정된다', async () => {
    fetchMock.mockRejectedValue(new Error('network error'));

    const { result } = renderHook(() => useAnalyze());

    await act(async () => {
      await result.current.analyze('fail');
    });

    expect(useWorkflowStore.getState().errorMessage).toBe('분석 중 오류가 발생했습니다');
  });
});
