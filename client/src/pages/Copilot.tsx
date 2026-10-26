import { type FormEvent, useState } from 'react'
import { Badge, Button, Card } from '../components/ui'
import { APP_NAME } from '../lib/config'

type Message =
  | { id: string; role: 'user' | 'assistant'; text: string }
  // Acción propuesta por la IA: nunca se ejecuta sin que el usuario la apruebe.
  | { id: string; role: 'action'; title: string; details: [string, string][]; status: 'pending' | 'approved' | 'rejected' }

const initialMessages: Message[] = [
  {
    id: 'welcome',
    role: 'assistant',
    text: `Hi! I'm ${APP_NAME}. I can draft and send PayPal invoices, check who owes you money and send reminders. I'll always ask before doing anything on your PayPal account.`,
  },
  // Ejemplo visual de la tarjeta de confirmación (se quitará al conectar el backend).
  {
    id: 'example-action',
    role: 'action',
    title: 'Create and send invoice',
    details: [
      ['Client', 'Acme Corp · billing@acme.example'],
      ['Item', 'Website redesign'],
      ['Amount', '$12,500.00 MXN'],
      ['Due', 'Net 15'],
    ],
    status: 'pending',
  },
]

export function Copilot() {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [draft, setDraft] = useState('')

  function send(e: FormEvent) {
    e.preventDefault()
    const text = draft.trim()
    if (!text) return
    // TODO: enviar a POST /api/chat y mostrar la respuesta de Claude.
    setMessages((m) => [...m, { id: crypto.randomUUID(), role: 'user', text }])
    setDraft('')
  }

  function resolveAction(id: string, status: 'approved' | 'rejected') {
    // TODO: POST /api/actions/:id/approve | reject
    setMessages((m) => m.map((msg) => (msg.id === id && msg.role === 'action' ? { ...msg, status } : msg)))
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-3xl flex-col">
      <ol className="flex-1 space-y-4 overflow-y-auto pb-4" aria-live="polite">
        {messages.map((msg) => (
          <li key={msg.id} className={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            {msg.role === 'action' ? (
              <ActionCard message={msg} onResolve={resolveAction} />
            ) : (
              <p
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user' ? 'bg-brand-600 text-white' : 'border border-line bg-surface'
                }`}
              >
                {msg.text}
              </p>
            )}
          </li>
        ))}
      </ol>

      <form onSubmit={send} className="flex gap-2 rounded-full border border-line bg-surface p-2 shadow-sm">
        <label htmlFor="chat-input" className="sr-only">
          Message
        </label>
        <input
          id="chat-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask about your invoices or tell me what to bill…"
          maxLength={2000}
          autoComplete="off"
          className="flex-1 bg-transparent px-4 text-sm outline-none placeholder:text-ink-muted"
        />
        <Button type="submit" disabled={!draft.trim()}>
          Send
        </Button>
      </form>
    </div>
  )
}

function ActionCard({
  message,
  onResolve,
}: {
  message: Extract<Message, { role: 'action' }>
  onResolve: (id: string, status: 'approved' | 'rejected') => void
}) {
  return (
    <Card className="w-full max-w-md border-brand-600/30 p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{message.title}</p>
        {message.status === 'pending' && <Badge tone="warning">Needs your approval</Badge>}
        {message.status === 'approved' && <Badge tone="success">Approved</Badge>}
        {message.status === 'rejected' && <Badge>Cancelled</Badge>}
      </div>
      <dl className="mt-3 divide-y divide-line text-sm">
        {message.details.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 py-2">
            <dt className="text-ink-muted">{k}</dt>
            <dd className="text-right font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      {message.status === 'pending' && (
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onResolve(message.id, 'rejected')}>
            Cancel
          </Button>
          <Button onClick={() => onResolve(message.id, 'approved')}>Approve & send</Button>
        </div>
      )}
    </Card>
  )
}
