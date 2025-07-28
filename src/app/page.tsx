'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { ArrowRight, Loader2 } from 'lucide-react';
import Logo from '@/components/logo';

function LoginPageContent() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading, isSuperAdmin } = useAuth();
  const [isClientLoading, setIsClientLoading] = React.useState(false);

  React.useEffect(() => {
    if (!loading && user) {
      router.push(isSuperAdmin ? '/admin' : '/client/dashboard');
    }
  }, [user, loading, isSuperAdmin, router]);

  const handleClientLogin = async () => {
    if (!auth) {
      toast({ variant: 'destructive', title: 'Error', description: 'Firebase no está configurado.' });
      return;
    }
    setIsClientLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // The useEffect will handle the redirect after state update
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error de inicio de sesión',
        description: error.message || 'No se pudo iniciar sesión con Google.',
      });
    } finally {
        setIsClientLoading(false);
    }
  };

  if (loading || user) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl border-primary/20">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Logo className="h-20 w-auto text-primary" />
          </div>
          <CardTitle className="font-headline text-3xl">Bienvenido a SpinPal</CardTitle>
          <CardDescription>Selecciona tu tipo de acceso para continuar.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Button asChild size="lg" className="h-12 text-base">
            <Link href="/login">
              Acceso Administrador
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="secondary"
            className="h-12 text-base"
            onClick={handleClientLogin}
            disabled={isClientLoading}
          >
            {isClientLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Iniciando...
              </>
            ) : (
              <>
                Acceso Cliente
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}


export default function Home() {
    return <LoginPageContent />
}
