import ConnectionsChecker from "@/components/admin/ConnectionsChecker";

export default function ConexionesPage() {
    
  return (
    <div className="flex min-h-screen flex-col items-center bg-background p-4 sm:p-8">
      <div className="w-full max-w-5xl space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold font-headline">Estado de Conexiones</h1>
          <p className="mt-2 text-muted-foreground">
            Verifica que todos los servicios estén configurados y funcionando correctamente.
          </p>
        </div>

        <ConnectionsChecker />
        
      </div>
    </div>
  );
}
