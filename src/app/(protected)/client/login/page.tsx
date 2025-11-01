'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { sendSignInLinkToEmail, isSignInWithEmailLink } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Logo from '@/components/logo';
import { Skeleton } from '@/components/ui/skeleton';

export default function ClientLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, signInWithGoogle, userRole } = useAuth();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Si llega un enlace mágico directo a esta ruta, redirigir al completador
  useEffect(() => {
    if (typeof window === 'undefined' || !auth) return;
    if (isSignInWithEmailLink(auth, window.location.href)) {
      const currentSearch = window.location.search || '';
      router.replace(`/client/complete${currentSearch}`);
    }
  }, [router]);

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (!loading && user) {
      const target = userRole.isSuperAdmin ? '/admin/dashboard' : '/client/dashboard';
      router.replace(target);
    }
  }, [user, loading, router, userRole.isSuperAdmin]);

  const prefillingEmail = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const fromQuery = searchParams?.get('email') || '';
    if (fromQuery) return fromQuery;
    const stored = window.localStorage.getItem('clientEmailForSignIn');
    return stored || '';
  }, [searchParams]);

  useEffect(() => {
    if (prefillingEmail) {
      setEmail(prefillingEmail);
    }
  }, [prefillingEmail]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!auth) {
      setErrorMessage('La autenticación no está configurada. Revisa las credenciales de Firebase.');
      setStatus('error');
      return;
    }

    const emailToUse = email.trim().toLowerCase();
    if (!emailToUse) {
      setErrorMessage('Por favor, ingresa un correo.');
      setStatus('error');
      return;
    }

    try {
      setStatus('sending');
      setErrorMessage('');
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL && process.env.NEXT_PUBLIC_SITE_URL.length > 0
          ? process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
          : typeof window !== 'undefined'
            ? window.location.origin
            : '';
      if (!siteUrl) {
        throw new Error('No se pudo determinar la URL base para completar el inicio de sesión. Define NEXT_PUBLIC_SITE_URL.');
      }
      const actionCodeSettings = {
        url: `${siteUrl}/client/complete?email=${encodeURIComponent(emailToUse)}`,
        handleCodeInApp: true,
      };

      await sendSignInLinkToEmail(auth, emailToUse, actionCodeSettings);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('clientEmailForSignIn', emailToUse);
      }
      setStatus('sent');
    } catch (error: any) {
      console.error('Error enviando enlace de acceso:', error);
      setErrorMessage(error?.message || 'No se pudo enviar el enlace de acceso. Intenta nuevamente.');
      setStatus('error');
    }
  };

  if (loading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm shadow-lg">
          <CardHeader>
            <Skeleton className="h-8 w-3/4 mx-auto" />
            <Skeleton className="h-4 w-1/2 mx-auto" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-12 w-full" />
          </CardContent>
          <CardFooter>
            <Skeleton className="h-4 w-1/3 mx-auto" />
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto mb-2">
            <Logo className="h-16 w-auto text-primary" />
          </div>
          <div>
            <CardTitle className="font-headline text-2xl">Acceso para Clientes</CardTitle>
            <CardDescription>Recibe un enlace mágico en tu correo para gestionar tus campañas.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2 text-left">
              <Label htmlFor="email">Correo registrado</Label>
              <Input
                id="email"
                type="email"
                placeholder="cliente@tuempresa.com"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={status === 'sending'}
                required
              />
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={status === 'sending'}>
              {status === 'sending' ? 'Enviando enlace…' : 'Enviar enlace de acceso'}
            </Button>
          </form>
          {status === 'sent' && (
            <Alert>
              <AlertDescription>
                ¡Listo! Revisa tu correo (incluyendo spam). Abre el enlace desde el mismo dispositivo para completar el acceso.
              </AlertDescription>
            </Alert>
          )}
          {status === 'error' && errorMessage && (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground text-center">
              ¿Prefieres usar Google? Puedes seguir utilizando el método anterior.
            </p>
            <Button variant="outline" onClick={signInWithGoogle} className="w-full">
              Continuar con Google
            </Button>
          </div>
        </CardContent>
        <CardFooter className="justify-center">
          <Button variant="link" asChild className="text-xs">
            <Link href="/">Volver</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
