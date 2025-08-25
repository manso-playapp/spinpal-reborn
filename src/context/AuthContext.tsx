'use client';

import { createContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

// TODO: Re-implement role management using Supabase (e.g., a 'profiles' table)
const superAdminEmail = 'grupomanso@gmail.com';

interface UserRole {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isClient: boolean;
  clientId?: string;
  allowedGameIds?: string[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  userRole: UserRole;
  signOut: () => Promise<void>;
  signInWithPassword: (credentials: { email: string, password: string }) => Promise<any>;
  // signInWithGoogle: () => Promise<void>; // TODO: Re-implement if needed
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>({
    isAdmin: false,
    isSuperAdmin: false,
    isClient: false
  });
  const router = useRouter();

  const updateUserRole = (user: User | null) => {
    if (!user) {
      setUserRole({ isAdmin: false, isSuperAdmin: false, isClient: false });
      return;
    }

    // Temporary role logic: only checks for super admin
    // TODO: Fetch roles from a 'profiles' table in Supabase
    const isSuperAdmin = user.email === superAdminEmail;
    const isAdmin = isSuperAdmin; // Simplified for now
    const isClient = !isAdmin; // Simplified for now

    setUserRole({
      isSuperAdmin,
      isAdmin,
      isClient,
    });
  };

  useEffect(() => {
    const getSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
        updateUserRole(session?.user ?? null);
        setLoading(false);
    };
    
    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Supabase auth event:', event);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      updateUserRole(currentUser);
      setLoading(false);

      if (event === 'SIGNED_IN') {
        // Simplified redirection logic
        // TODO: Re-implement proper role-based redirection
        if (currentUser?.email === superAdminEmail) {
            router.push('/admin/dashboard');
        } else {
            router.push('/client/dashboard');
        }
      } else if (event === 'SIGNED_OUT') {
        router.push('/login');
      }
    });

    return () => {
      authListener?.unsubscribe();
    };
  }, [router]);

  const signInWithPassword = async ({ email, password }: { email: string, password: string }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const value = {
    user,
    loading,
    userRole,
    signOut,
    signInWithPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
