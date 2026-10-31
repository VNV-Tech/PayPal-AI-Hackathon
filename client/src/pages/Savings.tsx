import { type FormEvent, useEffect, useState } from 'react'
import { Pencil, RefreshCw, Sparkles } from 'lucide-react'
import { Badge, Button, ButtonLink, Card, EmptyState, Modal, Notice, PageHeader, Skeleton } from '../components/ui'
import { useLiveEvents } from '../lib/events'
import { formatTotals } from '../lib/overview'
import { formatMoney } from '../lib/config'
import {
  MAX_BUCKETS,
  type PaymentReview,
  type PlanBucket,
  type PlanInput,
  type Savings as SavingsData,
  savingsApi,
} from '../lib/savings'

export function Savings() {
  const [data, setData] = useState<SavingsData | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)

  // Cambiar reloadKey vuelve a pedir los datos (botones Refresh / Try again).
  const [reloadKey, setReloadKey] = useState(0)
  const reload = () => setReloadKey((k) => k + 1)

  useEffect(() => {
    let ignore = false
    savingsApi.get().then(
      (savings) => {
        if (ignore) return
        setData(savings)
        setLoadError(null)
      },
      (err: unknown) => {
        if (!ignore) setLoadError(err instanceof Error ? err.message : 'Could not load your savings')
      },
    )
    return () => {
      ignore = true
    }
  }, [reloadKey])

  // Cada pago nuevo cambia lo que toca apartar.
  useLiveEvents(reload)

  return (
    <>
      <PageHeader
        title="Savings"
        description="Keep part of every payment for later: taxes, emergencies, anything you want."
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={reload}>
              <RefreshCw aria-hidden className="size-4" />
              Refresh
            </Button>
            <Button data-tour="savings-plan" onClick={() => setEditing(true)} disabled={!data}>
              <Pencil aria-hidden className="size-4" />
              Edit plan
            </Button>
          </div>
        }
      />

      <Notice className="mb-6">
        These set-asides are <strong>virtual</strong>: no money moves and nothing leaves your PayPal account. Every
        time you get paid, you decide whether to set part of it aside. The percentages are just a starting point:
        change them with Edit plan.
      </Notice>

      {loadError ? (
        <EmptyState
          title="Couldn't load your savings"
          description={loadError}
          action={<Button variant="secondary" onClick={reload}>Try again</Button>}
        />
      ) : !data ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <span className="sr-only">Loading savings…</span>
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      ) : (
        <SavingsView data={data} onChange={setData} onEdit={() => setEditing(true)} />
      )}

      <Modal open={editing} onClose={() => setEditing(false)} title="Edit savings plan">
        {data && (
          <PlanForm
            buckets={data.plan}
            onCancel={() => setEditing(false)}
            onSaved={(saved) => {
              setData(saved)
              setEditing(false)
            }}
          />
        )}
      </Modal>
    </>
  )
}

function monthName(month: string) {
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' })
}

function SavingsView({
  data,
  onChange,
  onEdit,
}: {
  data: SavingsData
  onChange: (data: SavingsData) => void
  onEdit: () => void
}) {
  const month = monthName(data.month)
  return (
    <>
      {data.pending.length > 0 && (
        <section aria-labelledby="to-review" className="mb-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 id="to-review" className="font-semibold text-ink">
              New payments · set aside part of them?
            </h2>
            {/* Con varios pagos, uno por uno cansa: el copiloto arma un solo ticket. */}
            {data.pending.length > 1 && (
              <ButtonLink to="/copilot?review=payments" variant="secondary">
                <Sparkles aria-hidden className="size-4" />
                Review all with AI
              </ButtonLink>
            )}
          </div>
          <div className="space-y-3">
            {data.pending.map((p, i) => (
              // La guía ilumina el primer pago por revisar.
              <div key={p.id} data-tour={i === 0 ? 'savings-review' : undefined}>
                <ReviewCard payment={p} onDecided={onChange} onEditPlan={onEdit} />
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-sm font-medium text-ink-muted">Collected in {month}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums">{data.paid ? formatTotals(data.paid) : '—'}</p>
          <p className="mt-1 text-xs text-ink-muted">{data.paid ? 'Payments received via PayPal' : "Couldn't load payments from PayPal"}</p>
        </Card>
        <Card className="bg-brand-50">
          <p className="text-sm font-medium text-brand-900">Left to spend</p>
          <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums text-brand-900">
            {data.paid ? formatTotals(data.available) : '—'}
          </p>
          <p className="mt-1 text-xs text-ink-muted">Collected minus what you set aside</p>
        </Card>
      </div>

      <h2 className="mt-8 mb-3 font-semibold text-ink">Set aside in {month}</h2>
      {data.buckets.length === 0 ? (
        <EmptyState
          title="No set-asides yet"
          description="Add one, for example Taxes. Every time you get paid, you'll be asked whether to set part of it aside."
          action={<Button onClick={onEdit}>Add a set-aside</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {data.buckets.map((b) => (
            <BucketCard key={b.id} bucket={b} />
          ))}
        </div>
      )}
    </>
  )
}

function ReviewCard({
  payment,
  onDecided,
  onEditPlan,
}: {
  payment: PaymentReview
  onDecided: (data: SavingsData) => void
  onEditPlan: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const amount = formatMoney(Number(payment.amount.value), payment.amount.currency_code)
  const proposal = payment.proposal.filter((a) => Number(a.amount.value) > 0)

  async function decide(decision: 'set_aside' | 'skip') {
    setBusy(true)
    setError(null)
    try {
      onDecided(await savingsApi.decide(payment.id, decision))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your answer')
      setBusy(false)
    }
  }

  return (
    <Card className="border-brand-100">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-ink">
            You got paid {amount}
            {payment.invoiceNumber && <span className="font-normal text-ink-muted"> · invoice #{payment.invoiceNumber}</span>}
          </p>
          {proposal.length > 0 ? (
            <p className="mt-1 text-sm text-ink-muted">
              Set aside{' '}
              {proposal.map((a, i) => (
                <span key={a.bucketId}>
                  {i > 0 && (i === proposal.length - 1 ? ' and ' : ', ')}
                  <strong className="text-ink">{formatMoney(Number(a.amount.value), a.amount.currency_code)}</strong> for{' '}
                  {a.name}
                </span>
              ))}
              ?
            </p>
          ) : (
            <p className="mt-1 text-sm text-ink-muted">
              Your plan has no set-asides yet.{' '}
              <button type="button" onClick={onEditPlan} className="font-semibold text-brand-600 hover:underline">
                Edit plan
              </button>
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" disabled={busy} onClick={() => decide('skip')}>
            Not this time
          </Button>
          <Button disabled={busy || proposal.length === 0} onClick={() => decide('set_aside')}>
            Set aside
          </Button>
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
    </Card>
  )
}

function BucketCard({ bucket }: { bucket: SavingsData['buckets'][number] }) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-ink">{bucket.name}</p>
        {bucket.percent !== null && <Badge tone="info">{bucket.percent}%</Badge>}
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight tabular-nums">{formatTotals(bucket.amounts)}</p>
      <p className="mt-1 text-xs text-ink-muted">
        {bucket.percent !== null ? `${bucket.percent}% of payments you accept` : 'No longer in your plan'}
      </p>
    </Card>
  )
}

const inputClass =
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100'

interface Row {
  key: string
  id?: string
  name: string
  percent: string
}

function PlanForm({
  buckets,
  onCancel,
  onSaved,
}: {
  buckets: PlanBucket[]
  onCancel: () => void
  onSaved: (saved: SavingsData) => void
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    buckets.map((b) => ({ key: b.id, id: b.id, name: b.name, percent: String(b.percent) })),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const total = rows.reduce((sum, r) => sum + (Number(r.percent) || 0), 0)
  const overLimit = total > 100

  function update(key: string, field: 'name' | 'percent', value: string) {
    setRows((list) => list.map((r) => (r.key === key ? { ...r, [field]: value } : r)))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const plan: PlanInput = rows.map((r) => ({ id: r.id, name: r.name, percent: Number(r.percent) }))
    try {
      onSaved(await savingsApi.savePlan(plan))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the plan')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-sm text-ink-muted">Choose what percent of every payment goes to each set-aside.</p>

      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center gap-2">
            <input
              required
              maxLength={40}
              aria-label="Name"
              placeholder="e.g. Taxes"
              value={r.name}
              onChange={(e) => update(r.key, 'name', e.target.value)}
              className={inputClass}
            />
            <div className="flex w-28 shrink-0 items-center gap-1">
              <input
                required
                type="number"
                min={0}
                max={100}
                step={0.5}
                aria-label={`Percent for ${r.name || 'set-aside'}`}
                value={r.percent}
                onChange={(e) => update(r.key, 'percent', e.target.value)}
                className={inputClass}
              />
              <span className="text-sm text-ink-muted">%</span>
            </div>
            <button
              type="button"
              onClick={() => setRows((list) => list.filter((x) => x.key !== r.key))}
              className="rounded-full px-2 text-lg text-ink-muted hover:text-danger"
              aria-label={`Remove ${r.name || 'set-aside'}`}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {rows.length < MAX_BUCKETS && (
        <Button
          type="button"
          variant="ghost"
          onClick={() => setRows((list) => [...list, { key: crypto.randomUUID(), name: '', percent: '0' }])}
        >
          + Add set-aside
        </Button>
      )}

      <p className={`text-sm font-medium ${overLimit ? 'text-danger' : 'text-ink-muted'}`}>
        Set aside: {total}% · Left to spend: {Math.max(0, 100 - total)}%
        {overLimit && ' — the total can’t be more than 100%'}
      </p>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving || overLimit}>
          {saving ? 'Saving…' : 'Save plan'}
        </Button>
      </div>
    </form>
  )
}
