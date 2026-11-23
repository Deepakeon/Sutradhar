'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

export interface AuthContextValue {
  user: User | null;
  supabase: ReturnType<typeof createClient>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  initialUser = null,
  children,
}: {
  initialUser?: User | null;
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(initialUser);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  return (
    <AuthContext.Provider value={{ user, supabase }}>
      {children}
    </AuthContext.Provider>
  );
}

let fallbackClient: ReturnType<typeof createClient> | undefined;

function getFallbackClient() {
  if (!fallbackClient) {
    fallbackClient = createClient();
  }
  return fallbackClient;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      supabase: getFallbackClient(),
    };
  }
  return context;
}

export function useOptionalAuth() {
  return useContext(AuthContext);
}
