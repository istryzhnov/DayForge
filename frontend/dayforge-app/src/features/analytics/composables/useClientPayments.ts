import type { PaymentStatus } from '../../../entities/BillingEntity'
import type { ID } from '../../../entities/types'
import { useSettings } from '../../../composables/useSettings'
import { withPaymentAmount, withPaymentStatus } from './clientBilling'

/** Writes payment status into the synced settings row. */
export function useClientPayments() {
  const { settings, update } = useSettings()

  function setStatus(
    clientId: ID,
    month: string,
    status: PaymentStatus,
    amount?: number,
  ) {
    update('billing', {
      payments: withPaymentStatus(
        settings.billing.payments,
        clientId,
        month,
        status,
        new Date().toISOString(),
        amount,
      ),
    })
  }

  function setAmount(clientId: ID, month: string, amount: number | undefined) {
    update('billing', {
      payments: withPaymentAmount(
        settings.billing.payments,
        clientId,
        month,
        amount,
      ),
    })
  }

  return { setStatus, setAmount }
}
