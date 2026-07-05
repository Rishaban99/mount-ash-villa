'use client';

import { AuthProvider } from '@/components/auth-provider';
import { Login } from '@/components/Login';

export default function LoginPage() {
  return (
    <AuthProvider>
      <Login />
    </AuthProvider>
  );
}
