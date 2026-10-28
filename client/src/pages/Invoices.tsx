import { type FormEvent, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, Copy, ExternalLink, Plus, Receipt, RefreshCw } from 'lucide-react'
import { Badge, Button, ButtonLink, Card, EmptyState, Modal, PageHeader, Skeleton } from '../components/ui'
import { formatDate, formatMoney } from '../lib/config'
import { useLiveEvents } from '../lib/events'
import {
  CURRENCIES,
  type Invoice,
  type InvoiceAction,
  type NewInvoice,
  PAYMENT_TERMS,
  availableActions,
  displayStatus,
  invoicesApi,
} from '../lib/invoices'
import { CFDI_USES, TAX_REGIMES, type TaxRequest, taxInfoApi, taxLink } from '../lib/taxInfo'

export function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  // El botón "New invoice" de la pantalla de inicio llega como ?new=1.
  const [params, setParams] = useSearchParams()
  const [creating, setCreating] = useState(() => params.get('new') === '1')
  const [pending, setPending] = useState<{ invoice: Invoice; action: InvoiceAction } | null>(null)
  // Datos fiscales (CFDI) por factura, y la factura cuyo link se está viendo.
  const [taxRequests, setTaxRequests] = useState<Record<string, TaxRequest>>({})
  const [taxFor, setTaxFor] = useState<Invoice | null>(null)

  // Cambiar reloadKey vuelve a pedir la lista (botones Refresh / Try again).
  const [reloadKey, setReloadKey] = useState(0)
  const reload = () => setReloadKey((k) => k + 1)

  useEffect(() => {
    let ignore = false
    invoicesApi.list().then(
      (page) => {
        if (ignore) return
        setInvoices(page.invoices)
        setLoadError(null)
      },
      (err: unknown) => {
        if (!ignore) setLoadError(err instanceof Error ? err.message : 'Could not load invoices')
      },
    )
    // Si fallan, la tabla se muestra igual, solo sin el estado de los datos fiscales.
    taxInfoApi.list().then(
      ({ requests }) => {
        if (!ignore) setTaxRequests(Object.fromEntries(requests.map((r) => [r.invoiceId, r])))
      },
      () => {},
    )
    return () => {
      ignore = true
    }
  }, [reloadKey])

  useEffect(() => {
    if (params.has('new')) setParams({}, { replace: true })
  }, [params, setParams])

  // Webhooks de PayPal: la lista se actualiza sola cuando una factura cambia.
  useLiveEvents((event) => {
    if (event.type === 'tax.updated') {
      reload()
      setNotice(`Your client sent their tax info for invoice #${event.invoiceNumber ?? '—'}. ✅`)
      return
    }
    if (event.type !== 'invoice.updated') return
    reload()
    if (event.paypalEvent === 'INVOICING.INVOICE.PAID' && event.invoiceNumber) {
      setNotice(`Invoice #${event.invoiceNumber} was just paid. 🎉 Go to Savings to set part of it aside.`)
    }
  })

  function onCreated(inv: Invoice) {
    setCreating(false)
    setInvoices((list) => [inv, ...(list ?? [])])
    setNotice(`Draft #${inv.number} created. Nothing was sent yet: press Send when you're ready.`)
  }

  function onActionDone(id: string, action: InvoiceAction, updated: Invoice | null) {
    setPending(null)
    setInvoices((list) =>
      (list ?? []).flatMap((inv) => (inv.id !== id ? [inv] : updated ? [updated] : [])),
    )
    setNotice(ACTION_COPY[action].done)
  }

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Invoices created through PayPal Invoicing. Clients pay with PayPal or card."
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={reload}>
              <RefreshCw aria-hidden className="size-4" />
              Refresh
            </Button>
            <Button data-tour="invoices-new" onClick={() => setCreating(true)}>
              <Plus aria-hidden className="size-4" />
              New invoice
            </Button>
          </div>
        }
      />

      {notice && (
        <p role="status" className="mb-4 flex items-start justify-between gap-4 rounded-xl bg-success-bg px-4 py-3 text-sm text-success">
          {notice}
          <button type="button" onClick={() => setNotice(null)} className="font-semibold" aria-label="Dismiss">
            ×
          </button>
        </p>
      )}

      {loadError ? (
        <EmptyState
          title="Couldn't load your invoices"
          description={loadError}
          action={<Button variant="secondary" onClick={reload}>Try again</Button>}
        />
      ) : invoices === null ? (
        <Card className="space-y-4">
          <span className="sr-only">Loading invoices…</span>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-8" />
          ))}
        </Card>
      ) : invoices.length === 0 ? (
        <EmptyState
          title="No invoices yet"
          description="Create your first invoice, or ask the copilot to draft one. You'll review it before anything is sent."
          action={
            <div className="flex gap-2">
              <Button onClick={() => setCreating(true)}>New invoice</Button>
              <ButtonLink to="/copilot" variant="secondary">
                Open copilot
              </ButtonLink>
            </div>
          }
        />
      ) : (
        <InvoiceTable
          invoices={invoices}
          taxRequests={taxRequests}
          onAction={(invoice, action) => setPending({ invoice, action })}
          onTaxInfo={setTaxFor}
        />
      )}

      <Modal open={creating} onClose={() => setCreating(false)} title="New invoice">
        <NewInvoiceForm onCancel={() => setCreating(false)} onCreated={onCreated} />
      </Modal>

      <Modal open={taxFor !== null} onClose={() => setTaxFor(null)} title="Tax invoice (CFDI)">
        {taxFor && (
          <TaxInfoPanel
            invoice={taxFor}
            onLoaded={(r) => setTaxRequests((all) => ({ ...all, [r.invoiceId]: r }))}
            onClose={() => setTaxFor(null)}
          />
        )}
      </Modal>

      <Modal
        open={pending !== null}
        onClose={() => setPending(null)}
        title={pending ? ACTION_COPY[pending.action].title : ''}
      >
        {pending && (
          <ConfirmAction
            invoice={pending.invoice}
            action={pending.action}
            onCancel={() => setPending(null)}
            onDone={onActionDone}
          />
        )}
      </Modal>
    </>
  )
}

const ACTION_COPY: Record<InvoiceAction, { button: string; title: string; explain: string; done: string; danger?: boolean }> = {
  send: {
    button: 'Send',
    title: 'Send this invoice?',
    explain: 'PayPal will email the invoice to your client with a link to pay.',
    done: 'Invoice sent. PayPal emailed your client.',
  },
  remind: {
    button: 'Remind',
    title: 'Send a payment reminder?',
    explain: 'PayPal will email your client a reminder for this invoice.',
    done: 'Reminder sent.',
  },
  cancel: {
    button: 'Cancel',
    title: 'Cancel this invoice?',
    explain: 'Your client will be notified and will no longer be able to pay it. This cannot be undone.',
    done: 'Invoice cancelled.',
    danger: true,
  },
  delete: {
    button: 'Delete',
    title: 'Delete this invoice?',
    explain: 'It will be removed from your PayPal account. This cannot be undone.',
    done: 'Invoice deleted.',
    danger: true,
  },
}

function money(m: { currency_code: string; value: string } | null) {
  return m ? formatMoney(Number(m.value), m.currency_code) : '—'
}

function InvoiceTable({
  invoices,
  taxRequests,
  onAction,
  onTaxInfo,
}: {
  invoices: Invoice[]
  taxRequests: Record<string, TaxRequest>
  onAction: (inv: Invoice, action: InvoiceAction) => void
  onTaxInfo: (inv: Invoice) => void
}) {
  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead className="border-b border-line text-xs font-semibold tracking-wide text-ink-muted uppercase">
          <tr>
            <th className="px-6 py-3">Invoice</th>
            <th className="px-6 py-3">Client</th>
            <th className="px-6 py-3 text-right">Amount</th>
            <th className="px-6 py-3">Due</th>
            <th className="px-6 py-3">Status</th>
            <th className="px-6 py-3 text-right">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {invoices.map((inv) => {
            const status = displayStatus(inv)
            const tax = taxRequests[inv.id]
            return (
              <tr key={inv.id}>
                <td className="px-6 py-4 font-semibold tabular-nums">#{inv.number ?? '—'}</td>
                <td className="px-6 py-4">
                  <p className="font-medium">{inv.customer.company ?? inv.customer.name ?? '—'}</p>
                  <p className="text-xs text-ink-muted">{inv.customer.email}</p>
                </td>
                <td className="px-6 py-4 text-right font-semibold tabular-nums">{money(inv.amount)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-ink-muted">{formatDate(inv.dueDate)}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge tone={status.tone}>{status.label}</Badge>
                  {tax && (
                    <p className="mt-1 text-xs text-ink-muted">
                      {tax.status === 'received' ? 'Tax info ✓' : 'Tax info pending'}
                    </p>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-end gap-1 whitespace-nowrap">
                    {inv.status !== 'DRAFT' && (
                      <a
                        href={inv.payerViewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full px-3 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-50"
                      >
                        Payment page
                      </a>
                    )}
                    {inv.status !== 'DRAFT' && (
                      <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => onTaxInfo(inv)}>
                        <Receipt aria-hidden className="size-3.5" />
                        Tax info
                      </Button>
                    )}
                    {availableActions(inv.status).map((action) => (
                      <Button
                        key={action}
                        variant={action === 'send' ? 'primary' : 'ghost'}
                        className="px-3 py-1.5 text-xs"
                        onClick={() => onAction(inv, action)}
                      >
                        {ACTION_COPY[action].button}
                      </Button>
                    ))}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </Card>
  )
}

// Link para que el cliente deje sus datos fiscales. Abrir esta ventana crea el
// link la primera vez (no le avisa nada al cliente).
function TaxInfoPanel({
  invoice,
  onLoaded,
  onClose,
}: {
  invoice: Invoice
  onLoaded: (request: TaxRequest) => void
  onClose: () => void
}) {
  const [request, setRequest] = useState<TaxRequest | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let ignore = false
    taxInfoApi.link(invoice.id).then(
      (r) => {
        if (ignore) return
        setRequest(r)
        onLoaded(r)
      },
      (err: unknown) => {
        if (!ignore) setError(err instanceof Error ? err.message : 'Could not create the link')
      },
    )
    return () => {
      ignore = true
    }
    // Solo al abrir la ventana de esta factura (onLoaded cambia en cada render).
  }, [invoice.id])

  async function copy(link: string) {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
    } catch {
      // Sin permiso para copiar: el link sigue visible para copiarlo a mano.
    }
  }

  const info = request?.taxInfo
  return (
    <>
      <p className="text-sm text-ink-muted">
        In Mexico, clients often need an official tax invoice (CFDI). Send this link to your client so they can fill in
        their tax details. We save them for their next invoices too.
      </p>

      {error ? (
        <p role="alert" className="mt-4 rounded-xl bg-danger-bg px-4 py-3 text-sm text-danger">{error}</p>
      ) : !request ? (
        <Skeleton className="mt-4 h-24 rounded-xl" />
      ) : (
        <>
          <div className="mt-4 flex gap-2">
            <label htmlFor="tax-link" className="sr-only">
              Link for your client
            </label>
            <input
              id="tax-link"
              readOnly
              value={taxLink(request.token)}
              onFocus={(e) => e.target.select()}
              className="min-w-0 flex-1 rounded-lg border border-line bg-canvas px-3 py-2 text-sm"
            />
            <Button variant="secondary" onClick={() => copy(taxLink(request.token))}>
              {copied ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <a
            href={taxLink(request.token)}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline"
          >
            Open the client's page
            <ExternalLink aria-hidden className="size-3.5" />
          </a>

          <div className="mt-4 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">Client's tax info</p>
            <Badge tone={request.status === 'received' ? 'success' : 'warning'}>
              {request.status === 'received' ? 'Received' : 'Waiting for your client'}
            </Badge>
          </div>
          {info ? (
            <dl className="mt-2 divide-y divide-line rounded-xl border border-line px-4 text-sm">
              {[
                ['RFC', info.rfc],
                ['Legal name', info.name],
                ['Tax regime', `${info.regime} · ${TAX_REGIMES[info.regime] ?? ''}`],
                ['ZIP code', info.zip],
                ['CFDI use', `${info.use} · ${CFDI_USES[info.use] ?? ''}`],
                ['Send CFDI to', info.email],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2">
                  <dt className="text-ink-muted">{k}</dt>
                  <dd className="text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-2 text-sm text-ink-muted">
              As soon as your client sends it, it shows up here. You can also give it to the copilot in the chat.
            </p>
          )}
          <p className="mt-4 text-xs text-ink-muted">Coming next: issue the CFDI with the SAT in one click.</p>
        </>
      )}

      <div className="mt-6 flex justify-end">
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
    </>
  )
}

function ConfirmAction({
  invoice,
  action,
  onCancel,
  onDone,
}: {
  invoice: Invoice
  action: InvoiceAction
  onCancel: () => void
  onDone: (id: string, action: InvoiceAction, updated: Invoice | null) => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const copy = ACTION_COPY[action]

  async function confirm() {
    setBusy(true)
    setError(null)
    try {
      const updated = await invoicesApi.run(invoice.id, action)
      onDone(invoice.id, action, action === 'delete' ? null : updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setBusy(false)
    }
  }

  return (
    <>
      <p className="text-sm text-ink-muted">{copy.explain}</p>
      <dl className="mt-4 divide-y divide-line rounded-xl border border-line px-4 text-sm">
        {[
          ['Invoice', `#${invoice.number ?? '—'}`],
          ['Client', [invoice.customer.company ?? invoice.customer.name, invoice.customer.email].filter(Boolean).join(' · ')],
          ['Amount', money(invoice.amount)],
          ['Due', formatDate(invoice.dueDate)],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 py-2">
            <dt className="text-ink-muted">{k}</dt>
            <dd className="text-right font-medium">{v}</dd>
          </div>
        ))}
      </dl>
      {error && <p role="alert" className="mt-4 rounded-xl bg-danger-bg px-4 py-3 text-sm text-danger">{error}</p>}
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          Go back
        </Button>
        <Button
          onClick={confirm}
          disabled={busy}
          className={copy.danger ? 'bg-danger hover:bg-danger/90' : ''}
        >
          {busy ? 'Working…' : `Yes, ${copy.button.toLowerCase()}`}
        </Button>
      </div>
    </>
  )
}

type ItemRow = { key: string; name: string; quantity: string; unitAmount: string }

const newRow = (): ItemRow => ({ key: crypto.randomUUID(), name: '', quantity: '1', unitAmount: '' })

const inputClass =
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100'

function NewInvoiceForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: (inv: Invoice) => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [items, setItems] = useState<ItemRow[]>([newRow()])
  const [currency, setCurrency] = useState<NewInvoice['currency']>('MXN')
  const [terms, setTerms] = useState<NewInvoice['terms']>('NET_15')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const total = items.reduce((sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unitAmount) || 0), 0)

  function updateItem(key: string, field: keyof Omit<ItemRow, 'key'>, value: string) {
    setItems((rows) => rows.map((r) => (r.key === key ? { ...r, [field]: value } : r)))
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const inv = await invoicesApi.create({
        customer: { name: name.trim(), email: email.trim(), ...(company.trim() ? { company: company.trim() } : {}) },
        items: items.map((i) => ({ name: i.name.trim(), quantity: Number(i.quantity), unitAmount: Number(i.unitAmount) })),
        currency,
        terms,
        ...(note.trim() ? { note: note.trim() } : {}),
      })
      onCreated(inv)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the invoice')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold">Client</legend>
        <label className="text-sm">
          <span className="mb-1 block text-ink-muted">Name</span>
          <input required maxLength={140} value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-ink-muted">Email</span>
          <input required type="email" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block text-ink-muted">Company (optional)</span>
          <input maxLength={120} value={company} onChange={(e) => setCompany(e.target.value)} className={inputClass} />
        </label>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Items</legend>
        <div className="space-y-2">
          {items.map((row, idx) => (
            <div key={row.key} className="grid grid-cols-[1fr_4.5rem_6.5rem_auto] items-end gap-2">
              <label className="text-sm">
                <span className={idx ? 'sr-only' : 'mb-1 block text-ink-muted'}>Description</span>
                <input required maxLength={200} value={row.name} onChange={(e) => updateItem(row.key, 'name', e.target.value)} className={inputClass} />
              </label>
              <label className="text-sm">
                <span className={idx ? 'sr-only' : 'mb-1 block text-ink-muted'}>Qty</span>
                <input required type="number" min={1} max={9999} step={1} value={row.quantity} onChange={(e) => updateItem(row.key, 'quantity', e.target.value)} className={inputClass} />
              </label>
              <label className="text-sm">
                <span className={idx ? 'sr-only' : 'mb-1 block text-ink-muted'}>Price</span>
                <input required type="number" min={0.01} max={1000000} step={0.01} value={row.unitAmount} onChange={(e) => updateItem(row.key, 'unitAmount', e.target.value)} className={inputClass} />
              </label>
              <button
                type="button"
                onClick={() => setItems((rows) => rows.filter((r) => r.key !== row.key))}
                disabled={items.length === 1}
                aria-label="Remove item"
                className="mb-1 rounded-full px-2 py-1 text-ink-muted hover:bg-canvas disabled:invisible"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        {items.length < 20 && (
          <button type="button" onClick={() => setItems((rows) => [...rows, newRow()])} className="mt-2 text-sm font-semibold text-brand-600">
            + Add item
          </button>
        )}
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-ink-muted">Currency</span>
          <select value={currency} onChange={(e) => setCurrency(e.target.value as NewInvoice['currency'])} className={inputClass}>
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-ink-muted">Payment terms</span>
          <select value={terms} onChange={(e) => setTerms(e.target.value as NewInvoice['terms'])} className={inputClass}>
            {PAYMENT_TERMS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block text-ink-muted">Note to client (optional)</span>
        <textarea maxLength={1000} rows={2} value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} />
      </label>

      <p className="flex justify-between border-t border-line pt-4 text-sm">
        <span className="text-ink-muted">Total</span>
        <span className="text-lg font-bold tabular-nums">{formatMoney(total, currency)}</span>
      </p>

      {error && <p role="alert" className="rounded-xl bg-danger-bg px-4 py-3 text-sm text-danger">{error}</p>}

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-ink-muted">Saved as a draft. Nothing is sent until you confirm.</p>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save draft'}
          </Button>
        </div>
      </div>
    </form>
  )
}
