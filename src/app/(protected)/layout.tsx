import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import AuthWrapper from '@/components/auth/AuthWrapper';
import { AdminI18nProvider } from '@/context/AdminI18nContext';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AuthProvider>
        <AuthWrapper>
          <AdminI18nProvider>
            {children}
            <Toaster />
          </AdminI18nProvider>
        </AuthWrapper>
      </AuthProvider>
    </ThemeProvider>
  );
}
