import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FileUpload from '@/components/modules/grading/FileUpload';
import { gradingApi as api } from '@/lib/api';
import { Sparkles, Edit3, CheckCircle, FileText, Type } from 'lucide-react';
import classNames from 'classnames';
import Editor from 'react-simple-wysiwyg';

export default function AssignmentUploadPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [inputMethod, setInputMethod] = useState<'file' | 'text'>('text');
  const [textPrompt, setTextPrompt] = useState('');
  
  const [content, setContent] = useState('');
  const [rubric, setRubric] = useState<any>(null);
  const [blueprint, setBlueprint] = useState<any>(null);
  const [metadata, setMetadata] = useState({ title: 'AI Generated Assignment', description: '', projectType: 'backend' });

  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();

  const handleGenerateContent = async () => {
    if (!textPrompt) return;
    setError(null);
    setIsLoading(true);
    
    try {
      setLoadingMsg('Gemini is generating the assignment content...');
      const markdown = await api.generateContent(textPrompt);
      
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
        projectType: draftBlueprint.projectType || 'backend'
      });
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to generate content");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setError(null);
    setIsLoading(true);
    setLoadingMsg('Analyzing document and generating rubric...');
    try {
      const text = await api.extractText(file);
      const result = await api.parseRubric(text);
      
      setRubric(result.rubric);
      setBlueprint(result.blueprint);
      setMetadata({
        title: result.blueprint.assignmentTitle || 'AI Generated Assignment',
        description: result.blueprint.description || '',
        projectType: result.blueprint.projectType || 'backend'
      });
      
      setStep(3); // Skip step 2 for files
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to process file");
    } finally {
      setIsLoading(false);
    }
  };

  const handleParseRubric = async () => {
    if (!content) return;
    // Step 3 transition is now instant since rubric and blueprint were generated in Step 1.
    if (rubric && blueprint) {
      setStep(3);
    }
  };

  const handlePublish = async () => {
    if (!rubric || !blueprint) return;
    setError(null);
    
    // Validation: Enforce minimum 3 test cases for algorithm assignments
    for (const rule of rubric.rules) {
      if (rule.scoringStrategy === 'StdInOutProbe') {
        const testCases = rule.requiredEvidence?.[0]?.stdInOutProbe?.testCases || [];
        if (testCases.length < 3) {
          setError(`Rule "${rule.title}" requires at least 3 test cases for I/O testing (has ${testCases.length}). Please add more test cases.`);
          return;
        }
      }
    }

    setIsLoading(true);
    setLoadingMsg('Finalizing and publishing assignment...');
    try {
      const assignment = await api.publishAssignment(metadata, blueprint, rubric);
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

  return (
    <div className="max-w-5xl mx-auto pb-12 px-4 -mt-2 sm:-mt-4">
      <div className="text-center mb-10">
        <div className="flex justify-center mb-4">
            <Sparkles className="text-amber-400 w-12 h-12" />
        </div>
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400 mb-4">
          AI assignment creator
        </h1>
        
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mt-8">
            <StepIndicator current={step} step={1} title="Input" icon={<Type size={16} />} />
            
            {inputMethod === 'text' && (
                <>
                    <div className="w-12 h-[2px] bg-slate-700"></div>
                    <StepIndicator current={step} step={2} title="Edit content" icon={<FileText size={16} />} />
                </>
            )}
            
            <div className="w-12 h-[2px] bg-slate-700"></div>
            <StepIndicator current={step} step={3} title="Review rubric" icon={<CheckCircle size={16} />} />
        </div>
      </div>

      {isLoading ? (
          <div className="flex flex-col items-center justify-center p-16 glass-panel text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-amber-400 mb-6"></div>
              <h2 className="text-2xl text-white font-semibold mb-2">{loadingMsg}</h2>
              <p className="text-slate-400">Please wait while the AI processes your request...</p>
          </div>
      ) : (
          <div className="glass-panel p-8">
            
            {/* STEP 1: INPUT */}
            {step === 1 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex gap-4 mb-6">
                        <button 
                            className={classNames("flex-1 py-3 font-semibold rounded-lg transition-all", inputMethod === 'text' ? 'bg-amber-500 text-slate-900' : 'bg-slate-800 text-slate-300 hover:bg-slate-700')}
                            onClick={() => setInputMethod('text')}
                        >
                            Write prompt
                        </button>
                        <button 
                            className={classNames("flex-1 py-3 font-semibold rounded-lg transition-all", inputMethod === 'file' ? 'bg-amber-500 text-slate-900' : 'bg-slate-800 text-slate-300 hover:bg-slate-700')}
                            onClick={() => setInputMethod('file')}
                        >
                            Upload file
                        </button>
                    </div>

                    {inputMethod === 'text' ? (
                        <div>
                            <label className="block text-slate-300 font-medium mb-2">What kind of assignment do you want to create?</label>
                            <textarea 
                                className="w-full h-40 bg-slate-900 border border-slate-700 rounded-lg p-4 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none resize-none"
                                placeholder="E.g., Create a fullstack React and Node.js assignment where students build a Shopping Cart. It should include JWT auth, Postgres database, and a checkout page."
                                value={textPrompt}
                                onChange={(e) => setTextPrompt(e.target.value)}
                            />
                            <div className="mt-6 flex justify-end">
                                <button 
                                    onClick={handleGenerateContent}
                                    disabled={!textPrompt}
                                    className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 px-8 py-3 rounded-lg font-bold shadow-lg shadow-amber-500/20"
                                >
                                    Generate content
                                </button>
                            </div>
                        </div>
                    ) : (
                        <FileUpload onUpload={handleFileUpload} accept=".pdf,.docx" errorMessage="Only PDF or DOCX" />
                    )}
                </div>
            )}

            {/* STEP 2: EDIT CONTENT */}
            {step === 2 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Edit3 className="text-amber-400" /> Refine assignment content
                        </h2>
                    </div>
                    <div className="bg-white rounded-lg text-black overflow-hidden h-[450px] flex flex-col [&>div]:h-full [&>div]:border-none">
                        <div className="flex-grow overflow-y-auto prose prose-slate max-w-none prose-h1:text-3xl prose-h1:font-bold prose-h1:mb-4 prose-h2:text-2xl prose-h2:mt-6 prose-h2:mb-3 prose-p:my-2 prose-ul:my-2">
                            <Editor 
                                value={content} 
                                onChange={(e) => setContent(e.target.value)} 
                                containerProps={{ style: { height: '100%' } }}
                            />
                        </div>
                    </div>
                    <div className="mt-6 flex justify-between">
                        <button onClick={() => setStep(1)} className="text-slate-400 hover:text-white px-4 py-2">Back</button>
                        <button 
                            onClick={handleParseRubric}
                            className="bg-amber-500 hover:bg-amber-400 text-slate-900 px-8 py-3 rounded-lg font-bold shadow-lg shadow-amber-500/20"
                        >
                            Generate scoring rubric
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 3: EDIT RUBRIC */}
            {step === 3 && rubric && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="mb-6">
                        <h2 className="text-xl font-bold text-white mb-2">Review & adjust scoring criteria</h2>
                        <p className="text-slate-400 text-sm mb-4">
                            Edit titles, descriptions, and scores. Ensure the total score adds up to <strong className="text-white">10 points</strong>.
                        </p>
                        
                        <div className="grid grid-cols-2 gap-4 bg-slate-800/30 p-4 rounded-lg border border-slate-700">
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Assignment title</label>
                                <input 
                                    className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm"
                                    value={metadata.title}
                                    onChange={(e) => setMetadata({...metadata, title: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Project type</label>
                                <select 
                                    className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm"
                                    value={metadata.projectType}
                                    onChange={(e) => setMetadata({...metadata, projectType: e.target.value})}
                                >
                                    <option value="backend">Backend</option>
                                    <option value="frontend">Frontend</option>
                                    <option value="fullstack">Fullstack</option>
                                    <option value="algorithm">Algorithm</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-4 mb-8">
                        {rubric.rules.map((rule: any, index: number) => (
                            <div key={index} className="bg-slate-800/50 border border-slate-700 p-4 rounded-lg flex flex-col gap-3">
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <input 
                                            className="w-full bg-transparent text-amber-400 font-semibold mb-1 border-b border-transparent hover:border-slate-600 focus:border-amber-500 outline-none"
                                            value={rule.title}
                                            onChange={(e) => handleRuleChange(index, 'title', e.target.value)}
                                            placeholder="Rule Title"
                                        />
                                        <textarea 
                                            className="w-full bg-transparent text-slate-300 text-sm border-b border-transparent hover:border-slate-600 focus:border-amber-500 outline-none resize-none"
                                            value={rule.description}
                                            onChange={(e) => handleRuleChange(index, 'description', e.target.value)}
                                            rows={2}
                                            placeholder="Rule Description"
                                        />
                                    </div>
                                    <div className="flex flex-col items-end gap-3 w-32">
                                        <div className="flex items-center gap-2">
                                            <label className="text-xs text-slate-400">Score</label>
                                            <input 
                                                type="number" 
                                                value={rule.weight} 
                                                onChange={(e) => handleRuleChange(index, 'weight', e.target.value)}
                                                className="w-16 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-center text-sm"
                                            />
                                        </div>
                                        <button 
                                            onClick={() => handleDeleteRule(index)}
                                            className="text-xs text-red-400 hover:text-red-300 underline"
                                        >
                                            Remove rule
                                        </button>
                                    </div>
                                </div>
                                <div className="flex gap-3 text-xs items-center">
                                    <select 
                                        className="px-2 py-1 bg-slate-900 rounded text-slate-400 border border-slate-700 outline-none"
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
                                        "px-2 py-1 rounded border font-medium",
                                        rule.scoringStrategy === 'AIVision' 
                                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' 
                                            : rule.scoringStrategy === 'StdInOutProbe' || rule.scoringStrategy === 'HTTPProbe'
                                            ? 'bg-sky-500/10 text-sky-300 border-sky-500/20'
                                            : rule.scoringStrategy === 'AICodeReview' || rule.scoringStrategy === 'AiTextAnalysis'
                                            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                                            : rule.scoringStrategy === 'Manual'
                                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                            : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                                    )}>
                                        {rule.scoringStrategy === 'AIVision' ? '👁 Visual check' : rule.scoringStrategy === 'StdInOutProbe' ? '⌨️ I/O test' : rule.scoringStrategy === 'HTTPProbe' ? '🌐 API probe' : rule.scoringStrategy === 'AICodeReview' ? '🤖 AI review' : rule.scoringStrategy === 'AiTextAnalysis' ? '📝 Text analysis' : rule.scoringStrategy === 'Manual' ? '👩‍🏫 Teacher review' : '⚡ Auto test'}
                                    </span>
                                </div>
                                {rule.scoringStrategy === 'StdInOutProbe' && rule.requiredEvidence?.[0]?.stdInOutProbe?.testCases && (
                                    <div className="mt-3 pt-3 border-t border-slate-700/50">
                                        <h4 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
                                            <Type size={14} className="text-amber-400" /> Standard I/O test cases
                                        </h4>
                                        <div className="grid gap-3">
                                            {rule.requiredEvidence[0].stdInOutProbe.testCases.map((tc: any, tcIdx: number) => (
                                                <div key={tc.id || tcIdx} className="bg-slate-900/50 p-3 rounded border border-slate-700 flex flex-col gap-2">
                                                    <div className="flex gap-4">
                                                        <div className="flex-1">
                                                            <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Standard input (stdin)</label>
                                                            <textarea 
                                                                className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-slate-300 text-xs font-mono resize-none focus:border-amber-500 outline-none"
                                                                value={tc.input || ''}
                                                                onChange={(e) => handleTestCaseChange(index, tcIdx, 'input', e.target.value)}
                                                                rows={4}
                                                            />
                                                        </div>
                                                        <div className="flex-1">
                                                            <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Expected output (stdout)</label>
                                                            <textarea 
                                                                className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-slate-300 text-xs font-mono resize-none focus:border-amber-500 outline-none"
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
                            className="w-full py-3 border border-dashed border-slate-600 rounded-lg text-slate-400 hover:text-amber-400 hover:border-amber-400 transition-colors"
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

                    <div className="mt-6 flex justify-between border-t border-slate-700 pt-6">
                        <button onClick={() => {
                            if (inputMethod === 'file') {
                                setStep(1);
                            } else {
                                setStep(2);
                            }
                        }} className="text-slate-400 hover:text-white px-4 py-2">
                            {inputMethod === 'file' ? 'Back to upload' : 'Back to edit content'}
                        </button>
                        <button 
                            onClick={handlePublish}
                            className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-8 py-3 rounded-lg font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                        >
                            <CheckCircle size={20} /> Publish assignment
                        </button>
                    </div>
                </div>
            )}
          </div>
      )}

      {error && (
        <div className="mt-8 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-center">
          <p className="font-semibold">Operation failed</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}
    </div>
  );
}

function StepIndicator({ current, step, title, icon }: { current: number, step: number, title: string, icon: React.ReactNode }) {
    const isCompleted = current > step;
    const isActive = current === step;
    
    return (
        <div className={classNames(
            "flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-colors duration-300",
            isActive ? "bg-amber-500 text-slate-900" : isCompleted ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800 text-slate-500"
        )}>
            {icon}
            <span className="text-sm">{title}</span>
        </div>
    );
}



