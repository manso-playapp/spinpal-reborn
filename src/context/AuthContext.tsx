'use client';

import type { User } from 'firebase/auth';
import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { useRouter } from 'next/navigation';

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
  signInWithGoogle: () => Promise<void>;
  impersonateClient: (clientId: string) => Promise<void>;
  stopImpersonating: () => Promise<void>;
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
  const [impersonatedClientId, setImpersonatedClientId] = useState<string | null>(null);
  const router = useRouter();

  const updateUserRole = useCallback(async (user: User | null) => {
    if (!user) {
      setUserRole({
        isAdmin: false,
        isSuperAdmin: false,
        isClient: false
      });
      return;
    }

    await user.getIdToken(true);
    const idTokenResult = await user.getIdTokenResult();
    console.log('Claims recibidos:', idTokenResult.claims);
    
    const isSuperAdmin = user.email === superAdminEmail;
    const isAdmin = isSuperAdmin || 
                   idTokenResult.claims.admin === true || 
                   idTokenResult.claims.role === 'admin';
    
    const clientId = idTokenResult.claims.clientId as string;
    const allowedGameIds = idTokenResult.claims.allowedGameIds as string[] || [];
    const isClient = !!clientId || allowedGameIds.length > 0;

    // Establecer roles primero
    setUserRole({
      isAdmin,
      isSuperAdmin,
      isClient,
      clientId,
      allowedGameIds
    });

    // Verificar permisos después de establecer roles
    if (!isAdmin && !isClient) {
      console.warn('Usuario sin permisos');
      if (auth) {
        await firebaseSignOut(auth);
        setUser(null);
        const target = window.location.pathname.startsWith('/client') ? '/client/login' : '/login';
        router.push(target);
      }
      return;
    }

    // No necesitamos otro setUserRole aquí ya que ya lo hicimos arriba
    console.log('Roles actualizados:', { isAdmin, isSuperAdmin, isClient });
  }, [router]);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      setUser(null);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Estado de autenticación cambiado:', user?.email);
      
      if (!user) {
        setUser(null);
        setUserRole({
          isAdmin: false,
          isSuperAdmin: false,
          isClient: false
        });
        setLoading(false);
        const publicPaths = ['/', '/login', '/client/login', '/client/complete'];
        if (!publicPaths.includes(window.location.pathname)) {
          router.push('/login');
        }
        return;
      }

      try {
        setUser(user);
        await updateUserRole(user);
        // Persist session token for middleware checks
        try {
          const token = await user.getIdToken();
          document.cookie = `session=${token}; path=/;`;
        } catch (_) {
          // ignore token errors on client
        }
        
        // Redirigir al usuario a la página correcta después de actualizar los roles
        const currentPath = window.location.pathname;
        if (currentPath === '/login') {
          const newRole = await user.getIdTokenResult();
          const isSuperAdminOrAdmin = user.email === superAdminEmail || 
                                    newRole.claims.admin === true || 
                                    newRole.claims.role === 'admin';
          
          if (isSuperAdminOrAdmin) {
            router.push('/admin/dashboard');
          } else if (newRole.claims.clientId || (newRole.claims.allowedGameIds as string[])?.length > 0) {
            router.push('/client/dashboard');
          }
        }
      } catch (error) {
        console.error('Error al actualizar roles:', error);
        if (auth) {
          await firebaseSignOut(auth);
          router.push('/login');
        }
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router, updateUserRole]);

  const signOut = async () => {
    if (auth) {
      await firebaseSignOut(auth);
      // Eliminar la cookie de sesión
      document.cookie = 'session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    }
    router.push('/login');
  };

  const signInWithGoogle = async () => {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      console.log('Login exitoso:', result.user.email);
      // Refuerzo: setear cookie de sesión inmediatamente para que el middleware la vea en el próximo request
      try {
        const token = await result.user.getIdToken();
        const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
        const cookie = `session=${token}; path=/; SameSite=Lax; ${isHttps ? 'Secure; ' : ''}Max-Age=3600`;
        document.cookie = cookie;
      } catch (e) {
        console.warn('No se pudo setear la cookie de sesión inmediatamente:', e);
      }
      // Navegar al dashboard del cliente si estamos en login de cliente
      try {
        const path = typeof window !== 'undefined' ? window.location.pathname : '';
        if (path.startsWith('/client')) {
          router.replace('/client/dashboard');
        }
      } catch (_) {}
      // onAuthStateChanged seguirá actualizando roles y estados
    } catch (error) {
      console.error('Error al iniciar sesión con Google:', error);
      throw error;
    }
  };

  const impersonateClient = async (clientId: string) => {
    if (!userRole.isAdmin) {
      throw new Error('Solo los administradores pueden impersonar clientes');
    }
    setImpersonatedClientId(clientId);
    // Aquí podrías actualizar los claims temporalmente o manejar la impersonación como prefieras
    router.push('/client/dashboard');
  };

  const stopImpersonating = async () => {
    setImpersonatedClientId(null);
    router.push('/admin/dashboard');
  };

  const value = {
    user,
    loading,
    userRole,
    signOut,
    signInWithGoogle,
    impersonateClient,
    stopImpersonating
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
