import { useEffect, useState, useCallback, memo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api, gradingApi, type AssignmentRow, type SubmissionRow, getStoredItem, AUTH_STORAGE_KEYS } from '@/lib/api'
import { FileText, UploadCloud, CheckCircle2, AlertCircle, Send, Loader2, Download, ChevronRight, Clock, Calendar, Check, Minus, Paperclip, Award, Sparkles, RotateCcw, Copy, Terminal } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { FormattedText } from '@/components/ui/FormattedText'
import { RubricRuleSpecViewer } from '@/components/modules/grading/evidence/RubricRuleSpecViewer'

const CodeBlockViewer = memo(function CodeBlockViewer({ code, language = 'code', onCopy, isCopied }: { code: string; language?: string; onCopy: () => void; isCopied: boolean }) {
  const codeLines = code.split('\n');

  return (
    <div className="my-5 rounded-2xl overflow-hidden border border-slate-800 bg-[#0d1117] shadow-xl">
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#161b22] border-b border-slate-800 text-xs font-mono text-slate-400">
        <span className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-wider">
          <Terminal size={14} /> {language}
        </span>
        <button
          onClick={onCopy}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors text-[11px] font-semibold border border-slate-700 shadow-sm"
        >
          {isCopied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
          <span>{isCopied ? 'Copied' : 'Copy code'}</span>
        </button>
      </div>

      <div className="p-4 max-h-[420px] overflow-y-auto overflow-x-auto text-xs sm:text-sm font-mono text-slate-100 leading-relaxed scrollbar-thin scrollbar-thumb-slate-700">
        <table className="w-full border-collapse">
          <tbody>
            {codeLines.map((line, lIdx) => (
              <tr key={lIdx} className="hover:bg-slate-800/40 transition-colors">
                <td className="select-none text-slate-600 text-right pr-4 py-0.5 w-10 text-[11px] font-mono border-r border-slate-800/80 shrink-0">
                  {lIdx + 1}
                </td>
                <td className="pl-4 py-0.5 whitespace-pre font-mono text-slate-200">
                  {line}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

const SmartAssignmentContent = memo(function SmartAssignmentContent({ content }: { content: string }) {
  const [copiedIdx, setCopiedIdx] = useState<string | number | null>(null);

  if (!content || !content.trim()) {
    return (
      <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
        <FileText className="w-10 h-10 mx-auto text-slate-400 mb-2" />
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">The lecturer has not provided a detailed description for this assignment.</p>
      </div>
    );
  }

  const handleCopy = (codeText: string, id: string | number) => {
    navigator.clipboard.writeText(codeText);
    setCopiedIdx(id);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const isHtml = /<[a-z][\s\S]*>/i.test(content);
  if (isHtml) {
    return (
      <div
        className="bg-slate-50/60 dark:bg-slate-900/40 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 leading-relaxed text-sm prose prose-slate dark:prose-invert max-w-none break-words overflow-hidden [&_pre]:bg-[#0d1117] [&_pre]:text-slate-100 [&_pre]:p-5 [&_pre]:rounded-2xl [&_pre]:border [&_pre]:border-slate-800 [&_pre]:max-h-[400px] [&_pre]:overflow-y-auto [&_code]:font-mono [&_code]:text-xs [&_h1]:text-xl [&_h1]:font-extrabold [&_h2]:text-lg [&_h2]:font-bold [&_h3]:text-base [&_h3]:font-bold"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  if (content.includes('```')) {
    return (
      <div className="prose prose-slate dark:prose-invert max-w-none break-words text-sm leading-relaxed">
        <ReactMarkdown
          components={{
            code({ node, inline, className, children, ...props }: any) {
              const match = /language-(\w+)/.exec(className || '');
              const codeString = String(children).replace(/\n$/, '');
              const codeId = Math.random().toString();
              const lang = match ? match[1] : 'code';
              if (!inline) {
                return (
                  <CodeBlockViewer
                    code={codeString}
                    language={lang}
                    onCopy={() => handleCopy(codeString, codeId)}
                    isCopied={copiedIdx === codeId}
                  />
                );
              }
              return (
                <code className="bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-md font-mono text-xs font-bold border border-slate-200 dark:border-slate-700" {...props}>
                  {children}
                </code>
              );
            },
            h1: ({ children }) => <h1 className="text-xl font-extrabold text-slate-900 dark:text-white mt-6 mb-3 border-b border-slate-200 dark:border-slate-800 pb-2 flex items-center gap-2">{children}</h1>,
            h2: ({ children }) => <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-5 mb-2 flex items-center gap-2">{children}</h2>,
            h3: ({ children }) => <h3 className="text-base font-bold text-slate-700 dark:text-slate-200 mt-4 mb-2">{children}</h3>,
            p: ({ children }) => <p className="mb-3 leading-relaxed text-slate-700 dark:text-slate-300">{children}</p>,
            ul: ({ children }) => <ul className="list-disc list-inside space-y-1.5 mb-4 text-slate-700 dark:text-slate-300">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal list-inside space-y-1.5 mb-4 text-slate-700 dark:text-slate-300">{children}</ol>,
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  }

  const lines = content.split('\n');
  const blocks: { type: 'text' | 'code' | 'heading'; content: string }[] = [];

  let currentCodeLines: string[] = [];
  let currentTextLines: string[] = [];

  const flushText = () => {
    if (currentTextLines.length > 0) {
      const text = currentTextLines.join('\n').trim();
      if (text) blocks.push({ type: 'text', content: text });
      currentTextLines = [];
    }
  };

  const flushCode = () => {
    if (currentCodeLines.length > 0) {
      const code = currentCodeLines.join('\n').trim();
      if (code) blocks.push({ type: 'code', content: code });
      currentCodeLines = [];
    }
  };

  lines.forEach(line => {
    const trimmed = line.trim();

    const isHeadingLine =
      /^(Expected Behavior|Test Cases|Example usage|Test Case \d+|Constraints|Problem Statement|Input:|Output:)/i.test(trimmed);

    const isCodeLine =
      !isHeadingLine &&
      (trimmed.startsWith('//') ||
        trimmed.startsWith('#include') ||
        trimmed.startsWith('using namespace') ||
        trimmed.startsWith('class ') ||
        trimmed.startsWith('struct ') ||
        trimmed.startsWith('public:') ||
        trimmed.startsWith('private:') ||
        trimmed.startsWith('TreeNode*') ||
        trimmed.startsWith('ListNode*') ||
        trimmed.startsWith('int main()') ||
        trimmed.startsWith('return ') ||
        trimmed.startsWith('std::') ||
        trimmed.includes('->') ||
        trimmed.startsWith('import ') ||
        trimmed.startsWith('def ') ||
        (currentCodeLines.length > 0 && (trimmed.startsWith('}') || trimmed.startsWith('{') || trimmed.endsWith(';') || trimmed === '')));

    if (isHeadingLine) {
      flushText();
      flushCode();
      blocks.push({ type: 'heading', content: trimmed });
    } else if (isCodeLine) {
      flushText();
      currentCodeLines.push(line);
    } else {
      flushCode();
      currentTextLines.push(line);
    }
  });

  flushText();
  flushCode();

  return (
    <div className="space-y-4 text-slate-800 dark:text-slate-200">
      {blocks.map((block, idx) => {
        if (block.type === 'heading') {
          return (
            <div key={idx} className="mt-6 mb-2 pt-2 flex items-center gap-2 text-base font-extrabold text-blue-600 dark:text-blue-400 border-b border-slate-100 dark:border-slate-800 pb-2">
              <Sparkles size={16} className="text-blue-500 shrink-0" />
              <span>{block.content}</span>
            </div>
          );
        }

        if (block.type === 'code') {
          return (
            <CodeBlockViewer
              key={idx}
              code={block.content}
              language="Sample Code / Harness"
              onCopy={() => handleCopy(block.content, idx)}
              isCopied={copiedIdx === idx}
            />
          );
        }

        return (
          <div key={idx} className="whitespace-pre-wrap leading-relaxed text-slate-700 dark:text-slate-300 text-sm">
            {block.content}
          </div>
        );
      })}
    </div>
  );
});

const CountdownDisplay = memo(function CountdownDisplay({ dueDate }: { dueDate: string | Date }) {
  const [countdownText, setCountdownText] = useState<string>('');

  useEffect(() => {
    if (!dueDate) return;
    const updateCountdown = () => {
      const now = new Date().getTime();
      const dueTime = new Date(dueDate).getTime();
      const diff = dueTime - now;

      if (diff <= 0) {
        setCountdownText('The submission deadline has passed');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const parts = [];
      if (days > 0) parts.push(`${days}d`);
      parts.push(`${hours.toString().padStart(2, '0')}h`);
      parts.push(`${minutes.toString().padStart(2, '0')}m`);
      parts.push(`${seconds.toString().padStart(2, '0')}s`);

      setCountdownText(parts.join(' '));
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [dueDate]);

  return <span>{countdownText || 'Calculating...'}</span>;
});

export function StudentAssignmentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [assignment, setAssignment] = useState<AssignmentRow | null>(null)
  const [submission, setSubmission] = useState<SubmissionRow | null>(null)

  const [file, setFile] = useState<File | null>(null)
  const [content] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResubmitting, setIsResubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const [appealText, setAppealText] = useState('')
  const [showAppeal, setShowAppeal] = useState(false)

  const dueDate = assignment?.due || (assignment as any)?.stats?.dueDate || (assignment as any)?.metadata?.dueDate || (assignment as any)?.dueDate || (assignment as any)?.DueDate || (assignment as any)?.ExamClass?.[0]?.DueDate

  const loadData = useCallback((showLoader = false) => {
    if (!id) return
    let alive = true
    if (showLoader) setLoading(true)

    Promise.all([
      gradingApi.getAssignment(id).catch(() => api.getAssignment(id)),
      api.getSubmissions({ assignmentId: id }).then(res => res?.[0] || null)
    ])
      .then(([a, s]) => {
        if (alive) {
          setAssignment(a as any)
          setSubmission(s as SubmissionRow)
        }
      })
      .finally(() => { if (alive && showLoader) setLoading(false) })

    return () => { alive = false }
  }, [id])

  useEffect(() => {
    const cleanup = loadData(true)

    // 1. BroadcastChannel Listener (Cross-tab/window instant real-time sync)
    let channel: BroadcastChannel | null = null
    let submissionChannel: BroadcastChannel | null = null
    try {
      channel = new BroadcastChannel('aita_assignment_updates')
      channel.onmessage = (event) => {
        if (event.data?.id === id && event.data?.dueDate) {
          console.log('[StudentAssignmentDetail] Real-time deadline update received:', event.data.dueDate)
          setAssignment(prev => prev ? { ...prev, due: event.data.dueDate, stats: { ...(prev as any).stats, dueDate: event.data.dueDate } } as any : prev)
          loadData(false)
        }
      }

      submissionChannel = new BroadcastChannel('aita_submission_events')
      submissionChannel.onmessage = (event) => {
        if (event.data?.type === 'SUBMISSION_PUBLISHED') {
          console.log('[StudentAssignmentDetail] Real-time publish event received!')
          loadData(false)
        }
      }
    } catch (e) { }

    // 2. Storage event listener (cross-tab fallback)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'aita_last_assignment_update' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue)
          if (parsed.id === id && parsed.dueDate) {
            console.log('[StudentAssignmentDetail] Storage deadline update received:', parsed.dueDate)
            setAssignment(prev => prev ? { ...prev, due: parsed.dueDate, stats: { ...(prev as any).stats, dueDate: parsed.dueDate } } as any : prev)
            loadData(false)
          }
        } catch (err) { }
      }
      if (e.key === 'aita_last_publish_event' && e.newValue) {
        console.log('[StudentAssignmentDetail] Storage publish event received!')
        loadData(false)
      }
    }

    // 3. Custom window event listener
    const handleCustomEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.id === id && detail?.dueDate) {
        setAssignment(prev => prev ? { ...prev, due: detail.dueDate, stats: { ...(prev as any).stats, dueDate: detail.dueDate } } as any : prev)
        loadData(false)
      }
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener('aita_assignment_updated', handleCustomEvent)

    // 4. Pure Real-Time Evaluation Listener (Zero idle polling)
    let pollInterval: ReturnType<typeof setInterval> | null = null
    const isEvaluating = submission?.reviewStatus === 'pending' || submission?.reviewStatus === 'processing'
    if (isEvaluating) {
      pollInterval = setInterval(() => {
        if (document.visibilityState === 'visible') {
          api.getSubmissions({ assignmentId: id! }).then(res => {
            const s = res?.[0]
            if (s) {
              setSubmission(prev => {
                if (!prev || prev.reviewStatus !== s.reviewStatus || (prev as any).isPublished !== (s as any).isPublished || prev.score !== s.score) {
                  return s as SubmissionRow
                }
                return prev
              })
            }
          }).catch(() => { })
        }
      }, 5000)
    }

    return () => {
      if (cleanup) cleanup()
      if (channel) channel.close()
      if (submissionChannel) submissionChannel.close()
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('aita_assignment_updated', handleCustomEvent)
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [id, loadData, submission?.reviewStatus])

  const handleSubmit = async () => {
    if (!id || (!file && !content)) return
    const wasAlreadySubmitted = !!submission
    setIsSubmitting(true)
    try {
      await api.submitAssignment(file, content, id)
      try {
        const evtChannel = new BroadcastChannel('aita_submission_events');
        evtChannel.postMessage({ type: 'SUBMISSION_CREATED', assignmentId: id });
        evtChannel.close();
      } catch (e) { }
      localStorage.setItem('aita_submission_event', JSON.stringify({ type: 'SUBMISSION_CREATED', assignmentId: id, timestamp: Date.now() }));
      setToast({
        message: wasAlreadySubmitted
          ? 'Resubmitted successfully. Your work is now waiting to be re-graded by the lecturer.'
          : 'Submitted successfully.',
        type: 'success'
      })
      setFile(null)
      setIsResubmitting(false)
      loadData()
    } catch (e: any) {
      setToast({ message: e.message || 'Submission failed', type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSendAppeal = async () => {
    if (!appealText.trim() || !submission) return
    setIsSubmitting(true)
    try {
      await api.submitFeedback(submission.id, appealText)
      setToast({ message: 'Your feedback has been sent to the lecturer.', type: 'success' })
      setShowAppeal(false)
      setAppealText('')
      // Optionally reload the submission to show the updated feedback state if the backend returns it
    } catch (e: any) {
      setToast({ message: e.message || 'Failed to send feedback', type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) return <div className="flex p-20 justify-center text-brand-600">Loading data...</div>
  if (!assignment) return <div className="p-20 text-center text-red-500 font-bold">Assignment not found</div>

  const timeRemaining = dueDate ? new Date(dueDate).getTime() - new Date().getTime() : 0;
  const isPastDue = timeRemaining < 0;
  const isNearDeadline = !isPastDue && timeRemaining < 24 * 60 * 60 * 1000;
  const isSubmitted = !!submission;
  const isPublished = submission && ((submission as any).reviewStatus === 'PUBLISHED' || (submission as any).isPublished === true);
  const displayScore = (submission && isPublished) ? ((submission as any).finalScore ?? submission.score ?? (submission as any).totalScore) : null;
  const isGraded = submission && (submission.status === 'Graded' || (submission as any).gradingStatus === 'Graded' || (submission as any).score != null);
  const gradedDate = submission ? ((submission as any).gradedAt || (submission as any).reviewedAt) : null;
  const isLocked = isPastDue && !isSubmitted;
  const fullContent = (assignment as any)?.metadata?.content || (assignment as any)?.content || (assignment as any)?.blueprint?.assignment?.description || (assignment as any)?.details;
  const rubricsList = assignment?.rubrics || (assignment as any)?.rubric?.rules || [];

  const handleDownloadFormattedDoc = () => {
    if (!assignment) return
    const title = assignment.title || (assignment as any)?.metadata?.title || 'Bai_Tap'
    const subjectName = assignment.subjectName || (assignment as any)?.subjectCode || (assignment as any)?.class || 'AITA LMS'
    const dueStr = dueDate ? new Date(dueDate).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : 'No due date'
    const lecturerName = assignment.lecturer || 'Subject lecturer'

    let formattedBodyHtml = ''
    if (fullContent) {
      formattedBodyHtml = fullContent
    } else {
      const rawText = assignment.description || (assignment as any)?.metadata?.description || ''
      formattedBodyHtml = rawText
        .split('\n')
        .map((line: string) => line.trim())
        .filter(Boolean)
        .map((line: string) => {
          if (line.toLowerCase().startsWith('assignment:') || line.toLowerCase().startsWith('project description') || line.toLowerCase().startsWith('technical requirements') || line.toLowerCase().startsWith('constraints:') || line.toLowerCase().startsWith('expected behavior')) {
            return `<h3 style="color:#1e3a8a; border-bottom:1px solid #cbd5e1; padding-bottom:4px; margin-top:18px; margin-bottom:8px; font-size:12pt; text-transform:uppercase;">${line}</h3>`
          }
          if (line.toLowerCase().startsWith('test case')) {
            return `<div style="background-color:#f1f5f9; border-left:4px solid #2563eb; padding:8px 12px; margin-top:12px; margin-bottom:6px; font-weight:bold; font-size:10.5pt;">${line}</div>`
          }
          return `<p style="margin-bottom:8px; line-height:1.6; font-size:11pt;">${line}</p>`
        })
        .join('')
    }

    const docHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${title}</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page {
            size: 21cm 29.7cm;
            margin: 2.5cm 2cm 2.5cm 2cm;
          }
          body {
            font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
            font-size: 11pt;
            color: #0f172a;
            line-height: 1.6;
          }
          .header-banner {
            border-bottom: 3px double #2563eb;
            padding-bottom: 12px;
            margin-bottom: 20px;
          }
          .brand-title {
            font-size: 9.5pt;
            font-weight: bold;
            color: #2563eb;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .doc-main-title {
            font-size: 18pt;
            font-weight: bold;
            color: #1e3a8a;
            margin-top: 6px;
            margin-bottom: 4px;
          }
          .meta-table {
            width: 100%;
            border-collapse: collapse;
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            margin-bottom: 24px;
          }
          .meta-table td {
            padding: 10px 14px;
            font-size: 10pt;
            border: 1px solid #e2e8f0;
          }
          .section-heading {
            font-size: 12pt;
            font-weight: bold;
            color: #1e3a8a;
            border-bottom: 1.5pt solid #2563eb;
            padding-bottom: 4px;
            margin-top: 22px;
            margin-bottom: 12px;
            text-transform: uppercase;
          }
          .content-box {
            font-size: 11pt;
            line-height: 1.75;
          }
          table.rubric-grid {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
            margin-bottom: 20px;
          }
          table.rubric-grid th {
            background-color: #1e3a8a;
            color: #ffffff;
            font-weight: bold;
            text-align: left;
            padding: 9px 12px;
            font-size: 10pt;
            border: 1px solid #1e3a8a;
          }
          table.rubric-grid td {
            padding: 9px 12px;
            border: 1px solid #cbd5e1;
            font-size: 10pt;
          }
          table.rubric-grid tr:nth-child(even) {
            background-color: #f8fafc;
          }
          .footer-sign {
            margin-top: 40px;
            border-top: 1px solid #cbd5e1;
            padding-top: 12px;
            font-size: 9pt;
            color: #64748b;
            text-align: center;
            font-style: italic;
          }
        </style>
      </head>
      <body>
        <div class="header-banner">
          <div class="brand-title">AITA LMS LEARNING MANAGEMENT SYSTEM</div>
          <div class="doc-main-title">${title}</div>
          <div style="font-size: 10.5pt; color: #475569;">Subject: <strong>${subjectName}</strong></div>
        </div>

        <table class="meta-table">
          <tr>
            <td width="50%"><strong>👤 Lecturer:</strong> ${lecturerName}</td>
            <td width="50%"><strong>⏰ Due:</strong> <span style="color: #dc2626; font-weight: bold;">${dueStr}</span></td>
          </tr>
        </table>

        <div class="section-heading">I. ASSIGNMENT CONTENT & REQUIREMENTS</div>
        <div class="content-box">
          ${formattedBodyHtml}
        </div>

        ${rubricsList && rubricsList.length > 0 ? `
          <div class="section-heading">II. GRADING RUBRIC</div>
          <table class="rubric-grid">
            <thead>
              <tr>
                <th width="8%" align="center">STT</th>
                <th width="72%">Criteria</th>
                <th width="20%" align="center">Max score</th>
              </tr>
            </thead>
            <tbody>
              ${rubricsList.map((r: any, idx: number) => {
      const rPoints = r.weight ?? r.maxPoints ?? r.maxScore ?? r.points ?? r.score ?? 0;
      return `
                <tr>
                  <td align="center"><strong>${idx + 1}</strong></td>
                  <td>${r.description || r.title || 'Criterion'}</td>
                  <td align="center"><strong style="color:#2563eb;">${rPoints} pts</strong></td>
                </tr>
              `}).join('')}
            </tbody>
          </table>
        ` : ''}

        <div class="footer-sign">
          Assignment sheet exported automatically from AITA LMS &bull; Downloaded on: ${new Date().toLocaleDateString(undefined)}
        </div>
      </body>
      </html>
    `

    const blob = new Blob(['\ufeff', docHtml], {
      type: 'application/msword;charset=utf-8'
    })

    const safeTitle = title.replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]/g, '_')
    const fileName = `De_Bai_${safeTitle}.doc`
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto animate-in fade-in duration-500 relative">
      {toast && (
        <div className="fixed top-24 right-8 z-[100] animate-toast-in">
          <div className={`rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border p-4 flex items-center gap-3 min-w-[320px] bg-white dark:bg-slate-800 ${toast.type === 'error' ? 'border-red-100 dark:border-red-900' : 'border-emerald-100 dark:border-emerald-900'}`}>
            <div className={`shrink-0 p-1.5 rounded-full ${toast.type === 'error' ? 'text-red-500 bg-red-50 dark:bg-red-500/10' : 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10'}`}>
              {toast.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
            </div>
            <p className={`font-semibold text-sm ${toast.type === 'error' ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{toast.message}</p>
            <button onClick={() => setToast(null)} className="ml-auto text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <span className="sr-only">Close</span>
              &times;
            </button>
          </div>
        </div>
      )}
      <div className="grid lg:grid-cols-3 gap-6 lg:gap-8 max-w-[1600px] mx-auto">

        {/* Left Column: Assignment Context (Like EduNext) */}
        <div className="lg:col-span-2 space-y-4">

          <div className="mb-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-3">
              <Link to="/student" className="hover:text-slate-600 cursor-pointer transition-colors">Home</Link>
              <ChevronRight size={14} />
              <Link to="/student/subjects" className="hover:text-slate-600 cursor-pointer transition-colors">Subject</Link>
              <ChevronRight size={14} />
              <Link to="/student/subjects" state={{ expand: assignment.subjectId }} className="hover:text-slate-600 cursor-pointer transition-colors">{assignment.subjectName ? assignment.subjectName.split(' - ')[0] : 'CSD201'}</Link>
              <ChevronRight size={14} />
              <span className="font-medium text-slate-700 dark:text-slate-300">{assignment.title}</span>
            </div>

            {/* Header Section */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-2">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{assignment.title}</h1>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-md font-medium text-sm border border-blue-100 dark:border-blue-800">
                  <FileText size={14} />
                  {assignment.type === 'Exam' ? 'Exam' : 'Assignment'}
                </div>

                {assignment.due && isNearDeadline && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 rounded-md font-medium text-sm border border-amber-100 dark:border-amber-800">
                    <Clock size={14} />
                    Due soon
                  </div>
                )}


                {assignment.due && (
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium text-sm border ${isPastDue || isNearDeadline
                    ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 border-red-100 dark:border-red-800'
                    : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800'
                    }`}>
                    <Calendar size={14} />
                    Due: {new Date(assignment.due).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* Reopen Notification Banner */}
          {submission?.isReopened && (
            <div className="p-4 rounded-2xl border flex items-center gap-3.5 bg-blue-50/90 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200 mb-4 shadow-sm">
              <div className="p-2.5 bg-blue-600 text-white rounded-xl shrink-0 shadow-xs">
                <RotateCcw size={20} />
              </div>
              <div>
                <p className="font-extrabold text-sm text-blue-900 dark:text-blue-200 flex items-center gap-2">
                  <span>Giảng viên đã cho phép bạn nộp lại bài!</span>
                  <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-blue-600 text-white rounded-full">Reopened</span>
                </p>
                <p className="text-xs mt-0.5 opacity-90">
                  {submission.reopenReason ? `Lý do: "${submission.reopenReason}". ` : ''}Hãy tải file bài làm mới lên và ấn "Nộp bài" trước khi hết hạn gia hạn.
                </p>
              </div>
            </div>
          )}

          {/* Deadline & Live Countdown Banner */}
          {dueDate && (
            isSubmitted ? (
              <div className="p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm mb-4 transition-all bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-emerald-500/10 border-emerald-300 dark:border-emerald-700/50 text-emerald-900 dark:text-emerald-200">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl font-bold flex items-center justify-center shrink-0 shadow-sm bg-emerald-600 text-white">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded-full bg-emerald-600 text-white">
                        SUBMITTED WORK
                      </span>
                      <span className="text-xs font-semibold">
                        Due: {new Date(dueDate).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-xs mt-1 font-bold">
                      You have submitted your work{submission?.submittedAt ? ` at ${new Date(submission.submittedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} ${new Date(submission.submittedAt).toLocaleDateString(undefined)}` : ''}. You can resubmit if you need to make changes.
                    </p>
                  </div>
                </div>
                <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-xl border border-emerald-200 dark:border-emerald-800 shrink-0 flex items-center gap-2 text-xs font-bold">
                  <Check size={16} />
                  <span>Submission complete</span>
                </div>
              </div>
            ) : (
              <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm mb-4 transition-all ${isPastDue
                  ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40 text-rose-800 dark:text-rose-300'
                  : isNearDeadline
                    ? 'bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-amber-500/10 border-amber-300 dark:border-amber-700/50 text-amber-900 dark:text-amber-200 animate-pulse'
                    : 'bg-gradient-to-r from-blue-500/10 via-brand-500/5 to-blue-500/10 border-blue-200 dark:border-blue-800/50 text-blue-900 dark:text-blue-200'
                }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl font-bold flex items-center justify-center shrink-0 shadow-sm ${isPastDue ? 'bg-rose-500 text-white' : isNearDeadline ? 'bg-amber-500 text-white' : 'bg-blue-600 text-white'
                    }`}>
                    <Clock size={20} className={!isPastDue ? 'animate-spin' : ''} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-full ${isPastDue ? 'bg-rose-600 text-white' : isNearDeadline ? 'bg-amber-600 text-white' : 'bg-blue-600 text-white'
                        }`}>
                        {isPastDue ? 'CLOSED' : isNearDeadline ? 'DEADLINE WARNING' : 'TIME REMAINING'}
                      </span>
                      <span className="text-xs font-semibold">
                        Due: {new Date(dueDate).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-xs mt-1 font-bold flex items-center gap-1">
                      {isPastDue ? 'This assignment is closed for official submissions.' : <>Time remaining: <CountdownDisplay dueDate={dueDate} /></>}
                    </p>
                  </div>
                </div>

                {!isPastDue && (
                  <div className="px-4 py-2 bg-white dark:bg-[#151821] rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-sm shrink-0 flex items-center gap-2 text-xs font-mono font-bold text-slate-800 dark:text-slate-100">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    <CountdownDisplay dueDate={dueDate} />
                  </div>
                )}
              </div>
            )
          )}

          {/* Card: Assignment details */}
          <Card className="bg-white dark:bg-[#151821] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
              <h2 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <FileText size={18} className="text-blue-600" /> Assignment details
              </h2>
              <button
                onClick={handleDownloadFormattedDoc}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-400 text-xs font-bold rounded-lg transition-all border border-blue-200 dark:border-blue-800/60 shadow-sm"
                title="Download the assignment as a pre-formatted Word file (.docx)"
              >
                <Download size={14} /> Download (.docx)
              </button>
            </div>
            <div className="p-5 text-[15px] text-slate-700 dark:text-slate-300">
              <SmartAssignmentContent content={fullContent || assignment.description || (assignment as any)?.metadata?.description || ''} />
            </div>
          </Card>

          {/* Card: Attachments */}
          {assignment.attachments && assignment.attachments.length > 0 && (
            <Card className="bg-white dark:bg-[#151821] border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="px-5 py-2 flex justify-between items-center">
                <h2 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Paperclip size={18} className="text-blue-600" /> Attachments
                </h2>
              </div>
              <div className="px-5 py-2">
                <div className="flex flex-col gap-2">
                  {assignment.attachments.map(att => {
                    const isPreviewable = att.fileName.toLowerCase().match(/\.(pdf|png|jpg|jpeg|gif)$/);
                    const fileUrl = `${(import.meta as any).env.VITE_API_URL || '/api'}/assignments/attachments/${att.id}/download?token=${getStoredItem(AUTH_STORAGE_KEYS.token)}`;

                    return (
                      <div key={att.id} className="flex flex-col gap-2">
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-brand-50 dark:bg-slate-900 dark:hover:bg-slate-800 transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <FileText size={18} className="text-blue-500" />
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-brand-600 transition-colors flex-1">{att.fileName}</span>
                          </div>
                          <div className="w-7 h-7 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 group-hover:text-brand-600 group-hover:border-brand-200 shadow-sm transition-all">
                            <Download size={14} />
                          </div>
                        </a>

                        {isPreviewable && (
                          <div className="w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white shadow-sm mt-1 mb-4">
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-2 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Xem trước tài liệu</span>
                              <a href={`${fileUrl}&inline=true`} target="_blank" rel="noreferrer" className="text-xs text-brand-600 hover:underline">Mở tab mới</a>
                            </div>
                            {att.fileName.toLowerCase().endsWith('.pdf') ? (
                              <iframe src={`${fileUrl}&inline=true`} className="w-full h-[800px] bg-slate-100" title={att.fileName} />
                            ) : (
                              <div className="p-4 flex justify-center bg-slate-100 dark:bg-slate-900/50">
                                <img src={`${fileUrl}&inline=true`} alt={att.fileName} className="max-w-full h-auto object-contain max-h-[800px] rounded" />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          )}

          {/* Card: Rubric Section */}
          {rubricsList && rubricsList.length > 0 && (
            <Card className="bg-white dark:bg-[#151821] border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="px-5 py-2 flex justify-between items-center">
                <h2 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Award size={18} className="text-blue-600" /> Grading criteria (rubric)
                </h2>
              </div>
              <div className="px-5 py-2">
                <div className="space-y-4">
                  {rubricsList.map((rule: any, index: number) => {
                    const rulePoints = rule.weight ?? rule.maxPoints ?? rule.maxScore ?? rule.points ?? rule.score;
                    const hasValidPoints = rulePoints != null && !isNaN(Number(rulePoints)) && Number(rulePoints) > 0;
                    const displayPoints = hasValidPoints
                      ? `${Number(rulePoints)} pts`
                      : (rule.criteria?.length ? `${rule.criteria.reduce((s: number, c: any) => s + (Number(c.weight ?? c.maxPoints ?? c.maxScore ?? 0) || 0), 0)} pts` : 'Criterion');

                    return (
                      <div key={rule.id || index} className="rounded-lg border border-blue-50 dark:border-blue-900/30 overflow-hidden bg-blue-50/50 dark:bg-blue-900/10">
                        <div className="p-4 flex justify-between items-start gap-4">
                          <div className="flex gap-3 flex-1">
                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-sm border border-blue-200 dark:border-blue-800">
                              {index + 1}
                            </div>
                            <div className="text-sm text-slate-800 dark:text-slate-200 block leading-relaxed mt-1">
                              {rule.title && (
                                <span className="font-bold text-slate-900 dark:text-white block mb-1">{rule.title}</span>
                              )}
                              <FormattedText text={rule.description || rule.title || 'Criterion'} />
                            </div>
                          </div>
                          <span className="text-xs font-extrabold text-blue-700 dark:text-blue-300 bg-blue-100/80 dark:bg-blue-900/60 px-3 py-1.5 rounded-lg shrink-0 mt-0.5 border border-blue-200 dark:border-blue-700 shadow-sm whitespace-nowrap">
                            {displayPoints}
                          </span>
                        </div>
                        <RubricRuleSpecViewer rule={rule} />

                        {rule.criteria && rule.criteria.length > 0 && (
                          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                            {rule.criteria.map((c: any, cIdx: number) => {
                              const cPoints = c.weight ?? c.maxPoints ?? c.maxScore ?? c.points ?? c.score;
                              const cDisplay = cPoints != null && !isNaN(Number(cPoints)) && Number(cPoints) > 0 ? `${Number(cPoints)} pts` : '';
                              return (
                                <li key={c.id || cIdx} className="p-3 flex justify-between items-start gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                                  <FormattedText className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed" text={typeof c.description === 'string' ? c.description : JSON.stringify(c.description)} />
                                  {cDisplay && (
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap pt-0.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">{cDisplay}</span>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          )}

          {/* Grading & Feedback Result */}
          {isGraded && displayScore != null && (
            <Card className="bg-white dark:bg-[#151821] border border-slate-200 dark:border-slate-800 shadow-sm animate-in slide-in-from-bottom-4 duration-500 overflow-hidden">
              {!((submission as any)?.reviewStatus === 'PUBLISHED' || (submission as any)?.isPublished) ? (
                <div className="p-6 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-amber-500/10 text-amber-900 dark:text-amber-200 flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                    <Clock size={24} className="animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-amber-900 dark:text-amber-100 mb-1">
                      ⌛ Your submission is being graded and reviewed by the lecturer
                    </h3>
                    <p className="text-xs text-amber-800/80 dark:text-amber-300/80 leading-relaxed">
                      Your submission has been analysed by the AI and the result saved.
                      The lecturer is reviewing the score and detailed assessment. The official result appears as soon as the lecturer approves it and presses <strong>Publish result</strong>.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-5 space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                    <h2 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <CheckCircle2 size={18} className="text-emerald-500" /> AI result and feedback
                    </h2>
                  </div>

                  {submission.aiFeedback ? (
                    <div className="bg-gradient-to-br from-indigo-50/50 to-blue-50/50 dark:from-indigo-900/10 dark:to-blue-900/10 border border-indigo-100/50 dark:border-indigo-500/20 rounded-2xl p-6 shadow-sm mb-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center border border-indigo-200/50 dark:border-indigo-700/30">
                          <Sparkles className="text-indigo-600 dark:text-indigo-400" size={20} />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white">AI Mentor Feedback</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Overall assessment and improvement plan</p>
                        </div>
                      </div>
                      <div className="prose prose-indigo dark:prose-invert max-w-none prose-p:leading-relaxed prose-li:my-1 text-sm text-slate-700 dark:text-slate-300">
                        <ReactMarkdown>{submission.aiFeedback as string}</ReactMarkdown>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-6">
                      <p className="text-sm text-slate-600 dark:text-slate-400 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 text-center italic">
                        No automated feedback.
                      </p>
                    </div>
                  )}

                  <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-6">
                    {!showAppeal ? (
                      <button onClick={() => setShowAppeal(true)} className="text-sm font-bold text-brand-600 dark:text-brand-400 hover:underline">
                        Have a question about your score?
                      </button>
                    ) : (
                      <div className="text-left bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 mt-2">
                        <h4 className="font-bold text-sm mb-2 text-slate-700 dark:text-slate-300">Send an appeal or comment to your lecturer</h4>
                        <div className="flex items-end gap-2">
                          <div className="flex-1">
                            <Input
                              placeholder="Type your question..."
                              value={appealText}
                              onChange={(e) => setAppealText(e.target.value)}
                            />
                          </div>
                          <Button onClick={handleSendAppeal} className="bg-brand-600 hover:bg-brand-700 text-white mb-1">
                            <Send size={16} className="mr-2" /> Send
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>
          )}

        </div>

        {/* Right Column: Submission Form & Info */}
        <div className="space-y-6 lg:pt-[88px]">
          <Card className="bg-slate-50 dark:bg-[#1a1d27] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-5 py-2">
              <h3 className="font-bold text-slate-800 dark:text-slate-200">
                Your submission
              </h3>
            </div>
            <div className="px-5 py-2 space-y-4">
              {isSubmitted ? (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-emerald-200 rounded-xl p-5 text-center dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-900/10">
                    <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-2" />
                    <p className="font-bold text-emerald-800 dark:text-emerald-500">Submitted successfully</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-600/80 mt-1 mb-3">
                      At: {submission.submittedAt ? new Date(submission.submittedAt).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}
                      {(submission as any).attemptNumber && (submission as any).attemptNumber > 1 && (
                        <span className="ml-2 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded font-semibold text-[11px]">
                          Attempt #{(submission as any).attemptNumber}
                        </span>
                      )}
                    </p>

                    {submission?.zipFileUrl && (
                      <a
                        href={`${(import.meta as any).env.VITE_API_URL || '/api'}/submissions/${submission.id}/download?token=${getStoredItem(AUTH_STORAGE_KEYS.token)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white hover:bg-emerald-50 dark:bg-emerald-900/40 dark:hover:bg-emerald-800/50 transition-colors group text-left"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <FileText size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300 group-hover:text-emerald-800 dark:group-hover:text-emerald-200 truncate">
                            {submission.zipFileUrl.includes('?filename=') ? decodeURIComponent(submission.zipFileUrl.split('?filename=')[1]) : (submission.zipFileUrl.split('/').pop()?.split('?')[0] || 'Submission file')}
                          </span>
                        </div>
                        <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-300 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-700 transition-all shrink-0 ml-2">
                          <Download size={14} />
                        </div>
                      </a>
                    )}
                  </div>

                  {/* Resubmission Section */}
                  {!isPastDue ? (
                    !isResubmitting ? (
                      <Button
                        variant="outline"
                        onClick={() => setIsResubmitting(true)}
                        className="w-full border-2 border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400 bg-blue-50/50 hover:bg-blue-100/80 dark:bg-blue-950/30 dark:hover:bg-blue-900/50 font-bold py-2.5 h-auto rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
                      >
                        <RotateCcw size={16} className="text-blue-600 dark:text-blue-400" />
                        <span>Resubmit</span>
                      </Button>
                    ) : (
                      <div className="border border-blue-200 dark:border-blue-800/50 rounded-xl p-4 bg-blue-50/50 dark:bg-slate-900/50 space-y-3 animate-in fade-in duration-300">
                        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-lg text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                          <strong>⚠️ Note:</strong> Resubmitting replaces your latest file and moves the submission back to <strong>Awaiting re-grading</strong> so the lecturer can grade it again.
                        </div>

                        <div className="border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-lg p-4 flex flex-col items-center justify-center text-slate-500 bg-white dark:bg-slate-900 relative cursor-pointer group">
                          <input
                            type="file"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                          />
                          <UploadCloud size={24} className="mb-1 text-blue-500 group-hover:text-blue-600 transition-colors" />
                          <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Choose a new submission file</p>
                          <p className="text-[11px] text-slate-400">PDF, DOCX, ZIP (max 10MB)</p>
                        </div>

                        {file && (
                          <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                            <span className="text-xs font-medium truncate pr-2 text-slate-700 dark:text-slate-300">{file.name}</span>
                            <button onClick={() => setFile(null)} className="text-red-500 text-xs font-bold hover:underline shrink-0">Remove</button>
                          </div>
                        )}

                        <div className="flex gap-2 pt-1">
                          <Button
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs py-2 h-auto rounded-lg"
                            onClick={handleSubmit}
                            disabled={isSubmitting || !file}
                          >
                            {isSubmitting ? <Loader2 className="animate-spin w-3.5 h-3.5 mr-1" /> : <Send size={14} className="mr-1" />}
                            Confirm resubmission
                          </Button>
                          <Button
                            variant="outline"
                            className="text-xs py-2 h-auto rounded-lg text-slate-600 dark:text-slate-400"
                            onClick={() => { setIsResubmitting(false); setFile(null); }}
                            disabled={isSubmitting}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="p-2.5 bg-slate-100 dark:bg-slate-800/60 rounded-lg text-center text-xs text-slate-500 dark:text-slate-400 font-medium">
                      🔒 Deadline passed - resubmission is not available.
                    </div>
                  )}
                </div>
              ) : isLocked ? (
                <div className="bg-red-50 border border-red-100 rounded-xl p-6 text-center dark:bg-red-900/10 dark:border-red-900/30">
                  <AlertCircle size={32} className="text-red-500 mx-auto mb-2" />
                  <p className="font-bold text-red-800 dark:text-red-500">The submission deadline has passed</p>
                  <p className="text-sm text-red-600 dark:text-red-600/80 mt-1">Submission has been locked by the system.</p>
                </div>
              ) : (
                <>
                  <div className="border-2 border-dashed border-blue-200 dark:border-blue-800/50 rounded-xl p-5 flex flex-col items-center justify-center text-slate-500 bg-white hover:bg-blue-50/50 dark:bg-slate-900/50 transition-colors relative cursor-pointer group">
                    <input
                      type="file"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                    <UploadCloud size={28} className="mb-2 text-blue-500 group-hover:text-blue-600 transition-colors" />
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Drag and drop your file here</p>
                    <p className="text-xs text-slate-400 mt-0.5 mb-3">or choose a file from your computer</p>
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Supported: PDF, DOCX, ZIP (max 10MB)</p>
                  </div>

                  {file && (
                    <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg flex items-center justify-between mb-4 mt-4">
                      <span className="text-sm font-medium truncate pr-4 text-slate-700 dark:text-slate-300">{file.name}</span>
                      <button onClick={() => setFile(null)} className="text-red-500 text-sm font-bold hover:underline shrink-0">Remove</button>
                    </div>
                  )}

                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-medium mt-2 rounded-lg py-2.5 h-auto"
                    onClick={handleSubmit}
                    disabled={isSubmitting || !file}
                  >
                    {isSubmitting ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Send size={16} className="mr-2" />}
                    Submit
                  </Button>
                </>
              )}
            </div>
          </Card>

          {/* Assignment information Card */}
          <Card className="bg-slate-50 dark:bg-[#1a1d27] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-5 py-2">
              <h3 className="font-bold text-slate-800 dark:text-slate-200">
                Assignment information
              </h3>
            </div>
            <div className="px-5 py-2 space-y-4 text-sm">
              <div className="flex justify-between items-start gap-4">
                <span className="text-slate-500 shrink-0 mt-0.5">Subject</span>
                <span className="font-medium text-slate-700 dark:text-slate-300 text-right">{assignment.subjectName || 'CSD201 - Mobile Application Dev'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Lecturer</span>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-200 overflow-hidden shrink-0">
                    <img src={assignment.lecturerAvatar || "https://i.pravatar.cc/100?img=5"} alt="Lecturer" className="w-full h-full object-cover" />
                  </div>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{assignment.lecturer || 'Lecturer'}</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Due date</span>
                <span className="font-medium text-red-600">{dueDate ? new Date(dueDate).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Status</span>
                <span className={`font-medium ${isSubmitted ? 'text-emerald-500' : 'text-amber-500'}`}>{isSubmitted ? 'Submitted' : 'Not submitted'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Score</span>
                {displayScore != null ? (
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${Number(displayScore) >= 8 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : Number(displayScore) >= 5 ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                    {Number(displayScore).toLocaleString(undefined)}
                  </span>
                ) : (
                  <span className="font-medium text-slate-700 dark:text-slate-300">—</span>
                )}
              </div>
            </div>
          </Card>

          {/* Progress Card */}
          <Card className="bg-slate-50 dark:bg-[#1a1d27] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-5 py-2">
              <h3 className="font-bold text-slate-800 dark:text-slate-200">
                Progress
              </h3>
            </div>
            <div className="px-5 py-2 relative">
              <div className="absolute left-[30px] top-8 bottom-8 w-0.5 bg-slate-200 dark:bg-slate-700 -ml-px z-0"></div>

              <div className="space-y-6 relative z-10">
                <div className="flex items-start gap-4">
                  <div className="w-5 h-5 rounded-full bg-emerald-500 border-[3px] border-white dark:border-[#151821] flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={12} className="text-white" />
                  </div>
                  <div className="flex-1 flex justify-between">
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">Assigned</span>
                    <span className="text-xs text-slate-400">{assignment.createdAt ? new Date(assignment.createdAt).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}</span>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className={`w-5 h-5 rounded-full border-[3px] border-white dark:border-[#151821] flex items-center justify-center shrink-0 mt-0.5 ${isSubmitted ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                    {isSubmitted ? <Check size={12} className="text-white" /> : <Minus size={12} className="text-white" />}
                  </div>
                  <div className="flex-1 flex justify-between">
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{isSubmitted ? 'Submitted' : 'Not submitted'}</span>
                    <span className="text-xs text-slate-400">{isSubmitted && submission?.submittedAt ? new Date(submission.submittedAt).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}</span>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className={`w-5 h-5 rounded-full border-[3px] border-white dark:border-[#151821] flex items-center justify-center shrink-0 mt-0.5 ${isGraded ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                    {isGraded && <Check size={12} className="text-white" />}
                  </div>
                  <div className="flex-1 flex justify-between">
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{isGraded ? 'Graded' : 'Not graded'}</span>
                    <span className="text-xs text-slate-400">{isGraded && gradedDate ? new Date(gradedDate).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {isGraded && submission && (
            <Button
              onClick={() => navigate(`/student/grading/result/${submission.id}`)}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white shadow-sm font-medium rounded-lg py-3 h-auto transition-all"
            >
              <Award size={18} className="mr-2" />
              View rubric grading details
            </Button>
          )}

        </div>
      </div>
    </div>
  )
}
