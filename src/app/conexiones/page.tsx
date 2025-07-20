import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle } from 'lucide-react';
import { auth, db } from '@/lib/firebase/config';
import { getApps } from 'firebase/app';
import { collection, getDocs } from 'firebase/firestore';

async function checkFirebaseServices() {
  const status = {
    auth: false,
    firestore: false,
  };

  try {
    if (getApps().length) {
      // Intenta usar el servicio de autenticación
      status.auth = !!auth.app;

      // Intenta hacer una consulta simple a Firestore
      await getDocs(collection(db, 'health_check'));
      status.firestore = true;
    }
  } catch (error: any) {
    console.error('Error de conexión con Firebase:', error.code, error.message);
    // Si falla la consulta a firestore pero la app existe, auth puede estar bien.
    if (error.code?.includes('permission-denied') || error.code?.includes('not-found')) {
        // Esto es esperado si la colección no existe o las reglas son estrictas, pero significa que la conexión es correcta.
        status.firestore = true; 
    } else {
        console.error("Error no manejado en chequeo de Firestore:", error);
    }
  }

  return status;
}

export default async function ConexionesPage() {
  const servicesStatus = await checkFirebaseServices();

  const ServiceStatusCard = ({
    title,
    connected,
  }: {
    title: string;
    connected: boolean;
  }) => (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-xl font-headline flex items-center justify-between">
          <span>{title}</span>
          <Badge variant={connected ? 'default' : 'destructive'}>
            {connected ? 'Conectado' : 'Desconectado'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        {connected ? (
          <CheckCircle2 className="h-8 w-8 text-green-500" />
        ) : (
          <XCircle className="h-8 w-8 text-destructive" />
        )}
        <p className="text-muted-foreground">
          {connected
            ? `El servicio ${title} funciona correctamente.`
            : `Hubo un problema al conectar con ${title}. Verifica las credenciales en el archivo .env.`}
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold font-headline">Estado de Conexiones</h1>
          <p className="mt-2 text-muted-foreground">
            Verificación del estado de los servicios integrados.
          </p>
        </div>
        <div className="space-y-4">
          <ServiceStatusCard title="Firebase Auth" connected={servicesStatus.auth} />
          <ServiceStatusCard title="Firebase Firestore" connected={servicesStatus.firestore} />
        </div>
      </div>
    </div>
  );
}
