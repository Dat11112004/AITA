import { useState, useRef } from 'react';
import { UploadCloud, FileType, FolderUp, X } from 'lucide-react';
import classNames from 'classnames';

interface MultiFileUploadProps {
  onUpload: (files: File[]) => Promise<void>;
  accept?: string;
  isUploading?: boolean;
}

export default function MultiFileUpload({ onUpload, accept = ".zip", isUploading = false }: MultiFileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFiles = (files: FileList | File[]) => {
    const acceptedTypes = accept.split(',').map(t => t.trim().toLowerCase());
    const validFiles: File[] = [];
    
    Array.from(files).forEach(file => {
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (acceptedTypes.some(type => fileExtension === type || type === '*/*')) {
        validFiles.push(file);
      }
    });

    if (validFiles.length > 0) {
      setSelectedFiles(prev => {
        // Prevent duplicates by name
        const newFiles = [...prev];
        validFiles.forEach(vf => {
          if (!newFiles.find(existing => existing.name === vf.name)) {
            newFiles.push(vf);
          }
        });
        return newFiles;
      });
    } else {
      alert(`No valid files found. Please make sure they end with ${accept}.`);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const handleSubmit = async () => {
    if (selectedFiles.length === 0) return;
    await onUpload(selectedFiles);
  };

  const removeFile = (indexToRemove: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== indexToRemove));
  };

  const totalSizeMB = selectedFiles.reduce((acc, file) => acc + file.size, 0) / 1024 / 1024;

  return (
    <div className="w-full max-w-4xl mx-auto mt-12">
      <div 
        className={classNames(
          "relative glass-panel p-12 flex flex-col items-center justify-center border-2 border-dashed transition-all duration-300",
          dragActive ? "border-emerald-500 bg-emerald-500/10 scale-[1.02]" : "dark:border-slate-600 border-slate-300 dark:hover:border-slate-500 hover:border-slate-400",
          isUploading && "opacity-50 pointer-events-none"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center gap-6 text-center z-10 pointer-events-none">
          <div className="flex gap-4">
            <div className="p-4 dark:bg-slate-800 bg-slate-100 rounded-full shadow-inner">
              <UploadCloud size={48} className="text-emerald-500 dark:text-emerald-400" />
            </div>
            <div className="p-4 dark:bg-slate-800 bg-slate-100 rounded-full shadow-inner">
              <FolderUp size={48} className="text-cyan-500 dark:text-cyan-400" />
            </div>
          </div>
          <div>
            <p className="font-medium text-xl dark:text-white text-slate-900">
              Drag & drop files or folders here
            </p>
            <p className="text-sm dark:text-slate-400 text-slate-500 mt-2 max-w-sm mx-auto">
              You can drop multiple {accept} files at once, or an entire directory.
            </p>
          </div>
          
          <div className="flex gap-4 mt-2 pointer-events-auto">
            <button 
                onClick={() => filesInputRef.current?.click()}
                className="px-6 py-2 rounded border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
            >
                Browse files
            </button>
            <button 
                onClick={() => folderInputRef.current?.click()}
                className="px-6 py-2 rounded border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
            >
                Browse folder
            </button>
          </div>
        </div>

        {/* Hidden Inputs */}
        <input 
          type="file" 
          multiple
          accept={accept}
          onChange={handleChange}
          ref={filesInputRef}
          className="hidden"
        />
        <input 
          type="file" 
          /* @ts-expect-error webkitdirectory is non-standard but widely supported */
          webkitdirectory="" 
          directory=""
          onChange={handleChange}
          ref={folderInputRef}
          className="hidden"
        />
      </div>

      {selectedFiles.length > 0 && (
        <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold dark:text-white">
                    Selected submissions ({selectedFiles.length})
                </h3>
                <span className="text-sm dark:text-slate-400">Total size: {totalSizeMB.toFixed(2)} MB</span>
            </div>
            
            <div className="max-h-64 overflow-y-auto glass-panel p-4 rounded-xl border dark:border-slate-700/50 flex flex-col gap-2">
                {selectedFiles.map((file, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 rounded-lg dark:bg-slate-800/50 bg-slate-50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group border dark:border-slate-700/50">
                        <div className="flex items-center gap-3">
                            <FileType className="text-emerald-500" size={24} />
                            <div>
                                <p className="text-sm font-medium dark:text-slate-200">{file.name}</p>
                                <p className="text-xs dark:text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB • {file.webkitRelativePath || 'Direct file'}</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => removeFile(idx)}
                            disabled={isUploading}
                            className="p-2 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-400/10 rounded transition-all disabled:opacity-0"
                        >
                            <X size={18} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
      )}

      {selectedFiles.length > 0 && !isUploading && (
        <div className="mt-8 flex justify-center">
          <button 
            onClick={handleSubmit}
            disabled={isUploading}
            className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 disabled:opacity-50 text-white font-semibold rounded-lg shadow-lg shadow-emerald-500/20 transition-all text-lg"
          >
            Start batch grading ({selectedFiles.length} files)
          </button>
        </div>
      )}
    </div>
  );
}
