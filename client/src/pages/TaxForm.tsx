import { type FormEvent, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CircleCheck, FlaskConical, Receipt } from 'lucide-react'
import { Button, Card, Skeleton } from '../components/ui'
import { APP_NAME, formatMoney } from '../lib/config'
import { CFDI_USES, type PublicTaxRequest, RFC_PATTERN, TAX_REGIMES, TEST_TAX_INFO, type TaxInfo, taxInfoApi } from '../lib/taxInfo'

// Página pública que abre el cliente con su link para dejar sus datos
// fiscales. Va en español: el CFDI solo existe en México. No usa el menú de
// la app porque quien la abre no es el usuario.

const EMPTY: TaxInfo = { rfc: '', name: '', regime: '', zip: '', use: 'G03', email: '' }

const inputClass =
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100'

export function TaxForm() {
  const { token = '' } = useParams()
  const [request, setRequest] = useState<PublicTaxRequest | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    let ignore = false
    taxInfoApi.getPublic(token).then(
      (r) => {
        if (!ignore) setRequest(r)
      },
      (err: unknown) => {
        if (!ignore) setLoadError(err instanceof Error ? err.message : 'No se pudo abrir el link')
      },
    )
    return () => {
      ignore = true
    }
  }, [token])

  const done = request?.status === 'received' && !editing

  return (
    <div className="min-h-screen">
      <header className="bg-navy-900 text-white">
        <div className="mx-auto flex h-16 max-w-xl items-center gap-2 px-4 text-lg font-bold tracking-tight">
          <img src="/favicon.svg" alt="" className="size-8 rounded-lg ring-1 ring-white/20" />
          {APP_NAME}
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-8">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Receipt aria-hidden className="size-6 text-brand-600" />
          Datos para tu factura
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Llena tus datos fiscales para recibir tu factura (CFDI) de este pago. Solo te los pedimos una vez.
        </p>

        {loadError ? (
          <Card className="mt-6 text-center">
            <p className="font-semibold">Este link no existe o ya venció</p>
            <p className="mt-1 text-sm text-ink-muted">Pídele un link nuevo a quien te mandó la factura.</p>
          </Card>
        ) : !request ? (
          <Skeleton className="mt-6 h-96 rounded-2xl" />
        ) : (
          <>
            <Card className="mt-6 flex items-center justify-between gap-4 py-4">
              <div>
                <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">Factura de PayPal</p>
                <p className="font-semibold">#{request.invoiceNumber ?? '—'}</p>
              </div>
              <p className="text-xl font-bold tabular-nums">
                {request.amount ? formatMoney(Number(request.amount.value), request.amount.currency_code) : '—'}
              </p>
            </Card>

            {done ? (
              <Card className="mt-4 text-center">
                <CircleCheck aria-hidden className="mx-auto size-10 text-success" />
                <p className="mt-2 text-lg font-bold">¡Listo! Ya tenemos tus datos</p>
                <p className="mt-1 text-sm text-ink-muted">Tu factura se generará con ellos. Puedes cerrar esta página.</p>
                <Button variant="ghost" className="mt-4" onClick={() => setEditing(true)}>
                  Corregir mis datos
                </Button>
              </Card>
            ) : (
              <TaxInfoForm
                token={token}
                onSaved={() => {
                  setRequest({ ...request, status: 'received' })
                  setEditing(false)
                }}
              />
            )}
          </>
        )}
      </main>
    </div>
  )
}

function TaxInfoForm({ token, onSaved }: { token: string; onSaved: () => void }) {
  const [info, setInfo] = useState<TaxInfo>(EMPTY)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (field: keyof TaxInfo) => (e: { target: { value: string } }) =>
    setInfo((i) => ({ ...i, [field]: field === 'rfc' ? e.target.value.toUpperCase() : e.target.value }))

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await taxInfoApi.submit(token, info)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar tus datos')
      setBusy(false)
    }
  }

  return (
    <Card className="mt-4">
      {/* La demo es pública: nadie debe escribir datos reales. */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-warning-bg px-4 py-3 text-sm text-warning">
        <span className="flex items-center gap-2">
          <FlaskConical aria-hidden className="size-4 shrink-0" />
          Esto es una demo: usa datos de prueba, no los tuyos.
        </span>
        <button type="button" onClick={() => setInfo(TEST_TAX_INFO)} className="font-semibold underline">
          Usar datos de prueba
        </button>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">RFC</span>
          <input
            required
            value={info.rfc}
            onChange={set('rfc')}
            pattern={RFC_PATTERN}
            title="12 caracteres si es empresa, 13 si es persona"
            maxLength={13}
            autoComplete="off"
            className={`${inputClass} uppercase`}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Nombre o razón social</span>
          <input required maxLength={254} value={info.name} onChange={set('name')} className={inputClass} />
          <span className="mt-1 block text-xs text-ink-muted">
            Tal como aparece en tu Constancia de Situación Fiscal, sin "S.A. de C.V."
          </span>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Régimen fiscal</span>
          <select required value={info.regime} onChange={set('regime')} className={inputClass}>
            <option value="" disabled>
              Elige tu régimen
            </option>
            {Object.entries(TAX_REGIMES).map(([code, label]) => (
              <option key={code} value={code}>
                {code} · {label}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Código postal fiscal</span>
            <input
              required
              inputMode="numeric"
              pattern="[0-9]{5}"
              title="5 dígitos"
              maxLength={5}
              value={info.zip}
              onChange={set('zip')}
              className={inputClass}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Uso del CFDI</span>
            <select required value={info.use} onChange={set('use')} className={inputClass}>
              {Object.entries(CFDI_USES).map(([code, label]) => (
                <option key={code} value={code}>
                  {code} · {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Correo para recibir la factura</span>
          <input required type="email" maxLength={254} value={info.email} onChange={set('email')} className={inputClass} />
        </label>

        {error && (
          <p role="alert" className="rounded-xl bg-danger-bg px-4 py-3 text-sm text-danger">
            {error}
          </p>
        )}

        <Button type="submit" disabled={busy} className="w-full">
          {busy ? 'Guardando…' : 'Enviar mis datos'}
        </Button>
      </form>
    </Card>
  )
}
