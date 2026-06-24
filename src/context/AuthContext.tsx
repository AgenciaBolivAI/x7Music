'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'client' | 'admin';
  company?: string;
  phone?: string;
  avatarUrl?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  isAdmin: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) { setUser(null); return; }
    const { data: p } = await supabase
      .from('profiles')
      .select('first_name, last_name, role, company, phone, avatar_url')
      .eq('id', authUser.id)
      .maybeSingle();
    setUser({
      id: authUser.id,
      email: authUser.email ?? '',
      firstName: p?.first_name ?? '',
      lastName: p?.last_name ?? '',
      role: (p?.role as 'client' | 'admin') ?? 'client',
      company: p?.company ?? undefined,
      phone: p?.phone ?? undefined,
      avatarUrl: p?.avatar_url ?? undefined,
    });
  };

  useEffect(() => {
    loadProfile().finally(() => setIsLoading(false));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) setUser(null);
      else loadProfile();
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        logout,
        refresh: loadProfile,
        isAdmin: user?.role === 'admin',
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
