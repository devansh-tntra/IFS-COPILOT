import React, { useState } from 'react';
import { Settings, BookOpen, Upload, Trash2, Edit3, Loader2, Link as LinkIcon } from 'lucide-react';
import { KnowledgeItem } from '../types';
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.8.69/build/pdf.worker.min.mjs`;

interface SidebarProps {
  systemPrompt: string;
  setSystemPrompt: (prompt: string) => void;
  knowledgeBase: KnowledgeItem[];
  onAddItems: (items: KnowledgeItem[]) => void;
  onRemoveItem: (id: string) => void;
  isOpen: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  systemPrompt,
  setSystemPrompt,
  knowledgeBase,
  onAddItems,
  onRemoveItem,
  isOpen,
  toggleSidebar
}) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'knowledge'>('knowledge');
  const [newNote, setNewNote] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);

  const extractTextFromPdf = async (file: File | ArrayBuffer): Promise<string> => {
    try {
      const data = file instanceof File ? await file.arrayBuffer() : file;
      const loadingTask = pdfjsLib.getDocument({ data });
      const pdf = await loadingTask.promise;
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        // @ts-ignore
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += `[Page ${i}] ${pageText}\n`;
      }
      return fullText;
    } catch (error) {
      console.error('Error parsing PDF:', error);
      throw new Error('Failed to parse PDF content');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newItems: KnowledgeItem[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Limit file size to 100MB
        if (file.size > 100 * 1024 * 1024) {
          alert(`File ${file.name} exceeds the 100MB limit.`);
          continue;
        }

        let content = '';
        
        try {
          if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
            content = await extractTextFromPdf(file);
          } else {
            // Assume text-based for others (txt, md, json, csv)
            content = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = (e) => {
                if (typeof e.target?.result === 'string') {
                  resolve(e.target.result);
                } else {
                  reject(new Error('Failed to read file as text'));
                }
              };
              reader.onerror = reject;
              reader.readAsText(file);
            });
          }

          newItems.push({
            id: Date.now().toString() + '-' + i,
            title: file.name,
            content: content,
            type: 'file'
          });
        } catch (err) {
          console.error(`Error reading ${file.name}:`, err);
          alert(`Failed to read file: ${file.name}`);
        }
      }

      if (newItems.length > 0) {
        onAddItems(newItems);
      }
    } catch (error) {
      console.error("Global upload error:", error);
    } finally {
      setIsUploading(false);
      // Reset input value to allow selecting the same files again if needed
      event.target.value = '';
    }
  };

  const handleUrlFetch = async () => {
    if (!urlInput.trim()) return;
    setIsFetchingUrl(true);

    try {
      let content: string | ArrayBuffer | null = null;
      let contentType = '';
      let isJinaContent = false;
      
      const targetUrl = urlInput.startsWith('http') ? urlInput : `https://${urlInput}`;
      const isPdfUrl = targetUrl.toLowerCase().endsWith('.pdf');

      // Strategy 1: Jina AI Reader (Best for Text/HTML/Docs)
      // Jina renders the page server-side (handling some JS/CAPTCHA) and returns clean Markdown.
      // We skip this for PDFs to handle them as binary via CORS proxy.
      if (!isPdfUrl) {
        try {
          console.log("Attempting Jina Reader...");
          const jinaUrl = `https://r.jina.ai/${targetUrl}`;
          const res = await fetch(jinaUrl);
          
          if (res.ok) {
            const text = await res.text();
            // Basic check to ensure we didn't just get a CAPTCHA block page from Jina's proxy
            if (text.length > 100 && !text.includes("Just a moment...") && !text.includes("Cloudflare")) {
              content = text;
              contentType = 'text/markdown';
              isJinaContent = true;
            }
          }
        } catch (e) {
          console.warn("Jina Reader failed, trying fallbacks...", e);
        }
      }

      // Strategy 2: CORS Proxy (corsproxy.io)
      // Primary method for PDFs or if Jina failed.
      if (!content) {
        try {
          console.log("Attempting CORS Proxy...");
          const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
          const res = await fetch(proxyUrl);
          if (res.ok) {
            contentType = res.headers.get('content-type') || '';
            if (contentType.includes('application/pdf') || isPdfUrl) {
               content = await res.arrayBuffer();
            } else {
               content = await res.text();
            }
          }
        } catch (e) {
          console.warn("CORS Proxy failed, trying next fallback...", e);
        }
      }

      // Strategy 3: Direct Fetch (Rarely works due to CORS, but worth a shot for raw text files)
      if (!content) {
         try {
            console.log("Attempting Direct Fetch...");
            const res = await fetch(targetUrl);
            if (res.ok) {
               if (targetUrl.toLowerCase().endsWith('.pdf')) {
                 content = await res.arrayBuffer();
               } else {
                 content = await res.text();
               }
            }
         } catch(e) { console.warn("Direct fetch failed."); }
      }

      // Strategy 4: AllOrigins (Last resort for simple HTML)
      if (!content && !isPdfUrl) {
        try {
          console.log("Attempting AllOrigins...");
          const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
          const res = await fetch(proxyUrl);
          if (res.ok) {
            const data = await res.json();
            if (data.contents) {
               content = data.contents;
               contentType = 'text/html';
            }
          }
        } catch (e) {
           console.warn("AllOrigins failed.");
        }
      }

      if (!content) {
        throw new Error("Unable to retrieve content. The site is blocking automated access (403/404) or requires advanced CAPTCHA interaction.");
      }

      let finalTitle = `URL: ${targetUrl}`;
      let finalContent = '';

      if (content instanceof ArrayBuffer) {
        finalContent = await extractTextFromPdf(content);
        finalTitle += ' (PDF)';
      } else if (typeof content === 'string') {
        if (isJinaContent) {
           // Jina returns Markdown, so we use it directly
           finalContent = content;
        } else {
           // Parse raw HTML from proxies
           const doc = new DOMParser().parseFromString(content, 'text/html');
           
           // Remove clutter
           const scripts = doc.querySelectorAll('script, style, noscript, svg, img, video, audio, link, meta, nav, footer, iframe');
           scripts.forEach(node => node.remove());
           
           // Try to get main content or body
           const main = doc.querySelector('main') || doc.body;
           finalContent = main.textContent || main.innerText || "";
           finalContent = finalContent.replace(/\s+/g, ' ').trim();
        }
      }

      if (!finalContent || finalContent.length < 50) {
        throw new Error("Content appears empty. The site might be an SPA (Single Page App) or fully locked behind CAPTCHA.");
      }

      // Double check for Cloudflare signatures if strictly blocked
      const lowerContent = finalContent.toLowerCase();
      if (
        lowerContent.includes('verify you are human') || 
        lowerContent.includes('enable javascript') ||
        lowerContent.includes('challenge-platform') ||
        lowerContent.includes('security check')
      ) {
        // Even Jina might have been served the challenge page
        throw new Error("Site security check detected (Cloudflare/CAPTCHA).");
      }

      onAddItems([{
        id: Date.now().toString(),
        title: finalTitle,
        content: finalContent,
        type: 'text'
      }]);
      setUrlInput('');
      
    } catch (error: any) {
      console.error("URL Fetch Error:", error);
      alert(`Could not fetch URL.\n\nReason: ${error.message}\n\nWe tried using advanced readers (Jina AI) and proxies, but the site prevented access.\n\nWorkaround: Open the link -> Print to PDF -> Upload the file.`);
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    const newItem: KnowledgeItem = {
      id: Date.now().toString(),
      title: `Note ${new Date().toLocaleTimeString()}`,
      content: newNote,
      type: 'text'
    };
    onAddItems([newItem]);
    setNewNote('');
  };

  return (
    <div
      className={`fixed inset-y-0 left-0 z-30 w-80 bg-slate-900 border-r border-slate-800 transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } md:relative md:translate-x-0 flex flex-col`}
    >
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="bg-indigo-600 p-1 rounded-lg">AI</span> IFS Copilot
        </h2>
        <button onClick={toggleSidebar} className="md:hidden text-slate-400">
          Close
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab('knowledge')}
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
            activeTab === 'knowledge'
              ? 'text-indigo-400 border-b-2 border-indigo-400 bg-slate-800/50'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen size={16} /> Knowledge
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
            activeTab === 'settings'
              ? 'text-indigo-400 border-b-2 border-indigo-400 bg-slate-800/50'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Settings size={16} /> Agent Role
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {activeTab === 'knowledge' ? (
          <div className="space-y-6">
            <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-lg p-3">
              <p className="text-xs text-indigo-200">
                Upload files (PDF, TXT, MD, JSON) or add URLs to ground the agent. Content is saved automatically.
              </p>
            </div>

            {/* Upload Section */}
            <div>
              <label className={`flex items-center justify-center w-full h-24 border-2 border-slate-700 border-dashed rounded-lg cursor-pointer bg-slate-800/50 hover:bg-slate-800 transition-colors ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {isUploading ? (
                    <Loader2 className="w-6 h-6 text-indigo-400 animate-spin mb-2" />
                  ) : (
                    <Upload className="w-6 h-6 text-slate-400 mb-2" />
                  )}
                  <p className="text-sm text-slate-400">
                    <span className="font-semibold">{isUploading ? 'Processing...' : 'Click to upload'}</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">PDF, TXT, MD (Max 100MB)</p>
                </div>
                <input 
                  type="file" 
                  className="hidden" 
                  accept=".txt,.md,.json,.csv,.pdf" 
                  multiple 
                  onChange={handleFileUpload} 
                  disabled={isUploading}
                />
              </label>
            </div>

            {/* URL Section */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Add from Link (Web/PDF)</label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="https://example.com/docs"
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                    <button
                        onClick={handleUrlFetch}
                        disabled={isFetchingUrl || !urlInput.trim()}
                        className="px-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg flex items-center justify-center disabled:opacity-50"
                        title="Fetch URL content"
                    >
                         {isFetchingUrl ? <Loader2 size={18} className="animate-spin" /> : <LinkIcon size={18} />}
                    </button>
                </div>
                <p className="text-[10px] text-slate-500">
                    Uses Jina AI Reader + Proxies. Can read many protected sites, but strict CAPTCHAs may still block.
                </p>
            </div>

            {/* Manual Note Entry */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Add Quick Note / Snippet</label>
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Paste code snippet, error log, or concept note..."
                className="w-full h-24 bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
              />
              <button
                onClick={handleAddNote}
                disabled={!newNote.trim()}
                className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                Add to Context
              </button>
            </div>

            {/* List Items */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex justify-between items-center">
                <span>Active Context</span>
                <span className="bg-slate-800 text-xs px-2 py-0.5 rounded-full border border-slate-700">
                  {knowledgeBase.length}
                </span>
              </h3>
              {knowledgeBase.length === 0 && (
                <p className="text-sm text-slate-600 italic">No documents loaded.</p>
              )}
              {knowledgeBase.map((item) => (
                <div key={item.id} className="group bg-slate-800 border border-slate-700 rounded-lg p-3 transition-all hover:border-slate-600">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-medium text-slate-200 truncate pr-2 max-w-[180px]">
                      {item.title}
                    </span>
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="text-slate-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2">{item.content.substring(0, 150)}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
             <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3">
              <p className="text-xs text-yellow-200">
                Edit the system instructions to change the agent's persona or rules.
              </p>
            </div>
            <div className="relative">
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="w-full h-[500px] bg-slate-800 border border-slate-700 rounded-lg p-4 text-sm text-slate-300 focus:ring-1 focus:ring-indigo-500 outline-none resize-none leading-relaxed font-mono"
              />
              <div className="absolute top-2 right-2">
                <Edit3 size={16} className="text-slate-500" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
