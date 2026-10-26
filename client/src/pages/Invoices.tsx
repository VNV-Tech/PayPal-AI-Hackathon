import { Button, ButtonLink, EmptyState, PageHeader } from '../components/ui'

export function Invoices() {
  return (
    <>
      <PageHeader
        title="Invoices"
        description="Invoices created through PayPal Invoicing. Clients pay with PayPal or card."
        actions={<Button disabled>New invoice</Button>}
      />

      {/* TODO: tabla de facturas desde GET /api/invoices */}
      <EmptyState
        title="No invoices yet"
        description="Ask the copilot to draft your first invoice. You'll review it before anything is sent."
        action={
          <ButtonLink to="/copilot" variant="secondary">Open copilot</ButtonLink>
        }
      />
    </>
  )
}
