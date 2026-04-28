export const dynamic = "force-dynamic";
import { Clock } from 'lucide-react';
import { redirect } from 'next/navigation';
import SignOutButton from './SignOutButton';
import { getAuthMember, isAdmin } from '@/lib/api-auth';

export default async function PendingApprovalPage() {
  const auth = await getAuthMember();
  // Já aprovado ou admin → tira daqui
  if (!auth) redirect('/sign-in');
  if (isAdmin(auth.role) || auth.is_approved) redirect('/my-tasks');

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface text-center p-6">
      <div className="max-w-md">
        <img src="/logo-bahtech.svg" alt="Bah!Flow" className="h-8 mb-8 mx-auto object-contain dark:invert-0 invert" />
        <div className="rounded-full bg-amber-500/10 p-5 inline-flex mb-5">
          <Clock size={36} className="text-amber-400" />
        </div>
        <h1 className="font-serif text-[28px] text-primary tracking-tight">
          Aguardando aprovação
        </h1>
        <p className="mt-3 text-[14px] text-secondary leading-relaxed">
          Olá <span className="text-primary font-medium">{auth.display_name}</span>, seu acesso à organização está sendo analisado pelo administrador.
          Você será notificado por email quando for aprovado.
        </p>
        <div className="mt-8">
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
