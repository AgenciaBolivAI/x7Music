import api from './axiosInstance';

export interface AgentChatMsg {
  role: 'user' | 'assistant';
  content: string;
}

export interface PendingAction {
  name: string;
  args: Record<string, unknown>;
  summary: string;
}

export interface AgentReply {
  success: boolean;
  answer: string;
  toolsUsed: string[];
  pendingAction: PendingAction | null;
}

export const askAgent = (history: AgentChatMsg[]) =>
  api.post<AgentReply>('/agent/chat', { history });

export const executeAgentAction = (name: string, args: Record<string, unknown>) =>
  api.post<{ success: boolean; message: string }>('/agent/execute', { name, args });

// ── Admin brain manager ──────────────────────────────────────────────────────
export interface BrainChunk {
  _id: string;
  title: string;
  content: string;
  sourceType: string;
  visibility: 'public' | 'internal';
  tags: string[];
  isActive: boolean;
  createdAt: string;
}

export const getBrain = () =>
  api.get<{ success: boolean; chunks: BrainChunk[]; total: number; active: number }>('/admin/brain');

export const addBrainChunk = (data: { title: string; content: string; sourceType?: string; visibility?: 'public' | 'internal'; tags?: string[] }) =>
  api.post('/admin/brain', data);

export const deleteBrainChunk = (id: string) => api.delete(`/admin/brain/${id}`);
