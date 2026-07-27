import React from 'react';

interface FormattedTextProps {
  text?: string;
  className?: string;
}

export function FormattedText({ text, className }: FormattedTextProps) {
  if (!text) return null;

  const lines = text.split('\n');

  return (
    <div className={`space-y-1 ${className || ''}`}>
      {lines.map((line, lineIdx) => {
        const isBullet = line.trim().startsWith('* ') || line.trim().startsWith('- ');
        const content = isBullet ? line.replace(/^\s*[*|-]\s+/, '') : line;

        // Split by inline markdown: `code`, 'bold', **bold**
        const regex = /(`[^`]+`|'[^']+'|\*\*[^*]+\*\*)/g;
        const parts = content.split(regex);

        const renderedParts = parts.map((part, i) => {
          if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
            return (
              <code key={i} className="font-mono text-[0.9em] bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-brand-400 px-1 py-0.5 rounded mx-0.5">
                {part.slice(1, -1)}
              </code>
            );
          }
          if (part.startsWith("'") && part.endsWith("'") && part.length > 2) {
            return (
              <strong key={i} className="font-semibold text-slate-700 dark:text-slate-200">
                {part.slice(1, -1)}
              </strong>
            );
          }
          if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
            return (
              <strong key={i} className="font-bold text-slate-800 dark:text-slate-100">
                {part.slice(2, -2)}
              </strong>
            );
          }
          return <React.Fragment key={i}>{part}</React.Fragment>;
        });

        if (isBullet) {
          return (
            <div key={lineIdx} className="flex items-start gap-2 mt-1.5">
              <span className="text-brand-500 mt-[2px] text-lg leading-none">•</span>
              <span className="flex-1">{renderedParts}</span>
            </div>
          );
        }

        return (
          <div key={lineIdx} className={lineIdx > 0 ? 'mt-1.5' : ''}>
            {renderedParts}
          </div>
        );
      })}
    </div>
  );
}
