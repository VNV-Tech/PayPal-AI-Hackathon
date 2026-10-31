import { type FormEvent, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SendHorizontal, SquarePen } from 'lucide-react'
import { Badge, Button, Card } from '../components/ui'
import { APP_NAME, formatMoney } from '../lib/config'
import { type ActionChoice, type ActionView, type ChatItem, chatApi } from '../lib/chat'
import { type Mode, useMode } from '../lib/mode'

type Message =
  | { id: string; role: 'user' | 'assistant'; text: string }
  | { id: string; role: 'error'; text: string }
  // Acción propuesta por la IA: nunca se ejecuta sin que el usuario la apruebe.
  | { id: string; role: 'action'; action: ActionView }

// El saludo y las sugerencias cambian según el modo. La IA puede hacer todo en
// ambos modos; esto solo orienta al usuario.
const WELCOME: Record<Mode, string> = {
  business: `Hi! I'm ${APP_NAME}. I can draft and send PayPal invoices, check who owes you money and send reminders. I'll always ask before doing anything on your PayPal account.`,
  personal: `Hi! I'm ${APP_NAME}. I can tell you how much you got paid, help you set part of it aside and change your savings plan. I'll always ask before changing anything.`,
}

const SUGGESTIONS: Record<Mode, string[]> = {
  business: [
    'Who still owes me money?',
    'Invoice Acme Corp 12,500 MXN for the website redesign, billing@acme.example',
    'Send a reminder for my overdue invoices',
  ],
  personal: [
    'How much have I set aside this month?',
    'Set aside 25% of every payment for taxes',
    'How much can I spend this month?',
  ],
}

const welcomeMessage = (mode: Mode): Message => ({ id: 'welcome', role: 'assistant', text: WELCOME[mode] })

function toMessages(items: ChatItem[]): Message[] {
  return items.map((item) =>
    item.type === 'text'
      ? { id: crypto.randomUUID(), role: 'assistant', text: item.text }
      : { id: item.action.id, role: 'action', action: item.action },
  )
}

export function Copilot() {
  const mode = useMode()
  const [messages, setMessages] = useState<Message[]>(() => [welcomeMessage(mode)])
  const [conversationId, setConversationId] = useState<string>()
  // Los ejemplos de la pantalla de inicio llegan como ?q=...: se escriben en la
  // caja pero no se envían solos.
  const [params, setParams] = useSearchParams()
  const [draft, setDraft] = useState(() => params.get('q')?.slice(0, 2000) ?? '')
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const endRef = useRef<HTMLLIElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, busy])

  useEffect(() => {
    if (!params.has('q')) return
    inputRef.current?.focus()
    setParams({}, { replace: true })
  }, [params, setParams])

  // Sugerencia que el copiloto preparó por su cuenta (?suggestion=<id>): se
  // abre como una conversación normal, con sus tarjetas para aprobar.
  const suggestionId = params.get('suggestion')
  useEffect(() => {
    if (!suggestionId) return
    let ignore = false
    chatApi.suggestions().then(
      ({ suggestions }) => {
        if (ignore) return
        const found = suggestions.find((sg) => sg.id === suggestionId)
        if (found) {
          setMessages(toMessages(found.items))
          setConversationId(found.id)
        } else {
          setMessages((m) => [...m, { id: crypto.randomUUID(), role: 'error', text: 'That suggestion expired.' }])
        }
        setParams({}, { replace: true })
      },
      (err: unknown) => {
        if (!ignore) fail(err)
      },
    )
    return () => {
      ignore = true
    }
  }, [suggestionId, setParams])

  // Botón "Review all with AI" de Savings (?review=payments): la conversación
  // arranca sola con los pagos pendientes. El ref evita pedirlo dos veces.
  const reviewStarted = useRef(false)
  useEffect(() => {
    if (params.get('review') !== 'payments' || reviewStarted.current) return
    reviewStarted.current = true
    setParams({}, { replace: true })
    setMessages((m) => [...m, { id: crypto.randomUUID(), role: 'user', text: 'Review all my pending payments' }])
    setBusy(true)
    chatApi
      .reviewPayments()
      .then((res) => {
        if (res.conversationId) setConversationId(res.conversationId)
        setMessages((m) => [...m, ...toMessages(res.items)])
      }, fail)
      .finally(() => setBusy(false))
  }, [params, setParams])

  function fail(err: unknown) {
    const text = err instanceof Error ? err.message : 'Something went wrong'
    setMessages((m) => [...m, { id: crypto.randomUUID(), role: 'error', text }])
  }

  async function ask(text: string) {
    if (!text || busy) return
    setMessages((m) => [...m, { id: crypto.randomUUID(), role: 'user', text }])
    setDraft('')
    setBusy(true)
    try {
      const res = await chatApi.send(text, conversationId)
      setConversationId(res.conversationId)
      // Escribir otra cosa con tarjetas abiertas cuenta como rechazarlas (lo decide el servidor).
      setMessages((m) => [
        ...m.map((msg) =>
          msg.role === 'action' && msg.action.status === 'pending'
            ? { ...msg, action: { ...msg.action, status: 'rejected' as const } }
            : msg,
        ),
        ...toMessages(res.items),
      ])
    } catch (err) {
      fail(err)
    } finally {
      setBusy(false)
    }
  }

  function send(e: FormEvent) {
    e.preventDefault()
    ask(draft.trim())
  }

  function updateAction(action: ActionView) {
    setMessages((m) => m.map((msg) => (msg.role === 'action' && msg.action.id === action.id ? { ...msg, action } : msg)))
  }

  async function resolveAction(action: ActionView, decision: 'approve' | 'reject', selected?: string[]) {
    updateAction({ ...action, status: 'running' })
    setBusy(true)
    try {
      const res = await chatApi.resolve(action.id, decision, selected)
      updateAction(res.action)
      setMessages((m) => [...m, ...toMessages(res.items)])
    } catch (err) {
      updateAction(action)
      fail(err)
    } finally {
      setBusy(false)
    }
  }

  function newChat() {
    setMessages([welcomeMessage(mode)])
    setConversationId(undefined)
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-8rem)] max-w-3xl flex-col max-sm:h-[calc(100dvh-13rem)]">
      <div className="mb-2 flex justify-end">
        <Button variant="ghost" onClick={newChat} disabled={busy || messages.length === 1}>
          <SquarePen aria-hidden className="size-4" />
          New chat
        </Button>
      </div>

      <ol className="flex-1 space-y-4 overflow-y-auto pb-4" aria-live="polite">
        {messages.map((msg) => (
          <li key={msg.id} className={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            {msg.role === 'action' ? (
              <ActionCard action={msg.action} disabled={busy} onResolve={resolveAction} />
            ) : (
              <p
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-brand-600 text-white'
                    : msg.role === 'error'
                      ? 'bg-danger-bg text-danger'
                      : 'border border-line bg-surface'
                }`}
              >
                <Linkified text={msg.text} />
              </p>
            )}
          </li>
        ))}
        {busy && (
          <li className="flex justify-start">
            <p className="rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-ink-muted">Thinking…</p>
          </li>
        )}
        {messages.length === 1 && !busy && (
          <li className="flex flex-wrap gap-2 pt-2">
            {SUGGESTIONS[mode].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => ask(s)}
                className="rounded-full border border-line bg-surface px-4 py-2 text-left text-sm text-ink-muted hover:border-brand-600 hover:text-brand-600"
              >
                {s}
              </button>
            ))}
          </li>
        )}
        <li ref={endRef} aria-hidden />
      </ol>

      <form data-tour="copilot-input" onSubmit={send} className="flex gap-2 rounded-full border border-line bg-surface p-2 shadow-sm">
        <label htmlFor="chat-input" className="sr-only">
          Message
        </label>
        <input
          ref={inputRef}
          id="chat-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={mode === 'business' ? 'Ask about your invoices or tell me what to bill…' : 'Ask about your money or your savings plan…'}
          maxLength={2000}
          autoComplete="off"
          className="flex-1 bg-transparent px-4 text-sm outline-none placeholder:text-ink-muted"
        />
        <Button type="submit" disabled={!draft.trim() || busy}>
          <SendHorizontal aria-hidden className="size-4" />
          <span className="max-sm:sr-only">Send</span>
        </Button>
      </form>
    </div>
  )
}

function ActionCard({
  action,
  disabled,
  onResolve,
}: {
  action: ActionView
  disabled: boolean
  onResolve: (action: ActionView, decision: 'approve' | 'reject', selected?: string[]) => void
}) {
  // Casillas de la tarjeta tipo ticket: empiezan como las dejó la IA.
  const [selected, setSelected] = useState(() => new Set(action.choices?.filter((c) => c.checked).map((c) => c.id)))
  const pending = action.status === 'pending'
  const choices = action.choices
  return (
    <Card className="w-full max-w-md border-brand-600/30 p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{action.title}</p>
        {action.status === 'pending' && <Badge tone="warning">Needs your approval</Badge>}
        {action.status === 'running' && <Badge tone="info">Working…</Badge>}
        {action.status === 'approved' && <Badge tone="success">Done</Badge>}
        {action.status === 'rejected' && <Badge>Declined</Badge>}
        {action.status === 'failed' && <Badge tone="danger">Failed</Badge>}
      </div>
      {choices && (
        <PaymentTicket
          choices={choices}
          selected={pending ? selected : new Set(choices.filter((c) => c.checked).map((c) => c.id))}
          editable={pending && !disabled}
          onToggle={(id) =>
            setSelected((s) => {
              const next = new Set(s)
              if (!next.delete(id)) next.add(id)
              return next
            })
          }
          onAll={(all) => setSelected(new Set(all ? choices.map((c) => c.id) : []))}
        />
      )}
      <dl className="mt-3 divide-y divide-line text-sm">
        {action.details.map(([k, v], i) => (
          <div key={`${k}-${i}`} className="flex justify-between gap-4 py-2">
            <dt className="text-ink-muted">{k}</dt>
            <dd className="text-right font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      {action.status === 'failed' && action.result && (
        <p className="mt-3 rounded-xl bg-danger-bg px-3 py-2 text-xs text-danger">{action.result}</p>
      )}
      {action.status === 'pending' && (
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" disabled={disabled} onClick={() => onResolve(action, 'reject')}>
            Decline
          </Button>
          <Button disabled={disabled} onClick={() => onResolve(action, 'approve', choices ? [...selected] : undefined)}>
            {choices ? `Approve ${selected.size} of ${choices.length}` : 'Approve'}
          </Button>
        </div>
      )}
    </Card>
  )
}

// Varios pagos en una tarjeta, como un ticket: cada renglón con su casilla y,
// abajo, cuánto se apartaría en total con lo palomeado. Lo no palomeado se
// salta esta vez.
function PaymentTicket({
  choices,
  selected,
  editable,
  onToggle,
  onAll,
}: {
  choices: ActionChoice[]
  selected: Set<string>
  editable: boolean
  onToggle: (id: string) => void
  onAll: (all: boolean) => void
}) {
  // Total por apartado y moneda, en centavos para no arrastrar decimales.
  const totals = new Map<string, { name: string; currency: string; cents: number }>()
  for (const c of choices) {
    if (!selected.has(c.id)) continue
    for (const a of c.setAside) {
      const key = `${a.name}|${a.currency}`
      const t = totals.get(key) ?? { name: a.name, currency: a.currency, cents: 0 }
      t.cents += Math.round(Number(a.value) * 100)
      totals.set(key, t)
    }
  }
  const allChecked = selected.size === choices.length

  return (
    <div className="mt-3 rounded-xl border border-dashed border-line bg-canvas px-3 py-2 text-sm">
      <div className="flex items-center justify-between py-1 text-xs text-ink-muted">
        <span>
          {choices.length} payments · {selected.size} selected
        </span>
        {editable && (
          <button type="button" className="font-semibold text-brand-600 hover:underline" onClick={() => onAll(!allChecked)}>
            {allChecked ? 'Select none' : 'Select all'}
          </button>
        )}
      </div>
      <ul className="divide-y divide-dashed divide-line">
        {choices.map((c) => {
          const on = selected.has(c.id)
          return (
            <li key={c.id}>
              <label className={`flex items-start gap-3 py-2 ${editable ? 'cursor-pointer' : ''}`}>
                <input
                  type="checkbox"
                  className="mt-1 size-4 shrink-0 accent-brand-600"
                  checked={on}
                  disabled={!editable}
                  onChange={() => onToggle(c.id)}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex justify-between gap-3">
                    <span className="truncate font-medium">{c.label}</span>
                    <span className="shrink-0 font-semibold tabular-nums">{c.amount}</span>
                  </span>
                  {c.detail && <span className="block text-xs text-ink-muted">{c.detail}</span>}
                  <span className={`block text-xs ${on ? 'text-brand-600' : 'text-ink-muted line-through'}`}>
                    {c.setAside.length
                      ? c.setAside.map((a) => `${a.name} ${formatMoney(Number(a.value), a.currency)}`).join(' · ')
                      : 'Nothing to set aside'}
                  </span>
                </span>
              </label>
            </li>
          )
        })}
      </ul>
      <div className="mt-1 border-t border-dashed border-ink-muted/40 pt-2">
        <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">Total to set aside</p>
        {totals.size ? (
          [...totals.values()].map((t) => (
            <p key={`${t.name}|${t.currency}`} className="flex justify-between py-0.5">
              <span>{t.name}</span>
              <span className="font-semibold tabular-nums">{formatMoney(t.cents / 100, t.currency)}</span>
            </p>
          ))
        ) : (
          <p className="py-0.5 text-ink-muted">Nothing: all payments will be skipped</p>
        )}
      </div>
    </div>
  )
}

// Links dentro del texto (por ejemplo el de datos fiscales): se pueden presionar
// y abren en otra pestaña. El punto o paréntesis final no es parte del link.
const URL_RE = /(https?:\/\/[^\s<>"]+[^\s<>".,;:!?)\]'])/g

function Linkified({ text }: { text: string }) {
  return text.split(URL_RE).map((part, i) =>
    i % 2 === 1 ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="break-all underline underline-offset-2">
        {part}
      </a>
    ) : (
      part
    ),
  )
}
