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
import { useAdminI18n, AdminI18nProvider } from '@/context/AdminI18nContext';

function LoginInner() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { tLogin } = useAdminI18n();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!auth) {
    const configError = tLogin('loginFirebaseConfigError');
    setError(configError);
    toast({
        variant: "destructive",
        title: tLogin('loginConfigTitle'),
        description: configError,
    });
        setLoading(false);
        return;
    }

    if (!email || !password) {
      setError(tLogin('loginMissingFields'));
      setLoading(false);
      return;
    }

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const token = await result.user.getIdToken();
      
      // Guardar el token en una cookie
      document.cookie = `session=${token}; path=/;`;
      
      router.push('/admin');
    } catch (err: any) {
      const errorCode = err.code;
      let friendlyMessage = tLogin('loginUnexpectedError');
      // Updated to include the current error code for wrong credentials
      if (errorCode === 'auth/invalid-credential') {
        friendlyMessage = tLogin('loginInvalidCredentials');
      }
      setError(friendlyMessage);
      toast({
        variant: "destructive",
        title: tLogin('loginErrorTitle'),
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
            <CardTitle className="font-headline text-2xl">{tLogin('loginTitle')}</CardTitle>
            <CardDescription>
              {tLogin('loginSubtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!auth && (
                 <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{tLogin('loginConfigTitle')}</AlertTitle>
                    <AlertDescription>
                        {tLogin('loginConfigDescription')} <Link href="/admin/conexiones" className="font-bold underline">Conexiones</Link>
                    </AlertDescription>
                </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">{tLogin('loginEmailLabel')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={tLogin('loginEmailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading || !auth}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{tLogin('loginPasswordLabel')}</Label>
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
              {loading ? tLogin('loginLoading') : tLogin('loginSubmit')}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <AdminI18nProvider>
      <LoginInner />
    </AdminI18nProvider>
  );
}
