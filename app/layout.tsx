/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Metadata } from 'next';
import { AppToaster } from '@/components/toaster';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mount Ash Villa',
  description: 'POS & Terminal Manager',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
        <AppToaster />
      </body>
    </html>
  );
}
