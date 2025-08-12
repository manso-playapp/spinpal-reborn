'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!auth) {
        const configError = "La configuración de Firebase no está completa. Revisa el archivo .env y la página de conexiones.";
        setError(configError);
        toast({
            variant: "destructive",
            title: "Error de Configuración",
            description: configError,
        });
        setLoading(false);
        return;
    }

    if (!email || !password) {
      setError('Por favor, introduce tu correo y contraseña.');
      setLoading(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/admin');
    } catch (err: any) {
      const errorCode = err.code;
      let friendlyMessage = 'Ha ocurrido un error inesperado.';
      // Updated to include the current error code for wrong credentials
      if (errorCode === 'auth/invalid-credential') {
        friendlyMessage = 'Credenciales incorrectas. Por favor, inténtalo de nuevo.';
      }
      setError(friendlyMessage);
      toast({
        variant: "destructive",
        title: "Error de inicio de sesión",
        description: friendlyMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm shadow-lg">
        <form onSubmit={handleLogin}>
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Admin Login</CardTitle>
            <CardDescription>
              Inicia sesión para gestionar tus juegos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!auth && (
                 <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error de Configuración</AlertTitle>
                    <AlertDescription>
                        Firebase no está configurado. Ve a <Link href="/admin/conexiones" className="font-bold underline">Conexiones</Link> para solucionarlo.
                    </AlertDescription>
                </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading || !auth}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading || !auth}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading || !auth}>
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
