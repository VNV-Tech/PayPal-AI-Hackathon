import { useEffect, useState } from 'react'
import { Button, ButtonLink, Card, PageHeader } from '../components/ui'
import { useLiveEvents } from '../lib/events'
import { type Overview as OverviewData, formatTotals, overviewApi, plural } from '../lib/overview'

export function Overview() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Cambiar reloadKey vuelve a pedir los números (botones Refresh / Try again).
  const [reloadKey, setReloadKey] = useState(0)
  const reload = () => setReloadKey((k) => k + 1)

  useEffect(() => {
    let ignore = false
    overviewApi.get().then(
      (overview) => {
        if (ignore) return
        setData(overview)
        setLoadError(null)
      },
      (err: unknown) => {
        if (!ignore) setLoadError(err instanceof Error ? err.message : 'Could not load your numbers')
      },
    )
    return () => {
      ignore = true
    }
  }, [reloadKey])

  // Cuando PayPal avisa de un pago o un cambio en una factura, se recargan los números.
  useLiveEvents(reload)

  const loading = '…'
  const paid = data?.paidThisMonth
  const stats = [
    {
      label: 'Outstanding',
      value: data ? formatTotals(data.outstanding) : loading,
      hint: data ? plural(data.outstandingCount, 'unpaid invoice') : 'Unpaid invoices',
    },
    {
      label: 'Paid this month',
      value: !data ? loading : paid ? formatTotals(paid.totals) : '—',
      hint: !data
        ? 'Collected via PayPal'
        : paid
          ? `${plural(paid.count, 'payment')} via PayPal`
          : "Couldn't load payments from PayPal",
    },
    {
      label: 'Overdue',
      value: data ? String(data.overdueCount) : loading,
      hint: 'Invoices past due date',
    },
  ]

  return (
    <>
      <PageHeader
        title="Good to see you"
        description="Your freelance finances at a glance."
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={reload}>
              Refresh
            </Button>
            <ButtonLink to="/copilot">Ask the copilot</ButtonLink>
          </div>
        }
      />

      {loadError && (
        <p role="alert" className="mb-4 flex items-center justify-between gap-4 rounded-xl bg-danger-bg px-4 py-3 text-sm text-danger">
          Couldn't load your numbers: {loadError}
          <Button variant="secondary" onClick={reload}>
            Try again
          </Button>
        </p>
      )}

      <div data-tour="overview-stats" className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <p className="text-sm font-medium text-ink-muted">{s.label}</p>
            <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums">{s.value}</p>
            <p className="mt-1 text-xs text-ink-muted">{s.hint}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-6 bg-brand-50">
        <h2 className="font-semibold text-brand-900">Try saying</h2>
        <ul className="mt-3 space-y-2 text-sm text-ink">
          <li>“Invoice Acme Corp 12,500 MXN for the website redesign, due in 15 days.”</li>
          <li>“Which clients still owe me money?”</li>
          <li>“Send a reminder for invoice #0007.”</li>
        </ul>
      </Card>
    </>
  )
}
