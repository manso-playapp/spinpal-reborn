import AuthWrapper from '@/components/auth/AuthWrapper';
import EmailLogList from '@/components/admin/EmailLogList';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { AdminLayout } from '@/components/admin/AdminLayout';

export default function EmailLogPage() {
  return (
    <AuthWrapper>
        <AdminLayout>
            <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
                <div className="flex items-center gap-4 mb-4">
                    <Button variant="outline" size="icon" className="h-7 w-7" asChild>
                        <Link href="/admin/dashboard">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Volver</span>
                        </Link>
                    </Button>
                    <h1 className="font-headline text-2xl font-semibold">
                        Registro de Correos Enviados
                    </h1>
                </div>
                <EmailLogList />
            </main>
      </AdminLayout>
    </AuthWrapper>
  );
}
