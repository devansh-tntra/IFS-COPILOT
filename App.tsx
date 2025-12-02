import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import { Message, Role, KnowledgeItem } from './types';
import { INITIAL_SYSTEM_PROMPT, DEFAULT_MODEL, SAMPLE_KNOWLEDGE } from './constants';
import { sendMessageToGemini } from './services/geminiService';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState(INITIAL_SYSTEM_PROMPT);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Initial demo knowledge
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeItem[]>([
    {
      id: '1',
      title: 'Sample: IFS Lifecycle Intro',
      content: SAMPLE_KNOWLEDGE,
      type: 'text'
    }
  ]);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: Role.USER,
      text: input,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Aggregate knowledge base content
      const contextString = knowledgeBase
        .map((item) => `[Document: ${item.title}]\n${item.content}`)
        .join('\n\n');

      const responseText = await sendMessageToGemini(
        userMessage.text,
        messages, // Send previous history for context
        systemPrompt,
        contextString,
        DEFAULT_MODEL
      );

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: Role.MODEL,
        text: responseText,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: Role.MODEL,
        text: `**Error:** ${error.message || 'Something went wrong.'} \n\nPlease check your API key environment variable or network connection.`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      <Sidebar
        systemPrompt={systemPrompt}
        setSystemPrompt={setSystemPrompt}
        knowledgeBase={knowledgeBase}
        setKnowledgeBase={setKnowledgeBase}
        isOpen={sidebarOpen}
        toggleSidebar={toggleSidebar}
      />
      <ChatInterface
        messages={messages}
        input={input}
        setInput={setInput}
        isLoading={isLoading}
        onSend={handleSend}
        toggleSidebar={toggleSidebar}
      />
    </div>
  );
};

export default App;
