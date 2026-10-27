import { api } from './api'

// Mismos tipos que server/src/ai/copilot.ts.
export type ActionStatus = 'pending' | 'running' | 'approved' | 'rejected' | 'failed'

export interface ActionView {
  id: string
  title: string
  details: [string, string][]
  status: ActionStatus
  result?: string
}

export type ChatItem = { type: 'text'; text: string } | { type: 'action'; action: ActionView }

export const chatApi = {
  send: (message: string, conversationId?: string) =>
    api<{ conversationId: string; items: ChatItem[] }>('/chat', {
      method: 'POST',
      body: JSON.stringify({ message, ...(conversationId ? { conversationId } : {}) }),
    }),
  resolve: (actionId: string, decision: 'approve' | 'reject') =>
    api<{ action: ActionView; items: ChatItem[] }>(`/chat/actions/${actionId}`, {
      method: 'POST',
      body: JSON.stringify({ decision }),
    }),
}
