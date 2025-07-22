import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, ExternalLink, ShieldCheck, Database, KeyRound, UserPlus, Sparkles } from 'lucide-react';
import { auth, db } from '@/lib/firebase/config';
import { getApps } from 'firebase/app';
import { collection, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';

type ServiceStatus = {
  connected: boolean;
  message: string;
  details?: string;
  actionUrl?: string;
  isConfigured: 'yes' | 'no' | 'partial';
};

async function checkServices(): Promise<{
  auth: ServiceStatus;
  firestore: ServiceStatus;
  gemini: ServiceStatus;
}> {
  const status = {
    auth: {
      connected: false,
      message: 'No se pudo verificar el servicio de Autenticación.',
      isConfigured: 'no' as const,
    },
    firestore: {
      connected: false,
      message: 'No se pudo verificar el servicio de Firestore.',
      isConfigured: 'no' as const,
    },
    gemini: {
      connected: false,
      message: 'La clave de API de Gemini no está configurada.',
      details: 'Añade tu clave al archivo .env para habilitar las funciones de IA.',
      isConfigured: 'no' as const,
    }
  };

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  // Chequeo de Gemini API Key
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 10) {
      status.gemini = {
        connected: true,
        message: 'La clave de API de Gemini está configurada correctamente.',
        details: '¡Todo listo para integrar funciones de IA en tu aplicación!',
        isConfigured: 'yes',
      };
  }


  if (getApps().length > 0 && process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
    // Chequeo de Autenticación
    if (auth.app) {
      status.auth = {
        connected: true,
        message: 'El servicio de Autenticación de Firebase está conectado correctamente.',
        details: 'Recuerda habilitar el proveedor "Correo/Contraseña" y crear un usuario administrador.',
        isConfigured: 'yes',
      };
    }

    // Chequeo de Firestore
    try {
      const healthCheckRef = doc(db, 'health_check', 'connectivity-test');
      await setDoc(healthCheckRef, { timestamp: new Date() });
      const docSnap = await getDoc(healthCheckRef);
      if (docSnap.exists()){
         status.firestore = {
            connected: true,
            message: 'El servicio de Firestore funciona correctamente.',
            details: 'La base de datos está creada y se puede escribir en ella.',
            isConfigured: 'yes',
          };
      } else {
        throw new Error("Document write failed silently");
      }
    } catch (error: any) {
        const errorMessage = (error.message || '').toLowerCase();
        
        if (errorMessage.includes('firestore api has not been used') || error.code === 'unimplemented' || error.code === 'failed-precondition') {
             status.firestore = {
                connected: false,
                message: 'La API de Firestore no está habilitada en tu proyecto.',
                details: 'Haz clic en el botón para habilitarla en tu proyecto de Google Cloud. Esto puede tardar unos minutos en reflejarse.',
                isConfigured: 'no',
                actionUrl: `https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=${projectId}`,
            };
        } else if (error.code === 'permission-denied') {
            status.firestore = {
                connected: true,
                message: 'Conexión exitosa, pero no se pudo escribir en la base de datos.',
                details: 'Esto es esperado si ya configuraste las reglas de seguridad. Si es la primera vez, crea la base de datos en modo de prueba o ajusta las reglas.',
                isConfigured: 'partial',
                actionUrl: `https://console.firebase.google.com/project/${projectId}/firestore/rules`,
            };
        } else {
            status.firestore = {
                connected: false,
                message: 'No se pudo conectar con Firestore. ¿Creaste la base de datos?',
                details: `Asegúrate de haber creado la base de datos en tu proyecto de Firebase. Si ya la creaste, puede que la API de Firestore no esté habilitada (ver arriba). Código de error: ${error.code || 'desconocido'}.`,
                isConfigured: 'no',
                actionUrl: `https://console.firebase.google.com/project/${projectId}/firestore`
            };
      }
    }
  } else {
      const errorMessage = `No has configurado tus credenciales de Firebase en el archivo .env. Por favor, sigue las instrucciones para obtenerlas.`;
      status.auth = { connected: false, message: errorMessage, isConfigured: 'no' };
      status.firestore = { connected: false, message: errorMessage, isConfigured: 'no' };
  }

  return status;
}

const ServiceStatusCard = ({
  title,
  icon,
  status,
}: {
  title: string;
  icon: React.ReactNode;
  status: ServiceStatus;
}) => (
  <Card className={`shadow-md border-l-4 ${status.isConfigured === 'yes' ? 'border-green-500' : (status.isConfigured === 'partial' ? 'border-yellow-500' : 'border-red-500')}`}>
    <CardHeader>
      <CardTitle className="text-xl font-headline flex items-center justify-between">
        <div className="flex items-center gap-3">
          {icon}
          <span>{title}</span>
        </div>
        <Badge variant={status.connected ? 'default' : 'destructive'} className={status.connected ? 'bg-green-600' : ''}>
          {status.connected ? 'Conectado' : 'Desconectado'}
        </Badge>
      </CardTitle>
    </CardHeader>
    <CardContent className="flex flex-col gap-4">
      <div className="flex items-start gap-4">
        {status.isConfigured === 'yes' ? (
          <CheckCircle2 className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
        ) : (
          <XCircle className={`h-6 w-6 ${status.isConfigured === 'partial' ? 'text-yellow-500' : 'text-destructive'} mt-1 flex-shrink-0`} />
        )}
        <div className="flex-grow">
          <p className="font-semibold">{status.message}</p>
          {status.details && (
            <p className="text-sm text-muted-foreground mt-1">{status.details}</p>

          )}
        </div>
      </div>
      {status.actionUrl && (
        <Button asChild variant="outline" size="sm" className="self-start">
          <Link href={status.actionUrl} target="_blank">
            Ir a la configuración <ExternalLink className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      )}
    </CardContent>
  </Card>
);

export default async function ConexionesPage() {
  const servicesStatus = await checkServices();
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  return (
    <div className="flex min-h-screen flex-col items-center bg-background p-4 sm:p-8">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold font-headline">Estado de Conexiones</h1>
          <p className="mt-2 text-muted-foreground">
            Verifica que todos los servicios estén configurados y funcionando correctamente.
          </p>
        </div>

        <div className="space-y-4">
          <ServiceStatusCard title="Gemini API" icon={<Sparkles />} status={servicesStatus.gemini} />
          <ServiceStatusCard title="Firebase Auth" icon={<UserPlus />} status={servicesStatus.auth} />
          <ServiceStatusCard title="Firebase Firestore" icon={<Database />} status={servicesStatus.firestore} />
        </div>

        <Separator />

        <div>
            <h2 className="text-3xl font-bold font-headline text-center mb-6">Guía de Configuración Inicial</h2>
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
                        <p className="font-bold text-destructive">¡IMPORTANTE! Copia y pega el siguiente código en el editor de reglas de tu consola de Firebase, reemplazando el contenido existente:</p>
                        <pre className="p-4 bg-muted rounded-md text-sm overflow-x-auto"><code>{`rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
  
    match /games/{gameId} {
      allow read: if true;
      // Admins pueden escribir todo el documento (crear, editar, borrar)
      allow write: if request.auth != null; 
      
      // Jugadores (sin autenticar) solo pueden actualizar los campos 'spinRequest' y 'plays'.
      // Se usa hasAll para asegurar que la operación contenga exactamente esos dos campos.
      allow update: if request.auth == null 
                      && request.resource.data.diff(resource.data).affectedKeys().hasAll(['spinRequest', 'plays']);
    }

    match /games/{gameId}/customers/{customerId} {
      allow read: if true;
      allow create: if true; // Cualquiera puede registrarse (crear su propio documento de cliente)
      
      // Admins pueden borrar clientes
      allow delete: if request.auth != null; 
      
      // Jugadores solo pueden actualizar 'hasPlayed' en su propio documento (no implementado aún, pero útil para el futuro)
      // Admins pueden actualizar cualquier campo.
      allow update: if request.auth != null || (request.auth == null && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['hasPlayed']));
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
