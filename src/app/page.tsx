import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import Logo from '@/components/logo';

export default function Home() {
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
                    <Button asChild size="lg" variant="secondary" className="h-12 text-base">
                        <Link href="/client/login">
                           Acceso Cliente
                           <ArrowRight className="ml-2 h-5 w-5" />
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
