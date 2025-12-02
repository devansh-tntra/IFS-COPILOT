import React, { useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Menu } from 'lucide-react';
import { Message, Role } from '../types';
import MarkdownRenderer from './MarkdownRenderer';

interface ChatInterfaceProps {
  messages: Message[];
  input: string;
  setInput: (val: string) => void;
  isLoading: boolean;
  onSend: () => void;
  toggleSidebar: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  input,
  setInput,
  isLoading,
  onSend,
  toggleSidebar
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 relative">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center p-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <button onClick={toggleSidebar} className="text-slate-300 mr-3">
          <Menu size={24} />
        </button>
        <span className="font-semibold text-white">IFS Copilot</span>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-4 opacity-60">
            <Bot size={64} className="text-indigo-500" />
            <div className="text-center max-w-md">
              <h3 className="text-lg font-medium text-white mb-2">Ready to assist</h3>
              <p>Upload your IFS notes or docs in the sidebar, then ask me anything about the lifecycle, build places, or exam prep.</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-4 max-w-4xl mx-auto ${
                msg.role === Role.USER ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
                  msg.role === Role.USER ? 'bg-indigo-600' : 'bg-emerald-600'
                }`}
              >
                {msg.role === Role.USER ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div
                className={`flex-1 rounded-2xl px-6 py-4 shadow-sm ${
                  msg.role === Role.USER
                    ? 'bg-slate-800 text-slate-100 rounded-tr-none'
                    : 'bg-slate-900/50 border border-slate-800 text-slate-200 rounded-tl-none'
                }`}
              >
                <MarkdownRenderer content={msg.text} />
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex gap-4 max-w-4xl mx-auto">
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0 mt-1">
              <Bot size={16} />
            </div>
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl rounded-tl-none px-6 py-4 flex items-center gap-2">
              <Loader2 className="animate-spin text-emerald-500" size={18} />
              <span className="text-slate-400 text-sm">Analyzing context...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about IFS Cloud or your uploaded docs..."
            rows={1}
            className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-xl pl-4 pr-12 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none overflow-hidden max-h-[200px]"
          />
          <button
            onClick={onSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 bottom-2 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
        <div className="text-center mt-2">
             <p className="text-xs text-slate-600">
                Gemini can make mistakes. Review generated code and facts.
             </p>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
