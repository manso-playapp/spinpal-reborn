

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, ExternalLink, ShieldCheck, Database, KeyRound, UserPlus, Sparkles, Mail, ShieldAlert, Image as ImageIcon, Info, HelpCircle, GitBranch, Server } from 'lucide-react';
import { auth, db } from '@/lib/firebase/config';
import { getApps } from 'firebase/app';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { Resend } from 'resend';
import TestEmailSender from '@/components/admin/TestEmailSender';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import packageJson from '../../../package.json';

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
  resend: ServiceStatus;
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
      details: 'Añade tu clave al archivo .env para habilitar las funciones de IA. Puedes obtenerla gratis desde Google AI Studio.',
      isConfigured: 'no' as const,
      actionUrl: 'https://aistudio.google.com/app/apikey'
    },
    resend: {
        connected: false,
        message: 'La clave de API de Resend no está configurada.',
        details: 'Añade tu clave al archivo .env para habilitar el envío de correos.',
        isConfigured: 'no' as const,
        actionUrl: 'https://resend.com/docs/introduction'
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
        actionUrl: 'https://aistudio.google.com/app/apikey'
      };
  }

  // Chequeo de Resend API Key
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
        const resend = new Resend(resendApiKey);
        const { data, error } = await resend.domains.list();
        if (error) throw error;
        
        status.resend = {
            connected: true,
            message: 'La API de Resend está conectada y funcionando.',
            details: `Se encontraron ${data.length} dominios verificados. ¡Asegúrate de que el remitente que uses sea uno de ellos!`,
            isConfigured: 'yes',
            actionUrl: 'https://resend.com/domains'
        }
    } catch (error: any) {
         status.resend = {
            connected: false,
            message: 'Error al verificar la clave de API de Resend.',
            details: 'La clave parece ser incorrecta o no tiene los permisos necesarios para leer dominios. Por favor, revisa tu clave en el panel de Resend.',
            isConfigured: 'no',
            actionUrl: 'https://resend.com/api-keys'
        }
    }
  }


  if (getApps().length > 0 && process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
    // Chequeo de Autenticación
    if (auth?.app) {
      status.auth = {
        connected: true,
        message: 'El servicio de Autenticación de Firebase está conectado correctamente.',
        details: 'Recuerda habilitar los proveedores de inicio de sesión que necesites.',
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
      const commonError = {
        connected: false,
        message: 'No has configurado tus credenciales de Firebase en el archivo .env.',
        details: 'Copia tus credenciales desde la consola de Firebase al archivo .env para conectar la aplicación.',
        isConfigured: 'no' as const,
        actionUrl: `https://console.firebase.google.com/project/_/settings/general/`
      };
      status.auth = commonError;
      status.firestore = commonError;
  }

  return status;
}

const ServiceStatusCard = ({
  title,
  icon,
  status,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  status: ServiceStatus;
  children?: React.ReactNode;
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
      {children}
      {status.actionUrl && (
        <Button asChild variant="outline" size="sm" className="self-start mt-2">
          <Link href={status.actionUrl} target="_blank">
            Ir a la configuración <ExternalLink className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      )}
    </CardContent>
  </Card>
);

const ConnectionStatusTable = ({ isFirestoreConnected, connectedProjectId }: { isFirestoreConnected: boolean, connectedProjectId?: string | null }) => {
    const projects = {
        spinPalReborn: { name: "SpinPal Reborn", id: "spinpal-reborn", number: "824009813017" },
        ruleta: { name: "Ruleta", id: "ruleta-414418", number: "826559679868" }
    };
    
    const githubRepoUrl = packageJson.repository.url || '';

    const connections = {
        firebaseStudio: {
            serviceName: "Firebase Studio",
            description: "El entorno donde se edita el código.",
            ruleta: { status: 'positive' as const, text: 'Conectado' },
            spinPalReborn: { status: 'negative' as const, text: 'No conectado' }
        },
        firestore: {
            serviceName: "Firestore / Auth / Storage",
            description: "La base de datos y autenticación que usa la app.",
            ruleta: { 
                status: isFirestoreConnected && connectedProjectId === projects.ruleta.id ? 'positive' as const : 'negative' as const,
                text: isFirestoreConnected && connectedProjectId === projects.ruleta.id ? 'Conectado' : 'No conectado'
            },
            spinPalReborn: { 
                status: isFirestoreConnected && connectedProjectId === projects.spinPalReborn.id ? 'positive' as const : 'negative' as const,
                text: isFirestoreConnected && connectedProjectId === projects.spinPalReborn.id ? 'Conectado' : 'No conectado'
            },
        },
        appHosting: {
            serviceName: "App Hosting (Vercel/Netlify/etc)",
            description: "Dónde está desplegada la versión pública de la app.",
            ruleta: { status: 'neutral' as const, text: 'Desconocido' },
            spinPalReborn: { status: 'neutral' as const, text: 'Desconocido' },
        },
        github: {
            serviceName: "Repositorio de GitHub",
            description: "Dónde se guarda el código fuente.",
            ruleta: { 
                status: githubRepoUrl.includes(projects.ruleta.id) || githubRepoUrl.includes('manso-playapp/ruleta') ? 'positive' as const : 'negative' as const,
                text: githubRepoUrl.includes(projects.ruleta.id) || githubRepoUrl.includes('manso-playapp/ruleta') ? 'Conectado' : 'No conectado'
            },
            spinPalReborn: { 
                status: githubRepoUrl.includes(projects.spinPalReborn.id) ? 'positive' as const : 'negative' as const,
                text: githubRepoUrl.includes(projects.spinPalReborn.id) ? 'Conectado' : 'No conectado'
            }
        },
         gemini: {
            serviceName: "Gemini API (IA)",
            description: "Servicio de IA para funciones inteligentes.",
            ruleta: { status: 'neutral' as const, text: 'Independiente' },
            spinPalReborn: { status: 'neutral' as const, text: 'Independiente' },
        },
        resend: {
            serviceName: "Resend API (Emails)",
            description: "Servicio para envío de correos de premios.",
            ruleta: { status: 'neutral' as const, text: 'Independiente' },
            spinPalReborn: { status: 'neutral' as const, text: 'Independiente' },
        }
    };

    const StatusCell = ({ status, text }: { status: 'positive' | 'negative' | 'neutral', text: string }) => {
        const baseClasses = "flex items-center justify-center gap-1.5 p-2 text-xs font-semibold rounded-md";
        if (status === 'positive') {
            return <div className={`${baseClasses} bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300`}><CheckCircle2 className="h-3.5 w-3.5"/>{text}</div>;
        }
        if (status === 'negative') {
            return <div className={`${baseClasses} bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300`}><XCircle className="h-3.5 w-3.5"/>{text}</div>;
        }
        return <div className={`${baseClasses} bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400`}>{text}</div>;
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Info /> Auditoría de Conexiones de Proyecto</CardTitle>
                <CardDescription>Esta tabla muestra qué servicio está conectado a qué proyecto. El objetivo es unificar todo bajo un solo proyecto.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table className="min-w-full divide-y divide-border">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-1/3">Servicio</TableHead>
                                <TableHead className="text-center">{projects.spinPalReborn.name} <Badge variant="outline">{projects.spinPalReborn.number}</Badge></TableHead>
                                <TableHead className="text-center">{projects.ruleta.name} <Badge variant="outline">{projects.ruleta.number}</Badge></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-border">
                            {Object.values(connections).map(conn => (
                                <TableRow key={conn.serviceName}>
                                    <TableCell>
                                        <p className="font-medium">{conn.serviceName}</p>
                                        <p className="text-xs text-muted-foreground">{conn.description}</p>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <StatusCell status={conn.spinPalReborn.status} text={conn.spinPalReborn.text} />
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <StatusCell status={conn.ruleta.status} text={conn.ruleta.text} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                 <Alert className="mt-4 border-blue-500/50 text-blue-800 dark:border-blue-500/60 dark:text-blue-300 dark:bg-blue-900/20">
                    <HelpCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <AlertTitle className="text-blue-700 dark:text-blue-300">Conclusión del Diagnóstico</AlertTitle>
                    <AlertDescription>
                        Los datos muestran que el desarrollo principal (Studio, Base de Datos, Código Fuente) está **conectado al proyecto "Ruleta"**. Esto confirma que "Ruleta" es nuestro proyecto principal y de producción. El proyecto "SpinPal Reborn" fue un entorno de prueba que ya no necesitamos. **No es necesaria ninguna migración de datos.** Nuestro objetivo ahora es asegurarnos de que el código y la configuración del proyecto "Ruleta" estén completamente actualizados y funcionando.
                    </AlertDescription>
                </Alert>
            </CardContent>
        </Card>
    );
}

export default async function ConexionesPage() {
  const servicesStatus = await checkServices();
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const isFirestoreConnected = servicesStatus.firestore.isConfigured === 'yes' || servicesStatus.firestore.isConfigured === 'partial';

  return (
    <div className="flex min-h-screen flex-col items-center bg-background p-4 sm:p-8">
      <div className="w-full max-w-5xl space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold font-headline">Estado de Conexiones</h1>
          <p className="mt-2 text-muted-foreground">
            Verifica que todos los servicios estén configurados y funcionando correctamente.
          </p>
        </div>

        <ConnectionStatusTable isFirestoreConnected={isFirestoreConnected} connectedProjectId={projectId}/>

        <div className="grid md:grid-cols-2 gap-4">
          <ServiceStatusCard title="Firebase Auth & Firestore" icon={<Database />} status={servicesStatus.firestore} />
          <ServiceStatusCard title="Gemini API (IA)" icon={<Sparkles />} status={servicesStatus.gemini} />
        </div>
        
        <ServiceStatusCard title="Resend API (Emails)" icon={<Mail />} status={servicesStatus.resend}>
          {servicesStatus.resend.isConfigured === 'yes' && (
              <div className="mt-4 pt-4 border-t">
                  <TestEmailSender />
              </div>
          )}
        </ServiceStatusCard>

        <Separator />

        <div>
            <h2 className="text-3xl font-bold font-headline text-center mb-6">Guía de Configuración Inicial</h2>
            <div className="space-y-8">

                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><KeyRound/>Paso 0: Credenciales de Firebase (.env)</CardTitle>
                        <CardDescription>Conecta tu aplicación con tu proyecto de Firebase.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p>Para que la aplicación pueda funcionar, necesitas obtener tus credenciales de Firebase y pegarlas en el archivo <code>.env</code> que se encuentra en la raíz de tu proyecto.</p>
                        <Button asChild variant="outline">
                            <Link href={`https://console.firebase.google.com/project/${projectId || '_'}/settings/general`} target="_blank">
                                Ir a la Configuración del Proyecto en Firebase <ExternalLink className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                        <ul className="list-decimal list-inside space-y-2 pl-4 text-muted-foreground">
                            <li>En la consola de Firebase, ve a la "Configuración del Proyecto" (el ícono del engranaje).</li>
                            <li>En la pestaña "General", baja hasta la sección "Tus apps".</li>
                            <li>Busca tu aplicación web y haz clic en el botón de opción "Configuración" y selecciona el formato **"CDN"**.</li>
                            <li>Verás un objeto de configuración. Copia los valores y pégalos en las variables correspondientes del archivo <code>.env</code>.</li>
                        </ul>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><UserPlus/>Paso 1: Configurar Autenticación</CardTitle>
                        <CardDescription>Permite que los administradores y clientes inicien sesión.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p>Para que el login funcione, necesitas habilitar los métodos de inicio de sesión en Firebase.</p>
                        <Button asChild variant="outline">
                            <Link href={`https://console.firebase.google.com/project/${projectId || '_'}/authentication/providers`} target="_blank">
                                Ir a Firebase Auth <ExternalLink className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                        <ul className="list-decimal list-inside space-y-2 pl-4 text-muted-foreground">
                            <li>En la pestaña <strong>"Sign-in method"</strong>, busca y habilita <strong>"Correo electrónico/Contraseña"</strong> (para el admin) y <strong>"Google"</strong> (para los clientes).</li>
                            <li>Ve a la pestaña <strong>"Users"</strong> y haz clic en <strong>"Add user"</strong> para crear tu usuario administrador.</li>
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
                            <Link href={`https://console.firebase.google.com/project/${projectId || '_'}/firestore`} target="_blank">
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
                        <CardTitle className="flex items-center gap-2"><ShieldCheck/>Paso 3: Configurar Reglas de Seguridad de Firestore</CardTitle>
                        <CardDescription>Protege tu base de datos contra accesos no autorizados.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                       <p>Estas reglas aseguran que solo los usuarios autorizados puedan modificar los datos.</p>
                       <Button asChild variant="outline">
                            <Link href={`https://console.firebase.google.com/project/${projectId || '_'}/firestore/rules`} target="_blank">
                                Ir a las Reglas de Firestore <ExternalLink className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                        <p className="font-bold text-destructive">¡IMPORTANTE! Copia y pega el siguiente código en el editor de reglas de tu consola de Firebase, reemplazando el contenido existente:</p>
                        <pre className="p-4 bg-muted rounded-md text-sm overflow-x-auto"><code>{`rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function isSuperAdmin() {
      return request.auth != null && request.auth.token.email == 'grupomanso@gmail.com';
    }

    function isGameClient(gameId) {
      return request.auth != null && request.auth.token.email == get(/databases/$(database)/documents/games/$(gameId)).data.clientEmail;
    }

    match /games/{gameId} {
      allow read: if true;
      allow create, delete: if isSuperAdmin();
      allow update: if
            isSuperAdmin() ||
            (isGameClient(gameId) && request.resource.data.clientEmail == resource.data.clientEmail) ||
            (request.auth == null && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['plays', 'prizesAwarded', 'spinRequest', 'lastResult']));
    }

    match /games/{gameId}/customers/{customerId} {
      allow read: if isSuperAdmin() || isGameClient(gameId) || request.auth == null;
      allow create: if true;
      allow delete: if isSuperAdmin() || isGameClient(gameId);
      allow update: if isSuperAdmin() || isGameClient(gameId) ||
                    (request.auth == null && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['hasPlayed', 'prizeWonName', 'prizeWonAt']));
    }

    match /outbound_emails/{emailId} {
      allow create: if true;
      allow read, delete: if isSuperAdmin();
    }

    match /health_check/{doc} {
      allow read, write: if true;
    }
  }
}`}</code></pre>
                        <p className="text-sm text-muted-foreground">No olvides hacer clic en <strong>"Publicar"</strong> para guardar los cambios.</p>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><ImageIcon/>Paso 3.5: Configurar Reglas de Storage</CardTitle>
                        <CardDescription>Protege la subida de archivos para que solo tú y tus clientes podáis subir imágenes a vuestros juegos.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                       <p>Estas reglas son cruciales para asegurar que solo los usuarios autorizados (el super admin o el cliente dueño del juego) puedan subir o borrar imágenes, mientras que cualquier persona puede verlas (necesario para el juego).</p>
                       <Button asChild variant="outline">
                            <Link href={`https://console.firebase.google.com/project/${projectId || '_'}/storage/rules`} target="_blank">
                                Ir a las Reglas de Storage <ExternalLink className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                        <p className="font-bold text-destructive">¡IMPORTANTE! Copia y pega el siguiente código en el editor de reglas de tu consola de Firebase Storage:</p>
                        <pre className="p-4 bg-muted rounded-md text-sm overflow-x-auto"><code>{`rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    
    // Función para verificar si el usuario es el Super Administrador
    function isSuperAdmin() {
      return request.auth != null && request.auth.token.email == 'grupomanso@gmail.com';
    }

    // Función para verificar si el usuario es el cliente dueño del juego
    function isGameClient(gameId) {
      return request.auth != null && request.auth.token.email == get(/databases/(default)/documents/games/$(gameId)).data.clientEmail;
    }

    // Permite la lectura pública de cualquier archivo.
    // Esto es necesario para que las imágenes se puedan mostrar en el juego y el editor.
    match /{allPaths=**} {
      allow read;
    }

    // Solo permite la escritura (subida, actualización, eliminación)
    // a los usuarios que estén autorizados para el juego específico.
    match /games/{gameId}/{allPaths=**} {
      allow write: if isSuperAdmin() || isGameClient(gameId);
    }
  }
}`}</code></pre>
                        <p className="text-sm text-muted-foreground">No olvides hacer clic en <strong>"Publicar"</strong> para guardar los cambios.</p>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Mail/>Paso 4: Verificar Dominio de Envío de Emails (DKIM)</CardTitle>
                        <CardDescription>Asegura que tus correos no lleguen a la carpeta de spam.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                       <p>Para que Resend pueda enviar correos en tu nombre, debes demostrar que eres el dueño del dominio (ej: `tuempresa.com`). Sin este paso, los correos se enviarán desde `onboarding@resend.dev` y es muy probable que sean marcados como spam.</p>
                       <Button asChild variant="outline">
                            <Link href="https://resend.com/domains" target="_blank">
                                Ir a Dominios en Resend <ExternalLink className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                        <ul className="list-decimal list-inside space-y-2 pl-4 text-muted-foreground">
                            <li>Haz clic en <strong>"Add Domain"</strong> e introduce tu dominio.</li>
                            <li>Resend te dará unos registros DNS que deberás añadir en la configuración de tu proveedor de dominio (GoDaddy, Namecheap, DONWEB, etc.).</li>
                            <li className='font-bold text-card-foreground'>
                                <strong>¡Atención Proveedores como DONWEB!</strong> Si el panel de tu dominio no acepta un nombre de host como `send` o `resend._domainkey`, es porque espera el nombre completo. Debes construirlo tú mismo:
                                <ul className="list-disc list-inside pl-6 mt-2 font-normal">
                                    <li>Si Resend pide un registro <strong>CNAME</strong> con el host `send`, en tu panel debes poner `send.tudominio.com`.</li>
                                    <li>Si Resend pide un registro <strong>TXT</strong> con el host `resend._domainkey`, en tu panel debes poner `resend._domainkey.tudominio.com`.</li>
                                </ul>
                            </li>
                            <li>Una vez que Resend detecte los cambios (puede tardar unas horas), tu dominio aparecerá como "Verified".</li>
                            <li>**Importante:** Después de verificar, actualiza la dirección del remitente en el código (`src/ai/flows/prize-notification-flow.ts`) a un correo de tu dominio verificado (ej: `noreply@tuempresa.com`).</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><ShieldAlert/>Paso 5: Configurar DMARC para Evitar la Carpeta de Spam</CardTitle>
                        <CardDescription>Este es el paso final y crucial para una buena entrega de correos.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                       <p>Aunque tu dominio esté verificado (Paso 4, que configura DKIM), los proveedores como Gmail necesitan una política DMARC para confiar plenamente en tus correos. Sin esto, es muy probable que terminen en spam.</p>
                       <p>Debes añadir un registro DNS más en tu proveedor de dominio (DONWEB, etc.):</p>
                       <div className="p-4 bg-muted rounded-md text-sm space-y-2">
                           <p><strong>Tipo de Registro:</strong> <code>TXT</code></p>
                           <p><strong>Host / Nombre:</strong> <code>_dmarc.tudominio.com</code> (¡Recuerda, usa tu dominio!)</p>
                           <p><strong>Valor:</strong> <code>v=DMARC1; p=none;</code></p>
                       </div>
                       <ul className="list-disc list-inside space-y-2 pl-4 text-muted-foreground">
                            <li>El valor <code>p=none</code> le dice a los servidores de correo que no tomen ninguna acción si un correo falla la verificación, pero que te empiecen a enviar reportes. Es la forma más segura de empezar.</li>
                            <li>Una vez que lo configures, la entrega a la bandeja de entrada debería mejorar drásticamente.</li>
                       </ul>
                    </CardContent>
                </Card>
            </div>
        </div>
      </div>
    </div>
  );
}
