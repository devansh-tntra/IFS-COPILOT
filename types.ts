export enum Role {
  USER = 'user',
  MODEL = 'model'
}

export interface Message {
  id: string;
  role: Role;
  text: string;
  timestamp: number;
}

export interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'file';
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}

export interface AppConfig {
  systemPrompt: string;
  model: string;
}
