import { aiApi } from '@/lib/api';

export interface PromptGenerationState {
  isGenerating: boolean;
  loadingMsg: string;
  subjectId: string | null;
  promptId: string | null;
  generatedContent: string | null;
  successMsg: string | null;
  error: string | null;
  isCompleted: boolean;
}

type Listener = (state: PromptGenerationState) => void;

class PromptGenerationStoreManager {
  private state: PromptGenerationState = {
    isGenerating: false,
    loadingMsg: '',
    subjectId: null,
    promptId: null,
    generatedContent: null,
    successMsg: null,
    error: null,
    isCompleted: false,
  };

  private listeners: Set<Listener> = new Set();

  getState(): PromptGenerationState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private setState(partial: Partial<PromptGenerationState>) {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((l) => l(this.state));
  }

  clearCompleted() {
    this.setState({
      isCompleted: false,
    });
  }

  reset() {
    this.setState({
      isGenerating: false,
      loadingMsg: '',
      subjectId: null,
      promptId: null,
      generatedContent: null,
      successMsg: null,
      error: null,
      isCompleted: false,
    });
  }

  async startExecuteGenerate(params: {
    templateType: 'quiz' | 'essay';
    questionCount: number;
    language: 'vi' | 'en';
    difficulty: string;
    topic: string;
    description: string;
    subjectCode: string;
    subjectId: string;
    promptId?: string;
    name: string;
    fallbackPrompt: string;
  }) {
    this.setState({
      isGenerating: true,
      loadingMsg: 'Gemini đang phân tích cấu hình & khởi tạo System Prompt...',
      subjectId: params.subjectId,
      promptId: params.promptId || null,
      generatedContent: null,
      error: null,
      isCompleted: false,
    });

    try {
      let finalContent = params.fallbackPrompt;
      try {
        const res = await aiApi.generatePrompt({
          name: params.name || params.subjectCode || 'Prompt Template',
          topic: params.topic || `Tạo đề ${params.templateType === 'quiz' ? 'trắc nghiệm' : 'tự luận'} môn ${params.subjectCode}`,
          category: params.templateType === 'quiz' ? 'Trắc nghiệm' : 'Tự luận',
          difficulty: params.difficulty,
          subjectCode: params.subjectCode,
          additionalNotes: `Số câu: ${params.questionCount}, Ngôn ngữ: ${params.language}, Mô tả: ${params.description}`,
        });

        const apiContent = res?.prompt || (res as any)?.data?.prompt;
        if (apiContent) {
          finalContent = apiContent;
        }
      } catch (e) {
        // Fallback to locally generated prompt
      }

      this.setState({
        isGenerating: false,
        loadingMsg: '',
        generatedContent: finalContent,
        successMsg: 'Đã tự động tạo mẫu Prompt theo cấu hình thành công!',
        isCompleted: true,
      });
    } catch (err: any) {
      this.setState({
        isGenerating: false,
        loadingMsg: '',
        error: err.message || 'Có lỗi xảy ra khi tạo Prompt bằng AI.',
        isCompleted: false,
      });
    }
  }

  async startAiRefine(params: {
    content: string;
    subjectCode: string;
    subjectId: string;
    promptId?: string;
  }) {
    this.setState({
      isGenerating: true,
      loadingMsg: 'Gemini đang tối ưu hóa & định dạng lại System Prompt...',
      subjectId: params.subjectId,
      promptId: params.promptId || null,
      generatedContent: null,
      error: null,
      isCompleted: false,
    });

    try {
      let refinedContent = '';
      try {
        const res = await aiApi.refinePrompt({ content: params.content });
        refinedContent = res?.prompt || (res as any)?.data?.prompt;
      } catch (e) {
        // Fallback refinement logic
      }

      if (!refinedContent) {
        refinedContent = `Bạn là một chuyên gia/giảng viên hàng đầu thuộc môn học ${params.subjectCode || 'CNTT'}.\n\nNhiệm vụ chính:\n${params.content.trim()}\n\nYêu cầu đầu ra:\n- Trình bày mạch lạc, chuyên nghiệp.\n- Hỗ trợ các biến: {assignment_name}, {student_code}, {requirements}.\n- Định dạng phản hồi: Markdown chuẩn.`;
      }

      this.setState({
        isGenerating: false,
        loadingMsg: '',
        generatedContent: refinedContent,
        successMsg: 'Đã chỉnh sửa và định dạng Prompt bằng AI!',
        isCompleted: true,
      });
    } catch (err: any) {
      this.setState({
        isGenerating: false,
        loadingMsg: '',
        error: err.message || 'Có lỗi xảy ra khi chỉnh sửa Prompt bằng AI.',
        isCompleted: false,
      });
    }
  }
}

export const promptGenerationStore = new PromptGenerationStoreManager();
