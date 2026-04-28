'use client';

import { useClerk } from '@clerk/nextjs';
import { LogOut } from 'lucide-react';

export default function SignOutButton() {
  const { signOut } = useClerk();
  return (
    <button onClick={() => signOut({ redirectUrl: '/sign-in' })} className="btn-premium btn-secondary">
      <LogOut size={14} />
      Sair
    </button>
  );
}
