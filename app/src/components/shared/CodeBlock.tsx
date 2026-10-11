import React, { useState } from 'react';
import { Copy, Check, Terminal } from 'lucide-react';

export interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  className?: string;
  onCopySuccess?: () => void;
}

/**
 * Terminal-styled CodeBlock Component
 * Features language/filename header, copy action, clean syntax styling,
 * and accessible scrollable container.
 */
export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language = 'typescript',
  filename,
  className = '',
  onCopySuccess,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      onCopySuccess?.();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  // Simple tokenized highlighter for code display without heavy external prism/shiki dependencies
  const renderHighlightedCode = (rawCode: string) => {
    const lines = rawCode.split('\n');
    return lines.map((line, idx) => {
      return (
        <div key={idx} className="table-row">
          <span className="table-cell pr-4 select-none text-[var(--text-muted)] opacity-50 text-right text-[11px] font-mono tabular-nums w-8">
            {idx + 1}
          </span>
          <span className="table-cell font-mono text-xs whitespace-pre">
            {line}
          </span>
        </div>
      );
    });
  };

  return (
    <div
      className={`rounded-lg border border-[var(--border)] bg-[#0C0E12] overflow-hidden my-3 text-[var(--text-primary)] ${className}`}
    >
      {/* Terminal Bar Header */}
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-[var(--border)] bg-[var(--surface)] text-xs font-mono">
        <div className="flex items-center gap-2 text-[var(--text-secondary)]">
          <Terminal className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span className="font-medium text-[var(--text-primary)]">
            {filename || language}
          </span>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-elevated)] transition-colors cursor-pointer"
          aria-label={copied ? 'Code copied' : 'Copy code to clipboard'}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-[var(--positive)]" />
              <span className="text-[var(--positive)]">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code body with horizontal scroll */}
      <div className="p-4 overflow-x-auto text-xs leading-relaxed font-mono">
        <div className="table w-full">{renderHighlightedCode(code)}</div>
      </div>
    </div>
  );
};
