import { ButtonLink, Card, PageHeader } from '../components/ui'
import { formatMoney } from '../lib/config'

// Datos de ejemplo mientras se conecta el backend.
const stats = [
  { label: 'Outstanding', value: formatMoney(0), hint: 'Unpaid invoices' },
  { label: 'Paid this month', value: formatMoney(0), hint: 'Collected via PayPal' },
  { label: 'Overdue', value: '0', hint: 'Invoices past due date' },
]

export function Overview() {
  return (
    <>
      <PageHeader
        title="Good to see you"
        description="Your freelance finances at a glance."
        actions={
          <ButtonLink to="/copilot">Ask the copilot</ButtonLink>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
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
