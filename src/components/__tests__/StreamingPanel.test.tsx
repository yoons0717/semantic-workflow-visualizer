import { render, screen } from '@testing-library/react';
import { renderLine } from '../StreamingPanel';

describe('renderLine', () => {
  describe('섹션 헤더 (**text**)', () => {
    it('**텍스트** 형식을 헤더로 렌더링한다', () => {
      render(renderLine('**Intent Analysis:**', 0));
      expect(screen.getByText('Intent Analysis:')).toBeInTheDocument();
    });

    it('** 마커를 제거하고 텍스트만 표시한다', () => {
      render(renderLine('**Entity Extraction:**', 0));
      const el = screen.getByText('Entity Extraction:');
      expect(el.textContent).toBe('Entity Extraction:');
    });

    it('앞뒤 공백이 있어도 헤더로 인식한다', () => {
      render(renderLine('  **Executability Assessment:**  ', 0));
      expect(screen.getByText('Executability Assessment:')).toBeInTheDocument();
    });
  });

  describe('마크다운 헤딩 (## / ###)', () => {
    it('## 헤딩을 # 마커 없이 헤더로 렌더링한다', () => {
      render(renderLine('## Intent Analysis', 0));
      expect(screen.getByText('Intent Analysis')).toBeInTheDocument();
      expect(screen.queryByText(/^##/)).not.toBeInTheDocument();
    });

    it('### 헤딩도 동일하게 처리한다', () => {
      render(renderLine('### [Issue 1] Null Pointer', 0));
      expect(screen.getByText('[Issue 1] Null Pointer')).toBeInTheDocument();
      expect(screen.queryByText(/^###/)).not.toBeInTheDocument();
    });
  });

  describe('bold 레이블 + 설명 (**Label**: desc)', () => {
    it('**Label**: description 형식을 분리해 렌더링한다', () => {
      render(renderLine('**Impact**: Application will crash', 0));
      expect(screen.getByText('Impact')).toBeInTheDocument();
      expect(screen.getByText(/Application will crash/)).toBeInTheDocument();
    });

    it('콜론 없는 **Label** desc 형식도 처리한다', () => {
      render(renderLine('**Severity** High priority issue', 0));
      expect(screen.getByText('Severity')).toBeInTheDocument();
      expect(screen.getByText(/High priority issue/)).toBeInTheDocument();
    });
  });

  describe('번호 리스트 (1. **bold**: rest)', () => {
    it('번호, bold 항목명, 설명을 분리해 렌더링한다', () => {
      render(renderLine('1. **Authentication**: Authenticate with the API', 0));
      expect(screen.getByText('Authentication')).toBeInTheDocument();
      expect(screen.getByText(/Authenticate with the API/)).toBeInTheDocument();
    });

    it('번호가 2 이상이어도 정상 파싱한다', () => {
      render(renderLine('3. **Error Handling**: Handle errors gracefully', 0));
      expect(screen.getByText('Error Handling')).toBeInTheDocument();
    });
  });

  describe('단순 번호 리스트 (1. text)', () => {
    it('bold 없는 번호 리스트를 렌더링한다', () => {
      render(renderLine('2. Send a message to the channel', 0));
      expect(screen.getByText(/Send a message to the channel/)).toBeInTheDocument();
    });

    it('번호를 표시한다', () => {
      render(renderLine('1. First item', 0));
      expect(screen.getByText('1.')).toBeInTheDocument();
    });
  });

  describe('불릿 리스트 (- item)', () => {
    it('- 로 시작하는 라인을 불릿 리스트로 렌더링한다', () => {
      render(renderLine('- Tool/Platform: Slack', 0));
      expect(screen.getByText(/Tool\/Platform: Slack/)).toBeInTheDocument();
    });

    it('불릿 마커(·)를 표시한다', () => {
      render(renderLine('- Some item', 0));
      expect(screen.getByText('·')).toBeInTheDocument();
    });

    it('불릿 내 inline bold를 렌더링한다', () => {
      render(renderLine('- **Critical**: must fix immediately', 0));
      expect(screen.getByText('Critical')).toBeInTheDocument();
      expect(screen.getByText(/must fix immediately/)).toBeInTheDocument();
    });
  });

  describe('inline bold (**word** 줄 중간)', () => {
    it('줄 중간 **bold** 마커를 제거하고 strong 태그로 렌더링한다', () => {
      render(renderLine('The **user** object is accessed without null check', 0));
      expect(screen.getByText('user')).toBeInTheDocument();
      expect(screen.queryByText(/\*\*/)).not.toBeInTheDocument();
    });

    it('여러 inline bold를 모두 처리한다', () => {
      render(renderLine('Both **title** and **body** fields are required', 0));
      expect(screen.getByText('title')).toBeInTheDocument();
      expect(screen.getByText('body')).toBeInTheDocument();
      expect(screen.queryByText(/\*\*/)).not.toBeInTheDocument();
    });
  });

  describe('빈 줄', () => {
    it('빈 문자열은 spacer div를 렌더링한다', () => {
      const { container } = render(renderLine('', 0));
      expect(container.firstChild).toHaveClass('h-1');
    });

    it('공백만 있는 라인도 spacer로 처리한다', () => {
      const { container } = render(renderLine('   ', 0));
      expect(container.firstChild).toHaveClass('h-1');
    });
  });

  describe('일반 텍스트', () => {
    it('패턴에 해당하지 않는 텍스트를 단락으로 렌더링한다', () => {
      render(renderLine('The user wants to send a Slack message.', 0));
      expect(screen.getByText('The user wants to send a Slack message.')).toBeInTheDocument();
    });
  });
});
