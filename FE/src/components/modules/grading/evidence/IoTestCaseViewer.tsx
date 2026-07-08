import React from 'react';
import type { IoTestCaseEvidence } from '@/types';

interface Props {
  testCases: IoTestCaseEvidence[];
}

const IoTestCaseViewer: React.FC<Props> = ({ testCases }) => {
  return (
    <div className="mt-4 space-y-3">
      <h4 className="text-sm font-semibold text-slate-300 border-b border-slate-700 pb-2">
        I/O Test Cases Execution
      </h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-slate-400">
          <thead className="text-xs text-slate-400 uppercase bg-slate-800 rounded-t-lg">
            <tr>
              <th scope="col" className="px-4 py-3 rounded-tl-lg">Case ID</th>
              <th scope="col" className="px-4 py-3">Input</th>
              <th scope="col" className="px-4 py-3">Expected Output</th>
              <th scope="col" className="px-4 py-3">Actual Output</th>
              <th scope="col" className="px-4 py-3 rounded-tr-lg">Result</th>
            </tr>
          </thead>
          <tbody>
            {testCases.map((tc) => (
              <tr key={tc.caseId} className="border-b border-slate-700 bg-slate-800/50 hover:bg-slate-700/50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-200 whitespace-nowrap">
                  {tc.caseId}
                </td>
                <td className="px-4 py-3 font-mono text-xs whitespace-pre-wrap text-slate-300">
                  {tc.input}
                </td>
                <td className="px-4 py-3 font-mono text-xs whitespace-pre-wrap">
                  {tc.expected}
                </td>
                <td className="px-4 py-3 font-mono text-xs whitespace-pre-wrap">
                  {tc.actual || <span className="italic text-slate-500">(empty)</span>}
                </td>
                <td className="px-4 py-3">
                  {tc.passed ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-900/50 text-emerald-400 border border-emerald-800">
                      Passed
                    </span>
                  ) : tc.timedOut ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-900/50 text-amber-400 border border-amber-800">
                      Timeout
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-900/50 text-rose-400 border border-rose-800">
                      Failed
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default IoTestCaseViewer;




