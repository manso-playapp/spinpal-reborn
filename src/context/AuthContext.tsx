'use client';

import type { User } from 'firebase/auth';
import { createContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { useRouter } from 'next/navigation';

const superAdminEmail = 'grupomanso@gmail.com';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isSuperAdmin: boolean;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Only subscribe to auth state changes if Firebase was initialized correctly
    if (auth) {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          // Forzar actualización del token para obtener los claims más recientes
          await user.getIdToken(true);
          const idTokenResult = await user.getIdTokenResult();
          
          // Verificar los roles/claims
          const isAdmin = idTokenResult.claims.admin === true || 
                         idTokenResult.claims.role === 'admin' ||
                         idTokenResult.claims.role === 'superadmin' ||
                         idTokenResult.claims.isAdmin === true;
          
          if (!isAdmin && user.email !== superAdminEmail) {
            console.warn('Usuario sin permisos de administrador');
            if (auth) await firebaseSignOut(auth);
            setUser(null);
            setIsSuperAdmin(false);
            router.push('/login');
            return;
          }
        }
        
        setUser(user);
        setIsSuperAdmin(user?.email === superAdminEmail);
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      // If Firebase is not configured, we are not loading and there is no user.
      setLoading(false);
      setUser(null);
      setIsSuperAdmin(false);
    }
  }, [router]);

  const signOut = async () => {
    if (auth) {
      await firebaseSignOut(auth);
    }
    router.push('/');
  };

  const signInWithGoogle = async () => {
    if (auth) {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // The onAuthStateChanged listener will handle the user state update and redirect
    }
  };

  const value = {
    user,
    loading,
    isSuperAdmin,
    signOut,
    signInWithGoogle,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
