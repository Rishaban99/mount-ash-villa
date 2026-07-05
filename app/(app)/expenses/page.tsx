'use client';

import { Suspense } from 'react';
import { Expenses } from '@/components/Expenses';

export default function ExpensesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading expenses...</div>}>
      <Expenses />
    </Suspense>
  );
}
