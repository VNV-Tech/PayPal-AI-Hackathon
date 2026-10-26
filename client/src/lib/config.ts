// Nombre provisional: cambiarlo aquí lo cambia en toda la interfaz.
export const APP_NAME = 'VNV Copilot'

// Las facturas arrancan en MXN; USD se agregará después.
export const DEFAULT_CURRENCY = 'MXN'

export function formatMoney(amount: number, currency = DEFAULT_CURRENCY) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
}
