import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AuthProvider } from '@/components/auth/auth-provider';

export default async function UnauthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return <AuthProvider initialUser={null}>{children}</AuthProvider>;
}
