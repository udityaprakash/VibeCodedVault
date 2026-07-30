import React from 'react';

export function renderMarkdown(md: string) {
  const lines = md.split('\n');
  const elements: React.ReactNode[] = [];
  let inList = false;
  let listItems: string[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];

  const flushList = (key: string | number) => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${key}`} className="list-disc pl-5 my-2 space-y-1 text-xs text-obsidian-350">
          {listItems.map((item, idx) => (
            <li key={idx}>{parseInlineMarkdown(item)}</li>
          ))}
        </ul>
      );
      listItems = [];
    }
    inList = false;
  };

  const flushCode = (key: string | number) => {
    if (codeLines.length > 0) {
      elements.push(
        <pre key={`code-${key}`} className="bg-obsidian-950/80 border border-obsidian-850 p-3 rounded-lg my-2 overflow-x-auto text-[10px] text-cyber-cyan font-mono leading-relaxed">
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      codeLines = [];
    }
    inCodeBlock = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        flushCode(i);
      } else {
        flushList(i);
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    if (line.startsWith('# ')) {
      flushList(i);
      elements.push(
        <h1 key={i} className="text-base font-bold text-obsidian-100 mt-4 mb-2 border-b border-obsidian-850 pb-1">
          {parseInlineMarkdown(line.slice(2))}
        </h1>
      );
      continue;
    }
    if (line.startsWith('## ')) {
      flushList(i);
      elements.push(
        <h2 key={i} className="text-xs font-extrabold text-cyber-cyan mt-4 mb-2">
          {parseInlineMarkdown(line.slice(3))}
        </h2>
      );
      continue;
    }
    if (line.startsWith('### ')) {
      flushList(i);
      elements.push(
        <h3 key={i} className="text-[11px] font-bold text-obsidian-200 mt-3 mb-1">
          {parseInlineMarkdown(line.slice(4))}
        </h3>
      );
      continue;
    }

    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      inList = true;
      listItems.push(line.trim().slice(2));
      continue;
    }

    if (!line.trim()) {
      flushList(i);
      continue;
    }

    if (inList) {
      flushList(i);
    }
    elements.push(
      <p key={i} className="text-xs text-obsidian-350 leading-relaxed my-1.5">
        {parseInlineMarkdown(line)}
      </p>
    );
  }

  flushList('end');
  flushCode('end');
  return <div className="space-y-1">{elements}</div>;
}

export function parseInlineMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let currentText = text;

  const tokenRegex = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
  const segments = currentText.split(tokenRegex);

  segments.forEach((seg, idx) => {
    if (seg.startsWith('`') && seg.endsWith('`')) {
      parts.push(
        <code key={idx} className="bg-obsidian-900 border border-obsidian-800 text-[10px] text-cyber-rose font-mono px-1 py-0.5 rounded mx-0.5">
          {seg.slice(1, -1)}
        </code>
      );
    } else if (seg.startsWith('**') && seg.endsWith('**')) {
      parts.push(<strong key={idx} className="font-extrabold text-obsidian-100">{seg.slice(2, -2)}</strong>);
    } else if (seg.startsWith('[') && seg.includes('](')) {
      const match = seg.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (match) {
        parts.push(
          <a
            key={idx}
            href={match[2]}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              if (window.api && (window.api as any).openExternal) {
                e.preventDefault();
                (window.api as any).openExternal(match[2]);
              }
            }}
            className="text-cyber-cyan hover:underline font-semibold"
          >
            {match[1]}
          </a>
        );
      } else {
        parts.push(seg);
      }
    } else {
      parts.push(seg);
    }
  });

  return parts;
}
