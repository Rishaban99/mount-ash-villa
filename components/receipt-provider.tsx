'use client';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState } from 'react';
import type { Bill } from '@/lib/types';
import { Receipt } from '@/components/Receipt';

interface ReceiptContextValue {
  showReceipt: (bill: Bill) => void;
}

const ReceiptContext = createContext<ReceiptContextValue | undefined>(undefined);

export function ReceiptProvider({ children }: { children: React.ReactNode }) {
  const [activeReceiptBill, setActiveReceiptBill] = useState<Bill | null>(null);

  return (
    <ReceiptContext.Provider value={{ showReceipt: setActiveReceiptBill }}>
      {children}
      {activeReceiptBill && (
        <Receipt
          bill={activeReceiptBill}
          onClose={() => setActiveReceiptBill(null)}
        />
      )}
    </ReceiptContext.Provider>
  );
}

export function useReceipt() {
  const context = useContext(ReceiptContext);
  if (!context) {
    throw new Error('useReceipt must be used within ReceiptProvider');
  }
  return context;
}
