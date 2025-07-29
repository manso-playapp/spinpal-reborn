import AuthWrapper from '@/components/auth/AuthWrapper';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { History, GitCommit, UploadCloud, ShieldCheck, Timer } from 'lucide-react';
import packageJson from '../../../../package.json';

const changelogData = [
    {
        version: "0.2.0",
        date: "29 de Julio de 2024",
        changes: [
            { icon: <History className="h-4 w-4 text-primary" />, text: "Se añade esta página de historial de cambios." },
            { icon: <GitCommit className="h-4 w-4 text-primary" />, text: "Se implementa un nuevo sistema de versionado numérico incremental (Build ID)." },
        ]
    },
    {
        version: "0.1.21",
        date: "29 de Julio de 2024",
        changes: [
            { icon: <UploadCloud className="h-4 w-4 text-primary" />, text: "Se implementa la funcionalidad para subir imágenes directamente desde el panel de edición del juego (fondos, bordes, iconos), reemplazando los campos de URL de texto." },
            { icon: <ShieldCheck className="h-4 w-4 text-primary" />, text: "Se actualizan las reglas de seguridad de Firebase Storage para permitir que los clientes administren las imágenes de sus propios juegos de forma segura." },
            { icon: <ShieldCheck className="h-4 w-4 text-primary" />, text: "Se añade la guía de configuración de reglas de Storage en la página de Conexiones para fácil acceso." },
        ]
    },
    {
        version: "0.1.20",
        date: "28 de Julio de 2024",
        changes: [
             { icon: <Timer className="h-4 w-4 text-primary" />, text: "Se aumenta en 3 segundos (de 8s a 11s) el tiempo de espera en la pantalla 'Girando...' del jugador para mejorar la sincronización con la animación de la ruleta." },
        ]
    }
];


export default function ChangelogPage() {
  return (
    <AuthWrapper adminOnly>
      <AdminLayout>
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <div className="mb-4">
                <h1 className="font-headline text-2xl font-semibold">
                    Historial de Cambios
                </h1>
                <p className="text-muted-foreground">Aquí puedes ver un registro de las actualizaciones y mejoras de la aplicación.</p>
            </div>
            
            <div className="space-y-8">
                {changelogData.map((log) => (
                    <Card key={log.version}>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Versión {log.version}</CardTitle>
                                <CardDescription>{log.date}</CardDescription>
                            </div>
                            <Badge variant="outline">Paquete v{packageJson.version}</Badge>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-3">
                                {log.changes.map((change, index) => (
                                    <li key={index} className="flex items-start gap-3">
                                        <div className="mt-1">{change.icon}</div>
                                        <span>{change.text}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                ))}
            </div>

        </main>
      </AdminLayout>
    </AuthWrapper>
  );
}
