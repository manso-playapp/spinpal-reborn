'use client'

import { Suspense } from 'react';
import AuthWrapper from '@/components/auth/AuthWrapper';
import { ClientLayout } from '@/components/client/ClientLayout';
import ClientDashboard from '@/components/client/ClientDashboard';

function DashboardPageContent() {
    return (
        <AuthWrapper clientOnly>
            <ClientLayout>
                <ClientDashboard />
            </ClientLayout>
        </AuthWrapper>
    );
}


export default function DashboardPage() {
  return (
    <Suspense>
        <DashboardPageContent />
    </Suspense>
  )
}
