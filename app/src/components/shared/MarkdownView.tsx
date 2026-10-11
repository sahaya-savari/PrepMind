import React from 'react';

interface MarkdownViewProps {
  content: string;
  className?: string;
}

// Inline formatting: parses bold (**text**), italic (*text*), inline code (`code`), and links ([text](url))
function renderInline(text: string): React.ReactNode[] {
  // Regex pattern matching:
  // 1. `inline code`
  // 2. **bold**
  // 3. *italic*
  // 4. [text](url)
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (!part) return null;

    // Inline code
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 mx-0.5 rounded font-mono text-[11px] bg-[var(--surface-elevated)] text-[var(--accent)] border border-[var(--border)]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Bold
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={index} className="font-semibold text-[var(--text-primary)]">
          {renderInline(part.slice(2, -2))}
        </strong>
      );
    }

    // Italic
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return (
        <em key={index} className="italic text-[var(--text-primary)]">
          {renderInline(part.slice(1, -1))}
        </em>
      );
    }

    // Links
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={index}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--accent)] underline hover:text-[var(--accent-hover)] transition-colors"
        >
          {linkMatch[1]}
        </a>
      );
    }

    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

export function MarkdownView({ content, className = '' }: MarkdownViewProps) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Empty line
    if (!trimmed) {
      i++;
      continue;
    }

    // 2. Horizontal Rule (---, ***, ___)
    if (/^(\*{3,}|-{3,}|_{3,})$/.test(trimmed)) {
      elements.push(<hr key={`hr-${i}`} className="my-4 border-[var(--border)]" />);
      i++;
      continue;
    }

    // 3. Headings (# H1, ## H2, ### H3, #### H4)
    if (trimmed.startsWith('#')) {
      const match = trimmed.match(/^(#{1,6})\s+(.*)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2];

        if (level === 1) {
          elements.push(
            <h1 key={`h1-${i}`} className="text-lg sm:text-xl font-bold text-[var(--text-primary)] mt-3 mb-2">
              {renderInline(text)}
            </h1>
          );
        } else if (level === 2) {
          elements.push(
            <h2 key={`h2-${i}`} className="text-base sm:text-lg font-bold text-[var(--text-primary)] mt-3 mb-1.5">
              {renderInline(text)}
            </h2>
          );
        } else if (level === 3) {
          elements.push(
            <h3 key={`h3-${i}`} className="text-sm sm:text-base font-semibold text-[var(--accent)] mt-2.5 mb-1">
              {renderInline(text)}
            </h3>
          );
        } else {
          elements.push(
            <h4 key={`h4-${i}`} className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] mt-2 mb-1">
              {renderInline(text)}
            </h4>
          );
        }
        i++;
        continue;
      }
    }

    // 4. Blockquotes (> quote)
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      elements.push(
        <blockquote
          key={`quote-${i}`}
          className="border-l-2 border-[var(--accent)] pl-3 my-2 text-xs text-[var(--text-secondary)] italic bg-[var(--surface-elevated)]/50 py-1 rounded-r"
        >
          {quoteLines.map((ql, qIdx) => (
            <div key={qIdx}>{renderInline(ql)}</div>
          ))}
        </blockquote>
      );
      continue;
    }

    // 5. Tables (| col1 | col2 |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableRows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        const rowLine = lines[i].trim();
        // Check if it's separator row (|---|---|)
        if (!/^[|\s-:]+$/.test(rowLine)) {
          const cells = rowLine
            .slice(1, -1)
            .split('|')
            .map((c) => c.trim());
          tableRows.push(cells);
        }
        i++;
      }

      if (tableRows.length > 0) {
        const headerRow = tableRows[0];
        const bodyRows = tableRows.slice(1);

        elements.push(
          <div key={`table-${i}`} className="overflow-x-auto my-3 rounded-lg border border-[var(--border)]">
            <table className="min-w-full text-left text-xs divide-y divide-[var(--border)]">
              <thead className="bg-[var(--surface-elevated)] font-semibold text-[var(--text-primary)]">
                <tr>
                  {headerRow.map((cell, cIdx) => (
                    <th key={cIdx} className="px-3 py-2 border-r border-[var(--border)] last:border-r-0">
                      {renderInline(cell)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)]">
                {bodyRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-[var(--surface-elevated)]/50 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3 py-2 border-r border-[var(--border)] last:border-r-0">
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // 6. Unordered Lists (- item, * item)
    if (/^[-*]\s+/.test(trimmed)) {
      const listItems: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^[-*]\s+/, ''));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="list-disc list-inside space-y-1 my-2 text-xs sm:text-sm text-[var(--text-secondary)] pl-1">
          {listItems.map((item, itemIdx) => (
            <li key={itemIdx} className="leading-relaxed">
              <span className="text-[var(--text-primary)]">{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 7. Ordered Lists (1. item)
    if (/^\d+\.\s+/.test(trimmed)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="list-decimal list-inside space-y-1 my-2 text-xs sm:text-sm text-[var(--text-secondary)] pl-1">
          {listItems.map((item, itemIdx) => (
            <li key={itemIdx} className="leading-relaxed">
              <span className="text-[var(--text-primary)]">{renderInline(item)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // 8. Normal Paragraph Line
    elements.push(
      <p key={`p-${i}`} className="text-xs sm:text-sm text-[var(--text-primary)] leading-relaxed my-1">
        {renderInline(trimmed)}
      </p>
    );
    i++;
  }

  return <div className={`space-y-1 ${className}`}>{elements}</div>;
}
