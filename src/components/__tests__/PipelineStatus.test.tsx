import { render, screen } from '@testing-library/react';
import { useWorkflowStore } from '@/store/workflowStore';
import { PipelineStatus } from '../PipelineStatus';

beforeEach(() => {
  useWorkflowStore.getState().reset();
});

describe('PipelineStatus', () => {
  it('idle 상태에서 "Idle" 레이블을 표시한다', () => {
    render(<PipelineStatus />);
    expect(screen.getByText('Idle')).toBeInTheDocument();
  });

  it('analyzing 상태에서 "Analyzing ···" 레이블을 표시한다', () => {
    useWorkflowStore.getState().setStage('analyzing');
    render(<PipelineStatus />);
    expect(screen.getByText('Analyzing ···')).toBeInTheDocument();
  });

  it('done 상태에서 "Done" 레이블을 표시한다', () => {
    useWorkflowStore.getState().setStage('done');
    render(<PipelineStatus />);
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('error 상태에서 "Error" 레이블을 표시한다', () => {
    useWorkflowStore.getState().setStage('error');
    render(<PipelineStatus />);
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('5개 스텝 레이블을 모두 렌더링한다', () => {
    render(<PipelineStatus />);
    expect(screen.getByText('Input')).toBeInTheDocument();
    expect(screen.getByText('Tokenizing')).toBeInTheDocument();
    expect(screen.getByText('Semantic Analysis')).toBeInTheDocument();
    expect(screen.getByText('Task Extraction')).toBeInTheDocument();
    expect(screen.getByText('Execution')).toBeInTheDocument();
  });
});
