
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Mail, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';


const formSchema = z.object({
  email: z.string().email({
    message: 'Por favor, introduce un correo electrónico válido.',
  }),
});

type TestEmailFormValues = z.infer<typeof formSchema>;

export default function TestEmailSender() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const form = useForm<TestEmailFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: TestEmailFormValues) => {
    setLoading(true);
    try {
      const response = await fetch('/api/send-test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: data.email,
          clientId: user?.uid 
        }),
      });
      const result = await response.json();
      if (result.success) {
        toast({
          title: '¡Éxito!',
          description: result.message,
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error al enviar correo',
        description: error.message || 'Hubo un problema al enviar el correo de prueba.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
        <h4 className="text-md font-semibold text-card-foreground">Enviar Correo de Prueba</h4>
        <p className="text-sm text-muted-foreground">
            Usa esta herramienta para verificar que tu integración con Resend funciona correctamente. Si el correo llega, ¡estás listo!
        </p>
        <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-end gap-2">
            <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
                <FormItem className="flex-grow">
                <FormLabel>Email del Destinatario</FormLabel>
                <FormControl>
                    <Input
                    placeholder="tu@correo.com"
                    {...field}
                    disabled={loading}
                    />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <Button type="submit" disabled={loading}>
            {loading ? (
                <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
                </>
            ) : (
                <>
                <Mail className="mr-2 h-4 w-4" />
                Enviar Prueba
                </>
            )}
            </Button>
        </form>
        </Form>
    </div>
  );
}
