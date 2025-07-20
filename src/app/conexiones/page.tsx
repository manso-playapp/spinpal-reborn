import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, ExternalLink, ShieldCheck, Database, KeyRound, UserPlus } from 'lucide-react';
import { auth, db } from '@/lib/firebase/config';
import { getApps } from 'firebase/app';
import { collection, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';

type ServiceStatus = {
  connected: boolean;
  message: string;
  details?: string;
  actionUrl?: string;
};

async function checkFirebaseServices(): Promise<{
  auth: ServiceStatus;
  firestore: ServiceStatus;
}> {
  const status = {
    auth: {
      connected: false,
      message: 'No se pudo verificar el servicio de Autenticación.',
    },
    firestore: {
      connected: false,
      message: 'No se pudo verificar el servicio de Firestore.',
    },
  };

  try {
    if (getApps().length > 0 && process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      // Chequeo de Autenticación
      if (auth.app) {
        status.auth = {
          connected: true,
          message:
            'El servicio de Autenticación de Firebase funciona correctamente.',
        };
      }

      // Chequeo de Firestore
      try {
        await getDocs(collection(db, 'health_check'));
        status.firestore = {
          connected: true,
          message: 'El servicio de Firestore funciona correctamente.',
        };
      } catch (error: any) {
        if (error.code === 'permission-denied') {
          status.firestore = {
            connected: true,
            message: 'Conexión con Firestore exitosa, pero se denegó el permiso.',
            details:
              'Esto es normal si no has configurado las reglas de seguridad o habilitado la API. Sigue los pasos de configuración de abajo.',
          };
        } else if (
          error.code === 'unimplemented' ||
          error.code === 'failed-precondition'
        ) {
          status.firestore = {
            connected: true,
            message: 'Conexión correcta, pero la API de Firestore podría no estar habilitada.',
            details:
              'Haz clic en el botón para habilitarla en tu proyecto de Google Cloud.',
            actionUrl: `https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`,
          };
        } else {
          throw error;
        }
      }
    } else {
        const errorMessage = `No has configurado tus credenciales de Firebase en el archivo .env. Por favor, sigue las instrucciones de abajo.`;
        if (!status.auth.connected) status.auth.message = errorMessage;
        if (!status.firestore.connected) status.firestore.message = errorMessage;
    }
  } catch (error: any) {
    console.error('Error de conexión con Firebase:', error.code, error.message);
    const errorMessage = `Hubo un problema al conectar con Firebase. Verifica tus credenciales en el archivo .env. Código de error: ${
      error.code || 'desconocido'
    }.`;
    if (!status.auth.connected) status.auth.message = errorMessage;
    if (!status.firestore.connected) status.firestore.message = errorMessage;
  }

  return status;
}

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

export default async function ConexionesPage() {
  const servicesStatus = await checkFirebaseServices();
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  return (
    <div className="flex min-h-screen flex-col items-center bg-background p-4 sm:p-8">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold font-headline">Estado y Configuración</h1>
          <p className="mt-2 text-muted-foreground">
            Verifica el estado de los servicios y sigue la guía para configurar tu proyecto.
          </p>
        </div>

        <div className="space-y-4">
          <ServiceStatusCard title="Firebase Auth" status={servicesStatus.auth} />
          <ServiceStatusCard title="Firebase Firestore" status={servicesStatus.firestore} />
        </div>

        <Separator />

        <div>
            <h2 className="text-3xl font-bold font-headline text-center mb-6">Guía de Configuración</h2>
            <div className="space-y-8">
                
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><KeyRound/>Paso 1: Configurar Autenticación</CardTitle>
                        <CardDescription>Permite que los administradores inicien sesión en la aplicación.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p>Para que el login de administrador funcione, necesitas habilitar este método de inicio de sesión en Firebase.</p>
                        <Button asChild variant="outline">
                            <Link href={`https://console.firebase.google.com/project/${projectId}/authentication/providers`} target="_blank">
                                Ir a Firebase Auth <ExternalLink className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                        <ul className="list-decimal list-inside space-y-2 pl-4 text-muted-foreground">
                            <li>En la pestaña <strong>"Sign-in method"</strong>, busca y habilita el proveedor <strong>"Correo electrónico/Contraseña"</strong>.</li>
                            <li>Ve a la pestaña <strong>"Users"</strong> y haz clic en <strong>"Add user"</strong>.</li>
                            <li>Introduce un correo y contraseña. Usarás estas credenciales para acceder en <code>/login</code>.</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Database/>Paso 2: Crear Base de Datos Firestore</CardTitle>
                        <CardDescription>Almacena todos los datos de tus juegos y clientes.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p>Firestore es la base de datos que usará tu aplicación.</p>
                         <Button asChild variant="outline">
                            <Link href={`https://console.firebase.google.com/project/${projectId}/firestore`} target="_blank">
                                Ir a Firestore <ExternalLink className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                        <ul className="list-decimal list-inside space-y-2 pl-4 text-muted-foreground">
                            <li>Haz clic en <strong>"Crear base de datos"</strong>.</li>
                            <li>Selecciona <strong>"Iniciar en modo de prueba"</strong>. Esto permite leer y escribir temporalmente, ideal para empezar.</li>
                            <li>Elige una ubicación para tus servidores y haz clic en "Habilitar".</li>
                        </ul>
                    </CardContent>
                </Card>
                
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><ShieldCheck/>Paso 3: Configurar Reglas de Seguridad</CardTitle>
                        <CardDescription>Protege tu base de datos contra accesos no autorizados.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                       <p>Estas reglas aseguran que solo los usuarios autenticados puedan modificar los datos.</p>
                       <Button asChild variant="outline">
                            <Link href={`https://console.firebase.google.com/project/${projectId}/firestore/rules`} target="_blank">
                                Ir a las Reglas de Firestore <ExternalLink className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                        <p>Copia y pega el siguiente código en el editor de reglas de tu consola de Firebase, reemplazando el contenido existente:</p>
                        <pre className="p-4 bg-muted rounded-md text-sm overflow-x-auto"><code>{`rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
  
    // Cualquiera puede leer los juegos
    match /games/{gameId} {
      allow read: if true;
      allow write: if request.auth != null; // Solo admins pueden escribir
    }

    // Cualquiera puede leer los clientes de un juego
    match /games/{gameId}/customers/{customerId} {
      allow read: if true;
      allow create: if true; // Cualquiera puede registrarse
      allow update, delete: if request.auth != null; // Solo admins pueden modificar
    }
    
    // Colección de prueba para verificar la conexión
    match /health_check/{doc} {
        allow read, write: if true;
    }
  }
}`}</code></pre>
                        <p className="text-sm text-muted-foreground">No olvides hacer clic en <strong>"Publicar"</strong> para guardar los cambios.</p>
                    </CardContent>
                </Card>

            </div>
        </div>
      </div>
    </div>
  );
}
