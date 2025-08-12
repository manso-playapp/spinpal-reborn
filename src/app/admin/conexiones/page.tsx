import AuthWrapper from '@/components/auth/AuthWrapper';
import { AdminLayout } from '@/components/admin/AdminLayout';
import ConnectionsChecker from '@/components/admin/ConnectionsChecker';
import { Skeleton } from '@/components/ui/skeleton';
import { Suspense } from 'react';

// Esta función se ejecuta en el servidor para determinar si las claves de API están configuradas
function getServerSideProps() {
  const isGeminiConfigured = !!process.env.GEMINI_API_KEY;
  const isResendConfigured = !!process.env.RESEND_API_KEY;
  return { isGeminiConfigured, isResendConfigured };
}

export default function ConexionesPage() {
  const { isGeminiConfigured, isResendConfigured } = getServerSideProps();

  return (
    <AuthWrapper adminOnly>
      <AdminLayout>
        <div className="p-4 md:p-8">
            <div className="mb-4">
                <h1 className="font-headline text-2xl font-semibold">
                    Estado de Conexiones
                </h1>
                <p className="text-muted-foreground">Verifica aquí que todos los servicios de la aplicación están correctamente configurados.</p>
            </div>
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              <ConnectionsChecker 
                isGeminiConfigured={isGeminiConfigured} 
                isResendConfigured={isResendConfigured} 
              />
            </Suspense>
        </div>
      </AdminLayout>
    </AuthWrapper>
  );
}
