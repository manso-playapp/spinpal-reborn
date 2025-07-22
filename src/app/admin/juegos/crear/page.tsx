import AuthWrapper from '@/components/auth/AuthWrapper';
import CreateGameForm from '@/components/admin/CreateGameForm';
import AdminHeader from '@/components/admin/AdminHeader';

export default function CreateGamePage() {
  return (
    <AuthWrapper>
      <div className="flex min-h-screen w-full flex-col bg-muted/40">
        <AdminHeader />
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <CreateGameForm />
        </main>
      </div>
    </AuthWrapper>
  );
}
