'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Logo from '@/components/logo';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase/config';
import { Eye, EyeOff } from 'lucide-react';

export default function ClientLoginPage() {
  const { user, loading, userRole } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      const targetRoute = userRole.isSuperAdmin ? '/admin' : '/client/dashboard';
      router.replace(targetRoute);
    }
  }, [user, loading, router, userRole.isSuperAdmin]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!auth) {
      toast({
        variant: 'destructive',
        title: 'Firebase no configurado',
        description: 'Revisa las variables NEXT_PUBLIC_FIREBASE_* en tu entorno.',
      });
      return;
    }

    try {
      setSubmitting(true);
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace('/client/dashboard');
    } catch (error: any) {
      console.error('Error al iniciar sesión:', error);
      toast({
        variant: 'destructive',
        title: 'No pudimos iniciar sesión',
        description: error?.message || 'Verifica el usuario y la contraseña.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!auth) {
      toast({
        variant: 'destructive',
        title: 'Firebase no configurado',
        description: 'Revisa las variables NEXT_PUBLIC_FIREBASE_* en tu entorno.',
      });
      return;
    }

    if (!email.trim()) {
      toast({
        variant: 'destructive',
        title: 'Escribe el email',
        description: 'Necesitamos el correo para poder enviarte el enlace de recuperación.',
      });
      return;
    }

    try {
      setResetting(true);
      await sendPasswordResetEmail(auth, email.trim());
      toast({
        title: 'Revisa tu correo',
        description: 'Te enviamos un enlace para restablecer la contraseña.',
      });
    } catch (error: any) {
      console.error('Error al enviar reset:', error);
      toast({
        variant: 'destructive',
        title: 'No pudimos enviar el correo',
        description: error?.message || 'Intenta nuevamente en unos minutos.',
      });
    } finally {
      setResetting(false);
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
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Logo className="h-16 w-auto text-primary" />
          </div>
          <CardTitle className="font-headline text-2xl">Acceso para Clientes</CardTitle>
          <CardDescription>
            Inicia sesión con el usuario y la contraseña que recibiste por correo. Si la olvidaste, puedes
            solicitar un enlace de recuperación.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="flex gap-2">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowPassword(!showPassword)}
                  className="px-3"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Ingresando…' : 'Ingresar'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button
            type="button"
            variant="link"
            className="text-sm"
            onClick={handleResetPassword}
            disabled={resetting}
          >
            {resetting ? 'Enviando enlace…' : '¿Olvidaste tu contraseña?'}
          </Button>
          <Button variant="link" asChild className="text-xs">
            <Link href="/">Volver</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
