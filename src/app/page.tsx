import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { MoveRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background">
      <div className="relative mx-auto flex max-w-3xl flex-col items-center justify-center p-8 text-center">
        <h1 className="font-headline text-4xl font-bold tracking-tighter text-foreground md:text-6xl lg:text-7xl">
          SpinPal Reborn
        </h1>
        <p className="mt-4 max-w-xl font-body text-base text-muted-foreground md:text-lg">
          El blueprint de reconstrucción definitivo. Construido con precisión y claridad para una nueva era de interacción.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/login">
              Admin Login
              <MoveRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
