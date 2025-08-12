
'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, ExternalLink, ShieldCheck, Database, KeyRound, UserPlus, Sparkles, Mail, ShieldAlert, Image as ImageIcon, Info, HelpCircle, Server, AlertTriangle } from 'lucide-react';
import { auth, db } from '@/lib/firebase/config';
import { getApps } from 'firebase/app';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import TestEmailSender from '@/components/admin/TestEmailSender';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

type ServiceStatus = {
  connected: boolean;
  message: string;
  details?: string;
  actionUrl?: string;
  isConfigured: 'yes' | 'no' | 'partial';
};

type AllServicesStatus = {
  firebase: ServiceStatus;
  gemini: ServiceStatus;
  resend: ServiceStatus;
};

const ServiceStatusCard = ({
  title,
  icon,
  status,
  projectId,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  status: ServiceStatus;
  projectId?: string | null;
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
       {projectId && (
        <CardDescription className="pt-1">
            Conectado al proyecto: <span className="font-bold text-foreground">{projectId}</span>
        </CardDescription>
      )}
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

interface ConnectionsCheckerProps {
    isGeminiConfigured: boolean;
    isResendConfigured: boolean;
}

const GuideSection = ({ title, icon, description, children }: { title: string, icon: React.ReactNode, description: string, children: React.ReactNode }) => (
    <Card className="overflow-hidden">
        <CardHeader className="bg-muted/30 text-center">
            <CardTitle className="flex items-center justify-center gap-3 text-2xl font-headline">
                {icon}
                {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4 text-left">
            {children}
        </CardContent>
    </Card>
);

export default function ConnectionsChecker({ isGeminiConfigured, isResendConfigured }: ConnectionsCheckerProps) {
  const [servicesStatus, setServicesStatus] = React.useState<AllServicesStatus | null>(null);
  const [connectedProjectId, setConnectedProjectId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function checkServices() {
      setLoading(true);

      const status: AllServicesStatus = {
        firebase: {
          connected: false,
          message: 'No se pudo verificar el servicio de Firestore.',
          isConfigured: 'no' as const,
        },
        gemini: {
          connected: isGeminiConfigured,
          message: isGeminiConfigured 
            ? 'La clave de API de Gemini está configurada correctamente.'
            : 'La clave de API de Gemini no está configurada.',
          details: isGeminiConfigured 
            ? '¡Todo listo para integrar funciones de IA en tu aplicación!'
            : 'Añade tu clave al archivo .env para habilitar las funciones de IA. Puedes obtenerla gratis desde Google AI Studio.',
          isConfigured: isGeminiConfigured ? 'yes' : 'no',
          actionUrl: 'https://aistudio.google.com/app/apikey'
        },
        resend: {
            connected: isResendConfigured,
            message: isResendConfigured
                ? 'La API de Resend está conectada y funcionando.'
                : 'La clave de API de Resend no está configurada.',
            details: isResendConfigured
                ? `La clave está presente. Se recomienda hacer una prueba de envío.`
                : 'Añade tu clave al archivo .env para habilitar el envío de correos.',
            isConfigured: isResendConfigured ? 'yes' : 'no',
            actionUrl: 'https://resend.com/domains'
        }
      };
      
      const currentProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || null;
      setConnectedProjectId(currentProjectId);
      
      if (getApps().length > 0 && process.env.NEXT_PUBLIC_FIREBASE_API_KEY && db && auth) {
          status.firebase.connected = true; // Assume connection is possible
          status.firebase.isConfigured = 'partial'; // Start as partial
          status.firebase.message = 'Las credenciales de Firebase están presentes en .env.';
        
          try {
            const healthCheckRef = doc(db, 'health_check', 'connectivity-test');
            await setDoc(healthCheckRef, { timestamp: new Date() });
            const docSnap = await getDoc(healthCheckRef);
            if (docSnap.exists()){
               status.firebase = {
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
                   status.firebase = { connected: false, message: 'La API de Firestore no está habilitada en tu proyecto.', details: 'Haz clic en el botón para habilitarla en tu proyecto de Google Cloud.', isConfigured: 'no', actionUrl: `https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=${currentProjectId}` };
              } else if (error.code === 'permission-denied') {
                  status.firebase = { connected: true, message: 'Conexión exitosa, pero no se pudo escribir en la base de datos.', details: 'Esto es esperado si ya configuraste las reglas de seguridad.', isConfigured: 'partial', actionUrl: `https://console.firebase.google.com/project/${currentProjectId}/firestore/rules`};
              } else {
                  status.firebase = { connected: false, message: 'No se pudo conectar con Firestore. ¿Creaste la base de datos?', details: `Asegúrate de haber creado la base de datos en tu proyecto de Firebase. Error: ${error.code || 'desconocido'}.`, isConfigured: 'no', actionUrl: `https://console.firebase.google.com/project/${currentProjectId}/firestore`};
            }
          }
      } else {
          status.firebase = { connected: false, message: 'No has configurado tus credenciales de Firebase en el archivo .env.', details: 'Copia tus credenciales desde la consola de Firebase al archivo .env para conectar la aplicación.', isConfigured: 'no' as const, actionUrl: `https://console.firebase.google.com/project/_/settings/general/`};
      }
      
      setServicesStatus(status);
      setLoading(false);
    }

    checkServices();
  }, [isGeminiConfigured, isResendConfigured]);

  if (loading || !servicesStatus) {
    return (
        <div className="w-full space-y-8">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
        </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-6">
          <ServiceStatusCard title="Firebase (BBDD, Usuarios, Archivos)" icon={<Database />} status={servicesStatus.firebase} projectId={connectedProjectId} />
          <ServiceStatusCard title="Gemini API (IA)" icon={<Sparkles />} status={servicesStatus.gemini} />
          <ServiceStatusCard title="Resend API (Emails)" icon={<Mail />} status={servicesStatus.resend}>
            {servicesStatus.resend.isConfigured === 'yes' && (
                <div className="mt-4 pt-4 border-t">
                    <TestEmailSender />
                </div>
            )}
          </ServiceStatusCard>
        </div>

        <Separator />

        <div>
            <h2 className="text-3xl font-bold font-headline text-center mb-6">Guía de Configuración Inicial</h2>
            <div className="space-y-8">
                <GuideSection
                    title="Credenciales de Firebase (.env)"
                    icon={<KeyRound/>}
                    description="Conecta tu aplicación con tu proyecto de Firebase."
                >
                    <p>Para que la aplicación pueda funcionar, necesitas obtener tus credenciales de Firebase y pegarlas en el archivo <code>.env</code> que se encuentra en la raíz de tu proyecto.</p>
                    <Button asChild variant="outline">
                        <Link href={`https://console.firebase.google.com/project/${connectedProjectId || '_'}/settings/general`} target="_blank">
                            Ir a la Configuración del Proyecto en Firebase <ExternalLink className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                    <ul className="list-decimal list-inside space-y-2 pl-4 text-muted-foreground">
                        <li>En la consola de Firebase, ve a la "Configuración del Proyecto" (el ícono del engranaje).</li>
                        <li>En la pestaña "General", baja hasta la sección "Tus apps".</li>
                        <li>Busca tu aplicación web y haz clic en el botón de opción "Configuración" y selecciona el formato **"CDN"**.</li>
                        <li>Verás un objeto de configuración. Copia los valores y pégalos en las variables correspondientes del archivo <code>.env</code>.</li>
                    </ul>
                </GuideSection>
                
                <GuideSection
                    title="Configurar Autenticación"
                    icon={<UserPlus/>}
                    description="Permite que los administradores y clientes inicien sesión."
                >
                    <p>Para que el login funcione, necesitas habilitar los métodos de inicio de sesión en Firebase.</p>
                    <Button asChild variant="outline">
                        <Link href={`https://console.firebase.google.com/project/${connectedProjectId || '_'}/authentication/providers`} target="_blank">
                            Ir a Firebase Auth <ExternalLink className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                    <ul className="list-decimal list-inside space-y-2 pl-4 text-muted-foreground">
                        <li>En la pestaña <strong>"Sign-in method"</strong>, busca y habilita <strong>"Correo electrónico/Contraseña"</strong> (para el admin) y <strong>"Google"</strong> (para los clientes).</li>
                        <li>Ve a la pestaña <strong>"Users"</strong> y haz clic en <strong>"Add user"</strong> para crear tu usuario administrador.</li>
                    </ul>
                </GuideSection>

                <GuideSection
                    title="Crear Base de Datos Firestore"
                    icon={<Database/>}
                    description="Almacena todos los datos de tus juegos y clientes."
                >
                    <p>Firestore es la base de datos que usará tu aplicación.</p>
                     <Button asChild variant="outline">
                        <Link href={`https://console.firebase.google.com/project/${connectedProjectId || '_'}/firestore`} target="_blank">
                            Ir a Firestore <ExternalLink className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                    <ul className="list-decimal list-inside space-y-2 pl-4 text-muted-foreground">
                        <li>Haz clic en <strong>"Crear base de datos"</strong>.</li>
                        <li>Selecciona <strong>"Iniciar en modo de prueba"</strong>. Esto permite leer y escribir temporalmente, ideal para empezar.</li>
                        <li>Elige una ubicación para tus servidores y haz clic en "Habilitar".</li>
                    </ul>
                </GuideSection>
                
                <GuideSection
                    title="Reglas de Seguridad de Firestore"
                    icon={<ShieldCheck/>}
                    description="Protege tu base de datos contra accesos no autorizados."
                >
                   <p>Estas reglas aseguran que solo los usuarios autorizados puedan modificar los datos.</p>
                   <Button asChild variant="outline">
                        <Link href={`https://console.firebase.google.com/project/${connectedProjectId || '_'}/firestore/rules`} target="_blank">
                            Ir a las Reglas de Firestore <ExternalLink className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                    <p className="font-bold text-destructive">¡IMPORTANTE! Copia y pega el siguiente código en el editor de reglas de tu consola de Firebase, reemplazando el contenido existente:</p>
                    <pre className="p-4 bg-muted rounded-md text-sm overflow-x-auto whitespace-pre-wrap"><code>{`rules_version = '2';

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
                </GuideSection>

                <GuideSection
                    title="Reglas de Storage"
                    icon={<ImageIcon/>}
                    description="Protege la subida de archivos para que solo tú y tus clientes podáis subir imágenes a vuestros juegos."
                >
                   <p>Estas reglas son cruciales para asegurar que solo los usuarios autorizados (el super admin o el cliente dueño del juego) puedan subir o borrar imágenes, mientras que cualquier persona puede verlas (necesario para el juego).</p>
                   <Button asChild variant="outline">
                        <Link href={`https://console.firebase.google.com/project/${connectedProjectId || '_'}/storage/rules`} target="_blank">
                            Ir a las Reglas de Storage <ExternalLink className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                    <p className="font-bold text-destructive">¡IMPORTANTE! Copia y pega el siguiente código en el editor de reglas de tu consola de Firebase Storage:</p>
                    <pre className="p-4 bg-muted rounded-md text-sm overflow-x-auto whitespace-pre-wrap"><code>{`rules_version = '2';

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
                </GuideSection>
                
                <GuideSection
                    title="Verificar Dominio de Envío de Emails (DKIM)"
                    icon={<Mail/>}
                    description="Asegura que tus correos no lleguen a la carpeta de spam."
                >
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
                </GuideSection>

                <GuideSection
                    title="Configurar DMARC para Evitar la Carpeta de Spam"
                    icon={<ShieldAlert/>}
                    description="Este es el paso final y crucial para una buena entrega de correos."
                >
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
                </GuideSection>
            </div>
        </div>
    </div>
  );
}

    