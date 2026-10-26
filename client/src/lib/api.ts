export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

// Cliente HTTP mínimo para el backend. Lanza ApiError con el mensaje del
// servidor para que la UI muestre algo útil en vez de fallar en silencio.
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
    credentials: 'same-origin',
  })

  const body = res.headers.get('content-type')?.includes('application/json') ? await res.json() : null

  if (!res.ok) {
    throw new ApiError(body?.error ?? `Request failed (${res.status})`, res.status)
  }
  return body as T
}
