import AuthWrapper from '@/components/auth/AuthWrapper';
import AdminDashboard from '@/components/admin/AdminDashboard';
import { AdminLayout } from '@/components/admin/AdminLayout';

export default function AdminPage() {
  return (
    <AuthWrapper adminOnly>
      <AdminLayout>
        <AdminDashboard />
      </AdminLayout>
    </AuthWrapper>
  );
}
