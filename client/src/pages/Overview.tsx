import { type ReactNode, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CircleAlert, Clock, FilePlus2, type LucideIcon, PiggyBank, RefreshCw, Sparkles, Wallet } from 'lucide-react'
import { Guide } from '../components/Guide'
import { Badge, Button, Card, Notice, Skeleton } from '../components/ui'
import { type Suggestion, chatApi } from '../lib/chat'
import { currentMonthName, formatDate, formatMoney } from '../lib/config'
import { useLiveEvents } from '../lib/events'
import { type Invoice, displayStatus, invoicesApi } from '../lib/invoices'
import { useMode } from '../lib/mode'
import { type RecentPayment, formatTotals, overviewApi, plural, sumTotals } from '../lib/overview'
import { type Savings, savingsApi } from '../lib/savings'

// Pantalla de inicio. Cada modo tiene la suya: Business (cobrar a clientes) y
// Personal (organizar lo que te pagan).
export function Overview() {
  return useMode() === 'business' ? <BusinessHome /> : <PersonalHome />
}

// load debe ser una función fija (definida fuera del componente).
// Pide los datos al abrir la pantalla, con Refresh / Try again, y los vuelve a
// pedir cuando PayPal avisa de un pago o un cambio en una factura.
function useHomeData<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const reload = () => setReloadKey((k) => k + 1)

  useEffect(() => {
    let ignore = false
    load().then(
      (result) => {
        if (ignore) return
        setData(result)
        setError(null)
      },
      (err: unknown) => {
        if (!ignore) setError(err instanceof Error ? err.message : 'Could not load your numbers')
      },
    )
    return () => {
      ignore = true
    }
  }, [load, reloadKey])

  useLiveEvents(reload)
  return { data, error, reload }
}

// Si fallan las sugerencias del copiloto, el resto de la pantalla se muestra igual.
const loadSuggestions = () => chatApi.suggestions().then((r) => r.suggestions, () => [] as Suggestion[])
const loadBusiness = () => Promise.all([overviewApi.get(), invoicesApi.list(1), loadSuggestions()])
const loadPersonal = () => Promise.all([savingsApi.get(), overviewApi.get(), loadSuggestions()])

const BUSINESS_PROMPTS = [
  'Who still owes me money?',
  'Invoice Acme Corp 12,500 MXN for the website redesign, billing@acme.example',
  'Send a reminder for my overdue invoices',
]

const PERSONAL_PROMPTS = [
  'How much have I set aside this month?',
  'Set aside 25% of every payment for taxes',
  'How much can I spend this month?',
]

function BusinessHome() {
  const { data, error, reload } = useHomeData(loadBusiness)
  const [overview, page, suggestions] = data ?? [null, null, []]
  const paid = overview?.paidThisMonth

  return (
    <>
      <HomeHeader
        eyebrow="Business"
        title="Good to see you"
        description="Bill your clients and see who has paid. Every number comes from your PayPal account."
        onRefresh={reload}
      />
      {error && <LoadError message={error} onRetry={reload} />}
      <CopilotSuggestion suggestions={suggestions} />
      <Guide title="Bill, get paid and send the CFDI" />

      <Hero
        label={`Collected in ${currentMonthName()}`}
        value={!overview ? null : paid ? formatTotals(paid.totals) : '—'}
        hint={!overview ? null : paid ? `${plural(paid.count, 'payment')} via PayPal` : "Couldn't load payments from PayPal"}
        actions={
          <>
            <HeroLink to="/invoices?new=1" icon={FilePlus2} primary>
              New invoice
            </HeroLink>
            <HeroLink to="/copilot" icon={Sparkles}>
              Ask the copilot
            </HeroLink>
          </>
        }
      />

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <StatCard
          icon={Clock}
          label="Waiting to be paid"
          value={overview ? formatTotals(overview.outstanding) : null}
          hint={overview ? plural(overview.outstandingCount, 'unpaid invoice') : null}
        />
        <StatCard
          icon={CircleAlert}
          label="Overdue"
          value={overview ? String(overview.overdueCount) : null}
          hint={overview ? (overview.overdueCount ? 'Past their due date: send a reminder' : 'Nothing overdue. Nice!') : null}
          alert={!!overview?.overdueCount}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionTitle title="Recent invoices" link={{ to: '/invoices', label: 'See all' }} />
          {!page ? (
            <ListSkeleton />
          ) : page.invoices.length === 0 ? (
            <p className="py-6 text-sm text-ink-muted">
              No invoices yet. Create your first one and your client can pay it with PayPal or a card.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {page.invoices.slice(0, 5).map((inv) => (
                <InvoiceRow key={inv.id} invoice={inv} />
              ))}
            </ul>
          )}
        </Card>
        <TryAsking prompts={BUSINESS_PROMPTS} />
      </div>
    </>
  )
}

function PersonalHome() {
  const { data, error, reload } = useHomeData(loadPersonal)
  const [savings, overview, suggestions] = data ?? [null, null, []]
  const setAside = savings ? sumTotals(savings.buckets.flatMap((b) => b.amounts)) : []
  const pending = savings?.pending.length ?? 0

  return (
    <>
      <HomeHeader
        eyebrow="Personal"
        title="Your money"
        description="Decide what part of each payment you keep for later, and see what's left to spend."
        onRefresh={reload}
      />
      {error && <LoadError message={error} onRetry={reload} />}
      <CopilotSuggestion suggestions={suggestions} />
      <Guide title="Keep part of every payment" />

      <Notice className="mb-4">
        Set-asides are <strong>virtual</strong>: your money stays in your PayPal account. They're a plan to help you budget.
      </Notice>

      <Hero
        label={`Left to spend in ${currentMonthName()}`}
        value={!savings ? null : savings.paid ? formatTotals(savings.available) : '—'}
        hint={
          !savings
            ? null
            : savings.paid
              ? `Collected ${formatTotals(savings.paid)} · set aside ${formatTotals(setAside)}`
              : "Couldn't load payments from PayPal"
        }
        actions={
          <>
            <HeroLink to="/savings" icon={PiggyBank} primary>
              {pending ? `Review ${plural(pending, 'payment')}` : 'My savings plan'}
            </HeroLink>
            <HeroLink to="/copilot" icon={Sparkles}>
              Ask the copilot
            </HeroLink>
          </>
        }
      />

      {pending > 0 && (
        <Link
          to="/savings"
          className="mt-4 flex items-center gap-3 rounded-2xl border border-brand-100 bg-brand-50 px-5 py-4 text-sm text-brand-900 hover:border-brand-500"
        >
          <Wallet aria-hidden className="size-5 shrink-0" />
          <span className="flex-1">
            <strong>You got paid!</strong> {pending === 1 ? 'One payment is' : `${pending} payments are`} waiting: do you
            want to set part of it aside?
          </span>
          <ArrowRight aria-hidden className="size-4" />
        </Link>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <SectionTitle title={`Set aside in ${currentMonthName()}`} link={{ to: '/savings', label: 'Edit plan' }} />
            {!savings ? (
              <ListSkeleton />
            ) : savings.buckets.length === 0 ? (
              <p className="py-6 text-sm text-ink-muted">
                No set-asides yet. Add one, like Taxes, and every time you get paid you'll be asked how much to keep.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {savings.buckets.map((b) => (
                  <BucketRow key={b.id} bucket={b} />
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <SectionTitle title="Recent payments" />
            {!overview ? (
              <ListSkeleton />
            ) : overview.recentPayments.length === 0 ? (
              <p className="py-6 text-sm text-ink-muted">No payments this month yet. They show up here the moment you get paid.</p>
            ) : (
              <ul className="divide-y divide-line">
                {overview.recentPayments.map((p) => (
                  <PaymentRow key={p.id} payment={p} />
                ))}
              </ul>
            )}
          </Card>
        </div>
        <TryAsking prompts={PERSONAL_PROMPTS} />
      </div>
    </>
  )
}

function HomeHeader({
  eyebrow,
  title,
  description,
  onRefresh,
}: {
  eyebrow: string
  title: string
  description: string
  onRefresh: () => void
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-bold tracking-wider text-brand-600 uppercase">{eyebrow}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">{title}</h1>
        <p className="mt-1 max-w-xl text-sm text-ink-muted">{description}</p>
      </div>
      <Button variant="ghost" onClick={onRefresh}>
        <RefreshCw aria-hidden className="size-4" />
        Refresh
      </Button>
    </header>
  )
}

function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <p role="alert" className="mb-4 flex items-center justify-between gap-4 rounded-xl bg-danger-bg px-4 py-3 text-sm text-danger">
      Couldn't load your numbers: {message}
      <Button variant="secondary" onClick={onRetry}>
        Try again
      </Button>
    </p>
  )
}

// Lo último que el copiloto preparó por su cuenta y sigue esperando respuesta.
function CopilotSuggestion({ suggestions }: { suggestions: Suggestion[] }) {
  const latest = suggestions.find((sg) =>
    sg.items.some((i) => i.type === 'action' && i.action.status === 'pending'),
  )
  if (!latest) return null
  const intro = latest.items.find((i) => i.type === 'text')
  const pending = latest.items.filter((i) => i.type === 'action' && i.action.status === 'pending').length
  return (
    <Link
      to={`/copilot?suggestion=${latest.id}`}
      className="mb-4 flex items-start gap-3 rounded-2xl border border-brand-100 bg-surface px-5 py-4 shadow-sm hover:border-brand-500"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-600 text-white">
        <Sparkles aria-hidden className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-bold tracking-wider text-brand-600 uppercase">From your copilot</span>
        <span className="mt-0.5 block font-semibold text-ink">{latest.title}</span>
        {intro?.type === 'text' && <span className="mt-0.5 line-clamp-2 block text-sm text-ink-muted">{intro.text}</span>}
        <span className="mt-1 block text-xs font-semibold text-brand-600">
          {pending === 1 ? '1 suggestion' : `${pending} suggestions`} waiting for your OK
        </span>
      </span>
      <ArrowRight aria-hidden className="mt-3 size-4 shrink-0 text-brand-600" />
    </Link>
  )
}

// Tarjeta grande de arriba: el número más importante del modo y los botones rápidos.
function Hero({ label, value, hint, actions }: { label: string; value: string | null; hint: string | null; actions: ReactNode }) {
  return (
    <section
      data-tour="home-hero"
      className="relative overflow-hidden rounded-3xl bg-navy-900 p-6 text-white shadow-lg sm:p-8"
    >
      {/* Brillo del color del modo en la esquina. */}
      <div aria-hidden className="absolute -top-24 -right-24 size-72 rounded-full bg-brand-500/40 blur-3xl" />
      <div className="relative flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-sm font-medium text-white/70">{label}</p>
          {value === null ? (
            <Skeleton className="mt-3 h-11 w-56 bg-white/15" />
          ) : (
            <p className="mt-2 text-4xl font-bold tracking-tight tabular-nums sm:text-5xl">{value}</p>
          )}
          {hint === null ? (
            <Skeleton className="mt-3 h-4 w-40 bg-white/15" />
          ) : (
            <p className="mt-2 text-sm text-white/70">{hint}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">{actions}</div>
      </div>
    </section>
  )
}

function HeroLink({ to, icon: Icon, primary, children }: { to: string; icon: LucideIcon; primary?: boolean; children: ReactNode }) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${
        primary ? 'bg-white text-navy-900 hover:bg-brand-50' : 'bg-white/10 text-white hover:bg-white/20'
      }`}
    >
      <Icon aria-hidden className="size-4" />
      {children}
    </Link>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  alert,
}: {
  icon: LucideIcon
  label: string
  value: string | null
  hint: string | null
  alert?: boolean
}) {
  return (
    <Card className="flex items-start gap-4">
      <span className={`grid size-10 shrink-0 place-items-center rounded-full ${alert ? 'bg-danger-bg text-danger' : 'bg-brand-50 text-brand-600'}`}>
        <Icon aria-hidden className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink-muted">{label}</p>
        {value === null ? (
          <Skeleton className="mt-2 h-8 w-32" />
        ) : (
          <p className={`mt-1 text-2xl font-bold tracking-tight tabular-nums ${alert ? 'text-danger' : ''}`}>{value}</p>
        )}
        {hint === null ? <Skeleton className="mt-2 h-3 w-24" /> : <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
      </div>
    </Card>
  )
}

function SectionTitle({ title, link }: { title: string; link?: { to: string; label: string } }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <h2 className="font-semibold text-ink">{title}</h2>
      {link && (
        <Link to={link.to} className="flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline">
          {link.label}
          <ArrowRight aria-hidden className="size-4" />
        </Link>
      )}
    </div>
  )
}

function ListSkeleton() {
  return (
    <div className="space-y-4 py-3">
      <span className="sr-only">Loading…</span>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-full" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  )
}

function Initial({ text }: { text: string }) {
  return (
    <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-800">
      {text.trim().charAt(0).toUpperCase() || '#'}
    </span>
  )
}

function InvoiceRow({ invoice }: { invoice: Invoice }) {
  const status = displayStatus(invoice)
  const client = invoice.customer.company ?? invoice.customer.name ?? invoice.customer.email ?? 'Client'
  return (
    <li className="flex items-center gap-3 py-3">
      <Initial text={client} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{client}</p>
        <p className="text-xs text-ink-muted">
          #{invoice.number ?? '—'} · due {formatDate(invoice.dueDate)}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold tabular-nums">
          {invoice.amount ? formatMoney(Number(invoice.amount.value), invoice.amount.currency_code) : '—'}
        </p>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>
    </li>
  )
}

function PaymentRow({ payment }: { payment: RecentPayment }) {
  return (
    <li className="flex items-center gap-3 py-3">
      <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-success-bg text-success">
        <Wallet className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{payment.invoiceNumber ? `Invoice #${payment.invoiceNumber} paid` : 'Payment received'}</p>
        <p className="text-xs text-ink-muted">{formatDate(payment.date)} · via PayPal</p>
      </div>
      <p className="text-sm font-semibold text-success tabular-nums">
        +{formatMoney(Number(payment.amount.value), payment.amount.currency_code)}
      </p>
    </li>
  )
}

function BucketRow({ bucket }: { bucket: Savings['buckets'][number] }) {
  return (
    <li className="flex items-center gap-3 py-3">
      <Initial text={bucket.name} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{bucket.name}</p>
        <p className="text-xs text-ink-muted">
          {bucket.percent !== null ? `${bucket.percent}% of the payments you accept` : 'No longer in your plan'}
        </p>
      </div>
      <p className="text-sm font-semibold tabular-nums">{formatTotals(bucket.amounts)}</p>
    </li>
  )
}

// Ejemplos para el copiloto: al presionarlos se abre el chat con el texto ya escrito.
function TryAsking({ prompts }: { prompts: string[] }) {
  return (
    <Card className="h-fit bg-brand-50">
      <h2 className="flex items-center gap-2 font-semibold text-brand-900">
        <Sparkles aria-hidden className="size-4" />
        Try asking the copilot
      </h2>
      <ul className="mt-3 space-y-2">
        {prompts.map((p) => (
          <li key={p}>
            <Link
              to={`/copilot?q=${encodeURIComponent(p)}`}
              className="block rounded-xl border border-brand-100 bg-surface px-4 py-3 text-sm text-ink hover:border-brand-500"
            >
              “{p}”
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-ink-muted">It always asks before doing anything on your PayPal account.</p>
    </Card>
  )
}
