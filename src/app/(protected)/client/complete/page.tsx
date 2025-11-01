'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithEmailLink, isSignInWithEmailLink } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Logo from '@/components/logo';

export default function ClientMagicLinkCompletePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'checking' | 'needsEmail' | 'signingIn' | 'completed' | 'error'>('checking');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace('/client/dashboard');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (typeof window === 'undefined' || !auth) {
      return;
    }

    if (!isSignInWithEmailLink(auth, window.location.href)) {
      setErrorMessage('El enlace no es válido o ya fue utilizado. Solicita uno nuevo.');
      setStatus('error');
      return;
    }

    const storedEmail = window.localStorage.getItem('clientEmailForSignIn');
    const emailFromQuery = searchParams?.get('email') || '';
    const emailToUse = storedEmail || emailFromQuery;

    if (!emailToUse) {
      setStatus('needsEmail');
      return;
    }

    setEmail(emailToUse);
    void completeSignIn(emailToUse);
  }, [searchParams]);

  const completeSignIn = async (emailToUse: string) => {
    if (typeof window === 'undefined' || !auth) return;

    try {
      setStatus('signingIn');
      await signInWithEmailLink(auth, emailToUse, window.location.href);
      window.localStorage.removeItem('clientEmailForSignIn');
      setStatus('completed');
      router.replace('/client/dashboard');
    } catch (error: any) {
      console.error('Error completando enlace mágico:', error);
      setErrorMessage(error?.message || 'No se pudo completar el acceso. Solicita un nuevo enlace.');
      setStatus('error');
    }
  };

  const handleSubmitEmail = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Necesitamos tu correo para confirmar el acceso.');
      setStatus('needsEmail');
      return;
    }
    await completeSignIn(email.trim().toLowerCase());
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto mb-1">
            <Logo className="h-14 w-auto text-primary" />
          </div>
          <CardTitle className="font-headline text-2xl">Completando acceso</CardTitle>
          <CardDescription>
            Estamos verificando tu enlace mágico. Esto tarda sólo unos segundos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'checking' || status === 'signingIn' ? (
            <Alert>
              <AlertDescription>Validando enlace…</AlertDescription>
            </Alert>
          ) : null}

          {status === 'needsEmail' && (
            <form onSubmit={handleSubmitEmail} className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Ingresa el correo con el que solicitaste el enlace para confirmar tu identidad.
              </p>
              <div className="space-y-2 text-left">
                <Label htmlFor="emailConfirm">Correo</Label>
                <Input
                  id="emailConfirm"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Completar acceso
              </Button>
            </form>
          )}

          {status === 'error' && (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {status === 'completed' && (
            <Alert>
              <AlertDescription>¡Acceso concedido! Redirigiendo a tu panel…</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
