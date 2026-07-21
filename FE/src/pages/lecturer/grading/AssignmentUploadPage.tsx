import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import FileUpload from '@/components/modules/grading/FileUpload';
import { gradingApi as api, api as mainApi } from '@/lib/api';
import { Sparkles, Edit3, CheckCircle, Type, UploadCloud, ArrowRight, Info, Lightbulb, X, Search, Clock, ArrowLeft, ChevronDown, AlertCircle } from 'lucide-react';
import classNames from 'classnames';
import Editor from 'react-simple-wysiwyg';
import { DateTimePicker } from '@/components/ui/DateTimePicker';

interface PromptTemplate {
    id: number;
    subject: string;
    category: string;
    title: string;
    description: string;
    requirements: string[];
    outcomes: string[];
    difficulty: 'Dễ' | 'Trung bình' | 'Khó';
    duration: string;
    tags: string[];
    prompt: string;
}

const PROMPT_TEMPLATES: PromptTemplate[] = [
    { id: 1, subject: 'PRM392', category: 'Assignment', title: 'Flutter Mobile App – ToDo List', description: 'Tạo bài tập yêu cầu sinh viên phát triển một ứng dụng quản lý công việc (ToDo List) bằng Flutter.', requirements: ['Flutter 3.x', 'Firebase Authentication', 'Cloud Firestore', 'CRUD Task', 'State Management (Provider hoặc Riverpod)', 'Form Validation', 'Responsive UI'], outcomes: ['Sinh viên có thể xây dựng một ứng dụng Flutter hoàn chỉnh với kiến trúc rõ ràng, quản lý trạng thái hợp lý và kết nối Firebase.'], difficulty: 'Trung bình', duration: '2-3 giờ', tags: ['Mobile Development'], prompt: 'Tạo bài tập yêu cầu sinh viên phát triển một ứng dụng quản lý công việc (ToDo List) bằng Flutter. Ứng dụng phải có giao diện trực quan, dữ liệu được lưu trữ trên Firebase và hỗ trợ xác thực người dùng.\n\nYêu cầu công nghệ:\n- Flutter 3.x\n- Firebase Authentication\n- Cloud Firestore\n- CRUD Task\n- State Management (Provider hoặc Riverpod)\n- Form Validation\n- Responsive UI\n\nKết quả mong đợi:\nSinh viên có thể xây dựng một ứng dụng Flutter hoàn chỉnh với kiến trúc rõ ràng, quản lý trạng thái hợp lý và kết nối Firebase.' },
    { id: 2, subject: 'PRM392', category: 'Final Project', title: 'Firebase Chat Application', description: 'Thiết kế ứng dụng nhắn tin thời gian thực sử dụng Flutter và Firebase.', requirements: ['Đăng nhập bằng Email', 'Danh sách người dùng', 'Chat 1-1', 'Tin nhắn thời gian thực', 'Upload hình ảnh', 'Notification cơ bản'], outcomes: ['Ứng dụng hoạt động ổn định với khả năng đồng bộ dữ liệu thời gian thực.'], difficulty: 'Khó', duration: '3-4 giờ', tags: ['Realtime', 'Firebase'], prompt: 'Thiết kế ứng dụng nhắn tin thời gian thực sử dụng Flutter và Firebase.\n\nYêu cầu công nghệ:\n- Đăng nhập bằng Email\n- Danh sách người dùng\n- Chat 1-1\n- Tin nhắn thời gian thực\n- Upload hình ảnh\n- Notification cơ bản\n\nKết quả mong đợi:\nỨng dụng hoạt động ổn định với khả năng đồng bộ dữ liệu thời gian thực.' },
    { id: 3, subject: 'PRM392', category: 'Lab', title: 'E-Commerce UI', description: 'Thiết kế giao diện ứng dụng thương mại điện tử bằng Flutter dựa trên Figma.', requirements: ['Home', 'Product List', 'Product Detail', 'Cart', 'Checkout', 'Responsive', 'Dark Mode'], outcomes: ['Hoàn thiện UI đúng thiết kế, cấu trúc widget hợp lý và tối ưu trải nghiệm người dùng.'], difficulty: 'Dễ', duration: '2 giờ', tags: ['UI/UX', 'Figma'], prompt: 'Thiết kế giao diện ứng dụng thương mại điện tử bằng Flutter dựa trên Figma.\n\nYêu cầu màn hình:\n- Home\n- Product List\n- Product Detail\n- Cart\n- Checkout\n- Responsive\n- Dark Mode\n\nKết quả mong đợi:\nHoàn thiện UI đúng thiết kế, cấu trúc widget hợp lý và tối ưu trải nghiệm người dùng.' },
    { id: 4, subject: 'SWP391', category: 'Assignment', title: 'Spring Boot REST API', description: 'Tạo bài tập xây dựng hệ thống RESTful API bằng Spring Boot.', requirements: ['CRUD API', 'Spring Data JPA', 'MySQL', 'JWT Authentication', 'Role Based Authorization', 'Validation', 'Swagger', 'Exception Handling'], outcomes: ['Sinh viên xây dựng được backend theo kiến trúc REST, đáp ứng các tiêu chuẩn bảo mật và dễ mở rộng.'], difficulty: 'Khó', duration: '4 giờ', tags: ['Backend', 'Java'], prompt: 'Tạo bài tập xây dựng hệ thống RESTful API bằng Spring Boot.\n\nYêu cầu công nghệ:\n- CRUD API\n- Spring Data JPA\n- MySQL\n- JWT Authentication\n- Role Based Authorization\n- Validation\n- Swagger\n- Exception Handling\n\nKết quả mong đợi:\nSinh viên xây dựng được backend theo kiến trúc REST, đáp ứng các tiêu chuẩn bảo mật và dễ mở rộng.' },
    { id: 5, subject: 'SWP391', category: 'Midterm', title: 'React Dashboard', description: 'Xây dựng Dashboard quản trị bằng ReactJS.', requirements: ['React Router', 'Axios', 'Authentication', 'Dashboard', 'Chart', 'Table', 'Pagination', 'Responsive'], outcomes: ['Ứng dụng có giao diện hiện đại, quản lý dữ liệu hiệu quả và đáp ứng trên nhiều thiết bị.'], difficulty: 'Trung bình', duration: '3 giờ', tags: ['Frontend', 'React'], prompt: 'Xây dựng Dashboard quản trị bằng ReactJS.\n\nYêu cầu công nghệ:\n- React Router\n- Axios\n- Authentication\n- Dashboard\n- Chart\n- Table\n- Pagination\n- Responsive\n\nKết quả mong đợi:\nỨng dụng có giao diện hiện đại, quản lý dữ liệu hiệu quả và đáp ứng trên nhiều thiết bị.' },
    { id: 6, subject: 'DBI202', category: 'Assignment', title: 'SQL Database Design', description: 'Thiết kế cơ sở dữ liệu cho hệ thống quản lý bán hàng.', requirements: ['ERD', 'Chuẩn hóa đến 3NF', 'Tạo Database', 'Primary Key', 'Foreign Key', 'Trigger', 'Stored Procedure', 'View'], outcomes: ['Cơ sở dữ liệu đầy đủ, đảm bảo tính toàn vẹn dữ liệu và hỗ trợ các chức năng nghiệp vụ.'], difficulty: 'Trung bình', duration: '2-3 giờ', tags: ['Database', 'SQL'], prompt: 'Thiết kế cơ sở dữ liệu cho hệ thống quản lý bán hàng.\n\nYêu cầu:\n- ERD\n- Chuẩn hóa đến 3NF\n- Tạo Database\n- Primary Key\n- Foreign Key\n- Trigger\n- Stored Procedure\n- View\n\nKết quả mong đợi:\nCơ sở dữ liệu đầy đủ, đảm bảo tính toàn vẹn dữ liệu và hỗ trợ các chức năng nghiệp vụ.' },
    { id: 7, subject: 'AI201', category: 'Lab', title: 'AI Prompt Engineering', description: 'Thiết kế prompt nhằm khai thác hiệu quả mô hình ngôn ngữ lớn (LLM) để giải quyết bài toán thực tế.', requirements: ['Prompt Structure', 'Context Design', 'Few-shot Prompting', 'Chain of Thought', 'Prompt Evaluation', 'Prompt Optimization'], outcomes: ['Sinh viên biết xây dựng prompt chất lượng và đánh giá kết quả sinh ra từ AI.'], difficulty: 'Trung bình', duration: '2 giờ', tags: ['AI', 'Prompt'], prompt: 'Thiết kế prompt nhằm khai thác hiệu quả mô hình ngôn ngữ lớn (LLM) để giải quyết bài toán thực tế.\n\nYêu cầu kỹ thuật:\n- Prompt Structure\n- Context Design\n- Few-shot Prompting\n- Chain of Thought\n- Prompt Evaluation\n- Prompt Optimization\n\nKết quả mong đợi:\nSinh viên biết xây dựng prompt chất lượng và đánh giá kết quả sinh ra từ AI.' },
    { id: 8, subject: 'AI201', category: 'Final Project', title: 'Machine Learning Classification', description: 'Xây dựng mô hình phân loại dữ liệu bằng Python.', requirements: ['Data Preprocessing', 'Feature Engineering', 'Train/Test Split', 'Random Forest hoặc SVM', 'Evaluation Metrics', 'Visualization'], outcomes: ['Mô hình đạt độ chính xác theo yêu cầu và có báo cáo phân tích kết quả.'], difficulty: 'Khó', duration: '4 giờ', tags: ['Python', 'Machine Learning'], prompt: 'Xây dựng mô hình phân loại dữ liệu bằng Python.\n\nYêu cầu kỹ thuật:\n- Data Preprocessing\n- Feature Engineering\n- Train/Test Split\n- Random Forest hoặc SVM\n- Evaluation Metrics\n- Visualization\n\nKết quả mong đợi:\nMô hình đạt độ chính xác theo yêu cầu và có báo cáo phân tích kết quả.' },
    { id: 9, subject: 'CSD201', category: 'Assignment', title: 'Java OOP Assignment', description: 'Phát triển ứng dụng quản lý thư viện bằng Java theo hướng đối tượng.', requirements: ['Inheritance', 'Polymorphism', 'Interface', 'Exception Handling', 'Generic', 'Collections', 'File I/O'], outcomes: ['Áp dụng đầy đủ các nguyên lý OOP và viết mã theo chuẩn Clean Code.'], difficulty: 'Trung bình', duration: '3 giờ', tags: ['Java', 'OOP'], prompt: 'Phát triển ứng dụng quản lý thư viện bằng Java theo hướng đối tượng.\n\nYêu cầu kỹ thuật:\n- Inheritance\n- Polymorphism\n- Interface\n- Exception Handling\n- Generic\n- Collections\n- File I/O\n\nKết quả mong đợi:\nÁp dụng đầy đủ các nguyên lý OOP và viết mã theo chuẩn Clean Code.' },
    { id: 10, subject: 'CSD201', category: 'Midterm', title: 'Data Structures & Algorithms', description: 'Giải quyết các bài toán thuật toán bằng Java.', requirements: ['BST', 'AVL Tree', 'BFS', 'DFS', 'Dijkstra', 'Kruskal', 'Time Complexity Analysis'], outcomes: ['Sinh viên cài đặt đúng thuật toán, phân tích được độ phức tạp và tối ưu lời giải.'], difficulty: 'Khó', duration: '3-4 giờ', tags: ['Algorithms', 'Data Structures'], prompt: 'Giải quyết các bài toán thuật toán bằng Java.\n\nYêu cầu kỹ thuật:\n- BST\n- AVL Tree\n- BFS\n- DFS\n- Dijkstra\n- Kruskal\n- Time Complexity Analysis\n\nKết quả mong đợi:\nSinh viên cài đặt đúng thuật toán, phân tích được độ phức tạp và tối ưu lời giải.' }
];

const RECENT_TEMPLATES = [
    'Flutter CRUD Application',
    'Java REST API',
    'SQL Midterm Practice'
];

const CustomDropdown = ({ value, onChange, options, placeholder = "Chọn...", className = "w-48", hasError = false }: { value: string, onChange: (v: string) => void, options: any[], placeholder?: string, className?: string, hasError?: boolean }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    const normalizedOptions = options.map(opt => typeof opt === 'string' ? { value: opt, label: opt } : opt);
    const selectedOption = normalizedOptions.find(opt => opt.value === value);

    return (
        <div className={`relative ${className}`}>
            <div 
                className={classNames(
                    "w-full px-4 py-2 border rounded-xl text-sm outline-none bg-white cursor-pointer flex items-center justify-between shadow-sm transition-all",
                    isOpen ? "border-brand-500 ring-2 ring-brand-100" : (hasError ? "border-rose-400 ring-2 ring-rose-100 bg-rose-50/30" : "border-slate-200 hover:border-slate-300")
                )}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className={value ? "text-slate-900 font-semibold" : "text-slate-400"}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </div>
            
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-[0_12px_40px_-10px_rgba(0,0,0,0.12)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 py-1.5 max-h-64 overflow-y-auto">
                        {normalizedOptions.map(opt => (
                            <div 
                                key={opt.value}
                                className={classNames(
                                    "px-4 py-2.5 mx-1.5 my-0.5 text-sm cursor-pointer transition-all duration-200 rounded-xl flex items-center",
                                    value === opt.value 
                                        ? "bg-brand-50 text-brand-700 font-bold" 
                                        : "text-slate-600 hover:bg-brand-50/60 hover:text-brand-600 font-medium"
                                )}
                                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                            >
                                {opt.label}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}

export default function AssignmentUploadPage() {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [inputMethod, setInputMethod] = useState<'file' | 'text'>('text');
    const [textPrompt, setTextPrompt] = useState('');

    const [content, setContent] = useState('');
    const [rubric, setRubric] = useState<any>(null);
    const [blueprint, setBlueprint] = useState<any>(null);
    const [metadata, setMetadata] = useState<any>({ title: 'AI Generated Assignment', description: '', projectType: 'backend', subject: '', dueDate: '' });

    const [isLoading, setIsLoading] = useState(false);
    const [loadingMsg, setLoadingMsg] = useState('');
    const [error, setError] = useState<string | null>(null);

    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [activeSubjectFilter, setActiveSubjectFilter] = useState('PRM392');

    const [previewTemplateId, setPreviewTemplateId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [subjectCode, setSubjectCode] = useState('');

    const navigate = useNavigate();

    const [teacherSubjects, setTeacherSubjects] = useState<string[]>([]);
    const [allClasses, setAllClasses] = useState<any[]>([]);
    const [semesters, setSemesters] = useState<any[]>([]);
    const [selectedSemester, setSelectedSemester] = useState<string>('');
    const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
    const [validationErrors, setValidationErrors] = useState<{ semester?: string, subjectCode?: string, dueDate?: string, classes?: string }>({});
    
    const abortControllerRef = useRef<AbortController | null>(null);

    const handleCancelGeneration = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setIsLoading(false);
    };

    useEffect(() => {
        const fetchClasses = async () => {
            try {
                const [clsData, semsData] = await Promise.all([
                    mainApi.getClasses(1, 1000),
                    mainApi.getSemesters()
                ]);
                setAllClasses(clsData);

                // Filter semesters to only include those where the lecturer has classes
                const teacherSemesterIds = new Set(clsData.map((c: any) => c.semester?.id).filter(Boolean));
                const filteredSems = semsData.filter((s: any) => teacherSemesterIds.has(s.id));
                setSemesters(filteredSems);

                const activeSem = filteredSems.find((s: any) => s.isActive) || filteredSems[0];
                if (activeSem) setSelectedSemester(activeSem.id);

                const uniqueSubjects = new Set<string>();
                clsData.forEach((c: any) => {
                    const code = c.subject?.code;
                    if (code) uniqueSubjects.add(code);
                });
                const subjectList = Array.from(uniqueSubjects).sort();
                setTeacherSubjects(subjectList);
            } catch (err) {
                console.error("Failed to load classes:", err);
            }
        };
        fetchClasses();
    }, []);

    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(null), 3500);
            return () => clearTimeout(timer);
        }
    }, [error]);

    const handleGenerateContent = async () => {
        const newErrors: { semester?: string, subjectCode?: string } = {};
        if (!selectedSemester) newErrors.semester = "Vui lòng chọn Học kỳ.";
        if (!subjectCode) newErrors.subjectCode = "Vui lòng chọn Mã môn học.";
        
        if (Object.keys(newErrors).length > 0) {
            setValidationErrors(newErrors);
            return;
        }
        setValidationErrors({});
        
        if (!textPrompt) return;
        setError(null);
        setIsLoading(true);
        abortControllerRef.current = new AbortController();

        try {
            setLoadingMsg('Gemini is generating the assignment content...');
            const finalPrompt = subjectCode ? `Môn học: ${subjectCode}\n\n${textPrompt}` : textPrompt;
            const markdown = await api.generateContent(finalPrompt, selectedSemester, subjectCode, { signal: abortControllerRef.current.signal });

            setLoadingMsg('Analyzing content & extracting grading blueprint...');
            const draftBlueprint = await api.parseRequirements(markdown);

            setLoadingMsg('Running background execution to compute Test Cases...');
            const generatedRubric = await api.generateRubric(draftBlueprint);

            let finalMarkdown = markdown;
            if (draftBlueprint.projectType === 'algorithm') {
                const ioRule = generatedRubric.rules.find((r: any) => r.scoringStrategy === 'StdInOutProbe');
                const testCases = ioRule?.requiredEvidence?.[0]?.stdInOutProbe?.testCases;
                if (testCases && testCases.length > 0) {
                    finalMarkdown += `<br/><h3>Expected Behavior (Test Cases)</h3><ul>`;
                    testCases.forEach((tc: any, idx: number) => {
                        finalMarkdown += `<li><strong>Test Case ${idx + 1}:</strong><br/>Input:<pre>${tc.input}</pre>Output:<pre>${tc.expectedOutput}</pre></li><br/>`;
                    });
                    finalMarkdown += `</ul>`;
                }
            }

            setContent(finalMarkdown);
            setRubric(generatedRubric);
            setBlueprint(draftBlueprint);
            setMetadata({
                title: draftBlueprint.assignmentTitle || 'AI Generated Assignment',
                description: draftBlueprint.description || '',
                projectType: draftBlueprint.projectType || 'backend',
                subject: subjectCode || draftBlueprint.subject || ''
            });
            setStep(2);
        } catch (err: any) {
            if (err.name === 'AbortError') return;
            setError(err.response?.data?.error || err.message || "Failed to generate content");
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileUpload = async (file: File) => {
        const newErrors: { semester?: string, subjectCode?: string } = {};
        if (!selectedSemester) newErrors.semester = "Vui lòng chọn Học kỳ.";
        if (!subjectCode) newErrors.subjectCode = "Vui lòng chọn Mã môn học.";
        
        if (Object.keys(newErrors).length > 0) {
            setValidationErrors(newErrors);
            return;
        }
        setValidationErrors({});

        setError(null);
        setIsLoading(true);
        setLoadingMsg('Analyzing document and generating rubric...');
        abortControllerRef.current = new AbortController();
        try {
            const extractResult = await api.extractText(file, selectedSemester, subjectCode, { signal: abortControllerRef.current.signal });
            const text = extractResult.text?.rawText || (typeof extractResult.text === 'string' ? extractResult.text : JSON.stringify(extractResult.text));
            const result = await api.parseRubric(text, extractResult.documentImageKey, { signal: abortControllerRef.current.signal });

            setRubric(result.rubric);
            setBlueprint(result.blueprint);
            setMetadata({
                title: result.blueprint.assignmentTitle || 'AI Generated Assignment',
                description: result.blueprint.description || '',
                projectType: result.blueprint.projectType || 'backend',
                subject: subjectCode || result.blueprint.subject || '',
                fileUrl: extractResult.uploadedFile?.url,
                fileName: extractResult.uploadedFile?.fileName,
                fileType: extractResult.uploadedFile?.fileType
            });

            setStep(3); // Skip step 2 for files
        } catch (err: any) {
            if (err.name === 'AbortError') return;
            setError(err.response?.data?.error || err.message || "Failed to process file");
        } finally {
            setIsLoading(false);
        }
    };

    const handleParseRubric = async () => {
        if (!content) return;
        if (rubric && blueprint) {
            setStep(3);
        }
    };

    const handlePublish = async () => {
        if (!rubric || !blueprint) return;
        
        const newErrors: { semester?: string, classes?: string, dueDate?: string } = {};
        if (!selectedSemester) newErrors.semester = "Vui lòng chọn Học kỳ.";
        if (selectedClasses.length === 0) newErrors.classes = "Vui lòng chọn ít nhất 1 lớp để giao bài tập.";
        if (!metadata.dueDate) {
            newErrors.dueDate = "Vui lòng chọn Hạn nộp (Due Date).";
        } else if (new Date(metadata.dueDate) < new Date()) {
            newErrors.dueDate = "Hạn nộp không được ở trong quá khứ.";
        }
        
        if (Object.keys(newErrors).length > 0) {
            setValidationErrors(newErrors);
            setError("Vui lòng điền đầy đủ các thông tin bắt buộc.");
            return;
        }

        setError(null);
        setValidationErrors({});

        for (const rule of rubric.rules) {
            if (rule.scoringStrategy === 'StdInOutProbe') {
                const testCases = rule.requiredEvidence?.[0]?.stdInOutProbe?.testCases || [];
                if (testCases.length < 3) {
                    setError(`Rule "${rule.title}" requires at least 3 test cases for I/O testing (has ${testCases.length}). Please add more test cases.`);
                    return;
                }
            }
        }

        const totalScore = rubric.rules.reduce((sum: number, r: any) => sum + (Number(r.weight) || 0), 0);
        if (Math.abs(totalScore - 10) > 0.01) {
            setError(`Tổng điểm hiện tại là ${totalScore.toFixed(2)}. Hệ thống yêu cầu tổng điểm phải bằng chính xác 10.0.`);
            return;
        }

        setIsLoading(true);
        setLoadingMsg('Finalizing and publishing assignment...');
        try {
            const finalMetadata = { ...metadata, semesterId: selectedSemester, classIds: selectedClasses };
            const assignment = await api.publishAssignment(finalMetadata, blueprint, rubric);
            navigate(`/lecturer/grading/assignments/${assignment.id}`);
        } catch (err: any) {
            setError(err.response?.data?.error || err.message || "Failed to publish assignment");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRuleChange = (index: number, field: string, value: string) => {
        const updatedRubric = { ...rubric };
        if (field === 'weight') {
            updatedRubric.rules[index].weight = parseFloat(value) || 0;
        } else {
            updatedRubric.rules[index][field] = value;
        }
        setRubric(updatedRubric);
    };

    const handleDeleteRule = (index: number) => {
        const updatedRubric = { ...rubric };
        updatedRubric.rules.splice(index, 1);
        setRubric(updatedRubric);
    };

    const handleTestCaseChange = (ruleIndex: number, tcIndex: number, field: string, value: string | number) => {
        const updatedRubric = { ...rubric };
        const rule = updatedRubric.rules[ruleIndex];
        if (rule.requiredEvidence && rule.requiredEvidence[0] && rule.requiredEvidence[0].stdInOutProbe) {
            const tc = rule.requiredEvidence[0].stdInOutProbe.testCases[tcIndex];
            if (tc) {
                tc[field] = value;
                setRubric(updatedRubric);
            }
        }
    };

    const availableSubjectsForInput = selectedSemester 
        ? Array.from(new Set(allClasses.filter((c: any) => c.semester?.id === selectedSemester && c.subject?.code).map((c: any) => c.subject.code))).sort()
        : teacherSubjects;

    const getSemesterLabel = (s: any) => {
        const parts = [s.season, s.code].filter(v => v && v !== 'undefined');
        return parts.length > 0 ? parts.join(' - ') : 'Kỳ học khác';
    };

    return (
        <div className="bg-gradient-to-br from-indigo-50/50 via-white to-white h-[calc(100vh-64px)] -mx-4 sm:-mx-6 lg:-mx-8 -mt-6 -mb-8 rounded-tl-3xl font-sans relative flex">
            <div className={classNames("overflow-y-auto overflow-x-hidden transition-all duration-300 relative flex flex-col", isDrawerOpen ? "w-1/2 shrink-0" : "flex-1")}>

                {/* Clean Background to match mockup */}

                <div className="max-w-6xl mx-auto w-full flex flex-col flex-1 relative z-10 px-6 lg:px-12 pt-5 pb-6">
                    <div className="mb-3 animate-fade-in">
                        <button onClick={() => navigate(`/lecturer/grading/assignments`)} className="text-slate-400 hover:text-brand-500 transition-colors p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 font-medium">
                            <ArrowLeft size={20} />
                            Back to assignments
                        </button>
                    </div>

                    {/* Top Section: Title + Steps + Image */}
                    <div className={classNames("flex items-start justify-between shrink-0 relative z-0", isDrawerOpen ? "mb-8" : "mb-0")}>
                        
                        {/* Left side: Title and Steps */}
                        <div className="flex flex-col gap-8">
                            <div className="flex gap-4">
                                <Sparkles className="text-brand-600 w-10 h-10 mt-1 shrink-0" />
                                <div>
                                    <h1 className="text-3xl font-black text-slate-900 mb-1 tracking-tight">
                                        AI assignment creator
                                    </h1>
                                    <p className="text-slate-500 font-medium text-base">Tạo bài tập thông minh với AI</p>
                                </div>
                            </div>

                            {/* Progress Steps */}
                            <div className="flex items-center justify-start gap-5 pl-14">
                                <StepIndicator current={step} step={1} title="Input" />
                                <div className="w-16 h-[1px] bg-slate-200"></div>
                                <StepIndicator current={step} step={2} title="Edit content" />
                                <div className="w-16 h-[1px] bg-slate-200"></div>
                                <StepIndicator current={step} step={3} title="Review rubric" />
                            </div>
                        </div>

                        {/* Right side: 3D Image (Natural layout, no absolute positioning) */}
                        {!isDrawerOpen && (
                            <div className="hidden lg:block w-[420px] h-[280px] shrink-0 -mr-8 -mt-6">
                                <div
                                    className="w-full h-full opacity-90"
                                    style={{
                                        WebkitMaskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 70%)',
                                        maskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 70%)'
                                    }}
                                >
                                    <img
                                        src="/ai-graphic.png"
                                        alt="3D Assignment Graphic"
                                        className="w-full h-full object-cover mix-blend-multiply contrast-[1.1] brightness-[1.05]"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center p-20 border border-slate-200 rounded-2xl bg-slate-50 text-center">
                            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-brand-600 mb-6"></div>
                            <h2 className="text-2xl text-slate-800 font-bold mb-2">{loadingMsg}</h2>
                            <p className="text-slate-500 mb-6">Vui lòng chờ AI xử lý yêu cầu của bạn...</p>
                            <button 
                                onClick={handleCancelGeneration}
                                className="px-6 py-2.5 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl font-bold transition-colors shadow-sm"
                            >
                                Hủy quá trình
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col flex-1">
                            {/* STEP 1: INPUT */}
                            {step === 1 && (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col flex-1 relative z-10">
                                    {/* Input Cards Grid */}
                                    <div className={classNames("grid shrink-0 relative z-10", isDrawerOpen ? "grid-cols-2 gap-3 mb-4" : "grid-cols-1 md:grid-cols-2 gap-5 mb-5")}>
                                        {/* Write Prompt Card */}
                                        <div
                                            onClick={() => setInputMethod('text')}
                                            className={classNames(
                                                "cursor-pointer transition-all duration-300 flex items-center border bg-white",
                                                isDrawerOpen ? "p-3 gap-3 rounded-[16px]" : "p-5 gap-5 rounded-[24px]",
                                                inputMethod === 'text'
                                                    ? "border-brand-500 shadow-sm"
                                                    : "border-slate-200 hover:border-slate-300"
                                            )}
                                        >
                                            <div className={classNames(
                                                "flex items-center justify-center shrink-0",
                                                isDrawerOpen ? "w-12 h-12 rounded-xl" : "w-16 h-16 rounded-2xl",
                                                inputMethod === 'text' ? "bg-brand-100/60 text-brand-600" : "bg-slate-50 text-slate-500"
                                            )}>
                                                <Type size={isDrawerOpen ? 22 : 28} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className={classNames("font-bold truncate", isDrawerOpen ? "text-[15px] mb-0" : "text-[17px] mb-1", inputMethod === 'text' ? "text-brand-600" : "text-slate-900")}>Viết prompt</h3>
                                                {!isDrawerOpen && <p className="text-[13px] text-slate-500 leading-snug">Mô tả yêu cầu bài tập bằng ngôn ngữ tự nhiên để AI tạo nội dung.</p>}
                                            </div>
                                            <div className={classNames(
                                                "rounded-full flex items-center justify-center shrink-0 transition-colors shadow-sm",
                                                isDrawerOpen ? "w-7 h-7" : "w-9 h-9",
                                                inputMethod === 'text' ? "bg-brand-600 text-white" : "bg-slate-400 text-white"
                                            )}>
                                                <ArrowRight size={isDrawerOpen ? 14 : 16} />
                                            </div>
                                        </div>

                                        {/* Upload File Card */}
                                        <div
                                            onClick={() => setInputMethod('file')}
                                            className={classNames(
                                                "cursor-pointer transition-all duration-300 flex items-center border bg-white",
                                                isDrawerOpen ? "p-3 gap-3 rounded-[16px]" : "p-5 gap-5 rounded-[24px]",
                                                inputMethod === 'file'
                                                    ? "border-brand-500 shadow-sm"
                                                    : "border-slate-200 hover:border-slate-300"
                                            )}
                                        >
                                            <div className={classNames(
                                                "flex items-center justify-center shrink-0",
                                                isDrawerOpen ? "w-12 h-12 rounded-xl" : "w-16 h-16 rounded-2xl",
                                                inputMethod === 'file' ? "bg-brand-100/60 text-brand-600" : "bg-slate-50 text-slate-500"
                                            )}>
                                                <UploadCloud size={isDrawerOpen ? 22 : 28} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className={classNames("font-bold truncate", isDrawerOpen ? "text-[15px] mb-0" : "text-[17px] mb-1", inputMethod === 'file' ? "text-brand-600" : "text-slate-900")}>Tải lên tệp</h3>
                                                {!isDrawerOpen && <p className="text-[13px] text-slate-500 leading-snug">Tải lên tài liệu (PDF, Word, TXT) để AI phân tích và tạo bài tập.</p>}
                                            </div>
                                            <div className={classNames(
                                                "rounded-full flex items-center justify-center shrink-0 transition-colors shadow-sm",
                                                isDrawerOpen ? "w-7 h-7" : "w-9 h-9",
                                                inputMethod === 'file' ? "bg-brand-600 text-white" : "bg-slate-400 text-white"
                                            )}>
                                                <ArrowRight size={isDrawerOpen ? 14 : 16} />
                                            </div>
                                        </div>
                                    </div>

                                    {inputMethod === 'text' ? (
                                        <>
                                            <div className="border border-slate-200 rounded-[24px] p-6 bg-white flex flex-col flex-1 min-h-[450px]">
                                                <div className="flex flex-col gap-4 mb-4 shrink-0">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-4">
                                                            <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                                                                Học kỳ <span className="text-rose-500">*</span>
                                                            </div>
                                                            <div className="relative">
                                                                <CustomDropdown
                                                                    value={selectedSemester}
                                                                    onChange={(val) => {
                                                                        setSelectedSemester(val);
                                                                        setSubjectCode('');
                                                                        setSelectedClasses([]);
                                                                        setMetadata({ ...metadata, subject: '' });
                                                                        setValidationErrors(prev => ({ ...prev, semester: undefined }));
                                                                    }}
                                                                    options={semesters.map((s: any) => ({ value: s.id, label: getSemesterLabel(s) }))}
                                                                    placeholder="Chọn học kỳ..."
                                                                    className="w-56"
                                                                    hasError={!!validationErrors.semester}
                                                                />
                                                                {validationErrors.semester && (
                                                                    <div className="absolute top-[110%] left-0 flex items-center gap-1.5 text-[12px] text-rose-600 font-bold bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-200 shadow-sm whitespace-nowrap z-10 animate-in fade-in slide-in-from-top-1">
                                                                        <Info size={14} className="shrink-0" />
                                                                        {validationErrors.semester}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2 text-slate-900 font-bold text-base ml-2">
                                                                Mã môn học <span className="text-rose-500">*</span>
                                                            </div>
                                                            <div className="relative">
                                                                <CustomDropdown 
                                                                    value={subjectCode} 
                                                                    onChange={(val) => {
                                                                        setSubjectCode(val);
                                                                        setSelectedClasses([]);
                                                                        setMetadata({ ...metadata, subject: val });
                                                                        setValidationErrors(prev => ({ ...prev, subjectCode: undefined }));
                                                                    }} 
                                                                    options={availableSubjectsForInput as string[]} 
                                                                    placeholder="Chọn môn học..."
                                                                    hasError={!!validationErrors.subjectCode}
                                                                />
                                                                {validationErrors.subjectCode && (
                                                                    <div className="absolute top-[110%] left-0 flex items-center gap-1.5 text-[12px] text-rose-600 font-bold bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-200 shadow-sm whitespace-nowrap z-10 animate-in fade-in slide-in-from-top-1">
                                                                        <Info size={14} className="shrink-0" />
                                                                        {validationErrors.subjectCode}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => setIsDrawerOpen(true)}
                                                            className="flex items-center gap-2 px-3 py-1.5 bg-brand-50 text-brand-600 hover:bg-brand-100 rounded-lg text-sm font-bold transition-colors"
                                                        >
                                                            <Lightbulb size={16} /> Gợi ý prompt
                                                        </button>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                                                        Mô tả yêu cầu bài tập
                                                        <Info size={16} className="text-slate-400" />
                                                    </div>
                                                </div>

                                                <div className="relative flex-1 flex flex-col rounded-xl border border-slate-200 bg-white">
                                                    <textarea
                                                        className="w-full flex-1 bg-transparent p-4 pb-10 text-slate-700 placeholder-slate-400 outline-none resize-none text-[15px] leading-relaxed rounded-xl focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                                        placeholder="Nhập yêu cầu của bạn tại đây...&#10;&#10;Ví dụ: Tạo bài tập React và Node.js toàn diện, yêu cầu sinh viên xây dựng giỏ hàng.&#10;Bao gồm xác thực JWT, cơ sở dữ liệu PostgreSQL và trang thanh toán."
                                                        value={textPrompt}
                                                        onChange={(e) => setTextPrompt(e.target.value)}
                                                    />
                                                    <div className="absolute bottom-4 right-4 text-xs font-medium text-slate-400 pointer-events-none">
                                                        {textPrompt.length}/2000
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-5 flex justify-end shrink-0">
                                                <button
                                                    onClick={handleGenerateContent}
                                                    disabled={!textPrompt || textPrompt.length === 0}
                                                    className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-bold shadow-md transition-all text-sm"
                                                >
                                                    <Sparkles size={16} /> Tạo nội dung <ArrowRight size={16} />
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="border border-slate-200 rounded-[24px] p-6 bg-white flex flex-col flex-1 min-h-[450px]">
                                            <div className="flex items-center gap-4 mb-6">
                                                <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                                                    Học kỳ <span className="text-rose-500">*</span>
                                                </div>
                                                <div className="relative">
                                                    <CustomDropdown
                                                        value={selectedSemester}
                                                        onChange={(val) => {
                                                            setSelectedSemester(val);
                                                            setSubjectCode('');
                                                            setSelectedClasses([]);
                                                            setMetadata({ ...metadata, subject: '' });
                                                            setValidationErrors(prev => ({ ...prev, semester: undefined }));
                                                        }}
                                                        options={semesters.map((s: any) => ({ value: s.id, label: getSemesterLabel(s) }))}
                                                        placeholder="Chọn học kỳ..."
                                                        className="w-56"
                                                        hasError={!!validationErrors.semester}
                                                    />
                                                    {validationErrors.semester && (
                                                        <div className="absolute top-[110%] left-0 flex items-center gap-1.5 text-[12px] text-rose-600 font-bold bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-200 shadow-sm whitespace-nowrap z-10 animate-in fade-in slide-in-from-top-1">
                                                            <Info size={14} className="shrink-0" />
                                                            {validationErrors.semester}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 text-slate-900 font-bold text-base ml-2">
                                                    Mã môn học <span className="text-rose-500">*</span>
                                                </div>
                                                <div className="relative">
                                                    <CustomDropdown 
                                                        value={subjectCode} 
                                                        onChange={(val) => {
                                                            setSubjectCode(val);
                                                            setSelectedClasses([]);
                                                            setMetadata({ ...metadata, subject: val });
                                                            setValidationErrors(prev => ({ ...prev, subjectCode: undefined }));
                                                        }} 
                                                        options={availableSubjectsForInput as string[]} 
                                                        placeholder="Chọn môn học..."
                                                        hasError={!!validationErrors.subjectCode}
                                                    />
                                                    {validationErrors.subjectCode && (
                                                        <div className="absolute top-[110%] left-0 flex items-center gap-1.5 text-[12px] text-rose-600 font-bold bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-200 shadow-sm whitespace-nowrap z-10 animate-in fade-in slide-in-from-top-1">
                                                            <Info size={14} className="shrink-0" />
                                                            {validationErrors.subjectCode}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex-1 flex items-center justify-center border border-slate-200 border-dashed rounded-xl bg-slate-50 p-4">
                                                <div className="w-full max-w-xl">
                                                    <FileUpload onUpload={handleFileUpload} accept=".pdf,.docx" errorMessage="Chỉ hỗ trợ PDF hoặc DOCX" />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* STEP 2: EDIT CONTENT */}
                            {step === 2 && (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="flex justify-between items-center mb-4">
                                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                            <Edit3 className="text-brand-600" /> Refine assignment content
                                        </h2>
                                    </div>
                                    <div className="bg-white border border-slate-200 rounded-2xl text-slate-900 overflow-hidden h-[450px] flex flex-col [&>div]:h-full [&>div]:border-none shadow-sm">
                                        <div className="flex-grow overflow-y-auto prose prose-slate max-w-none prose-h1:text-3xl prose-h1:font-bold prose-h1:mb-4 prose-h2:text-2xl prose-h2:mt-6 prose-h2:mb-3 prose-p:my-2 prose-ul:my-2 p-4">
                                            <Editor
                                                value={content}
                                                onChange={(e) => setContent(e.target.value)}
                                                containerProps={{ style: { height: '100%' } }}
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-6 flex justify-between">
                                        <button onClick={() => setStep(1)} className="text-slate-500 hover:text-slate-800 font-medium px-6 py-3 border border-slate-200 rounded-xl bg-white shadow-sm">Quay lại</button>
                                        <button
                                            onClick={handleParseRubric}
                                            className="bg-brand-600 hover:bg-brand-700 text-white px-8 py-3 rounded-xl font-bold shadow-md transition-all"
                                        >
                                            Generate scoring rubric
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* STEP 3: EDIT RUBRIC */}
                            {step === 3 && rubric && (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-slate-900">
                                    <div className="mb-6">
                                        <h2 className="text-xl font-bold text-slate-900 mb-2">Review & adjust scoring criteria</h2>
                                        <p className="text-slate-500 text-sm mb-4">
                                            Edit titles, descriptions, and scores. Ensure the total score adds up to <strong className="text-slate-900">10 points</strong>.
                                        </p>

                                        <div className="grid grid-cols-3 gap-4 bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-sm mb-4">
                                            <div className="col-span-1">
                                                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Subject code (Môn học)</label>
                                                <CustomDropdown 
                                                    value={metadata.subject || ''} 
                                                    onChange={(v) => {
                                                        setMetadata({ ...metadata, subject: v });
                                                        setSelectedClasses([]); // Reset classes when subject changes
                                                    }} 
                                                    options={teacherSubjects} 
                                                    className="w-full"
                                                    placeholder="Chọn môn học..."
                                                />
                                            </div>
                                            <div className="col-span-1">
                                                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Assignment title</label>
                                                <input
                                                    className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 text-sm focus:border-brand-500 outline-none shadow-sm"
                                                    value={metadata.title}
                                                    onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
                                                />
                                            </div>
                                            <div className="col-span-1">
                                                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Project type</label>
                                                <select
                                                    className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 text-sm focus:border-brand-500 outline-none shadow-sm"
                                                    value={metadata.projectType}
                                                    onChange={(e) => setMetadata({ ...metadata, projectType: e.target.value })}
                                                >
                                                    <option value="backend">Backend</option>
                                                    <option value="frontend">Frontend</option>
                                                    <option value="fullstack">Fullstack</option>
                                                    <option value="mobile">Mobile</option>
                                                    <option value="desktop">Desktop</option>
                                                    <option value="algorithm">Algorithm</option>
                                                    <option value="unity">Unity / Game</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-sm mb-8">
                                            <div className="grid grid-cols-4 gap-6">
                                                <div className="col-span-1 border-r border-slate-200 pr-6">
                                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Học kỳ (Semester)</label>
                                                    <CustomDropdown
                                                        value={selectedSemester}
                                                        onChange={(val) => setSelectedSemester(val)}
                                                        options={semesters.map((s: any) => ({ value: s.id, label: getSemesterLabel(s) }))}
                                                        placeholder="Chọn học kỳ..."
                                                        className="w-full"
                                                    />
                                                </div>
                                                <div className="col-span-2 border-r border-slate-200 pr-6">
                                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Giao bài tập cho các lớp</label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {(() => {
                                                            const availableClasses = allClasses.filter((c: any) => c.semester?.id === selectedSemester && c.subject?.code === metadata.subject);
                                                            if (!metadata.subject) return <div className="text-sm text-slate-500 mt-2 italic">Vui lòng chọn Môn học (Subject code) ở trên trước.</div>;
                                                            if (availableClasses.length === 0) return <div className="text-sm text-slate-500 mt-2 italic">Không tìm thấy lớp học nào cho môn và kỳ này.</div>;
                                                            return availableClasses.map((c: any) => (
                                                                <button
                                                                    key={c.id}
                                                                    onClick={() => {
                                                                        setSelectedClasses(prev => prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id]);
                                                                        if (validationErrors.classes) setValidationErrors({ ...validationErrors, classes: undefined });
                                                                    }}
                                                                    className={classNames(
                                                                        "px-4 py-2 rounded-lg text-sm font-bold border transition-all duration-200",
                                                                        selectedClasses.includes(c.id) 
                                                                            ? "bg-brand-600 text-white border-brand-600 shadow-md ring-2 ring-brand-100 ring-offset-1" 
                                                                            : "bg-white text-slate-600 border-slate-200 hover:border-brand-300 hover:text-brand-600 hover:bg-brand-50/50"
                                                                    )}
                                                                >
                                                                    {c.code || c.name || 'N/A'}
                                                                </button>
                                                            ));
                                                        })()}
                                                    </div>
                                                    {validationErrors.classes && (
                                                        <div className="text-rose-500 text-[11px] font-semibold mt-2 flex items-center gap-1">
                                                            <AlertCircle size={12} /> {validationErrors.classes}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="col-span-1">
                                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Hạn nộp (Due Date) <span className="text-rose-500">*</span></label>
                                                    <DateTimePicker
                                                        value={metadata.dueDate || ''}
                                                        onChange={(val) => {
                                                            setMetadata({ ...metadata, dueDate: val });
                                                            if (validationErrors.dueDate) {
                                                                setValidationErrors({ ...validationErrors, dueDate: undefined });
                                                                setError(null);
                                                            }
                                                        }}
                                                        error={!!validationErrors.dueDate}
                                                    />
                                                    {validationErrors.dueDate && (
                                                        <div className="text-rose-500 text-[11px] font-semibold mt-1 flex items-center gap-1">
                                                            <AlertCircle size={12} /> {validationErrors.dueDate}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid gap-5 mb-8">
                                        {rubric.rules.map((rule: any, index: number) => (
                                            <div key={index} className="bg-white border border-slate-200 p-6 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col gap-4">
                                                <div className="flex gap-4">
                                                    <div className="flex-1">
                                                        <input
                                                            className="w-full bg-transparent text-brand-600 font-extrabold mb-2 border-b-2 border-transparent hover:border-slate-200 focus:border-brand-500 outline-none text-xl"
                                                            value={rule.title}
                                                            onChange={(e) => handleRuleChange(index, 'title', e.target.value)}
                                                            placeholder="Rule Title"
                                                        />
                                                        <textarea
                                                            ref={(el) => {
                                                                if (el) {
                                                                    el.style.height = 'auto';
                                                                    el.style.height = el.scrollHeight + 'px';
                                                                }
                                                            }}
                                                            className="w-full bg-transparent text-slate-600 text-sm border-b-2 border-transparent hover:border-slate-200 focus:border-brand-500 outline-none resize-none leading-relaxed overflow-hidden"
                                                            value={rule.description}
                                                            onChange={(e) => {
                                                                handleRuleChange(index, 'description', e.target.value);
                                                                e.target.style.height = 'auto';
                                                                e.target.style.height = e.target.scrollHeight + 'px';
                                                            }}
                                                            rows={2}
                                                            placeholder="Rule Description"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col items-end gap-3 w-32 border-l border-slate-100 pl-4">
                                                        <div className="flex flex-col items-end gap-1">
                                                            <label className="text-xs font-bold text-slate-400 uppercase">Score</label>
                                                            <input
                                                                type="number"
                                                                value={rule.weight}
                                                                onChange={(e) => handleRuleChange(index, 'weight', e.target.value)}
                                                                className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-slate-900 font-black text-center text-lg focus:border-brand-500 outline-none shadow-inner"
                                                            />
                                                        </div>
                                                        <button
                                                            onClick={() => handleDeleteRule(index)}
                                                            className="text-xs text-rose-500 hover:text-rose-600 font-bold mt-2"
                                                        >
                                                            Xóa tiêu chí
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3 text-xs items-center pt-3 border-t border-slate-100">
                                                    <select
                                                        disabled
                                                        className="px-3 py-2 bg-slate-100 rounded-lg text-slate-500 font-bold border border-slate-200 outline-none cursor-not-allowed shadow-sm appearance-none"
                                                        value={rule.category}
                                                        onChange={(e) => handleRuleChange(index, 'category', e.target.value)}
                                                    >
                                                        <option value="Functional">Functional</option>
                                                        <option value="Architecture">Architecture</option>
                                                        <option value="Theory">Theory</option>
                                                        <option value="UI/UX">UI/UX</option>
                                                        <option value="Security">Security</option>
                                                        <option value="Data">Data</option>
                                                        <option value="Algorithm">Algorithm</option>
                                                        <option value="CodeQuality">Code Quality</option>
                                                        <option value="Design">Design</option>
                                                    </select>
                                                    <span className={classNames(
                                                        "px-3 py-2 rounded-lg border font-bold shadow-sm",
                                                        rule.scoringStrategy === 'AIVision'
                                                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                                                            : rule.scoringStrategy === 'StdInOutProbe' || rule.scoringStrategy === 'HTTPProbe'
                                                                ? 'bg-sky-50 text-sky-700 border-sky-200'
                                                                : rule.scoringStrategy === 'AICodeReview' || rule.scoringStrategy === 'AiTextAnalysis'
                                                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                                                    : rule.scoringStrategy === 'Manual'
                                                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                    )}>
                                                        {rule.scoringStrategy === 'AIVision' ? '👁 Visual check' : rule.scoringStrategy === 'StdInOutProbe' ? '⌨️ I/O test' : rule.scoringStrategy === 'HTTPProbe' ? '🌐 API probe' : rule.scoringStrategy === 'AICodeReview' ? '🤖 AI review' : rule.scoringStrategy === 'AiTextAnalysis' ? '📝 Text analysis' : rule.scoringStrategy === 'HybridVisionAndCode' ? '⚡ Hybrid AI & UI test' : rule.scoringStrategy === 'Manual' ? '👩‍🏫 Teacher review' : '⚡ Auto test'}
                                                    </span>
                                                </div>
                                                {rule.scoringStrategy === 'StdInOutProbe' && rule.requiredEvidence?.[0]?.stdInOutProbe?.testCases && (
                                                    <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50 -mx-6 -mb-6 p-6 rounded-b-xl">
                                                        <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                                            <Type size={16} className="text-brand-600" /> Standard I/O test cases
                                                        </h4>
                                                        <div className="grid gap-4">
                                                            {rule.requiredEvidence[0].stdInOutProbe.testCases.map((tc: any, tcIdx: number) => (
                                                                <div key={tc.id || tcIdx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
                                                                    <div className="flex gap-6">
                                                                        <div className="flex-1">
                                                                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Standard input (stdin)</label>
                                                                            <textarea
                                                                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-700 text-sm font-mono resize-none focus:border-brand-500 outline-none shadow-inner"
                                                                                value={tc.input || ''}
                                                                                onChange={(e) => handleTestCaseChange(index, tcIdx, 'input', e.target.value)}
                                                                                rows={4}
                                                                            />
                                                                        </div>
                                                                        <div className="flex-1">
                                                                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Expected output (stdout)</label>
                                                                            <textarea
                                                                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-700 text-sm font-mono resize-none focus:border-brand-500 outline-none shadow-inner"
                                                                                value={tc.expectedOutput || ''}
                                                                                onChange={(e) => handleTestCaseChange(index, tcIdx, 'expectedOutput', e.target.value)}
                                                                                rows={4}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}

                                        <button
                                            className="w-full py-5 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-bold hover:text-brand-600 hover:border-brand-400 hover:bg-brand-50 transition-colors"
                                            onClick={() => {
                                                const updatedRubric = { ...rubric };
                                                updatedRubric.rules.push({
                                                    id: `rule-custom-${Date.now()}`,
                                                    title: "New Rule",
                                                    description: "Describe the requirement here",
                                                    category: "Functional",
                                                    weight: 5,
                                                    scoringStrategy: "Boolean",
                                                    requiredEvidence: []
                                                });
                                                setRubric(updatedRubric);
                                            }}
                                        >
                                            + Add custom rule
                                        </button>
                                    </div>

                                    <div className="mt-8 flex justify-between border-t border-slate-200 pt-6">
                                        <button onClick={() => {
                                            if (inputMethod === 'file') {
                                                setStep(1);
                                            } else {
                                                setStep(2);
                                            }
                                        }} className="text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 font-bold px-6 py-3 rounded-xl shadow-sm">
                                            {inputMethod === 'file' ? 'Back to upload' : 'Back to edit content'}
                                        </button>
                                        <button
                                            onClick={handlePublish}
                                            className="bg-brand-600 hover:bg-brand-700 text-white px-8 py-3.5 rounded-xl font-bold shadow-md flex items-center gap-2 transition-all"
                                        >
                                            <CheckCircle size={20} /> Phát hành bài tập
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {error && (
                        <div className="fixed top-24 right-8 z-[100] animate-toast-in">
                            <div className="bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-rose-100 p-4 flex items-start gap-4 min-w-[320px]">
                                <div className="text-rose-500 shrink-0 mt-0.5 bg-rose-50 p-1.5 rounded-full">
                                    <Info size={20} />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-[15px] font-bold text-slate-900 leading-tight">Thiếu thông tin</h4>
                                    <p className="text-sm text-slate-600 mt-1">{error}</p>
                                </div>
                                <button 
                                    onClick={() => setError(null)}
                                    className="text-slate-400 hover:text-slate-600 transition-colors shrink-0 p-1 rounded-md hover:bg-slate-50"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Context Panel */}
            {isDrawerOpen && (
                <div className="w-1/2 bg-white border-l border-slate-200 shadow-[-4px_0_24px_-10px_rgba(0,0,0,0.1)] flex flex-col z-20 h-full animate-in slide-in-from-right duration-300 font-sans shrink-0">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
                        <h2 className="text-[22px] font-black text-slate-900 tracking-tight">Gợi ý prompt</h2>
                        <button onClick={() => setIsDrawerOpen(false)} className="text-slate-400 hover:text-slate-800 transition-colors p-1 rounded-full">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Search */}
                    <div className="px-6 mb-5 shrink-0">
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Tìm kiếm template..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-sm placeholder:font-normal"
                            />
                        </div>
                    </div>



                    {/* Split Content */}
                    <div className="flex-1 flex border-t border-slate-100 min-h-0 overflow-hidden">
                        {/* Left Sidebar (Subjects) */}
                        <div className="w-[140px] shrink-0 bg-slate-50 border-r border-slate-100 flex flex-col py-3 overflow-y-auto">
                            <div className="flex items-center justify-between px-4 py-2 text-xs font-bold text-slate-500 mb-1">
                                <span>Tất cả môn học</span>
                                <span className="text-slate-500">{PROMPT_TEMPLATES.length}</span>
                            </div>
                            {['PRM392', 'SWP391', 'DBI202', 'AI201', 'Khác'].map(sub => {
                                const count = PROMPT_TEMPLATES.filter(x => sub === 'Khác' ? !['PRM392', 'SWP391', 'DBI202', 'AI201'].includes(x.subject) : x.subject === sub).length;
                                return (
                                    <button
                                        key={sub}
                                        onClick={() => setActiveSubjectFilter(sub)}
                                        className={classNames(
                                            "flex items-center justify-between px-4 py-2.5 text-[13px] font-semibold transition-all relative",
                                            activeSubjectFilter === sub ? "bg-white text-brand-700 shadow-sm" : "text-slate-600 hover:bg-slate-100"
                                        )}
                                    >
                                        {activeSubjectFilter === sub && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-brand-600"></div>}
                                        <span>{sub}</span>
                                        <span className={classNames("px-1.5 py-0.5 rounded-md font-bold text-[10px]", activeSubjectFilter === sub ? "bg-brand-50 text-brand-600" : "bg-transparent text-slate-400")}>{count}</span>
                                    </button>
                                )
                            })}

                            <div className="mt-6 mb-2 flex items-center gap-1.5 px-4 text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                                <Clock size={12} /> Mới sử dụng
                            </div>
                            <div className="flex flex-col">
                                {RECENT_TEMPLATES.map((t, i) => (
                                    <button key={i} className="text-left px-4 py-2 text-[12px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 truncate transition-colors">
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Right Content (Templates) */}
                        <div className="flex-1 overflow-y-auto bg-white p-6">
                            {(() => {
                                const filtered = PROMPT_TEMPLATES.filter(p => {
                                    if (activeSubjectFilter === 'Khác') return !['PRM392', 'SWP391', 'DBI202', 'AI201'].includes(p.subject);
                                    return p.subject === activeSubjectFilter;
                                }).filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));

                                if (filtered.length === 0) {
                                    return (
                                        <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-70">
                                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                                                <Search className="text-slate-400" size={24} />
                                            </div>
                                            <p className="text-slate-600 font-bold mb-1">Chưa có template nào</p>
                                            <p className="text-slate-400 text-xs">Vui lòng thử môn học hoặc từ khóa khác.</p>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h3 className="text-[14px] font-black text-slate-800">{activeSubjectFilter} <span className="text-slate-400 font-medium">- Templates</span></h3>
                                        </div>

                                        {filtered.map(prompt => (
                                            <div key={prompt.id} className="bg-white border border-slate-200 rounded-xl hover:border-brand-300 transition-colors flex flex-col">
                                                <div className="p-4 pb-3 flex-1">
                                                    <h4 className="font-bold text-slate-900 text-[14px] mb-1.5">{prompt.title}</h4>
                                                    <p className="text-slate-500 text-[13px] leading-relaxed line-clamp-2">
                                                        {prompt.description}
                                                    </p>
                                                </div>

                                                <div className="px-4 pb-4 flex flex-col justify-end border-t border-slate-100 pt-4 mt-2">
                                                    <div className="flex items-center justify-end gap-3">
                                                        <button
                                                            onClick={() => setPreviewTemplateId(prompt.id)}
                                                            className="px-5 py-2 text-[12px] font-bold text-brand-600 border border-brand-200 hover:bg-brand-50 rounded-lg transition-colors"
                                                        >
                                                            Xem trước
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setTextPrompt(prompt.prompt);
                                                                setIsDrawerOpen(false);
                                                            }}
                                                            className="px-5 py-2 text-[12px] font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-colors"
                                                        >
                                                            Sử dụng
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        <button className="flex items-center justify-center gap-1 mt-2 mb-4 text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline">
                                            Xem tất cả template của {activeSubjectFilter} <ArrowRight size={14} />
                                        </button>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>

                    {/* Footer Tip */}
                    <div className="bg-indigo-50/50 p-4 px-6 flex items-start gap-3 shrink-0 border-t border-indigo-100">
                        <Lightbulb size={16} className="text-brand-500 shrink-0 mt-0.5" />
                        <p className="text-indigo-800 text-[13px] font-medium leading-relaxed">
                            Mẹo: Chọn template phù hợp và chỉnh sửa để tạo prompt hiệu quả hơn.
                        </p>
                    </div>
                </div>
            )}

            {/* Preview Dialog */}
            {previewTemplateId !== null && (() => {
                const t = PROMPT_TEMPLATES.find(x => x.id === previewTemplateId);
                if (!t) return null;
                return (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center font-sans p-4">
                        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setPreviewTemplateId(null)}></div>
                        <div className="relative bg-white w-[650px] max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <div>
                                    <div className="flex gap-2 mb-1">
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">{t.subject}</span>
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">{t.category}</span>
                                    </div>
                                    <h2 className="text-xl font-bold text-slate-900">{t.title}</h2>
                                </div>
                                <button onClick={() => setPreviewTemplateId(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300 hover:text-slate-800 transition-colors">
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 mb-2">Mô tả</h3>
                                    <p className="text-slate-600 text-sm leading-relaxed">{t.description}</p>
                                </div>

                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 mb-2">Yêu cầu</h3>
                                    <ul className="list-disc pl-5 flex flex-col gap-1.5">
                                        {t.requirements.map((req, i) => (
                                            <li key={i} className="text-slate-600 text-sm">{req}</li>
                                        ))}
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 mb-2">Kết quả mong đợi</h3>
                                    <ul className="list-disc pl-5 flex flex-col gap-1.5">
                                        {t.outcomes.map((out, i) => (
                                            <li key={i} className="text-slate-600 text-sm leading-relaxed">{out}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
                                <button onClick={() => setPreviewTemplateId(null)} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors text-sm">
                                    Đóng
                                </button>
                                <button
                                    onClick={() => {
                                        setTextPrompt(t.prompt);
                                        setPreviewTemplateId(null);
                                        setIsDrawerOpen(false);
                                    }}
                                    className="px-6 py-2.5 rounded-xl font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-sm transition-colors flex items-center gap-2 text-sm"
                                >
                                    Sử dụng Template <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                )
            })()}
        </div>
    );
}


function StepIndicator({ current, step, title }: { current: number, step: number, title: string }) {

    const isActive = current === step;

    return (
        <div className="flex items-center gap-3">
            <div className={classNames(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors duration-300",
                isActive ? "bg-brand-600 text-white" : "bg-slate-200 text-slate-500"
            )}>
                {step}
            </div>
            <span className={classNames(
                "text-sm",
                isActive ? "text-brand-600 font-bold" : "text-slate-500 font-medium"
            )}>{title}</span>
        </div>
    );
}
