import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import { auth, db } from '@/lib/firebase/config';
import { getApps } from 'firebase/app';
import { collection, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type ServiceStatus = {
  connected: boolean;
  message: string;
  details?: string;
  actionUrl?: string;
};

async function checkFirebaseServices(): Promise<{ auth: ServiceStatus; firestore: ServiceStatus }> {
  const status = {
    auth: { connected: false, message: 'No se pudo verificar el servicio de Autenticación.' },
    firestore: { connected: false, message: 'No se pudo verificar el servicio de Firestore.' },
  };

  try {
    if (getApps().length) {
      // Chequeo de Autenticación
      if (auth.app) {
        status.auth = { connected: true, message: 'El servicio de Autenticación de Firebase funciona correctamente.' };
      }

      // Chequeo de Firestore
      try {
        await getDocs(collection(db, 'health_check'));
        status.firestore = { connected: true, message: 'El servicio de Firestore funciona correctamente.' };
      } catch (error: any) {
        if (error.code === 'permission-denied') {
          status.firestore = {
            connected: true,
            message: 'Conexión con Firestore exitosa, pero se denegó el permiso.',
            details: 'Esto es normal si no has configurado las reglas de seguridad o habilitado la API. Haz clic en el botón para habilitarla si es necesario.',
            actionUrl: `https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`
          };
        } else if (error.code === 'unimplemented' || error.code === 'failed-precondition') {
           status.firestore = {
            connected: true,
            message: 'Conexión con Firestore correcta, pero la API podría no estar habilitada.',
            details: 'El SDK no pudo conectar a Firestore. Usualmente esto significa que la API de Firestore no ha sido habilitada en tu proyecto de Google Cloud. Haz clic en el botón para habilitarla.',
            actionUrl: `https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`
          };
        }
         else {
          throw error;
        }
      }
    }
  } catch (error: any) {
    console.error('Error de conexión con Firebase:', error.code, error.message);
    const errorMessage = `Hubo un problema al conectar con Firebase. Verifica tus credenciales en el archivo .env. Código de error: ${error.code || 'desconocido'}.`;
    if (!status.auth.connected) status.auth.message = errorMessage;
    if (!status.firestore.connected) status.firestore.message = errorMessage;
  }

  return status;
}

export default async function ConexionesPage() {
  const servicesStatus = await checkFirebaseServices();

  const ServiceStatusCard = ({
    title,
    status,
  }: {
    title: string;
    status: ServiceStatus;
  }) => (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-xl font-headline flex items-center justify-between">
          <span>{title}</span>
          <Badge variant={status.connected ? 'default' : 'destructive'}>
            {status.connected ? 'Conectado' : 'Desconectado'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start gap-4">
          {status.connected ? (
            <CheckCircle2 className="h-8 w-8 text-green-500 mt-1 flex-shrink-0" />
          ) : (
            <XCircle className="h-8 w-8 text-destructive mt-1 flex-shrink-0" />
          )}
          <div className="flex-grow">
            <p className="text-muted-foreground">{status.message}</p>
            {status.details && (
              <p className="text-sm text-muted-foreground mt-2">{status.details}</p>
            )}
          </div>
        </div>
        {status.actionUrl && (
          <Button asChild variant="outline" size="sm" className="self-start">
            <Link href={status.actionUrl} target="_blank">
              Habilitar API de Firestore
              <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        )}
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
          <ServiceStatusCard title="Firebase Auth" status={servicesStatus.auth} />
          <ServiceStatusCard title="Firebase Firestore" status={servicesStatus.firestore} />
        </div>
      </div>
    </div>
  );
}
