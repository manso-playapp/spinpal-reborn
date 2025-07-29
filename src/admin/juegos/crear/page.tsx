import AuthWrapper from '@/components/auth/AuthWrapper';
import CreateGameForm from '@/components/admin/CreateGameForm';
import { AdminLayout } from '@/components/admin/AdminLayout';

export default function CreateGamePage() {
  return (
    <AuthWrapper>
        <AdminLayout>
            <CreateGameForm />
        </AdminLayout>
    </AuthWrapper>
  );
}
