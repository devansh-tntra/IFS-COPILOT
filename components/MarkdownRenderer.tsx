import React from 'react';
import ReactMarkdown from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <div className="prose prose-invert prose-sm max-w-none break-words">
      <ReactMarkdown
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match;
            return isInline ? (
              <code className="bg-slate-800 px-1 py-0.5 rounded text-pink-300 font-mono text-sm" {...props}>
                {children}
              </code>
            ) : (
              <div className="bg-slate-900 rounded-md p-3 my-2 overflow-x-auto border border-slate-700">
                <code className={className} {...props}>
                  {children}
                </code>
              </div>
            );
          },
          ul({ children }) {
            return <ul className="list-disc pl-5 my-2 space-y-1">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal pl-5 my-2 space-y-1">{children}</ol>;
          },
          h1({ children }) {
            return <h1 className="text-xl font-bold text-white mt-4 mb-2">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-lg font-bold text-white mt-3 mb-2">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-base font-semibold text-slate-200 mt-2 mb-1">{children}</h3>;
          },
          p({ children }) {
            return <p className="mb-2 leading-relaxed text-slate-300">{children}</p>;
          },
          a({ href, children }) {
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                {children}
              </a>
            );
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-indigo-500 pl-4 italic text-slate-400 my-2">
                {children}
              </blockquote>
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
