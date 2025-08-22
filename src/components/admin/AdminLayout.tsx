
'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
} from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/useAuth';
import Logo from '../logo';
import { LogOut, Gamepad, Mail, Link2, MessageSquareWarning, Sun, Moon, History } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut, userRole } = useAuth();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  const handleReportBug = () => {
    const subject = "PlayApp - Reporte de Error/Sugerencia";
    const body = `
¡Hola!

He encontrado un error o tengo una sugerencia para PlayApp.

**Descripción:**
[Describe el problema o la idea aquí. Si es un error, incluye los pasos para reproducirlo]

**Detalles Adicionales:**
- **Página:** ${window.location.href}
- **Usuario:** ${user?.email || 'No disponible'}
- **Fecha y Hora:** ${new Date().toLocaleString()}

Gracias,
`;
    window.location.href = `mailto:grupomanso@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };
  

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="p-2">
            <Link href="/admin">
                <Logo className="h-10 w-auto text-sidebar-primary" />
            </Link>
          </div>
        </SidebarHeader>

        <SidebarContent className="p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === '/admin' || pathname === '/admin/dashboard'}
                tooltip={{ children: 'Mis Juegos' }}
              >
                <Link href="/admin">
                    <Gamepad />
                    <span>Mis Juegos</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {userRole.isSuperAdmin && (
              <>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith('/admin/correos')}
                    tooltip={{ children: 'Correos Enviados' }}
                  >
                    <Link href="/admin/correos">
                      <Mail />
                      <span>Correos</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith('/admin/conexiones')}
                    tooltip={{ children: 'Conexiones' }}
                  >
                    <Link href="/admin/conexiones">
                      <Link2 />
                      <span>Conexiones</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith('/admin/changelog')}
                    tooltip={{ children: 'Historial de Cambios' }}
                  >
                    <Link href="/admin/changelog">
                      <History />
                      <span>Historial</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </>
            )}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter>
            <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={handleReportBug} tooltip={{ children: 'Reportar Error' }}>
                        <MessageSquareWarning />
                        <span>Reportar Error</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                    <SidebarMenuButton
                        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                        tooltip={{ children: `Cambiar a tema ${theme === 'light' ? 'oscuro' : 'claro'}` }}
                    >
                        {theme === 'light' ? <Moon /> : <Sun />}
                        <span>{theme === 'light' ? 'Tema Oscuro' : 'Tema Claro'}</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={signOut} tooltip={{ children: 'Cerrar Sesión' }}>
                        <LogOut />
                        <span>Cerrar Sesión</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
         <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 md:hidden">
            <SidebarTrigger/>
            <p className="grow text-sm text-muted-foreground text-right">{user?.email}</p>
        </header>
        {children}
        </SidebarInset>
    </SidebarProvider>
  );
}
