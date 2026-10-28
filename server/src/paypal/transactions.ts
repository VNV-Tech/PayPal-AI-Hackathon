// Pagos recibidos, con el SDK oficial de PayPal para servidor (generado por
// APIMatic). Invoicing no está en el SDK, pero Transaction Search sí.
// Docs: https://www.paypalobjects.com/serversdk/typescript/api-endpoints/transaction-search/search-transactions
import { ApiError, Client, Environment, TransactionSearchController } from '@paypal/paypal-server-sdk';
import { env } from '../config/env.js';
import { PayPalError } from './client.js';
import type { Money } from './invoices.js';

// Solo Sandbox, igual que client.ts: no se usa Environment.Production.
const sdkClient = new Client({
  clientCredentialsAuthCredentials: {
    oAuthClientId: env.PAYPAL_CLIENT_ID,
    oAuthClientSecret: env.PAYPAL_CLIENT_SECRET,
  },
  environment: Environment.Sandbox,
  timeout: 15_000,
});

const transactionSearch = new TransactionSearchController(sdkClient);

export interface PaymentsReceived {
  totals: Money[]; // un total por moneda
  count: number;
}

// Los códigos T00xx son pagos recibidos (por ejemplo T0006, pago de factura).
// Se excluyen comisiones, reembolsos y ajustes; en Sandbox, por ejemplo, el
// saldo inicial de la cuenta de prueba aparece como T1900.
function isPaymentReceived(code: string | undefined, value: number): boolean {
  return Boolean(code?.startsWith('T00')) && value > 0;
}

// PayPal pide fechas con segundos y permite como máximo 31 días por búsqueda.
function toPayPalDate(d: Date): string {
  return `${d.toISOString().slice(0, 19)}Z`;
}

// Nota: PayPal tarda hasta 3 horas en mostrar un pago nuevo en esta búsqueda.
export async function getPaymentsReceived(start: Date, end: Date): Promise<PaymentsReceived> {
  const sums = new Map<string, number>();
  let count = 0;

  try {
    for (let page = 1; ; page++) {
      const { result } = await transactionSearch.searchTransactions({
        startDate: toPayPalDate(start),
        endDate: toPayPalDate(end),
        transactionStatus: 'S', // solo pagos completados
        fields: 'transaction_info',
        pageSize: 100,
        page,
      });

      for (const { transactionInfo: info } of result.transactionDetails ?? []) {
        const amount = info?.transactionAmount;
        const value = Number(amount?.value);
        if (!amount || !isPaymentReceived(info?.transactionEventCode, value)) continue;
        // Se suma en centavos para evitar errores de redondeo con decimales.
        sums.set(amount.currencyCode, (sums.get(amount.currencyCode) ?? 0) + Math.round(value * 100));
        count++;
      }

      // Tope de 10 páginas (1,000 movimientos) para no colgar la pantalla.
      if (page >= (result.totalPages ?? 1) || page >= 10) break;
    }
  } catch (err) {
    if (err instanceof ApiError) {
      // Se convierte al mismo error que el resto del código de PayPal para que
      // el manejador central registre el debug_id.
      const debugId = (err.headers?.['paypal-debug-id'] as string | undefined) ?? undefined;
      throw new PayPalError(`PayPal transaction search falló (${err.statusCode})`, err.statusCode, debugId);
    }
    throw err;
  }

  return {
    totals: [...sums].map(([currency_code, cents]) => ({ currency_code, value: (cents / 100).toFixed(2) })),
    count,
  };
}
