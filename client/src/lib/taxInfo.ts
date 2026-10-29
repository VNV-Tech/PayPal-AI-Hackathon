import { api } from './api'
import type { Money } from './invoices'

// Datos fiscales para facturar en México (CFDI). Mismos catálogos y tipos que
// server/src/taxInfo.ts.
export const TAX_REGIMES: Record<string, string> = {
  '601': 'General de Ley Personas Morales',
  '603': 'Personas Morales con Fines no Lucrativos',
  '605': 'Sueldos y Salarios e Ingresos Asimilados a Salarios',
  '606': 'Arrendamiento',
  '607': 'Régimen de Enajenación o Adquisición de Bienes',
  '608': 'Demás ingresos',
  '610': 'Residentes en el Extranjero sin Establecimiento Permanente en México',
  '611': 'Ingresos por Dividendos (socios y accionistas)',
  '612': 'Personas Físicas con Actividades Empresariales y Profesionales',
  '614': 'Ingresos por intereses',
  '615': 'Régimen de los ingresos por obtención de premios',
  '616': 'Sin obligaciones fiscales',
  '620': 'Sociedades Cooperativas de Producción que optan por diferir sus ingresos',
  '621': 'Incorporación Fiscal',
  '622': 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras',
  '623': 'Opcional para Grupos de Sociedades',
  '624': 'Coordinados',
  '625': 'Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas',
  '626': 'Régimen Simplificado de Confianza',
}

export const CFDI_USES: Record<string, string> = {
  G01: 'Adquisición de mercancías',
  G03: 'Gastos en general',
  I02: 'Mobiliario y equipo de oficina por inversiones',
  I04: 'Equipo de cómputo y accesorios',
  I08: 'Otra maquinaria y equipo',
  S01: 'Sin efectos fiscales',
}

// RFC: 3 letras (empresa) o 4 (persona), fecha AAMMDD y homoclave de 3.
export const RFC_PATTERN = '[A-Za-zÑñ&]{3,4}[0-9]{6}[A-Za-z0-9]{3}'

export interface TaxInfo {
  rfc: string
  name: string // razón social
  regime: string
  zip: string
  use: string
  email: string
}

// Datos de prueba del SAT para la demo (la página es pública: nadie debe
// escribir datos reales). Probados con el sandbox de Facturama.
export const TEST_TAX_INFO: TaxInfo = {
  rfc: 'URE180429TM6',
  name: 'UNIVERSIDAD ROBOTICA ESPAÑOLA',
  regime: '601',
  zip: '86991',
  use: 'G03',
  email: 'facturas@example.com',
}

export interface IssuedTaxInvoice {
  id: string
  uuid: string // folio fiscal del SAT
  folio: string
  total: Money
  issuedAt: string
  emailedTo: string | null
}

export interface TaxRequest {
  token: string
  invoiceId: string
  invoiceNumber: string | null
  customerEmail: string | null
  amount: Money | null
  createdAt: string
  status: 'waiting' | 'received'
  receivedAt?: string
  source?: 'client' | 'user' | 'saved'
  taxInfo?: TaxInfo
  cfdi?: IssuedTaxInvoice
}

export interface PublicTaxRequest {
  issuer: string | null // nombre del negocio que pide los datos
  invoiceNumber: string | null
  amount: Money | null
  status: 'waiting' | 'received'
  cfdi: { folio: string; uuid: string } | null
}

export const taxInfoApi = {
  // cfdiEnabled: false si el servidor no tiene las credenciales de Facturama.
  // knownClients: correos de clientes cuyos datos fiscales ya tenemos.
  list: () => api<{ requests: TaxRequest[]; knownClients: string[]; cfdiEnabled: boolean }>('/tax-info'),
  issue: (invoiceId: string) => api<TaxRequest>('/tax-info/cfdi', { method: 'POST', body: JSON.stringify({ invoiceId }) }),
  fileUrl: (invoiceId: string, format: 'pdf' | 'xml') => `/api/tax-info/cfdi/${invoiceId}/${format}`,
  publicFileUrl: (token: string, format: 'pdf' | 'xml') => `/api/tax-info/public/${encodeURIComponent(token)}/${format}`,
  link: (invoiceId: string) => api<TaxRequest>('/tax-info/requests', { method: 'POST', body: JSON.stringify({ invoiceId }) }),
  getPublic: (token: string) => api<PublicTaxRequest>(`/tax-info/public/${encodeURIComponent(token)}`),
  submit: (token: string, info: TaxInfo) =>
    api<{ status: string }>(`/tax-info/public/${encodeURIComponent(token)}`, { method: 'POST', body: JSON.stringify(info) }),
}

// El link que el usuario le comparte a su cliente.
export function taxLink(token: string) {
  return `${window.location.origin}/factura/${token}`
}
