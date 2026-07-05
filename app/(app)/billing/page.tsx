'use client';

import { Billing } from '@/components/Billing';
import { useReceipt } from '@/components/receipt-provider';

export default function BillingPage() {
  const { showReceipt } = useReceipt();
  return <Billing onShowReceipt={showReceipt} />;
}
