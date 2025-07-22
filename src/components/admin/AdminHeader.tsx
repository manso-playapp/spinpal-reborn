
'use client';

import Link from "next/link";
import Logo from "../logo";
import { Button } from "../ui/button";
import { useAuth } from "@/hooks/useAuth";
import { LogOut } from "lucide-react";

export default function AdminHeader() {
  const { user, signOut } = useAuth();
  
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background px-6">
        <div className="flex items-center gap-4">
        <Link href="/admin">
            <Logo className="h-8 w-auto text-primary" />
        </Link>
        </div>

        <div className="flex items-center gap-2">
        {user && user.email && (
            <p className="text-sm text-muted-foreground hidden md:block">
            {user.email}
            </p>
        )}
        <Button onClick={signOut} variant="outline" size="icon" className="h-8 w-8">
            <LogOut className="h-4 w-4" />
            <span className="sr-only">Cerrar sesión</span>
        </Button>
        </div>
    </header>
  )
}
