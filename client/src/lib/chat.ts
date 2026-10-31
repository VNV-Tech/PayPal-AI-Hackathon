import { api } from './api'

// Mismos tipos que server/src/ai/copilot.ts.
export type ActionStatus = 'pending' | 'running' | 'approved' | 'rejected' | 'failed'

// Un renglón con casilla en una tarjeta tipo ticket (por ejemplo, varios pagos).
export interface ActionChoice {
  id: string
  label: string
  detail: string
  amount: string
  setAside: { name: string; value: string; currency: string }[]
  checked: boolean
}

export interface ActionView {
  id: string
  title: string
  details: [string, string][]
  choices?: ActionChoice[]
  status: ActionStatus
  result?: string
}

export type ChatItem = { type: 'text'; text: string } | { type: 'action'; action: ActionView }

// Lo que el copiloto preparó por su cuenta (mismo tipo que listSuggestions
// en server/src/ai/copilot.ts). El id es el de la conversación.
export interface Suggestion {
  id: string
  createdAt: string
  title: string
  items: ChatItem[]
}

export const chatApi = {
  suggestions: () => api<{ suggestions: Suggestion[] }>('/copilot/suggestions'),
  send: (message: string, conversationId?: string) =>
    api<{ conversationId: string; items: ChatItem[] }>('/chat', {
      method: 'POST',
      body: JSON.stringify({ message, ...(conversationId ? { conversationId } : {}) }),
    }),
  resolve: (actionId: string, decision: 'approve' | 'reject', selected?: string[]) =>
    api<{ action: ActionView; items: ChatItem[] }>(`/chat/actions/${actionId}`, {
      method: 'POST',
      body: JSON.stringify({ decision, ...(selected ? { selected } : {}) }),
    }),
}
