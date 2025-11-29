'use client';

import MarkdownToJSX from 'markdown-to-jsx';
import { ReactNode } from 'react';

interface MarkdownProps {
  children: string;
  className?: string;
}

// Custom styled components for markdown rendering with dark mode support
const H1 = ({ children }: { children: ReactNode }) => (
  <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 mt-6 first:mt-0">{children}</h1>
);

const H2 = ({ children }: { children: ReactNode }) => (
  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 mt-5 first:mt-0">{children}</h2>
);

const H3 = ({ children }: { children: ReactNode }) => (
  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 mt-4 first:mt-0">{children}</h3>
);

const H4 = ({ children }: { children: ReactNode }) => (
  <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-2 mt-3 first:mt-0">{children}</h4>
);

const Paragraph = ({ children }: { children: ReactNode }) => (
  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-3 last:mb-0">{children}</p>
);

const Strong = ({ children }: { children: ReactNode }) => (
  <strong className="font-semibold text-gray-900 dark:text-white">{children}</strong>
);

const Em = ({ children }: { children: ReactNode }) => (
  <em className="italic text-gray-700 dark:text-gray-300">{children}</em>
);

const UnorderedList = ({ children }: { children: ReactNode }) => (
  <ul className="list-disc list-inside space-y-1 mb-3 text-sm text-gray-700 dark:text-gray-300">{children}</ul>
);

const OrderedList = ({ children }: { children: ReactNode }) => (
  <ol className="list-decimal list-inside space-y-1 mb-3 text-sm text-gray-700 dark:text-gray-300">{children}</ol>
);

const ListItem = ({ children }: { children: ReactNode }) => (
  <li className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{children}</li>
);

const Blockquote = ({ children }: { children: ReactNode }) => (
  <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 py-2 my-3 text-gray-600 dark:text-gray-400 italic bg-gray-50 dark:bg-neutral-800 rounded-r">
    {children}
  </blockquote>
);

const Code = ({ children }: { children: ReactNode }) => (
  <code className="bg-gray-100 dark:bg-neutral-800 text-gray-800 dark:text-gray-200 px-1.5 py-0.5 rounded text-sm font-mono">
    {children}
  </code>
);

const Pre = ({ children }: { children: ReactNode }) => (
  <pre className="bg-gray-900 dark:bg-black text-gray-100 p-4 rounded-lg overflow-x-auto mb-3 text-sm font-mono border border-gray-800 dark:border-neutral-700">
    {children}
  </pre>
);

const Link = ({ children, href }: { children: ReactNode; href?: string }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
  >
    {children}
  </a>
);

const Hr = () => <hr className="border-gray-200 dark:border-neutral-700 my-4" />;

const Table = ({ children }: { children: ReactNode }) => (
  <div className="overflow-x-auto mb-3">
    <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700 text-sm">{children}</table>
  </div>
);

const Thead = ({ children }: { children: ReactNode }) => (
  <thead className="bg-gray-50 dark:bg-neutral-800">{children}</thead>
);

const Tbody = ({ children }: { children: ReactNode }) => (
  <tbody className="divide-y divide-gray-200 dark:divide-neutral-700">{children}</tbody>
);

const Tr = ({ children }: { children: ReactNode }) => <tr>{children}</tr>;

const Th = ({ children }: { children: ReactNode }) => (
  <th className="px-4 py-2 text-left font-semibold text-gray-900 dark:text-white">{children}</th>
);

const Td = ({ children }: { children: ReactNode }) => (
  <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{children}</td>
);

export function Markdown({ children, className = '' }: MarkdownProps) {
  return (
    <div className={`markdown-content ${className}`}>
      <MarkdownToJSX
        options={{
          overrides: {
            h1: { component: H1 },
            h2: { component: H2 },
            h3: { component: H3 },
            h4: { component: H4 },
            p: { component: Paragraph },
            strong: { component: Strong },
            em: { component: Em },
            ul: { component: UnorderedList },
            ol: { component: OrderedList },
            li: { component: ListItem },
            blockquote: { component: Blockquote },
            code: { component: Code },
            pre: { component: Pre },
            a: { component: Link },
            hr: { component: Hr },
            table: { component: Table },
            thead: { component: Thead },
            tbody: { component: Tbody },
            tr: { component: Tr },
            th: { component: Th },
            td: { component: Td },
          },
        }}
      >
        {children}
      </MarkdownToJSX>
    </div>
  );
}

export default Markdown;
