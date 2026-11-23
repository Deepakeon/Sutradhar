import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AuthProvider } from '@/components/auth/auth-provider';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return <AuthProvider initialUser={user}>{children}</AuthProvider>;
}
