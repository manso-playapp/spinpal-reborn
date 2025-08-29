'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Logo from '@/components/logo';
import { Skeleton } from '@/components/ui/skeleton';

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-5 w-5" {...props}>
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.574l6.19 5.238C39.712 36.083 44 30.638 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
);


export default function ClientLoginPage() {
    const { user, loading, signInWithGoogle, userRole } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && user) {
            const targetRoute = userRole.isSuperAdmin ? '/admin' : '/client/dashboard';
            router.replace(targetRoute);
        }
    }, [user, loading, router, userRole.isSuperAdmin]);

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
        <Card className="w-full max-w-sm shadow-lg">
            <CardHeader className="text-center">
                 <div className="mx-auto mb-4">
                    <Logo className="h-16 w-auto text-primary" />
                </div>
                <CardTitle className="font-headline text-2xl">Acceso para Clientes</CardTitle>
                <CardDescription>
                Inicia sesión con tu cuenta de Google para gestionar tus campañas.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button onClick={signInWithGoogle} size="lg" className="w-full h-12 text-base">
                    <GoogleIcon className="mr-3"/>
                    Iniciar Sesión con Google
                </Button>
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
