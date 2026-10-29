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

export interface ReceivedPayment {
  id: string; // ID de la transacción; es el mismo payment_id que guarda la factura
  amount: Money;
  date: string; // AAAA-MM-DD
  invoiceNumber: string | null; // número de factura de PayPal, si el pago fue de una
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

// Nota: PayPal tarda hasta 3 horas en mostrar un pago nuevo en esta búsqueda;
// overview.ts completa el hueco con los pagos que guarda cada factura.
export async function listPaymentsReceived(start: Date, end: Date): Promise<ReceivedPayment[]> {
  const payments: ReceivedPayment[] = [];

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
        if (!amount || !info?.transactionId || !isPaymentReceived(info.transactionEventCode, value)) continue;
        payments.push({
          id: info.transactionId,
          amount: { currency_code: amount.currencyCode, value: amount.value },
          date: (info.transactionInitiationDate ?? toPayPalDate(end)).slice(0, 10),
          invoiceNumber: info.invoiceId ?? null,
        });
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

  return payments;
}
